'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from '@/components/auth/login-form';
import { toast } from 'sonner';
import type { UserSyncResponse } from '@/types/api';

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-black">
                <div className="w-8 h-8 border-2 border-[#2D00F7] border-t-transparent rounded-full animate-spin" />
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
            <div className="flex h-screen items-center justify-center bg-black">
                <div className="w-8 h-8 border-2 border-[#2D00F7] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-black">
            <div className="w-full max-w-sm px-4">
                <LoginForm
                    showLogo={true}
                    onSuccess={(me: UserSyncResponse) => {
                        const destination = me.organization?.memberRole === 'staff'
                            ? '/staff'
                            : (next || '/dashboard');
                        router.push(destination);
                    }}
                />
            </div>
        </div>
    );
}
