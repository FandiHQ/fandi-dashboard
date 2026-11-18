'use client';

/**
 * Two-step verification building blocks (authenticator app, TOTP):
 *  - TotpCodeField     the 6-digit input
 *  - TotpVerifyForm    "Escribe el código de tu app" (sign-in step, step-up)
 *  - TotpEnrollForm    QR + secret for manual entry + confirm with a code
 *
 * Supabase calls live in lib/two-step-client.ts; error codes map to copy
 * through lib/two-step.ts (`twoStep.errors.*`), never raw messages.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormAlert } from '@/components/auth/password-fields';
import {
    TOTP_CODE_LENGTH, groupSecret, isCompleteTotpCode, normalizeTotpCode, twoStepErrorKey, type TwoStepErrorKey,
} from '@/lib/two-step';
import {
    startTotpEnrollment, verifyAccountCode, verifyTotp, type TotpEnrollment,
} from '@/lib/two-step-client';
import { cn } from '@/lib/utils';

const LABEL = 'label-mono block text-[11px] text-muted-white';

export function TotpCodeField({
    id,
    value,
    onChange,
    disabled,
    invalid,
    autoFocus,
}: {
    id: string;
    value: string;
    onChange: (code: string) => void;
    disabled?: boolean;
    invalid?: boolean;
    autoFocus?: boolean;
}) {
    const t = useTranslations('twoStep');
    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={id} className={LABEL}>{t('codeLabel')}</label>
            <Input
                id={id}
                value={value}
                onChange={(e) => onChange(normalizeTotpCode(e.target.value))}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={TOTP_CODE_LENGTH + 2}
                disabled={disabled}
                autoFocus={autoFocus}
                aria-invalid={invalid ? true : undefined}
                aria-describedby={`${id}-hint`}
                data-testid="totp-code"
                className="h-[58px] max-w-[240px] rounded-[12px] px-4 text-center font-space-mono text-[26px] tracking-[0.4em] md:text-[26px]"
            />
            <p id={`${id}-hint`} className="text-[12px] leading-relaxed text-muted-white">{t('codeHint')}</p>
        </div>
    );
}

function useErrorCopy() {
    const t = useTranslations('twoStep.errors');
    return (key: TwoStepErrorKey | null) => (key ? t(key) : null);
}

/**
 * Asks the code of the account's authenticator. `onVerified` runs once the
 * session is aal2 (Supabase stores the upgraded session itself).
 */
export function TotpVerifyForm({
    onVerified,
    submitLabel,
    idPrefix = 'totp-verify',
    verify = verifyAccountCode,
}: {
    onVerified: () => void | Promise<void>;
    submitLabel?: string;
    idPrefix?: string;
    /** How to check the code (default: the app's own session). */
    verify?: (code: string) => Promise<{ error: unknown | null }>;
}) {
    const t = useTranslations('twoStep');
    const errorCopy = useErrorCopy();
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<TwoStepErrorKey | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (busy) return;
        if (!isCompleteTotpCode(code)) {
            setError('wrongCode');
            return;
        }
        setBusy(true);
        setError(null);
        const { error: verifyError } = await verify(code);
        if (verifyError) {
            setBusy(false);
            setCode('');
            setError(twoStepErrorKey(verifyError));
            return;
        }
        await onVerified();
        setBusy(false);
    }

    return (
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <TotpCodeField
                id={`${idPrefix}-code`}
                value={code}
                onChange={(v) => { setCode(v); setError(null); }}
                disabled={busy}
                invalid={error === 'wrongCode'}
                autoFocus
            />
            <FormAlert>{errorCopy(error)}</FormAlert>
            <Button
                type="submit"
                size="lg"
                disabled={busy || !isCompleteTotpCode(code)}
                data-testid="totp-verify-submit"
                className="h-[54px] w-full rounded-[14px] text-[17px] font-black [font-stretch:115%] sm:w-auto sm:self-start sm:px-8"
            >
                {busy ? (
                    <>
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                        {t('verifying')}
                    </>
                ) : (submitLabel ?? t('verifySubmit'))}
            </Button>
        </form>
    );
}

/**
 * Turns two-step verification on: shows the QR and the secret, then
 * confirms with a first code. `onEnrolled` runs once the factor is
 * verified and the session is aal2.
 */
export function TotpEnrollForm({
    onEnrolled,
    onCancel,
    idPrefix = 'totp-enrol',
}: {
    onEnrolled: () => void | Promise<void>;
    onCancel?: () => void;
    idPrefix?: string;
}) {
    const t = useTranslations('twoStep');
    const errorCopy = useErrorCopy();
    const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
    const [startError, setStartError] = useState<TwoStepErrorKey | null>(null);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<TwoStepErrorKey | null>(null);
    const [copied, setCopied] = useState(false);
    // One enrolment per mount (StrictMode runs effects twice in dev).
    const started = useRef(false);

    async function start() {
        setStartError(null);
        const { data, error: enrolError } = await startTotpEnrollment();
        if (enrolError || !data) {
            setStartError(twoStepErrorKey(enrolError));
            return;
        }
        setEnrollment(data);
    }

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        // Not cleared on unmount on purpose: StrictMode's simulated
        // remount would otherwise cancel the only start. A factor left
        // half done is dropped by the next enrolment.
        setTimeout(() => { void start(); }, 0);
    }, []);

    async function copySecret() {
        if (!enrollment) return;
        try {
            await navigator.clipboard.writeText(enrollment.secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* the secret stays visible to copy by hand */
        }
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (busy || !enrollment) return;
        if (!isCompleteTotpCode(code)) {
            setError('wrongCode');
            return;
        }
        setBusy(true);
        setError(null);
        const { error: verifyError } = await verifyTotp(enrollment.factorId, code);
        if (verifyError) {
            setBusy(false);
            setCode('');
            setError(twoStepErrorKey(verifyError));
            return;
        }
        await onEnrolled();
        setBusy(false);
    }

    if (startError) {
        return (
            <div className="flex flex-col gap-4" data-testid="totp-enrol-error">
                <FormAlert>{errorCopy(startError)}</FormAlert>
                <div className="flex flex-wrap gap-3">
                    {startError !== 'disabled' && (
                        <Button type="button" variant="secondary" onClick={() => void start()}>
                            {t('retry')}
                        </Button>
                    )}
                    {onCancel && (
                        <Button type="button" variant="ghost" onClick={onCancel}>{t('cancel')}</Button>
                    )}
                </div>
            </div>
        );
    }

    if (!enrollment) {
        return (
            <div className="flex items-center gap-3 py-6" role="status" aria-live="polite">
                <span className="live-dot size-3 text-blue" aria-hidden="true" />
                <span className="text-[15px] font-semibold text-body-white">{t('preparing')}</span>
            </div>
        );
    }

    return (
        <form onSubmit={submit} noValidate className="flex flex-col gap-6" data-testid="totp-enrol">
            <ol className="flex flex-col gap-5">
                <li className="flex flex-col gap-3">
                    <Step n={1}>{t('enrolStep1')}</Step>
                </li>
                <li className="@container flex flex-col gap-3">
                    <Step n={2}>{t('enrolStep2')}</Step>
                    {/* Side by side only when the card is wide (Configuración), stacked in the sign-in block. */}
                    <div className="flex flex-col gap-4 @lg:flex-row @lg:items-start">
                        {/* Supabase's own SVG data URL; next/image adds nothing here. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={enrollment.qrSrc}
                            alt={t('qrAlt')}
                            width={176}
                            height={176}
                            className="size-[176px] shrink-0 rounded-[12px] border-2 border-ink bg-white p-2"
                        />
                        <div className="flex min-w-0 flex-col gap-2">
                            <span className={LABEL}>{t('secretLabel')}</span>
                            <code
                                className="block break-all rounded-[10px] border-2 border-line-white bg-white px-3 py-2 font-space-mono text-[14px] font-bold leading-relaxed text-ink"
                                data-testid="totp-secret"
                            >
                                {groupSecret(enrollment.secret)}
                            </code>
                            <Button type="button" variant="secondary" size="sm" onClick={() => void copySecret()} className="self-start">
                                {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                                {copied ? t('copied') : t('copySecret')}
                            </Button>
                            <p className="text-[12px] leading-relaxed text-muted-white">{t('secretHint')}</p>
                        </div>
                    </div>
                </li>
                <li className="flex flex-col gap-3">
                    <Step n={3}>{t('enrolStep3')}</Step>
                    <TotpCodeField
                        id={`${idPrefix}-code`}
                        value={code}
                        onChange={(v) => { setCode(v); setError(null); }}
                        disabled={busy}
                        invalid={error === 'wrongCode'}
                    />
                </li>
            </ol>
            <FormAlert>{errorCopy(error)}</FormAlert>
            <div className="flex flex-wrap items-center gap-3">
                <Button
                    type="submit"
                    size="lg"
                    disabled={busy || !isCompleteTotpCode(code)}
                    data-testid="totp-enrol-submit"
                    className="h-[54px] rounded-[14px] px-8 text-[17px] font-black [font-stretch:115%]"
                >
                    {busy ? (
                        <>
                            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                            {t('verifying')}
                        </>
                    ) : t('enrolSubmit')}
                </Button>
                {onCancel && (
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>{t('cancel')}</Button>
                )}
            </div>
        </form>
    );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
    return (
        <p className="flex items-start gap-3 text-[15px] font-semibold leading-snug text-ink">
            <span
                aria-hidden="true"
                className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-blue font-space-mono text-[12px] font-bold text-white',
                )}
            >
                {n}
            </span>
            <span className="pt-0.5">{children}</span>
        </p>
    );
}
