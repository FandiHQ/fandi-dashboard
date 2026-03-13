'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';

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
                <div className="w-8 h-8 border-2 border-[#2D00F7] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            <aside className="hidden w-64 border-r border-border bg-card lg:block">
                <div className="flex h-16 items-center px-6">
                    <span className="text-lg font-bold">Fandi</span>
                </div>
            </aside>
            <div className="flex flex-1 flex-col">
                <header className="flex h-16 items-center border-b border-border px-6">
                    <span className="text-sm text-muted-foreground">Dashboard</span>
                </header>
                <main className="flex-1 p-6">{children}</main>
            </div>
        </div>
    );
}
