import {
    LayoutDashboard, Calendar, Users, Settings, Trophy, Handshake, ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
    href: string;
    icon: LucideIcon;
    labelKey: string;        // i18n key within 'dashboardNav' namespace
    exactMatch?: boolean;    // true = pathname === href, false = startsWith
    roles?: string[];        // if set, only shown for these memberRole values
    platformAdmin?: boolean; // only for platform admins (users.role = 'admin')
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
        // Fanbase (fandi-api RFC §8); the old Top Fans is its "Top fans" tab.
        href: '/dashboard/fanbase',
        icon: Trophy,
        labelKey: 'fanbase',
    },
    {
        // Idol collaborations: invitations and events shared with my org.
        href: '/dashboard/collaborations',
        icon: Handshake,
        labelKey: 'collaborations',
        roles: ['owner', 'admin', 'viewer'],
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
    },
    {
        // A Fandi admin who also belongs to an idol team: the way across to
        // the Fandi Admin area (Retiros, Clasificación and the rest live
        // there now, see admin-nav-config.ts). The API checks the persisted
        // role; this only hides the entry.
        href: '/admin',
        icon: ShieldCheck,
        labelKey: 'fandiAdmin',
        platformAdmin: true,
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
export function getVisibleItems(memberRole: string | null, isPlatformAdmin = false): NavItem[] {
    return navItems.filter(item => {
        if (item.platformAdmin && !isPlatformAdmin) return false;
        if (!item.roles) return true;
        return memberRole ? item.roles.includes(memberRole) : false;
    });
}
