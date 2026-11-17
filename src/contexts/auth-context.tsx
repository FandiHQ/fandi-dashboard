'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { authApi } from '@/lib/api-hooks';
import {
    DashboardAccessError, SyncFailedError, dashboardAccessOf, sessionSyncFailure, withOneRetry,
} from '@/lib/auth-flow';
import type { UserSyncResponse } from '@/types/api';

// Closing a session the panel can't use is LOCAL on purpose: the default
// (global) scope revokes every session of that account, which would also
// log a fan out of the mobile app just for trying the dashboard.
const signOutHere = () => supabase.auth.signOut({ scope: 'local' });

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
    login: (email: string, password: string) => Promise<UserSyncResponse>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserSyncResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUnreachable, setIsUnreachable] = useState(false);

    const loadSession = useCallback(() => {
        return supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session) {
                const syncResponse = await withOneRetry(() => authApi.sync());
                // Only store if user has dashboard access
                if (dashboardAccessOf(syncResponse) === 'ok') {
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
            async (event) => {
                if (event === 'SIGNED_OUT') {
                    setUser(null);
                }
                // TOKEN_REFRESHED: no action needed — request interceptor
                // calls getSession() each time, picks up refreshed token.
            }
        );
        return () => subscription.unsubscribe();
    }, []);

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

        // Check dashboard access: fans and users without an org cannot access.
        // The error says which (safe: the caller proved the password).
        const access = dashboardAccessOf(syncResponse);
        if (access !== 'ok') {
            await signOutHere();
            throw new DashboardAccessError(access);
        }

        setIsUnreachable(false);
        setUser(syncResponse);
        return syncResponse;
    }, []);

    const logout = useCallback(async () => {
        // "Cerrar sesión" closes THIS browser only (same reason as above:
        // the global default would also log the person out of the app).
        await signOutHere();
        setUser(null);
        // Small delay to let Supabase clear cookies before hard navigation
        // prevents Turbopack module-factory race condition on SSR
        if (typeof window !== 'undefined') {
            setTimeout(() => { window.location.href = '/'; }, 100);
        }
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const syncResponse = await authApi.sync();
            if (dashboardAccessOf(syncResponse) === 'ok') {
                setUser(syncResponse);
            }
        } catch { /* silently fail */ }
    }, []);

    const isAuthenticated = user !== null;
    const organization = user?.organization ?? null;
    const memberRole = user?.organization?.memberRole ?? null;

    return (
        <AuthContext.Provider value={{
            user, isLoading, isAuthenticated, isUnreachable, retrySession,
            organization, memberRole, login, logout, refreshUser
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
