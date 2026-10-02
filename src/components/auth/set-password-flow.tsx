'use client';

/**
 * The whole "email link → new password → into the dashboard" flow, shared by
 * /reset-password (recovery email) and /invite/accept (team invitation).
 *
 * 1. The link session is opened on an ephemeral client (useEmailLinkSession).
 * 2. updateUser({ password }) on that session.
 * 3. The link session is closed and the person is signed in for real with
 *    AuthProvider.login(email, newPassword), which also runs /users/sync
 *    (activates a pending team membership) and the panel-access check.
 * 4. Panel → /dashboard (or /staff). No panel → an honest message: fan
 *    account, or no team yet. The password change itself already happened.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle, KeyRound, Loader2, Lock, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthShellChecking, AuthShellHeader } from '@/components/auth/auth-shell';
import { FormAlert, NewPasswordFields } from '@/components/auth/password-fields';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { useEmailLinkSession } from '@/components/auth/use-email-link-session';
import { useAuth } from '@/contexts/auth-context';
import {
    PASSWORD_MIN_LENGTH, loginErrorKey, passwordUpdateErrorKey, validateNewPassword,
} from '@/lib/auth-flow';

type Variant = 'reset' | 'invite';
type DoneStage = 'entering' | 'signIn' | 'fan' | 'noOrg';

export function SetPasswordFlow({ variant }: { variant: Variant }) {
    const t = useTranslations('auth');
    const router = useRouter();
    const { login } = useAuth();
    const cleanPath = variant === 'reset' ? '/reset-password' : '/invite/accept';
    const { state, setState, getClient, closeSession } = useEmailLinkSession(cleanPath);

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [triedSubmit, setTriedSubmit] = useState(false);
    const [done, setDone] = useState<DoneStage | null>(null);

    const copy = (key: string) => t(`${variant}.${key}`);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (state.status !== 'ready' || saving) return;
        setTriedSubmit(true);
        const problem = validateNewPassword(password, confirm);
        if (problem) {
            setError(t(`newPassword.${problem}`, { min: PASSWORD_MIN_LENGTH }));
            return;
        }
        const client = getClient();
        if (!client) {
            setState({ status: 'invalid' });
            return;
        }

        setError(null);
        setSaving(true);
        const { error: updateError } = await client.auth.updateUser({ password });
        if (updateError) {
            setSaving(false);
            const key = passwordUpdateErrorKey(updateError);
            if (key === 'linkExpired') {
                setState({ status: 'expired' });
            } else if (key === 'tooManyAttempts' || key === 'networkError') {
                setError(t(key));
            } else {
                setError(t(`passwordErrors.${key}`));
            }
            return;
        }

        // Saved. Close the link session and enter with the new password.
        await closeSession();
        setDone('entering');
        if (!state.email) {
            setDone('signIn');
            return;
        }
        try {
            const me = await login(state.email, password);
            router.replace(me.organization?.memberRole === 'staff' ? '/staff' : '/dashboard');
        } catch (err) {
            const key = loginErrorKey(err);
            setDone(key === 'noAccessFan' ? 'fan' : key === 'noAccessNoOrg' ? 'noOrg' : 'signIn');
        }
    }

    // ── Password saved ──
    if (done) {
        if (done === 'entering') {
            return (
                <>
                    <AuthShellHeader tone="lime" icon={<CheckCircle size={22} />} title={copy('doneTitle')} />
                    <AuthShellChecking label={copy('doneEntering')} />
                </>
            );
        }
        const body =
            done === 'fan'
                ? (variant === 'reset' ? t('reset.doneFan') : t('noAccessFan'))
                : done === 'noOrg'
                    ? (variant === 'reset' ? t('reset.doneNoOrg') : t('noAccessNoOrg'))
                    : copy('doneSignIn');
        return (
            <>
                <AuthShellHeader tone="lime" icon={<CheckCircle size={22} />} title={copy('doneTitle')}>
                    <p className="text-[15px] leading-relaxed text-body-white" role="status">{body}</p>
                    {done === 'fan' && variant === 'reset' && (
                        <p className="text-[13px] leading-relaxed text-muted-white">{t('noAccessFan')}</p>
                    )}
                </AuthShellHeader>
                <Button asChild size="lg" className="h-[54px] w-full rounded-[14px]">
                    <Link href="/login">{t('goToLogin')}</Link>
                </Button>
            </>
        );
    }

    // ── Verifying the link ──
    if (state.status === 'checking') {
        return <AuthShellChecking label={copy('checking')} />;
    }

    // ── Reset page opened without a link: ask for one ──
    if (state.status === 'none' && variant === 'reset') {
        return (
            <>
                <ForgotPasswordForm idPrefix="reset-request" />
                <BackToLogin label={t('forgot.backToLogin')} />
            </>
        );
    }

    // ── Expired / unusable link ──
    if (state.status !== 'ready') {
        if (variant === 'invite') {
            return (
                <>
                    <AuthShellHeader tone="alert" icon={<Lock size={22} />} title={t('invite.expiredTitle')}>
                        <p className="text-[15px] leading-relaxed text-body-white">{t('invite.expiredBody')}</p>
                        <p className="text-[13px] leading-relaxed text-muted-white">{t('invite.alreadySet')}</p>
                    </AuthShellHeader>
                    <Button asChild size="lg" className="h-[54px] w-full rounded-[14px]">
                        <Link href="/login">{t('goToLogin')}</Link>
                    </Button>
                </>
            );
        }
        const expired = state.status === 'expired';
        return (
            <>
                <AuthShellHeader
                    tone="alert"
                    icon={<Lock size={22} />}
                    title={expired ? t('reset.expiredTitle') : t('reset.invalidTitle')}
                >
                    <p className="text-[15px] leading-relaxed text-body-white">
                        {expired ? t('reset.expiredBody') : t('reset.invalidBody')}
                    </p>
                </AuthShellHeader>
                <ForgotPasswordForm idPrefix="reset-retry" showTitle={false} autoFocus={false} />
                <BackToLogin label={t('forgot.backToLogin')} />
            </>
        );
    }

    // ── The form ──
    return (
        <>
            <AuthShellHeader
                icon={variant === 'reset' ? <KeyRound size={22} /> : <UserPlus size={22} />}
                title={copy('title')}
            >
                <p className="text-[15px] leading-relaxed text-body-white">{copy('body')}</p>
                {state.email && (
                    <p className="break-all font-space-mono text-[12px] font-bold text-ink">
                        {t(`${variant}.account`, { email: state.email })}
                    </p>
                )}
            </AuthShellHeader>

            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                {/* Lets password managers save the new password under the right account. */}
                {state.email && (
                    <input type="email" name="username" autoComplete="username" value={state.email} readOnly hidden />
                )}
                <NewPasswordFields
                    idPrefix={variant}
                    password={password}
                    confirm={confirm}
                    onPasswordChange={(v) => { setPassword(v); setError(null); }}
                    onConfirmChange={(v) => { setConfirm(v); setError(null); }}
                    disabled={saving}
                    autoFocus
                    invalid={triedSubmit}
                />
                <FormAlert>{error}</FormAlert>
                <Button
                    type="submit"
                    size="lg"
                    disabled={saving}
                    className="mt-1 h-[58px] w-full rounded-[14px] text-[18px] font-black [font-stretch:115%] shadow-ext-block"
                >
                    {saving ? (
                        <>
                            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                            {copy('saving')}
                        </>
                    ) : copy('submit')}
                </Button>
            </form>
        </>
    );
}

function BackToLogin({ label }: { label: string }) {
    return (
        <Link
            href="/login"
            className="mt-5 inline-block text-sm font-bold text-blue underline decoration-2 underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        >
            {label}
        </Link>
    );
}
