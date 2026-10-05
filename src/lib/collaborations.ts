/**
 * Idol collaborations (fandi-api RFC §3) — small pure rules for the guest
 * inbox, the nav badge, the Home banner, the shared-event page and the
 * "Ídolos invitados" section of the create/edit panels.
 */
import type { Collaboration, ContestCategoryResult, DynamicType, ExperienceKind } from '../types/api';

/** The guest inbox; the nav item at this href carries the pending-invitations badge. */
export const COLLABORATIONS_HREF = '/dashboard/collaborations';

/** Only owners and admins answer invitations, so only they get the badge and the banner. */
export function canAnswerInvitations(memberRole: string | null | undefined): boolean {
    return memberRole === 'owner' || memberRole === 'admin';
}

/** The nav badge text: the count, capped at "9+" so it fits the rail tile. */
export function pendingBadgeLabel(count: number): string | null {
    if (!Number.isFinite(count) || count <= 0) return null;
    return count > 9 ? '9+' : String(Math.floor(count));
}

/** How a dynamic is named to people: an auction, or an experience by its kind. */
export type DynamicLabelKey = 'oportunidad' | 'impacto' | 'auction';

export function dynamicLabelKey(c: Pick<Collaboration, 'dynamicType' | 'dynamicKind'>): DynamicLabelKey {
    if (c.dynamicType === 'auction') return 'auction';
    // Older api builds send no kind; an experience is an oportunidad by default.
    return c.dynamicKind === 'impacto' ? 'impacto' : 'oportunidad';
}

// ── Inviting idols from the create/edit panels ──

/**
 * At most this many idols can be picked before the first save: one save
 * sends one invitation each, and the api allows 20 invitation writes per
 * minute per user.
 */
export const MAX_QUEUED_IDOLS = 10;

/** Orgs already invited (pending) or collaborating (accepted) on one dynamic. */
export function liveGuestIds(
    collaborations: readonly Collaboration[],
    dynamicType: DynamicType,
    dynamicId: string | null,
): Set<string> {
    if (!dynamicId) return new Set();
    return new Set(
        collaborations
            .filter((c) => c.dynamicType === dynamicType && c.dynamicId === dynamicId)
            .filter((c) => c.status === 'pending' || c.status === 'accepted')
            .map((c) => c.guestOrgId),
    );
}

/**
 * Search results worth offering: never my own org, never one already
 * invited or collaborating, never one already picked for this save.
 */
export function inviteCandidates<T extends { id: string }>(
    results: readonly T[],
    { myOrgId, excluded }: { myOrgId: string | null | undefined; excluded: Iterable<string> },
): T[] {
    const skip = new Set(excluded);
    if (myOrgId) skip.add(myOrgId);
    return results.filter((r) => !skip.has(r.id));
}

export type QueuedInviteOutcome =
    | { name: string; ok: true }
    | { name: string; ok: false; message: string };

/**
 * Sends the invitations picked while creating, one call per idol, once the
 * dynamic exists. Never throws: each failure comes back with its idol, so
 * an invitation can never cost the dynamic that was just created.
 */
export async function sendQueuedInvites(
    invite: (guestOrgId: string) => Promise<unknown>,
    idols: readonly { id: string; name: string }[],
    fallbackMessage: string,
): Promise<QueuedInviteOutcome[]> {
    return Promise.all(
        idols.map(async (idol): Promise<QueuedInviteOutcome> => {
            try {
                await invite(idol.id);
                return { name: idol.name, ok: true };
            } catch (err) {
                const message = err instanceof Error && err.message ? err.message : fallbackMessage;
                return { name: idol.name, ok: false, message };
            }
        }),
    );
}

/** Who was invited and who failed (with why), for the single summary toast. */
export function summarizeInvites(outcomes: readonly QueuedInviteOutcome[]): {
    sent: string[];
    failed: { name: string; message: string }[];
} {
    const sent: string[] = [];
    const failed: { name: string; message: string }[] = [];
    for (const o of outcomes) {
        if (o.ok) sent.push(o.name);
        else failed.push({ name: o.name, message: o.message });
    }
    return { sent, failed };
}

/**
 * The invitation behind an email `?token=`: the API has no token lookup,
 * so the card names host, event and dynamic only when the inbox holds
 * exactly one pending invitation (then it has to be that one). Otherwise
 * null, and the card stays generic.
 */
export function matchTokenInvitation(inbox: readonly Collaboration[]): Collaboration | null {
    const pending = inbox.filter((c) => c.status === 'pending');
    return pending.length === 1 ? pending[0] : null;
}

/**
 * History rows open the shared page only for a collaboration that was
 * accepted and then ended (it keeps the data up to its end). Declined or
 * expired ones never had access.
 */
export function canOpenFromHistory(c: Pick<Collaboration, 'status' | 'respondedAt'>): boolean {
    return c.status === 'ended' && !!c.respondedAt;
}

/**
 * The "Resultados" block on the shared page: only for an oportunidad
 * (never an Impacto or an auction), and only when there is something to
 * say — results with participants, or "results coming" right after close.
 */
export function showSharedResults({
    dynamicType,
    dynamicKind,
    categories,
    notFinalized,
}: {
    dynamicType: DynamicType;
    dynamicKind?: ExperienceKind | null;
    categories: readonly Pick<ContestCategoryResult, 'participants'>[] | undefined;
    notFinalized: boolean;
}): boolean {
    if (dynamicType !== 'experience' || dynamicKind === 'impacto') return false;
    if (notFinalized) return true;
    return (categories ?? []).some((c) => c.participants > 0);
}
