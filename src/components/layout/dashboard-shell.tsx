'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { SessionUnreachable } from '@/components/auth/session-unreachable';
import { Skeleton } from '@/components/ui/skeleton';
import { RouteSkeleton } from '@/components/layout/dashboard-skeletons';
import { TwoStepBanner } from '@/components/security/two-step-banner';
import { ADMIN_HOME_PATH } from '@/lib/auth-flow';
import { verificationUrl } from '@/lib/two-step';

/**
 * The dashboard frame (rail, header, content) behind the session gate.
 * Client side; app/(dashboard)/dashboard/layout.tsx wraps it so the route
 * can still declare its tab title.
 */
export function DashboardShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading, isAuthenticated, isUnreachable, retrySession, organization, twoStep } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    // A Fandi admin without an idol org has the /admin area only.
    const adminOnly = isAuthenticated && !organization;
    // The 6-digit code (an authenticator exists), or turning it on (an
    // owner/admin past the reminder period), comes before any page.
    const mustVerify = isAuthenticated && (twoStep.kind === 'verify' || twoStep.kind === 'enrol');

    useEffect(() => {
        if (!isLoading && !isAuthenticated && !isUnreachable) {
            // Keep the query too (e.g. a collaboration invitation token).
            router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
        } else if (adminOnly) {
            router.replace(ADMIN_HOME_PATH);
        } else if (mustVerify) {
            router.replace(verificationUrl(pathname + window.location.search));
        }
    }, [isLoading, isAuthenticated, isUnreachable, adminOnly, mustVerify, pathname, router]);

    if (!isLoading && isUnreachable) {
        return <SessionUnreachable onRetry={retrySession} />;
    }

    if (isLoading || !isAuthenticated || adminOnly || mustVerify) {
        return <ShellSkeleton pathname={pathname} />;
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
                    {twoStep.kind === 'remind' && <TwoStepBanner deadline={twoStep.deadline} />}
                    {children}
                </main>
            </div>
        </div>
    );
}

/**
 * While the session is checked: the same frame (rail, header) with a
 * skeleton of the page being opened, instead of a blank blue screen.
 */
function ShellSkeleton({ pathname }: { pathname: string }) {
    const tCommon = useTranslations('common');
    return (
        <div className="flex min-h-screen bg-blue" aria-busy="true">
            <span role="status" className="sr-only">{tCommon('loading')}</span>

            <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[84px] lg:flex-col" aria-hidden="true">
                <div className="flex h-full w-[84px] flex-col items-center justify-between bg-ink py-5">
                    <div className="flex flex-col items-center gap-2.5">
                        <Skeleton className="mb-4 size-[46px] bg-chip-ink" />
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="size-[50px] bg-chip-ink" />
                        ))}
                    </div>
                    <Skeleton className="size-[46px] bg-chip-ink" />
                </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col lg:pl-[84px]" aria-hidden="true">
                <div className="flex h-[74px] items-center justify-between gap-4 border-b-2 border-ink px-5 lg:px-9">
                    <div className="flex items-center gap-3">
                        <Skeleton className="size-11 rounded-[10px] bg-white/15 lg:hidden" />
                        <Skeleton className="h-[38px] w-40 rounded-[10px] bg-white/15" />
                    </div>
                    <div className="hidden items-center gap-3 lg:flex">
                        <div className="flex flex-col items-end gap-1.5">
                            <Skeleton className="h-3.5 w-28 rounded-full bg-white/15" />
                            <Skeleton className="h-2.5 w-14 rounded-full bg-white/15" />
                        </div>
                        <Skeleton className="size-10 rounded-full bg-white/15" />
                    </div>
                </div>

                <div className="flex-1 px-5 py-7 lg:px-9">
                    <RouteSkeleton pathname={pathname} />
                </div>
            </div>
        </div>
    );
}
