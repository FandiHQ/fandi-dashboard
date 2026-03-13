import {
    LayoutDashboard, Calendar, Users, Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
    href: string;
    icon: LucideIcon;
    labelKey: string;        // i18n key within 'dashboardNav' namespace
    exactMatch?: boolean;    // true = pathname === href, false = startsWith
    roles?: string[];        // if set, only shown for these memberRole values
}

export const navItems: NavItem[] = [
    {
        href: '/dashboard',
        icon: LayoutDashboard,
        labelKey: 'home',
        exactMatch: true,
    },
    {
        href: '/dashboard/events',
        icon: Calendar,
        labelKey: 'events',
    },
    {
        href: '/dashboard/team',
        icon: Users,
        labelKey: 'team',
        roles: ['owner', 'admin'],
    },
    {
        href: '/dashboard/settings',
        icon: Settings,
        labelKey: 'settings',
        roles: ['owner', 'admin'],
    },
];

// Helper: check if a nav item is active based on current pathname
export function isNavActive(item: NavItem, pathname: string): boolean {
    if (item.exactMatch) {
        return pathname === item.href;
    }
    return pathname.startsWith(item.href);
}

// Helper: filter items by role
export function getVisibleItems(memberRole: string | null): NavItem[] {
    return navItems.filter(item => {
        if (!item.roles) return true;
        return memberRole ? item.roles.includes(memberRole) : false;
    });
}
