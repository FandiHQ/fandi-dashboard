'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    AUTH_FIELD_CLASS, AUTH_LABEL_CLASS, FormAlert, PasswordInput,
} from '@/components/auth/password-fields';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { loginErrorKey, type LoginErrorKey } from '@/lib/auth-flow';
import type { UserSyncResponse } from '@/types/api';

const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
});
type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
    onSuccess?: (user: UserSyncResponse) => void;
    showLogo?: boolean;
    /** Render the "Iniciar sesión" heading (the login page); the modal has none. */
    heading?: boolean;
}

export function LoginForm({ onSuccess, showLogo = false, heading = false }: LoginFormProps) {
    const t = useTranslations('auth');
    const { login } = useAuth();
    const [mode, setMode] = useState<'login' | 'forgot'>('login');
    const [errorKey, setErrorKey] = useState<LoginErrorKey | null>(null);
    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    async function onSubmit(data: LoginFormData) {
        setErrorKey(null);
        try {
            const me = await login(data.email, data.password);
            onSuccess?.(me);
        } catch (err: unknown) {
            // Neutral "Credenciales inválidas" for every real auth failure;
            // the specific "no panel" reasons only after a correct password.
            setErrorKey(loginErrorKey(err));
        }
    }

    if (mode === 'forgot') {
        return (
            <ForgotPasswordForm
                initialEmail={form.getValues('email')}
                onBack={() => setMode('login')}
            />
        );
    }

    const { errors, isSubmitting } = form.formState;
    const clearServerError = () => { if (errorKey) setErrorKey(null); };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {showLogo && (
                <div className="mb-3 flex justify-center">
                    <Image
                        src="/fandi-logo.png"
                        alt="Fandi"
                        width={160}
                        height={52}
                        className="h-12 w-auto"
                    />
                </div>
            )}

            {heading && (
                <h2 className="font-display text-[34px] leading-none">
                    {t('loginTitle')}
                </h2>
            )}

            <div className="flex flex-col gap-2">
                <label htmlFor="login-email" className={AUTH_LABEL_CLASS}>
                    {t('email')}
                </label>
                <Input
                    id="login-email"
                    type="email"
                    inputMode="email"
                    data-testid="email"
                    placeholder={t('emailPlaceholder')}
                    autoComplete="email"
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? 'login-email-error' : undefined}
                    className={AUTH_FIELD_CLASS}
                    {...form.register('email', { onChange: clearServerError })}
                />
                {errors.email && (
                    <p id="login-email-error" className="text-sm font-bold text-destructive">
                        {t('invalidEmail')}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor="login-password" className={AUTH_LABEL_CLASS}>
                    {t('password')}
                </label>
                <PasswordInput
                    id="login-password"
                    data-testid="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                    {...form.register('password', { onChange: clearServerError })}
                />
                {errors.password && (
                    <p id="login-password-error" className="text-sm font-bold text-destructive">
                        {t('passwordRequired')}
                    </p>
                )}
                <button
                    type="button"
                    onClick={() => { setErrorKey(null); setMode('forgot'); }}
                    data-testid="forgot-password"
                    className="mt-0.5 cursor-pointer self-end text-[13px] font-bold text-blue underline decoration-2 underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                >
                    {t('forgotPassword')}
                </button>
            </div>

            <FormAlert>{errorKey ? t(errorKey) : null}</FormAlert>

            <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                data-testid="login-button"
                className="mt-1.5 h-[58px] w-full rounded-[14px] text-[18px] font-black [font-stretch:115%] shadow-ext-block"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                        {t('signingIn')}
                    </>
                ) : t('enterPanel')}
            </Button>

            <div className="my-1 h-0.5 bg-border" aria-hidden="true" />

            <p className="text-sm leading-relaxed text-muted-foreground">
                {t('noAccount')}
            </p>
        </form>
    );
}
