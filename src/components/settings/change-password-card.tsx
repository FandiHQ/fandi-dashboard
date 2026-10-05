'use client';

/**
 * Settings → change password.
 *
 * 1. The current password is checked by signing in again with it. Besides
 *    proving it's the owner of the session (not someone at an unlocked
 *    laptop), the fresh session satisfies Supabase's "secure password
 *    change" rule (sessions older than 24 h would otherwise need an
 *    emailed nonce). A wrong password leaves the current session intact.
 * 2. updateUser({ password }) on that fresh session.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormAlert, NewPasswordFields, PasswordInput } from '@/components/auth/password-fields';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import {
    PASSWORD_MIN_LENGTH, currentPasswordErrorKey, passwordUpdateErrorKey, validatePasswordChange,
} from '@/lib/auth-flow';

const FIELD_LABEL = 'label-mono block text-[11px] text-muted-white';
const FIELD_INPUT = 'h-12 rounded-[10px] px-3 text-base md:text-sm';

export function ChangePasswordCard() {
    const t = useTranslations('settings.security');
    const tAuth = useTranslations('auth');
    const { user } = useAuth();
    const [current, setCurrent] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving, setSaving] = useState(false);
    const [triedSubmit, setTriedSubmit] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentInvalid, setCurrentInvalid] = useState(false);

    function fail(message: string, onCurrent = false) {
        setError(message);
        setCurrentInvalid(onCurrent);
        setSaving(false);
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (saving) return;
        const problem = validatePasswordChange(current, password, confirm);
        // Mark the new-password inputs only when they are the problem.
        setTriedSubmit(problem === 'tooShort' || problem === 'mismatch');
        if (problem === 'currentRequired') return fail(t('currentRequired'), true);
        if (problem === 'sameAsCurrent') return fail(t('sameAsCurrent'));
        if (problem) return fail(tAuth(`newPassword.${problem}`, { min: PASSWORD_MIN_LENGTH }));

        setError(null);
        setCurrentInvalid(false);
        setSaving(true);

        const { data: { session } } = await supabase.auth.getSession();
        const email = session?.user.email ?? user?.email;
        if (!email) return fail(tAuth('sessionExpired'));

        // 1. Prove the current password (and get a fresh session).
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: current });
        if (signInError) {
            const key = currentPasswordErrorKey(signInError);
            return fail(key === 'currentWrong' ? t('currentWrong') : tAuth(key), key === 'currentWrong');
        }

        // 2. Save the new one.
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
            const key = passwordUpdateErrorKey(updateError);
            if (key === 'linkExpired') return fail(tAuth('sessionExpired'));
            if (key === 'tooManyAttempts' || key === 'networkError') return fail(tAuth(key));
            return fail(tAuth(`passwordErrors.${key}`));
        }

        setSaving(false);
        setCurrent('');
        setPassword('');
        setConfirm('');
        setTriedSubmit(false);
        toast.success(t('success'), { description: t('otherDevices') });
    }

    return (
        <section className="block-white flex flex-col overflow-hidden" aria-labelledby="settings-password-title">
            <div className="flex items-center gap-2.5 border-b-2 border-ink px-6 py-4">
                <KeyRound size={16} className="text-ink" aria-hidden="true" />
                <h2 id="settings-password-title" className="font-display text-[17px]">{t('title')}</h2>
            </div>

            <form onSubmit={onSubmit} noValidate className="flex flex-col">
                <div className="flex max-w-[520px] flex-col gap-5 px-6 py-6">
                    <p className="text-sm leading-relaxed text-body-white">{t('subtitle')}</p>

                    {/* Lets password managers update the saved entry for this account. */}
                    {user?.email && (
                        <input type="email" name="username" autoComplete="username" value={user.email} readOnly hidden />
                    )}

                    <div className="flex flex-col gap-2">
                        <label htmlFor="settings-password-current" className={FIELD_LABEL}>
                            {t('current')}
                        </label>
                        <PasswordInput
                            id="settings-password-current"
                            value={current}
                            onChange={(e) => { setCurrent(e.target.value); setError(null); setCurrentInvalid(false); }}
                            autoComplete="current-password"
                            disabled={saving}
                            aria-invalid={currentInvalid ? true : undefined}
                            className={FIELD_INPUT}
                        />
                        <p className="text-[12px] leading-relaxed text-muted-white">{t('forgotHint')}</p>
                    </div>

                    <NewPasswordFields
                        idPrefix="settings-password"
                        password={password}
                        confirm={confirm}
                        onPasswordChange={(v) => { setPassword(v); setError(null); }}
                        onConfirmChange={(v) => { setConfirm(v); setError(null); }}
                        disabled={saving}
                        invalid={triedSubmit}
                        labelClassName={FIELD_LABEL}
                        inputClassName={FIELD_INPUT}
                    />

                    <FormAlert>{error}</FormAlert>
                </div>

                <div className="mt-auto flex justify-end border-t-2 border-line-white px-6 py-4">
                    <Button type="submit" variant="secondary" size="lg" disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                                {t('saving')}
                            </>
                        ) : t('submit')}
                    </Button>
                </div>
            </form>
        </section>
    );
}
