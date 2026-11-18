'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { authApi } from '@/lib/api-hooks';
import {
    DashboardAccessError, SyncFailedError, dashboardAccessOf, hasPanelAccess, sessionSyncFailure, withOneRetry,
} from '@/lib/auth-flow';
import { twoStepGate, type TwoStepGate } from '@/lib/two-step';
import type { UserSyncResponse } from '@/types/api';

// Closing a session the panel can't use is LOCAL on purpose: the default
// (global) scope revokes every session of that account, which would also
// log a fan out of the mobile app just for trying the dashboard.
const signOutHere = () => supabase.auth.signOut({ scope: 'local' });

/** The session's two-step state, from Supabase (decoded locally, no API call). */
export interface SessionAssurance {
    /** 'aal2' once this session verified the 6-digit code. */
    currentLevel: string | null;
    /** The account has a verified authenticator (Supabase nextLevel 'aal2'). */
    hasVerifiedFactor: boolean;
}

async function readAssurance(): Promise<SessionAssurance> {
    try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error || !data) return { currentLevel: null, hasVerifiedFactor: false };
        return { currentLevel: data.currentLevel ?? null, hasVerifiedFactor: data.nextLevel === 'aal2' };
    } catch {
        // Unknown: the API still answers 403 MFA_REQUIRED when it matters.
        return { currentLevel: null, hasVerifiedFactor: false };
    }
}

interface AuthContextType {
    user: UserSyncResponse | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    /**
     * There is a session but our API did not answer on load (offline,
     * deploy, restart). The session is kept; layouts offer a retry instead
     * of sending the person to the login form.
     */
    isUnreachable: boolean;
    retrySession: () => Promise<void>;
    organization: UserSyncResponse['organization'];
    memberRole: string | null;
    /** Fandi Admin (persisted users.role; the API checks it on every call). */
    isPlatformAdmin: boolean;
    /** Two-step verification of this session (null until known). */
    assurance: SessionAssurance | null;
    /** What a protected area must do first (verify / enrol / remind / ok). */
    twoStep: TwoStepGate;
    /** Re-read the assurance after a verify, enrol or removal. */
    refreshAssurance: () => Promise<SessionAssurance>;
    login: (email: string, password: string) => Promise<UserSyncResponse>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserSyncResponse | null>(null);
    const [assurance, setAssurance] = useState<SessionAssurance | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUnreachable, setIsUnreachable] = useState(false);

    const refreshAssurance = useCallback(async () => {
        const next = await readAssurance();
        setAssurance(next);
        return next;
    }, []);

    const loadSession = useCallback(() => {
        return supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session) {
                const syncResponse = await withOneRetry(() => authApi.sync());
                // Only store if user has dashboard access (an org, or Fandi Admin)
                if (hasPanelAccess(dashboardAccessOf(syncResponse))) {
                    setAssurance(await readAssurance());
                    setUser(syncResponse);
                } else {
                    // Fan or no org — sign out silently
                    await signOutHere();
                }
            }
        }).catch(async (err: unknown) => {
            if (sessionSyncFailure(err) === 'keepAndRetry') {
                // Our API is down or restarting: the session itself is fine.
                setIsUnreachable(true);
            } else {
                // Valid Supabase session but our API rejected it
                await signOutHere();
                setUser(null);
            }
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    // The initial render already starts loading. Reset retry state only
    // in the explicit user action, not synchronously in the mount effect.
    const retrySession = useCallback(async () => {
        setIsLoading(true);
        setIsUnreachable(false);
        await loadSession();
    }, [loadSession]);

    // On mount — check existing session
    useEffect(() => {
        loadSession();
    }, [loadSession]);

    // Subscribe to Supabase auth state changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event) => {
                if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setAssurance(null);
                }
                if (event === 'MFA_CHALLENGE_VERIFIED') {
                    // Outside the callback: Supabase holds its lock while it runs.
                    setTimeout(() => { void refreshAssurance(); }, 0);
                }
                // TOKEN_REFRESHED: no action needed — request interceptor
                // calls getSession() each time, picks up refreshed token.
            }
        );
        return () => subscription.unsubscribe();
    }, [refreshAssurance]);

    // login() returns Promise<UserSyncResponse> so callers can read role
    // for routing decisions without stale closures.
    const login = useCallback(async (email: string, password: string): Promise<UserSyncResponse> => {
        const { error } = await supabase.auth.signInWithPassword({
            email, password,
        });
        if (error) throw error;

        // The password was right. If our API doesn't answer (offline,
        // restarting), close the Supabase session so nothing stays half
        // signed in, and let the form say "couldn't reach Fandi".
        let syncResponse: UserSyncResponse;
        try {
            syncResponse = await withOneRetry(() => authApi.sync());
        } catch (syncError) {
            await signOutHere();
            throw new SyncFailedError(syncError);
        }

        // Check dashboard access: fans and users without an org cannot access
        // (a Fandi admin can, to /admin). The error says which (safe: the
        // caller proved the password).
        const access = dashboardAccessOf(syncResponse);
        if (!hasPanelAccess(access)) {
            await signOutHere();
            throw new DashboardAccessError(access);
        }

        // A password sign-in is aal1: with a verified authenticator the
        // layouts send the person to the 6-digit code step first.
        setAssurance(await readAssurance());
        setIsUnreachable(false);
        setUser(syncResponse);
        return syncResponse;
    }, []);

    const logout = useCallback(async () => {
        // "Cerrar sesión" closes THIS browser only (same reason as above:
        // the global default would also log the person out of the app).
        await signOutHere();
        setUser(null);
        setAssurance(null);
        // Small delay to let Supabase clear cookies before hard navigation
        // prevents Turbopack module-factory race condition on SSR
        if (typeof window !== 'undefined') {
            setTimeout(() => { window.location.href = '/'; }, 100);
        }
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const syncResponse = await authApi.sync();
            if (hasPanelAccess(dashboardAccessOf(syncResponse))) {
                setUser(syncResponse);
            }
        } catch { /* silently fail */ }
    }, []);

    const isAuthenticated = user !== null;
    const organization = user?.organization ?? null;
    const memberRole = user?.organization?.memberRole ?? null;
    const isPlatformAdmin = user?.role === 'admin';
    const twoStep = useMemo<TwoStepGate>(() => {
        if (!user || !assurance) return { kind: 'ok' };
        return twoStepGate({
            role: user.role,
            mfa: user.mfa ?? null,
            currentLevel: assurance.currentLevel,
            hasVerifiedFactor: assurance.hasVerifiedFactor,
        });
    }, [user, assurance]);

    return (
        <AuthContext.Provider value={{
            user, isLoading, isAuthenticated, isUnreachable, retrySession,
            organization, memberRole, isPlatformAdmin, assurance, twoStep, refreshAssurance,
            login, logout, refreshUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
