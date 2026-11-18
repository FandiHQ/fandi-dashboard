'use client';

/**
 * The Fandi Admin frame (Azul Bloque web layout, DESIGN_GUIDELINES §7):
 * the 84px ink rail with its own icon nav (Ídolos, Retiros, Recargas,
 * Fans, Clasificación, Auditoría; Seguridad and logout at the bottom), a
 * top bar with "FANDI ADMIN" and the signed-in person, the blue canvas.
 *
 * Gate, in order: a session (else /login), the persisted admin role from
 * /users/sync (else /dashboard), then two-step verification: any /admin
 * page at aal1 goes to /verificacion first (the API answers 403
 * MFA_REQUIRED anyway; this saves the round trip).
 */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LayoutDashboard, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { SessionUnreachable } from '@/components/auth/session-unreachable';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { verificationUrl } from '@/lib/two-step';
import { LogoutDialog } from './logout-dialog';
import {
    ADMIN_HOME, adminNavItems, adminSecurityItem, isAdminNavActive, type AdminNavItem,
} from './admin-nav-config';

function initials(name: string | null | undefined): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'F';
    return (parts[0]!.charAt(0) + (parts[1]?.charAt(0) ?? '')).toUpperCase();
}

export function AdminShell({ children }: { children: React.ReactNode }) {
    const { isLoading, isAuthenticated, isUnreachable, retrySession, isPlatformAdmin, twoStep } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const mustVerify = isAuthenticated && isPlatformAdmin && (twoStep.kind === 'verify' || twoStep.kind === 'enrol');

    useEffect(() => {
        if (isLoading || isUnreachable) return;
        if (!isAuthenticated) {
            router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
        } else if (!isPlatformAdmin) {
            router.replace('/dashboard');
        } else if (mustVerify) {
            router.replace(verificationUrl(pathname + window.location.search));
        } else if (pathname === '/admin') {
            router.replace(ADMIN_HOME);
        }
    }, [isLoading, isUnreachable, isAuthenticated, isPlatformAdmin, mustVerify, pathname, router]);

    if (!isLoading && isUnreachable) {
        return <SessionUnreachable onRetry={retrySession} />;
    }
    if (isLoading || !isAuthenticated || !isPlatformAdmin || mustVerify) {
        return <AdminSkeleton />;
    }

    return (
        <div className="flex min-h-screen bg-blue" data-testid="admin-shell">
            <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[84px] lg:flex-col">
                <AdminRail />
            </div>
            <div className="flex min-w-0 flex-1 flex-col lg:pl-[84px]">
                <AdminHeader />
                <main className="flex-1 px-4 py-7 sm:px-5 lg:px-9">{children}</main>
            </div>
        </div>
    );
}

function AdminRail() {
    const t = useTranslations('adminNav');
    const tAuth = useTranslations('auth');
    const pathname = usePathname();
    return (
        <aside className="flex h-full w-[84px] flex-col items-center justify-between bg-ink py-5">
            <div className="flex flex-col items-center gap-2.5">
                <Link href={ADMIN_HOME} className="mb-4 rounded-[12px] focus-visible:ring-2 focus-visible:ring-lime" aria-label={t('label')}>
                    <Image
                        src="/fandi-tile.png"
                        alt="Fandi"
                        width={46}
                        height={46}
                        unoptimized
                        loading="eager"
                        className="size-[46px] rounded-[12px]"
                    />
                </Link>
                <nav className="flex flex-col items-center gap-2.5" aria-label={t('navAria')}>
                    {adminNavItems.map((item) => (
                        <RailLink key={item.href} item={item} active={isAdminNavActive(item, pathname)} label={t(item.labelKey)} />
                    ))}
                </nav>
            </div>
            <div className="flex flex-col items-center gap-2.5">
                <RailLink
                    item={adminSecurityItem}
                    active={isAdminNavActive(adminSecurityItem, pathname)}
                    label={t(adminSecurityItem.labelKey)}
                />
                <LogoutDialog>
                    <button
                        className="flex size-[50px] cursor-pointer items-center justify-center rounded-[12px] text-nav-inactive transition-colors duration-100 hover:bg-chip-ink hover:text-alert focus-visible:ring-2 focus-visible:ring-lime"
                        aria-label={tAuth('logout')}
                        data-testid="admin-nav-logout"
                    >
                        <LogOut size={20} />
                    </button>
                </LogoutDialog>
            </div>
        </aside>
    );
}

function RailLink({ item, active, label }: { item: AdminNavItem; active: boolean; label: string }) {
    const Icon = item.icon;
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    href={item.href}
                    data-testid={`admin-nav-${item.labelKey}`}
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                    className={`flex size-[50px] items-center justify-center rounded-[12px] transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-lime ${
                        active ? 'bg-lime text-ink' : 'text-nav-inactive hover:bg-chip-ink hover:text-white'
                    }`}
                >
                    <Icon size={22} strokeWidth={2.2} />
                </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
    );
}

function AdminHeader() {
    const { user, organization } = useAuth();
    const t = useTranslations('adminNav');
    const tAuth = useTranslations('auth');
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const sheetItems = [...adminNavItems, adminSecurityItem];

    return (
        <header className="flex h-[74px] items-center justify-between gap-3 border-b-2 border-ink px-4 sm:px-5 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <button
                            className="flex size-11 items-center justify-center rounded-[10px] border-2 border-ink bg-white text-ink shadow-ext-sm lg:hidden"
                            aria-label={t('menu')}
                            data-testid="admin-menu"
                        >
                            <Menu size={20} />
                        </button>
                    </SheetTrigger>
                    <SheetContent side="left" showCloseButton={false} className="surface-ink w-[280px] border-r-0 bg-ink p-0 text-white">
                        <SheetTitle className="sr-only">{t('navAria')}</SheetTitle>
                        <div className="flex h-full flex-col justify-between p-5">
                            <div className="space-y-6">
                                <Image src="/fandi-tile.png" alt="Fandi" width={46} height={46} unoptimized className="size-[46px] rounded-[12px]" />
                                <div className="space-y-1">
                                    <p className="font-display text-lg text-white">{t('label')}</p>
                                    <p className="text-sm font-bold text-white">{user?.displayName ?? user?.email}</p>
                                    <span className="font-space-mono text-[9px] uppercase tracking-[0.14em] text-tier-vip">{t('role')}</span>
                                </div>
                                <nav className="flex flex-col gap-1.5" aria-label={t('navAria')}>
                                    {sheetItems.map((item) => {
                                        const active = isAdminNavActive(item, pathname);
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setOpen(false)}
                                                aria-current={active ? 'page' : undefined}
                                                className={`flex items-center gap-3 rounded-[12px] px-3 py-3 text-sm font-extrabold uppercase [font-stretch:108%] transition-colors duration-100 ${
                                                    active ? 'bg-lime text-ink' : 'text-muted-ink hover:bg-chip-ink hover:text-white'
                                                }`}
                                            >
                                                <Icon size={20} />
                                                <span>{t(item.labelKey)}</span>
                                            </Link>
                                        );
                                    })}
                                    {organization && (
                                        <Link
                                            href="/dashboard"
                                            onClick={() => setOpen(false)}
                                            className="flex items-center gap-3 rounded-[12px] px-3 py-3 text-sm font-extrabold uppercase text-muted-ink hover:bg-chip-ink hover:text-white"
                                        >
                                            <LayoutDashboard size={20} />
                                            <span>{t('idolDashboard')}</span>
                                        </Link>
                                    )}
                                </nav>
                            </div>
                            <LogoutDialog onLoggedOut={() => setOpen(false)}>
                                <button className="flex cursor-pointer items-center gap-3 rounded-[12px] px-3 py-3 text-sm font-extrabold uppercase text-nav-inactive transition-colors duration-100 hover:text-alert">
                                    <LogOut size={20} />
                                    <span>{tAuth('logout')}</span>
                                </button>
                            </LogoutDialog>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Workspace chip: the area, not an idol. */}
                <span className="flex min-w-0 items-center gap-2.5 rounded-[10px] border-2 border-ink bg-white px-3 py-1.5 text-[15px] font-black uppercase text-ink shadow-ext-sm [font-stretch:110%]">
                    <span className="flex size-[22px] flex-none items-center justify-center rounded-[6px] bg-ink text-[11px] text-lime">F</span>
                    <span className="truncate">{t('label')}</span>
                </span>
                {organization && (
                    <Link
                        href="/dashboard"
                        className="hidden items-center gap-2 rounded-[10px] border-2 border-ink bg-ink px-3 py-1.5 text-[13px] font-bold text-white hover:text-lime focus-visible:ring-2 focus-visible:ring-lime lg:flex"
                    >
                        <LayoutDashboard size={14} aria-hidden="true" />
                        {t('idolDashboard')}
                    </Link>
                )}
            </div>

            <div className="hidden items-center gap-3 lg:flex">
                <div className="text-right">
                    <div className="text-sm font-extrabold text-white">{user?.displayName ?? user?.email}</div>
                    <span className="font-space-mono text-[9px] uppercase tracking-[0.14em] text-tier-vip">{t('role')}</span>
                </div>
                <span className="flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-tier-vip text-sm font-black text-ink">
                    {initials(user?.displayName ?? user?.email)}
                </span>
            </div>
        </header>
    );
}

function AdminSkeleton() {
    const tCommon = useTranslations('common');
    return (
        <div className="flex min-h-screen bg-blue" aria-busy="true">
            <span role="status" className="sr-only">{tCommon('loading')}</span>
            <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[84px] lg:flex-col" aria-hidden="true">
                <div className="flex h-full w-[84px] flex-col items-center justify-between bg-ink py-5">
                    <div className="flex flex-col items-center gap-2.5">
                        <Skeleton className="mb-4 size-[46px] bg-chip-ink" />
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="size-[50px] bg-chip-ink" />
                        ))}
                    </div>
                    <Skeleton className="size-[46px] bg-chip-ink" />
                </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col lg:pl-[84px]" aria-hidden="true">
                <div className="flex h-[74px] items-center gap-3 border-b-2 border-ink px-5 lg:px-9">
                    <Skeleton className="h-[38px] w-40 rounded-[10px] bg-white/15" />
                </div>
                <div className="flex flex-1 flex-col gap-4 px-5 py-7 lg:px-9">
                    <Skeleton className="h-12 w-64 rounded-[12px] bg-white/15" />
                    <Skeleton className="h-64 w-full rounded-[16px] bg-white/15" />
                </div>
            </div>
        </div>
    );
}
