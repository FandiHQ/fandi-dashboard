'use client';

/**
 * The Colaboraciones signal, both sides: invitations awaiting my org's
 * answer (guest owners/admins: the "friend request", also the Home banner)
 * and answers to my org's invitations not seen yet in Enviadas (host
 * owners/admins/viewers). One summary call; staff never ask.
 *
 * Fresh enough without polling hard: refetched on window focus, every two
 * minutes while the tab is visible, right after accept/decline (the page
 * invalidates every ['collaborations', …] query) and once Enviadas is seen.
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { collaborationsApi } from '@/lib/api-hooks';
import { navBadgeCount, seesCollaborationsBadge } from '@/lib/collaborations';
import type { PendingInvitationsSummary } from '@/types/api';

export const PENDING_INVITATIONS_KEY = ['collaborations', 'pending-summary'] as const;

export function usePendingInvitations(): PendingInvitationsSummary | null {
    const { organization, memberRole } = useAuth();
    const enabled = Boolean(organization?.id) && seesCollaborationsBadge(memberRole);
    const { data } = useQuery({
        queryKey: [...PENDING_INVITATIONS_KEY, organization?.id],
        queryFn: () => collaborationsApi.pendingSummary(),
        enabled,
        refetchOnWindowFocus: 'always',
        refetchInterval: 120_000,
        refetchIntervalInBackground: false,
    });
    return enabled ? (data ?? null) : null;
}

/**
 * The nav item's badge: the total and, for assistive tech, what it counts
 * ("2 invitaciones pendientes · 1 respuesta nueva"); null label when 0.
 */
export function useCollaborationsNavBadge(): { count: number; label: string | null } {
    const t = useTranslations('collaborations');
    const summary = usePendingInvitations();
    const count = navBadgeCount(summary);
    if (!summary || count === 0) return { count: 0, label: null };
    const parts: string[] = [];
    if (summary.count > 0) parts.push(t('pendingBadge', { count: summary.count }));
    if ((summary.responses ?? 0) > 0) parts.push(t('responsesBadge', { count: summary.responses ?? 0 }));
    return { count, label: parts.join(' · ') };
}
