'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import Image from 'next/image';
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
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white font-sora text-base
                            px-4 py-3 outline-none focus:border-[#2D00F7] focus:shadow-[0_0_10px_rgba(45,0,247,0.2)] transition-all"
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
                    <input
                        id="login-password"
                        type="password"
                        data-testid="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white font-sora text-base
                            px-4 py-3 outline-none focus:border-[#2D00F7] focus:shadow-[0_0_10px_rgba(45,0,247,0.2)] transition-all"
                        {...form.register('password')}
                    />
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
                    className="w-full font-space-mono text-[13px] uppercase tracking-[2px]
                        bg-[#2D00F7] text-white py-4
                        hover:shadow-[0_0_25px_rgba(45,0,247,0.5)]
                        active:scale-95 transition-all cursor-pointer
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
