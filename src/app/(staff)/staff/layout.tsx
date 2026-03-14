'use client';

import { useEffect } from 'react';
import Image from 'next/image';
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
                <div className="h-8 w-8 animate-spin border-2 border-[#2D00F7] border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-black">
            <header className="flex h-14 items-center border-b border-[#1A1A1A] px-4">
                <div className="flex items-center gap-3">
                    <Image
                        src="/fandi-logo.png"
                        alt="Fandi"
                        width={80}
                        height={28}
                        unoptimized
                        className="h-6 w-auto object-contain"
                    />
                    <span className="bg-[#22C55E20] px-2 py-0.5 font-space-mono text-[10px] uppercase tracking-[1px] text-[#22C55E]">
                        Staff
                    </span>
                </div>
            </header>
            <main className="flex-1 p-4">{children}</main>
        </div>
    );
}
