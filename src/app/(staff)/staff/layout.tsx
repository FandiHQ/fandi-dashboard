// fandi-dashboard\src\app\(staff)\staff\layout.tsx
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function StaffLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading, isAuthenticated, myRole } = useAuth();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <div className="w-8 h-8 border-2 border-[#2D00F7] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        router.replace('/login');
        return null;
    }

    if (myRole !== 'staff') {
        router.replace('/dashboard');
        return null;
    }

    return (
        <div className="flex min-h-screen flex-col">
            {/* Minimal mobile-optimized header */}
            <header className="flex h-14 items-center border-b border-border px-4">
                <span className="text-lg font-bold">Fandi Staff</span>
            </header>

            <main className="flex-1 p-4">{children}</main>
        </div>
    );
}
