// fandi-dashboard\src\app\login\page.tsx
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from '@/components/auth/login-form';
import { toast } from 'sonner';
import type { AuthMeResponse } from '@/types/api';

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
    const { isAuthenticated, isLoading, myRole } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations('auth');

    const expired = searchParams.get('expired') === 'true';
    const next = searchParams.get('next');

    useEffect(() => {
        if (expired) {
            toast.error(t('sessionExpired'));
        }
    }, [expired, t]);

    // Already authenticated → redirect by role
    if (!isLoading && isAuthenticated) {
        const destination = myRole === 'staff'
            ? '/staff'
            : (next || '/dashboard');
        router.replace(destination);
        return null;
    }

    if (isLoading) {
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
                    onSuccess={(me: AuthMeResponse) => {
                        const destination = me.organization.myRole === 'staff'
                            ? '/staff'
                            : (next || '/dashboard');
                        router.push(destination);
                    }}
                />
            </div>
        </div>
    );
}
