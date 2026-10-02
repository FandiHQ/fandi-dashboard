'use client';

/**
 * Password inputs shared by login, reset password, invite accept and
 * Settings → change password. White-surface components (login block,
 * invite shell, settings block, sign-in modal).
 */
import { useState, type ComponentProps, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PASSWORD_MIN_LENGTH, newPasswordChecks } from '@/lib/auth-flow';
import { cn } from '@/lib/utils';

export const AUTH_LABEL_CLASS = 'label-mono block text-[11px] text-muted-foreground';
export const AUTH_FIELD_CLASS = 'h-[54px] rounded-[12px] px-4 text-base md:text-base focus-visible:border-blue';

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type'>;

/** A password input with its own show/hide button (keyboard reachable, labelled). */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
    const t = useTranslations('auth');
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative">
            <Input
                {...props}
                type={visible ? 'text' : 'password'}
                className={cn(AUTH_FIELD_CLASS, 'pr-12', className)}
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? t('hidePassword') : t('showPassword')}
                aria-pressed={visible}
                aria-controls={props.id}
                className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[10px] text-muted-white transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-blue"
            >
                {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
        </div>
    );
}

/** Inline form error: words + a dot, never colour alone. */
export function FormAlert({ children, id }: { children: ReactNode; id?: string }) {
    if (!children) return null;
    return (
        <p id={id} role="alert" className="flex items-start gap-2 text-sm font-bold leading-snug text-alert-white">
            <span className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-alert-white" aria-hidden="true" />
            <span>{children}</span>
        </p>
    );
}

interface NewPasswordFieldsProps {
    idPrefix: string;
    password: string;
    confirm: string;
    onPasswordChange: (value: string) => void;
    onConfirmChange: (value: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    /** Marks both inputs invalid (after a failed submit). */
    invalid?: boolean;
    labelClassName?: string;
    inputClassName?: string;
}

/**
 * New password + confirmation with a live checklist of the rules, so people
 * see what is missing before they press the button.
 */
export function NewPasswordFields({
    idPrefix,
    password,
    confirm,
    onPasswordChange,
    onConfirmChange,
    disabled,
    autoFocus,
    invalid,
    labelClassName = AUTH_LABEL_CLASS,
    inputClassName,
}: NewPasswordFieldsProps) {
    const t = useTranslations('auth.newPassword');
    const checks = newPasswordChecks(password, confirm);
    const rulesId = `${idPrefix}-rules`;

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <label htmlFor={`${idPrefix}-new`} className={labelClassName}>
                    {t('label')}
                </label>
                <PasswordInput
                    id={`${idPrefix}-new`}
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    placeholder={t('placeholder', { min: PASSWORD_MIN_LENGTH })}
                    autoComplete="new-password"
                    autoFocus={autoFocus}
                    disabled={disabled}
                    aria-describedby={rulesId}
                    aria-invalid={invalid && !checks.length ? true : undefined}
                    className={inputClassName}
                />
            </div>
            <div className="flex flex-col gap-2">
                <label htmlFor={`${idPrefix}-confirm`} className={labelClassName}>
                    {t('confirmLabel')}
                </label>
                <PasswordInput
                    id={`${idPrefix}-confirm`}
                    value={confirm}
                    onChange={(e) => onConfirmChange(e.target.value)}
                    placeholder={t('confirmPlaceholder')}
                    autoComplete="new-password"
                    disabled={disabled}
                    aria-describedby={rulesId}
                    aria-invalid={invalid && !checks.match ? true : undefined}
                    className={inputClassName}
                />
            </div>
            <ul id={rulesId} aria-label={t('rulesLabel')} className="flex flex-col gap-1.5">
                <Rule ok={checks.length} doneLabel={t('ruleDone')}>{t('ruleLength', { min: PASSWORD_MIN_LENGTH })}</Rule>
                <Rule ok={checks.match} doneLabel={t('ruleDone')}>{t('ruleMatch')}</Rule>
            </ul>
        </div>
    );
}

function Rule({ ok, doneLabel, children }: { ok: boolean; doneLabel: string; children: ReactNode }) {
    return (
        <li className={cn('flex items-center gap-2 text-[13px] font-semibold', ok ? 'text-ink' : 'text-muted-white')}>
            <span
                aria-hidden="true"
                className={cn(
                    'flex size-[18px] shrink-0 items-center justify-center rounded-full border-2',
                    ok ? 'border-ink bg-lime text-ink' : 'border-muted-white bg-white',
                )}
            >
                {ok && <Check size={11} strokeWidth={3.5} />}
            </span>
            <span>{children}</span>
            {ok && <span className="sr-only">({doneLabel})</span>}
        </li>
    );
}
