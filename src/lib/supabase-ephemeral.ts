// fandi-dashboard\src\lib\supabase-ephemeral.ts
import { createClient } from '@supabase/supabase-js';

/**
 * A short-lived, in-memory Supabase client for the email-link flows
 * (forgot/reset password, invite accept).
 *
 * Why not the app client (`@/lib/supabase`):
 * - `createBrowserClient` from @supabase/ssr is a browser singleton, so it
 *   can't be "isolated" with different options, and the AuthProvider signs
 *   it out when the account has no panel — which would kill a recovery or
 *   invite session before the new password is saved.
 * - It is PKCE-only. A PKCE reset link only works in the browser that asked
 *   for it; people often ask on the laptop and open the email on the phone.
 *   This client uses the implicit flow, so the link carries its own tokens
 *   (#access_token=…) and works on any device.
 *
 * Nothing is persisted: the session lives in memory until the page is left.
 */
export function createEphemeralAuthClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                flowType: 'implicit',
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
                storageKey: 'sb-fandi-ephemeral',
            },
        },
    );
}

export type EphemeralAuthClient = ReturnType<typeof createEphemeralAuthClient>;
