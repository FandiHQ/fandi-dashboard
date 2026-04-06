'use client';

import { useState } from 'react';
import { Menu, LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { isNavActive, getVisibleItems } from './nav-config';

function RoleBadge({ role }: { role: string }) {
    const tTeam = useTranslations('team');
    const colors: Record<string, { text: string; bg: string }> = {
        owner: { text: '#F59E0B', bg: '#F59E0B20' },
        admin: { text: '#2D00F7', bg: '#2D00F720' },
        viewer: { text: '#A0A0A0', bg: '#A0A0A020' },
        staff: { text: '#22C55E', bg: '#22C55E20' },
    };
    const c = colors[role] || colors.viewer;
    return (
        <span
            className="font-space-mono text-[10px] uppercase tracking-[1px] px-2 py-0.5"
            style={{ color: c.text, backgroundColor: c.bg }}
        >
            {tTeam(`roles.${role}`)}
        </span>
    );
}

export function DashboardHeader() {
    const { user, organization, memberRole, logout } = useAuth();
    const pathname = usePathname();
    const t = useTranslations('dashboardNav');
    const tAuth = useTranslations('auth');
    const visibleItems = getVisibleItems(memberRole);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="flex h-20 items-center justify-between border-b border-[#2A2A2A] bg-black/50 px-5 backdrop-blur-md lg:px-14">
            {/* Left: mobile menu trigger + org info */}
            <div className="flex items-center gap-3">
                {/* Mobile hamburger — hidden on desktop */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger asChild>
                        <button
                            className="flex h-12 w-12 items-center justify-center text-white lg:hidden"
                            aria-label="Open navigation menu"
                        >
                            <Menu size={20} />
                        </button>
                    </SheetTrigger>

                    <SheetContent
                        side="left"
                        className="w-[280px] rounded-none border-r border-[#1A1A1A] bg-black p-0"
                    >
                        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

                        {/* Mobile nav — WITH text labels */}
                        <div className="flex h-full flex-col justify-between p-6">
                            <div className="space-y-6">
                                {/* Logo */}
                                <Image
                                    src="/fandi-logo.png"
                                    alt="Fandi"
                                    width={120}
                                    height={40}
                                    unoptimized
                                    className="h-8 w-auto object-contain"
                                />

                                {/* Org name */}
                                <div>
                                    <p className="font-sora text-base font-semibold text-white">
                                        {organization?.name}
                                    </p>
                                </div>

                                {/* User + role */}
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden bg-[#121212]">
                                        {user?.avatarUrl ? (
                                            <Image
                                                src={user.avatarUrl}
                                                alt={user.displayName || 'User'}
                                                width={32}
                                                height={32}
                                                className="h-8 w-8 object-cover"
                                                unoptimized
                                            />
                                        ) : (
                                            <span className="font-sora text-sm font-bold text-white">
                                                {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-space-mono text-xs text-[#A0A0A0]">
                                            {user?.displayName}
                                        </span>
                                        {memberRole && <RoleBadge role={memberRole} />}
                                    </div>
                                </div>

                                {/* Nav items with text */}
                                <nav className="flex flex-col gap-1">
                                    {visibleItems.map((item) => {
                                        const active = isNavActive(item, pathname);
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setMobileOpen(false)}
                                                className={`flex items-center gap-3 px-3 py-3 font-sora text-sm transition-colors duration-150 ${
                                                    active
                                                        ? 'bg-[#2D00F710] text-[#2D00F7]'
                                                        : 'text-[#A0A0A0] hover:bg-[#121212] hover:text-white'
                                                }`}
                                            >
                                                <Icon size={20} />
                                                <span>{t(item.labelKey)}</span>
                                            </Link>
                                        );
                                    })}
                                </nav>
                            </div>

                            {/* Bottom: logout */}
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button className="flex cursor-pointer items-center gap-3 px-3 py-3 font-sora text-sm text-[#4A4A4A] transition-colors duration-150 hover:text-[#FF3366]">
                                        <LogOut size={20} />
                                        <span>{tAuth('logout')}</span>
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-none border-[#1A1A1A] bg-[#121212]">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="font-sora text-white">
                                            {tAuth('logoutConfirm')}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="font-space-mono text-[#A0A0A0]">
                                            {tAuth('logoutWarning')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-none border-[#2A2A2A] bg-transparent font-space-mono text-xs uppercase tracking-[1px] text-white hover:bg-[#1A1A1A] hover:text-white">
                                            {tAuth('cancel')}
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => {
                                                logout();
                                                setMobileOpen(false);
                                            }}
                                            className="rounded-none bg-[#FF3366] font-space-mono text-xs uppercase tracking-[1px] text-white hover:bg-[#CC2952]"
                                        >
                                            {tAuth('logout')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Org name — always visible */}
                <div className="flex flex-col">
                    <span className="font-sora text-base font-semibold text-white tracking-wide">
                        {organization?.name || 'Fandi'}
                    </span>
                </div>
            </div>

            {/* Right: user info + role badge (desktop only) */}
            <Link 
                href="/dashboard/settings"
                className="group ml-auto hidden cursor-pointer items-center gap-4 transition-all duration-300 lg:flex"
            >
                <div className="flex flex-col items-end transition-colors duration-300 group-hover:text-[var(--color-tactical-acid)]">
                    <span className="font-space-mono text-sm text-[#E0E0E0] transition-colors duration-300 group-hover:text-white">
                        {user?.displayName}
                    </span>
                    {memberRole && <RoleBadge role={memberRole} />}
                </div>
                <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-none border border-[#2A2A2A] bg-[#121212] transition-all duration-300 group-hover:border-[var(--color-tactical-acid)] group-hover:shadow-[0_0_15px_rgba(204,255,0,0.3)]">
                    {user?.avatarUrl ? (
                        <Image
                            src={user.avatarUrl}
                            alt={user.displayName || 'User'}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                            unoptimized
                        />
                    ) : (
                        <span className="font-sora text-base font-bold text-white transition-colors duration-300 group-hover:text-[var(--color-tactical-acid)]">
                            {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    )}
                </div>
            </Link>
        </header>
    );
}
