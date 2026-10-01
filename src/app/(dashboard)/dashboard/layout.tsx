'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { DashboardHeader } from '@/components/layout/dashboard-header';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Keep the query too (e.g. a collaboration invitation token).
            router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
        }
    }, [isLoading, isAuthenticated, pathname, router]);

    if (isLoading || !isAuthenticated) {
        return (
            <div className="flex h-screen items-center justify-center" aria-busy="true">
                <span className="live-dot size-3 text-lime" aria-hidden="true" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-blue">
            {/* Desktop rail (84px ink) — fixed; collapses into the header sheet below lg */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[84px] lg:flex-col">
                <Sidebar />
            </div>

            {/* Main area — offset by the rail on desktop */}
            <div className="flex min-w-0 flex-1 flex-col lg:pl-[84px]">
                <DashboardHeader />

                {/* Content — Azul Bloque web padding (36px) */}
                <main className="flex-1 px-5 py-7 lg:px-9">
                    {children}
                </main>
            </div>
        </div>
    );
}
