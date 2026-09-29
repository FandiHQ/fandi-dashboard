'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UserSyncResponse } from '@/types/api';

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
    onSuccess?: (user: UserSyncResponse) => void;
    showLogo?: boolean;
}

export function LoginForm({ onSuccess, showLogo = false }: LoginFormProps) {
    const t = useTranslations('auth');
    const tCommon = useTranslations('common');
    const { login } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    async function onSubmit(data: LoginFormData) {
        try {
            const me = await login(data.email, data.password);
            onSuccess?.(me);
        } catch (err: unknown) {
            // Security: show same message for wrong password AND fan accounts
            if (err instanceof Error && err.message === 'NO_DASHBOARD_ACCESS') {
                toast.error(t('invalidCredentials'));
            } else if (
                err instanceof Error &&
                (err.message?.toLowerCase().includes('network') ||
                    err.message?.toLowerCase().includes('fetch'))
            ) {
                toast.error(tCommon('error'));
            } else {
                toast.error(t('invalidCredentials'));
            }
        }
    }

    // Surface-agnostic: labels/errors use the re-scoped shadcn vars, so the
    // form reads correctly on the white login block and on ink modals.
    const labelClass = 'label-mono block text-[11px] text-muted-foreground';
    const fieldClass = 'h-[54px] rounded-[12px] px-4 text-base md:text-base focus-visible:border-blue';

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
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

            <div className="flex flex-col gap-2">
                <label htmlFor="login-email" className={labelClass}>
                    {t('email')}
                </label>
                <Input
                    id="login-email"
                    type="email"
                    data-testid="email"
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                    aria-invalid={form.formState.errors.email ? true : undefined}
                    className={fieldClass}
                    {...form.register('email')}
                />
                {form.formState.errors.email && (
                    <p className="text-sm font-bold text-destructive">
                        {t('invalidEmail')}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor="login-password" className={labelClass}>
                    {t('password')}
                </label>
                <div className="relative">
                    <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        data-testid="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        aria-invalid={form.formState.errors.password ? true : undefined}
                        className={`${fieldClass} pr-12`}
                        {...form.register('password')}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[10px] text-muted-white transition-colors hover:text-ink"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                {form.formState.errors.password && (
                    <p className="text-sm font-bold text-destructive">
                        {t('passwordRequired')}
                    </p>
                )}
            </div>

            <Button
                type="submit"
                size="lg"
                disabled={form.formState.isSubmitting}
                data-testid="login-button"
                className="mt-1.5 h-[58px] w-full rounded-[14px] text-[18px] font-black [font-stretch:115%] shadow-ext-block"
            >
                {form.formState.isSubmitting ? t('signingIn') : t('enterPanel')}
            </Button>

            <div className="my-1 h-0.5 bg-border" aria-hidden="true" />

            <p className="text-sm leading-relaxed text-muted-foreground">
                {t('noAccount')}
            </p>
        </form>
    );
}
