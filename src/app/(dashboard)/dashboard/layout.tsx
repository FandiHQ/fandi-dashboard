// fandi-dashboard\src\app\(dashboard)\dashboard
'use client';

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

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <div className="w-8 h-8 border-2 border-[#2D00F7] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return null;
    }

    // Sidebar + header added in Step 4.6
    return (
        <div className="flex min-h-screen">
            {/* Sidebar — will be added in Step 4.6 */}
            <aside className="hidden w-64 border-r border-border bg-card lg:block">
                <div className="flex h-16 items-center px-6">
                    <span className="text-lg font-bold">Fandi</span>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex flex-1 flex-col">
                {/* Header — will be added in Step 4.6 */}
                <header className="flex h-16 items-center border-b border-border px-6">
                    <span className="text-sm text-muted-foreground">Dashboard</span>
                </header>

                <main className="flex-1 p-6">{children}</main>
            </div>
        </div>
    );
}
