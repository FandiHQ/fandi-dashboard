'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function StaffLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading, isAuthenticated, memberRole } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/login');
        } else if (!isLoading && isAuthenticated && memberRole !== 'staff') {
            router.replace('/dashboard');
        }
    }, [isLoading, isAuthenticated, memberRole, router]);

    if (isLoading || !isAuthenticated || memberRole !== 'staff') {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <div className="w-8 h-8 border-2 border-[#2D00F7] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="flex h-14 items-center border-b border-border px-4">
                <span className="text-lg font-bold">Fandi Staff</span>
            </header>
            <main className="flex-1 p-4">{children}</main>
        </div>
    );
}
