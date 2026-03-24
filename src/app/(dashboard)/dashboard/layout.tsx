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
            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
    }, [isLoading, isAuthenticated, pathname, router]);

    if (isLoading || !isAuthenticated) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <div className="h-8 w-8 animate-spin border-2 border-[#2D00F7] border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-black scanlines">
            {/* Desktop sidebar — hidden on mobile, fixed position */}
            <div className="hidden lg:flex lg:w-20 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50">
                <Sidebar />
            </div>

            {/* Main area — offset by sidebar width on desktop */}
            <div className="flex flex-1 flex-col lg:pl-20">
                <DashboardHeader />

                {/* Content area — FANDI_DESIGN_WEB spacing */}
                <main className="flex-1 px-5 py-8 lg:px-14 lg:py-12">
                    {children}
                </main>
            </div>
        </div>
    );
}
