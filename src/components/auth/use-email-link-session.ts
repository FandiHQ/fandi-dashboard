'use client';

/**
 * Opens the session carried by an email link (password recovery or team
 * invitation) on an ephemeral, in-memory Supabase client, so the app's own
 * client and the AuthProvider are never touched until the person has a
 * password and signs in for real.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createEphemeralAuthClient, type EphemeralAuthClient } from '@/lib/supabase-ephemeral';
import { authLinkProblem, parseAuthLink, type AuthLink } from '@/lib/auth-flow';

export type EmailLinkState =
    | { status: 'checking' }
    | { status: 'none' }
    | { status: 'expired' }
    | { status: 'invalid' }
    | { status: 'ready'; email: string | null };

async function openSession(client: EphemeralAuthClient, link: AuthLink): Promise<EmailLinkState> {
    try {
        switch (link.kind) {
            case 'none':
                return { status: 'none' };
            case 'error':
                return { status: authLinkProblem(link.errorCode) };
            case 'code':
                // A PKCE link only works in the browser that asked for it;
                // our own emails never produce one. Offer a fresh link.
                return { status: 'invalid' };
            case 'tokens': {
                const { data, error } = await client.auth.setSession({
                    access_token: link.accessToken,
                    refresh_token: link.refreshToken,
                });
                // Tokens that no longer work = a link opened too late.
                if (error || !data.session) return { status: 'expired' };
                return { status: 'ready', email: data.session.user.email ?? null };
            }
            case 'tokenHash': {
                const { data, error } = await client.auth.verifyOtp({
                    token_hash: link.tokenHash,
                    type: link.type as EmailOtpType,
                });
                if (error || !data.session) return { status: authLinkProblem(error?.code ?? null) };
                return { status: 'ready', email: data.session.user.email ?? data.user?.email ?? null };
            }
        }
    } catch {
        return { status: 'invalid' };
    }
}

/**
 * @param cleanPath the page path; tokens are removed from the address bar
 *   (and history) as soon as they are read.
 */
export function useEmailLinkSession(cleanPath: string) {
    const clientRef = useRef<EphemeralAuthClient | null>(null);
    // One verification per page load, even when StrictMode runs effects twice
    // (the first run already cleaned the URL).
    const openingRef = useRef<Promise<EmailLinkState> | null>(null);
    const [state, setState] = useState<EmailLinkState>({ status: 'checking' });

    useEffect(() => {
        let active = true;
        if (!openingRef.current) {
            const link = parseAuthLink(window.location.href);
            if (link.kind !== 'none') window.history.replaceState(null, '', cleanPath);
            const client = createEphemeralAuthClient();
            clientRef.current = client;
            openingRef.current = openSession(client, link);
        }
        openingRef.current.then((next) => {
            if (active) setState(next);
        });
        return () => {
            active = false;
        };
    }, [cleanPath]);

    const getClient = useCallback(() => clientRef.current, []);

    /** Drop the link session (this device only; the password change already happened). */
    const closeSession = useCallback(async () => {
        try {
            await clientRef.current?.auth.signOut({ scope: 'local' });
        } catch { /* best effort */ }
    }, []);

    return { state, setState, getClient, closeSession };
}
