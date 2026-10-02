'use client';

/**
 * Invitations awaiting my org's answer — the "friend request" signal: the
 * count on the Colaboraciones nav item (rail + mobile sheet) and the Home
 * banner. Only owners and admins answer, so only they ask; everyone else
 * gets null and nothing renders.
 *
 * Fresh enough without polling hard: refetched on window focus, every two
 * minutes while the tab is visible, and right after accept/decline (the
 * inbox invalidates every ['collaborations', …] query).
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { collaborationsApi } from '@/lib/api-hooks';
import { canAnswerInvitations } from '@/lib/collaborations';
import type { PendingInvitationsSummary } from '@/types/api';

export const PENDING_INVITATIONS_KEY = ['collaborations', 'pending-summary'] as const;

export function usePendingInvitations(): PendingInvitationsSummary | null {
    const { organization, memberRole } = useAuth();
    const enabled = Boolean(organization?.id) && canAnswerInvitations(memberRole);
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
