import {
    Banknote, CreditCard, FolderTree, ScrollText, ShieldCheck, Star, UserSearch,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** The Fandi Admin area (users.role 'admin'; the API's PersistedAdminGuard decides). */
export interface AdminNavItem {
    href: string;
    icon: LucideIcon;
    /** i18n key within the 'adminNav' namespace. */
    labelKey: string;
}

export const ADMIN_HOME = '/admin/organizations';

export const adminNavItems: AdminNavItem[] = [
    { href: '/admin/organizations', icon: Star, labelKey: 'organizations' },
    { href: '/admin/withdrawals', icon: Banknote, labelKey: 'withdrawals' },
    { href: '/admin/topups', icon: CreditCard, labelKey: 'topups' },
    { href: '/admin/fans', icon: UserSearch, labelKey: 'fans' },
    { href: '/admin/classification', icon: FolderTree, labelKey: 'classification' },
    { href: '/admin/audit', icon: ScrollText, labelKey: 'audit' },
];

/** Pinned at the bottom of the rail, next to "Cerrar sesión". */
export const adminSecurityItem: AdminNavItem = {
    href: '/admin/security', icon: ShieldCheck, labelKey: 'security',
};

export function isAdminNavActive(item: AdminNavItem, pathname: string): boolean {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
