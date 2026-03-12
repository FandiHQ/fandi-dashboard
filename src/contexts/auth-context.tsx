// fandi-dashboard\src\contexts\auth-context.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { authApi } from '@/lib/api-hooks';
import type { AuthMeResponse } from '@/types/api';

interface AuthContextType {
    user: AuthMeResponse | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    organization: AuthMeResponse['organization'] | null;
    myRole: 'owner' | 'admin' | 'viewer' | 'staff' | null;
    login: (email: string, password: string) => Promise<AuthMeResponse>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthMeResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // On mount — check existing session
    useEffect(() => {
        async function init() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const me = await authApi.me();
                    setUser(me);
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

    // login() returns Promise<AuthMeResponse> so callers can read role
    // for routing decisions without stale closures.
    const login = useCallback(async (email: string, password: string): Promise<AuthMeResponse> => {
        const { error } = await supabase.auth.signInWithPassword({
            email, password,
        });
        if (error) throw error;

        try {
            const me = await authApi.me();
            setUser(me);
            return me;
        } catch {
            // Supabase auth succeeded but our API rejected.
            // Example: a fan trying to log in to the dashboard.
            await supabase.auth.signOut();
            throw new Error('NO_DASHBOARD_ACCESS');
        }
    }, []);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        // onAuthStateChange SIGNED_OUT handler clears user state.
        // Hard redirect to landing to clear ALL client state:
        if (typeof window !== 'undefined') {
            window.location.href = '/';
        }
    }, []);

    const isAuthenticated = user !== null;
    const organization = user?.organization ?? null;
    const myRole = user?.organization?.myRole ?? null;

    return (
        <AuthContext.Provider value={{
            user, isLoading, isAuthenticated,
            organization, myRole, login, logout
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
