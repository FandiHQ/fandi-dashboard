'use client';

/**
 * Sidebar — Azul Bloque web layout (DESIGN_GUIDELINES §7): an 84px ink
 * rail with the brand tile, icon navigation (the active item is a lime
 * 50px tile), logout and the workspace tile at the bottom. Labels live in
 * tooltips; the mobile sheet in DashboardHeader carries them in text.
 */
import Image from 'next/image';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { isNavActive, getVisibleItems } from './nav-config';
import { LogoutDialog } from './logout-dialog';

export function Sidebar() {
    const { user, organization, memberRole } = useAuth();
    const pathname = usePathname();
    const t = useTranslations('dashboardNav');
    const tAuth = useTranslations('auth');
    const visibleItems = getVisibleItems(memberRole, user?.role === 'admin');

    return (
        <aside className="flex h-full w-[84px] flex-col items-center justify-between bg-ink py-5">
            <div className="flex flex-col items-center gap-2.5">
                <Link href="/dashboard" className="mb-4 rounded-[12px] focus-visible:ring-2 focus-visible:ring-lime" aria-label="Fandi">
                    <Image
                        src="/fandi-tile.png"
                        alt="Fandi"
                        width={46}
                        height={46}
                        unoptimized
                        className="size-[46px] rounded-[12px]"
                    />
                </Link>

                <nav className="flex flex-col items-center gap-2.5" aria-label="Dashboard navigation">
                    {visibleItems.map((item) => {
                        const active = isNavActive(item, pathname);
                        const Icon = item.icon;
                        return (
                            <Tooltip key={item.href}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={item.href}
                                        data-testid={`nav-${item.labelKey}`}
                                        aria-label={t(item.labelKey)}
                                        aria-current={active ? 'page' : undefined}
                                        className={`flex size-[50px] items-center justify-center rounded-[12px] transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-lime ${
                                            active ? 'bg-lime text-ink' : 'text-nav-inactive hover:bg-chip-ink hover:text-white'
                                        }`}
                                    >
                                        <Icon size={22} strokeWidth={2.2} />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>
                            </Tooltip>
                        );
                    })}
                </nav>
            </div>

            <div className="flex flex-col items-center gap-3">
                <LogoutDialog>
                    <button
                        className="flex size-[50px] cursor-pointer items-center justify-center rounded-[12px] text-nav-inactive transition-colors duration-100 hover:bg-chip-ink hover:text-alert focus-visible:ring-2 focus-visible:ring-lime"
                        aria-label={tAuth('logout')}
                        data-testid="nav-logout"
                    >
                        <LogOut size={20} />
                    </button>
                </LogoutDialog>

                <div
                    className="flex size-[46px] items-center justify-center overflow-hidden rounded-[12px] border-2 border-dash-ink bg-chip-ink"
                    aria-label={organization?.name || 'Organization'}
                >
                    {organization?.logoUrl ? (
                        <Image
                            src={organization.logoUrl}
                            alt={organization.name}
                            width={46}
                            height={46}
                            className="h-full w-full object-cover"
                            unoptimized
                        />
                    ) : (
                        <span className="font-display text-lg text-lime">
                            {organization?.name?.charAt(0) || 'F'}
                        </span>
                    )}
                </div>
            </div>
        </aside>
    );
}
