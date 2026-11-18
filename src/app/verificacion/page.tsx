'use client';

/**
 * /verificacion: the two-step verification step (authenticator app, TOTP).
 *
 *  - verify  the account has an authenticator and this session has not
 *            used it yet (after the password, or after the API answered
 *            403 MFA_REQUIRED): "Escribe el código de 6 dígitos".
 *  - enrol   no authenticator yet and the role needs one (Fandi Admin
 *            always; idol owners/admins after their reminder period):
 *            QR + secret + first code.
 *  - done    back to `next`.
 *
 * Needs a session (the proxy guards it). Nothing here calls the organizer
 * API, so a 403 MFA_REQUIRED can never loop back to this page.
 */
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ShieldCheck, ShieldPlus } from 'lucide-react';
import { AuthShell, AuthShellChecking, AuthShellHeader } from '@/components/auth/auth-shell';
import { SessionUnreachable } from '@/components/auth/session-unreachable';
import { TotpEnrollForm, TotpVerifyForm } from '@/components/security/two-step-forms';
import { useAuth } from '@/contexts/auth-context';
import { postLoginPath } from '@/lib/auth-flow';
import { colombiaDateTime } from '@/lib/colombia-time';
import { safeNextPath } from '@/lib/safe-next';
import { VERIFICATION_PATH, twoStepRequiredNow, verificationStep } from '@/lib/two-step';

export default function VerificationPage() {
    return (
        <Suspense fallback={<Checking />}>
            <VerificationContent />
        </Suspense>
    );
}

function Checking() {
    const t = useTranslations('twoStep');
    return (
        <AuthShell>
            <AuthShellChecking label={t('checking')} />
        </AuthShell>
    );
}

function VerificationContent() {
    const t = useTranslations('twoStep');
    const locale = useLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        user, isLoading, isAuthenticated, isUnreachable, retrySession, assurance, refreshAssurance, logout,
    } = useAuth();

    const requested = searchParams.get('next');
    const home = user ? postLoginPath(user, '/dashboard') : '/dashboard';
    const next = (() => {
        const safe = safeNextPath(requested, home);
        return safe.startsWith(VERIFICATION_PATH) ? home : safe;
    })();

    const step = user && assurance
        ? verificationStep({
            role: user.role,
            mfa: user.mfa ?? null,
            currentLevel: assurance.currentLevel,
            hasVerifiedFactor: assurance.hasVerifiedFactor,
        })
        : null;

    useEffect(() => {
        if (!isLoading && !isAuthenticated && !isUnreachable) {
            router.replace(`/login?next=${encodeURIComponent(next)}`);
        } else if (step === 'done') {
            router.replace(next);
        }
    }, [isLoading, isAuthenticated, isUnreachable, step, next, router]);

    if (!isLoading && isUnreachable) {
        return <SessionUnreachable onRetry={retrySession} />;
    }
    if (!user || !step || step === 'done') return <Checking />;

    async function finish() {
        await refreshAssurance();
        router.replace(next);
    }

    const isAdmin = user.role === 'admin';
    const deadline = colombiaDateTime(user.mfa?.requiredAfter ?? null, locale);
    const requiredNow = twoStepRequiredNow({ role: user.role, mfa: user.mfa ?? null });

    return (
        <AuthShell>
            {step === 'verify' ? (
                <>
                    <AuthShellHeader icon={<ShieldCheck size={22} />} title={t('verifyTitle')}>
                        <p className="text-[15px] leading-relaxed text-body-white">{t('verifyBody')}</p>
                        <p className="text-[13px] leading-relaxed text-muted-white">{isAdmin ? t('whyAdmin') : t('why')}</p>
                    </AuthShellHeader>
                    <TotpVerifyForm onVerified={finish} submitLabel={t('verifyEnter')} />
                    <p className="mt-6 text-[13px] leading-relaxed text-muted-white">{t('lostDevice')}</p>
                </>
            ) : (
                <>
                    <AuthShellHeader icon={<ShieldPlus size={22} />} title={t('enrolTitle')}>
                        <p className="text-[15px] font-semibold leading-relaxed text-ink" data-testid="enrol-reason">
                            {isAdmin
                                ? t('enrolReasonAdmin')
                                : requiredNow || !deadline
                                    ? t('enrolReasonRequired')
                                    : t('enrolReasonGrace', { date: deadline.date })}
                        </p>
                        <p className="text-[13px] leading-relaxed text-muted-white">{isAdmin ? t('whyAdmin') : t('why')}</p>
                    </AuthShellHeader>
                    <TotpEnrollForm onEnrolled={finish} />
                </>
            )}
            <div className="mt-6 border-t-2 border-line-white pt-4">
                <button
                    type="button"
                    onClick={() => void logout()}
                    data-testid="verification-other-account"
                    className="cursor-pointer text-[13px] font-bold text-blue underline decoration-2 underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                >
                    {t('otherAccount', { email: user.email ?? '' })}
                </button>
            </div>
        </AuthShell>
    );
}
