'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { isNavActive, getVisibleItems } from './nav-config';

export function Sidebar() {
    const { user, organization, memberRole, logout } = useAuth();
    const pathname = usePathname();
    const t = useTranslations('dashboardNav');
    const tAuth = useTranslations('auth');
    const visibleItems = getVisibleItems(memberRole);

    return (
        <aside className="flex h-full w-20 flex-col items-center justify-between bg-black py-[18px]">
            {/* Top section: logo + nav */}
            <div className="flex flex-col items-center gap-6">
                {/* Fandi logo — links to dashboard home */}
                <Link href="/dashboard" className="mb-2" aria-label="Fandi Dashboard">
                    <Image
                        src="/fandi-logo.png"
                        alt="Fandi"
                        width={48}
                        height={48}
                        className="h-10 w-auto object-contain"
                    />
                </Link>

                {/* Navigation icons */}
                <nav className="flex flex-col items-center gap-2" aria-label="Dashboard navigation">
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
                                        className={`flex h-12 w-12 items-center justify-center transition-colors duration-150 ${
                                            active
                                                ? 'text-[#2D00F7]'
                                                : 'text-[#4A4A4A] hover:text-[#A0A0A0]'
                                        }`}
                                    >
                                        <Icon size={20} />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="rounded-none border-[#1A1A1A] bg-[#121212] font-space-mono text-xs text-white">
                                    {t(item.labelKey)}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom section: logout + avatar */}
            <div className="flex flex-col items-center gap-3">
                {/* Logout with confirmation */}
                <AlertDialog>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                                <button
                                    className="flex h-12 w-12 cursor-pointer items-center justify-center text-[#4A4A4A] transition-colors duration-150 hover:text-[#FF3366]"
                                    aria-label={tAuth('logout')}
                                    data-testid="nav-logout"
                                >
                                    <LogOut size={20} />
                                </button>
                            </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="rounded-none border-[#1A1A1A] bg-[#121212] font-space-mono text-xs text-white">
                            {tAuth('logout')}
                        </TooltipContent>
                    </Tooltip>

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
                                onClick={() => logout()}
                                className="rounded-none bg-[#FF3366] font-space-mono text-xs uppercase tracking-[1px] text-white hover:bg-[#CC2952]"
                            >
                                {tAuth('logout')}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* User avatar */}
                <div
                    className="flex h-12 w-12 items-center justify-center bg-[#121212]"
                    aria-label={user?.displayName || 'User'}
                >
                    {organization?.logoUrl ? (
                        <Image
                            src={organization.logoUrl}
                            alt={organization.name}
                            width={48}
                            height={48}
                            className="h-12 w-12 object-cover"
                        />
                    ) : (
                        <span className="font-sora text-lg font-bold text-white">
                            {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    )}
                </div>
            </div>
        </aside>
    );
}
