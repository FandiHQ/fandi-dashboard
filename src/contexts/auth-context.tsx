'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { authApi } from '@/lib/api-hooks';
import type { UserSyncResponse } from '@/types/api';

interface AuthContextType {
    user: UserSyncResponse | null;
    isLoading: boolean;
    isAuthenticated: boolean;
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

    // On mount — check existing session
    useEffect(() => {
        async function init() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const syncResponse = await authApi.sync();
                    // Only store if user has dashboard access
                    if (syncResponse.role !== 'fan' && syncResponse.organization) {
                        setUser(syncResponse);
                    } else {
                        // Fan or no org — sign out silently
                        await supabase.auth.signOut();
                    }
                }
            } catch {
                // Valid Supabase session but our API rejected it
                await supabase.auth.signOut();
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        }
        init();
    }, []);

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

        const syncResponse = await authApi.sync();

        // Check dashboard access: fans and users without an org cannot access
        if (syncResponse.role === 'fan' || !syncResponse.organization) {
            await supabase.auth.signOut();
            throw new Error('NO_DASHBOARD_ACCESS');
        }

        setUser(syncResponse);
        return syncResponse;
    }, []);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
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
            if (syncResponse.role !== 'fan' && syncResponse.organization) {
                setUser(syncResponse);
            }
        } catch { /* silently fail */ }
    }, []);

    const isAuthenticated = user !== null;
    const organization = user?.organization ?? null;
    const memberRole = user?.organization?.memberRole ?? null;

    return (
        <AuthContext.Provider value={{
            user, isLoading, isAuthenticated,
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
