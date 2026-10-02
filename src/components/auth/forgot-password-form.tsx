'use client';

/**
 * "¿Olvidaste tu contraseña?" → email → Supabase sends a recovery link to
 * /reset-password. The confirmation is the same whether or not the email
 * has an account (no account enumeration); only rate limits and a dead
 * connection get their own message.
 *
 * Uses the ephemeral implicit-flow client so the emailed link carries its
 * own tokens and works on any device (see lib/supabase-ephemeral.ts).
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AUTH_FIELD_CLASS, AUTH_LABEL_CLASS, FormAlert } from '@/components/auth/password-fields';
import { createEphemeralAuthClient } from '@/lib/supabase-ephemeral';
import {
    looksLikeEmail, resetPasswordRedirectUrl, resetRequestOutcome,
    type ResetRequestOutcome,
} from '@/lib/auth-flow';

interface ForgotPasswordFormProps {
    initialEmail?: string;
    /** Shows a "back to log in" action (inline on the login form). */
    onBack?: () => void;
    /** Hide the built-in title when the page already explains the situation. */
    showTitle?: boolean;
    autoFocus?: boolean;
    idPrefix?: string;
}

export function ForgotPasswordForm({
    initialEmail = '',
    onBack,
    showTitle = true,
    autoFocus = true,
    idPrefix = 'forgot',
}: ForgotPasswordFormProps) {
    const t = useTranslations('auth');
    const [email, setEmail] = useState(initialEmail);
    const [sending, setSending] = useState(false);
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [problem, setProblem] = useState<'invalidEmail' | Exclude<ResetRequestOutcome, 'sent'> | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const value = email.trim();
        if (!looksLikeEmail(value)) {
            setProblem('invalidEmail');
            return;
        }
        setProblem(null);
        setSending(true);
        let failure: unknown = null;
        try {
            const client = createEphemeralAuthClient();
            const { error } = await client.auth.resetPasswordForEmail(value, {
                redirectTo: resetPasswordRedirectUrl(window.location.origin),
            });
            failure = error;
        } catch (err) {
            failure = err;
        } finally {
            setSending(false);
        }
        const outcome = resetRequestOutcome(failure);
        if (outcome === 'sent') setSentTo(value);
        else setProblem(outcome);
    }

    if (sentTo) {
        return (
            <div className="flex flex-col gap-5" aria-live="polite">
                <span className="flex size-12 items-center justify-center rounded-[12px] border-2 border-ink bg-lime text-ink shadow-ext-sm" aria-hidden="true">
                    <MailCheck size={22} />
                </span>
                <h2 className="font-display text-[28px] leading-none text-ink">{t('forgot.sentTitle')}</h2>
                <p className="text-[15px] leading-relaxed text-body-white">
                    {t('forgot.sentBody', { email: sentTo })}
                </p>
                <p className="text-[13px] leading-relaxed text-muted-white">{t('forgot.sentNote')}</p>
                <div className="flex flex-col gap-3">
                    {onBack && (
                        <Button type="button" size="lg" onClick={onBack} className="h-[54px] w-full rounded-[14px]">
                            {t('forgot.backToLogin')}
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="secondary"
                        size="lg"
                        onClick={() => setSentTo(null)}
                        className="h-[54px] w-full rounded-[14px]"
                    >
                        {t('forgot.sendAnother')}
                    </Button>
                </div>
            </div>
        );
    }

    const problemText =
        problem === 'invalidEmail' ? t('invalidEmail')
            : problem === 'tooManyAttempts' ? t('tooManyAttempts')
                : problem === 'networkError' ? t('networkError')
                    : null;

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            {/* Without the title the page above already explains why (expired link). */}
            {showTitle && (
                <>
                    <h2 className="font-display text-[28px] leading-none text-ink sm:text-[34px]">{t('forgot.title')}</h2>
                    <p className="text-[15px] leading-relaxed text-body-white">{t('forgot.body')}</p>
                </>
            )}

            <div className="flex flex-col gap-2">
                <label htmlFor={`${idPrefix}-email`} className={AUTH_LABEL_CLASS}>
                    {t('email')}
                </label>
                <Input
                    id={`${idPrefix}-email`}
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (problem === 'invalidEmail') setProblem(null); }}
                    placeholder={t('emailPlaceholder')}
                    autoComplete="email"
                    autoFocus={autoFocus}
                    disabled={sending}
                    aria-invalid={problem === 'invalidEmail' ? true : undefined}
                    aria-describedby={problemText ? `${idPrefix}-error` : undefined}
                    className={AUTH_FIELD_CLASS}
                />
            </div>

            <FormAlert id={`${idPrefix}-error`}>{problemText}</FormAlert>

            <Button
                type="submit"
                size="lg"
                disabled={sending}
                className="h-[58px] w-full rounded-[14px] text-[18px] font-black [font-stretch:115%] shadow-ext-block"
            >
                {sending ? (
                    <>
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                        {t('forgot.sending')}
                    </>
                ) : t('forgot.submit')}
            </Button>

            {onBack && (
                <button
                    type="button"
                    onClick={onBack}
                    className="self-start text-sm font-bold text-blue underline decoration-2 underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                >
                    {t('forgot.backToLogin')}
                </button>
            )}
        </form>
    );
}
