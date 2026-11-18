'use client';

/**
 * /invitacion: where a team invitation email lands
 * ({DASHBOARD_URL}/invitacion#t=<token>). Public route: the proxy only
 * guards /dashboard and /staff; the token is the credential and lives in
 * the URL fragment. See components/auth/invitation-flow.tsx.
 */
import { AuthShell } from '@/components/auth/auth-shell';
import { InvitationFlow } from '@/components/auth/invitation-flow';

export default function InvitationPage() {
    return (
        <AuthShell>
            <InvitationFlow />
        </AuthShell>
    );
}
