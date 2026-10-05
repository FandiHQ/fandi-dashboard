'use client';

/**
 * /reset-password — where the recovery email lands (public route: the proxy
 * only guards /dashboard and /staff). Without a link it doubles as the
 * "forgot password" page, so every dead end has a way forward.
 */
import { AuthShell } from '@/components/auth/auth-shell';
import { SetPasswordFlow } from '@/components/auth/set-password-flow';

export default function ResetPasswordPage() {
    return (
        <AuthShell>
            <SetPasswordFlow variant="reset" />
        </AuthShell>
    );
}
