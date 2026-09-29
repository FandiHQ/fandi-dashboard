'use client';

/**
 * Top bar — Azul Bloque web layout (DESIGN_GUIDELINES §7): the workspace
 * chip on the left (white, 2px ink, 3px extrusion: "[JB] J Balvin"), the
 * user + role on the right (role in lilac mono, never orange), a 2px ink
 * rule underneath. Below lg the rail collapses into a left sheet with
 * text labels.
 */
import { useState } from 'react';
import { Menu, LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { isNavActive, getVisibleItems } from './nav-config';
import { LogoutDialog } from './logout-dialog';

function initials(name: string | null | undefined): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'F';
    return (parts[0]!.charAt(0) + (parts[1]?.charAt(0) ?? '')).toUpperCase();
}

function RoleLabel({ role }: { role: string }) {
    const tTeam = useTranslations('team');
    return (
        <span className="font-space-mono text-[9px] uppercase tracking-[0.14em] text-tier-vip">
            {tTeam(`roles.${role}`)}
        </span>
    );
}

export function DashboardHeader() {
    const { user, organization, memberRole } = useAuth();
    const pathname = usePathname();
    const t = useTranslations('dashboardNav');
    const tAuth = useTranslations('auth');
    const visibleItems = getVisibleItems(memberRole);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="flex h-[74px] items-center justify-between gap-4 border-b-2 border-ink px-5 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger asChild>
                        <button
                            className="flex size-11 items-center justify-center rounded-[10px] border-2 border-ink bg-white text-ink shadow-ext-sm lg:hidden"
                            aria-label="Open navigation menu"
                        >
                            <Menu size={20} />
                        </button>
                    </SheetTrigger>

                    <SheetContent side="left" showCloseButton={false} className="surface-ink w-[280px] border-r-0 bg-ink p-0 text-white">
                        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                        <div className="flex h-full flex-col justify-between p-5">
                            <div className="space-y-6">
                                <Image
                                    src="/fandi-tile.png"
                                    alt="Fandi"
                                    width={46}
                                    height={46}
                                    unoptimized
                                    className="size-[46px] rounded-[12px]"
                                />
                                <div className="space-y-1">
                                    <p className="font-display text-lg text-white">{organization?.name}</p>
                                    <p className="text-sm font-bold text-white">{user?.displayName}</p>
                                    {memberRole && <RoleLabel role={memberRole} />}
                                </div>
                                <nav className="flex flex-col gap-1.5">
                                    {visibleItems.map((item) => {
                                        const active = isNavActive(item, pathname);
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setMobileOpen(false)}
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
                                </nav>
                            </div>

                            <LogoutDialog onLoggedOut={() => setMobileOpen(false)}>
                                <button className="flex cursor-pointer items-center gap-3 rounded-[12px] px-3 py-3 text-sm font-extrabold uppercase text-nav-inactive transition-colors duration-100 hover:text-alert">
                                    <LogOut size={20} />
                                    <span>{tAuth('logout')}</span>
                                </button>
                            </LogoutDialog>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Workspace chip */}
                <span className="flex min-w-0 items-center gap-2.5 rounded-[10px] border-2 border-ink bg-white px-3 py-1.5 text-[15px] font-black text-ink shadow-ext-sm [font-stretch:110%]">
                    <span className="flex size-[22px] flex-none items-center justify-center rounded-[6px] bg-ink text-[11px] text-lime">
                        {initials(organization?.name)}
                    </span>
                    <span className="truncate">{organization?.name || 'Fandi'}</span>
                </span>
            </div>

            <Link
                href="/dashboard/settings"
                className="group hidden items-center gap-3 rounded-[12px] focus-visible:ring-2 focus-visible:ring-lime lg:flex"
            >
                <div className="text-right">
                    <div className="text-sm font-extrabold text-white group-hover:underline group-hover:decoration-lime group-hover:decoration-2">
                        {user?.displayName}
                    </div>
                    {memberRole && <RoleLabel role={memberRole} />}
                </div>
                <span className="flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-tier-vip text-sm font-black text-ink">
                    {user?.avatarUrl ? (
                        <Image
                            src={user.avatarUrl}
                            alt={user.displayName || 'User'}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                            unoptimized
                        />
                    ) : (
                        initials(user?.displayName)
                    )}
                </span>
            </Link>
        </header>
    );
}
