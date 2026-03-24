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

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {showLogo && (
                <div className="flex justify-center mb-8">
                    <Image
                        src="/fandi-logo.png"
                        alt="Fandi"
                        width={160}
                        height={52}
                        className="h-12 w-auto"
                    />
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label htmlFor="login-email" className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] block mb-2">
                        {t('email')}
                    </label>
                    <input
                        id="login-email"
                        type="email"
                        data-testid="email"
                        placeholder="tucorreo@ejemplo.com"
                        autoComplete="email"
                        className="w-full rounded-none bg-[rgba(18,18,18,0.4)] border border-[rgba(255,255,255,0.05)] text-white font-sora text-base
                            px-4 py-3 outline-none focus:border-[var(--color-tactical-acid)] focus:bg-[rgba(204,255,0,0.05)] focus:shadow-[0_0_15px_rgba(204,255,0,0.2)] transition-all"
                        {...form.register('email')}
                    />
                    {form.formState.errors.email && (
                        <p className="text-sm text-red-400 mt-1">
                            {t('invalidEmail')}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="login-password" className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] block mb-2">
                        {t('password')}
                    </label>
                    <div className="relative">
                        <input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            data-testid="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="w-full rounded-none bg-[rgba(18,18,18,0.4)] border border-[rgba(255,255,255,0.05)] text-white font-sora text-base
                                px-4 py-3 pr-12 outline-none focus:border-[var(--color-tactical-acid)] focus:bg-[rgba(204,255,0,0.05)] focus:shadow-[0_0_15px_rgba(204,255,0,0.2)] transition-all"
                            {...form.register('password')}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[var(--color-tactical-acid)] transition-colors cursor-pointer"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {form.formState.errors.password && (
                        <p className="text-sm text-red-400 mt-1">
                            {t('passwordRequired')}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    data-testid="login-button"
                    className="btn-tactical w-full font-space-mono text-[13px] font-bold uppercase tracking-[2px]
                        py-4 transition-all cursor-pointer
                        disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {form.formState.isSubmitting ? t('signingIn') : t('login')}
                </button>
            </div>

            <p className="font-space-mono text-[13px] text-[#6B6B6B] text-center mt-6">
                {t('noAccount')}
            </p>
        </form>
    );
}
