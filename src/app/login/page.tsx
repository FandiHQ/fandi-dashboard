'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from '@/components/auth/login-form';
import { toast } from 'sonner';
import type { UserSyncResponse } from '@/types/api';

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-blue text-lime">
                <span className="live-dot size-3" aria-hidden="true" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}

function LoginContent() {
    const { isAuthenticated, isLoading, memberRole } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations('auth');

    const expired = searchParams.get('expired') === 'true';
    const next = searchParams.get('next');

    // Show expired toast
    useEffect(() => {
        if (expired) {
            toast.error(t('sessionExpired'));
        }
    }, [expired, t]);

    // Already authenticated → redirect by role (in useEffect to avoid setState during render)
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            const destination = memberRole === 'staff'
                ? '/staff'
                : (next || '/dashboard');
            router.replace(destination);
        }
    }, [isLoading, isAuthenticated, memberRole, next, router]);

    if (isLoading || isAuthenticated) {
        return (
            <div className="flex h-screen items-center justify-center bg-blue text-lime">
                <span className="live-dot size-3" aria-hidden="true" />
            </div>
        );
    }

    // Design "01 Login": blue canvas, hero left, white block right.
    return (
        <div className="grid min-h-screen bg-blue text-white lg:grid-cols-[minmax(0,1fr)_560px]">
            <div className="flex flex-col justify-between gap-10 px-6 pb-4 pt-10 sm:px-12 lg:px-[72px] lg:py-16">
                <Image
                    src="/fandi-tile.png"
                    alt="Fandi"
                    width={92}
                    height={92}
                    unoptimized
                    priority
                    className="size-16 -rotate-[4deg] rounded-[18px] border-[3px] border-ink shadow-ext-lg lg:size-[92px] lg:rounded-[22px]"
                />
                <div>
                    <h1 className="font-display text-[52px] leading-[0.86] tracking-[-0.02em] [font-stretch:118%] sm:text-[80px] xl:text-[112px]">
                        {t('loginHero.line1')}
                        <br />
                        {t('loginHero.line2')}
                        <br />
                        <span className="text-lime">{t('loginHero.line3')}</span>
                    </h1>
                    <p className="mt-6 max-w-[560px] text-[17px] leading-[1.45] text-lilac lg:mt-7 lg:text-[19px]">
                        {t('loginHero.body')}
                    </p>
                </div>
                <p className="label-mono hidden text-[11px] text-lilac lg:block">
                    {t('loginHero.footer')}
                </p>
            </div>

            <div className="flex items-center justify-center px-4 pb-12 pt-4 sm:px-12 lg:p-12">
                <div className="surface-white flex w-full max-w-[464px] flex-col gap-5 rounded-[20px] border-2 border-ink bg-white p-7 text-ink shadow-[10px_10px_0_var(--color-ink)] sm:p-10 lg:max-w-none">
                    <h2 className="font-display text-[34px] leading-none">
                        {t('loginTitle')}
                    </h2>
                    <LoginForm
                        showLogo={false}
                        onSuccess={(me: UserSyncResponse) => {
                            const destination = me.organization?.memberRole === 'staff'
                                ? '/staff'
                                : (next || '/dashboard');
                            router.push(destination);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
