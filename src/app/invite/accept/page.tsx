'use client';

/**
 * /invite/accept — where the Supabase team-invitation email lands
 * (redirectTo set by the API's inviteUserByEmail). The person creates a
 * password and goes straight into the panel; signing in runs /users/sync,
 * which activates the pending membership.
 *
 * The invitation session lives on an ephemeral, in-memory client (see
 * lib/supabase-ephemeral.ts): the app client is a browser singleton, and the
 * AuthProvider signs it out for accounts without a panel, which used to kill
 * the invitation session before the password was saved.
 */
import { AuthShell } from '@/components/auth/auth-shell';
import { SetPasswordFlow } from '@/components/auth/set-password-flow';

export default function InviteAcceptPage() {
    return (
        <AuthShell>
            <SetPasswordFlow variant="invite" />
        </AuthShell>
    );
}
