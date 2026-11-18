/**
 * Idol collaborations (fandi-api RFC §3) — small pure rules for the
 * Colaboraciones page (Recibidas · Enviadas · Activas · Historial), the nav
 * badge, the Home banner, the shared-event page and the "Ídolos invitados"
 * section of the create/edit panels.
 */
import type {
    Collaboration, ContestCategoryResult, DynamicType, ExperienceKind, PendingInvitationsSummary,
} from '../types/api';
import { apiErrorCode, apiErrorKind } from './api-error-kind.ts';

/** The Colaboraciones page; its nav item carries the badge. */
export const COLLABORATIONS_HREF = '/dashboard/collaborations';

/** Only owners and admins answer invitations, so only they get the banner. */
export function canAnswerInvitations(memberRole: string | null | undefined): boolean {
    return memberRole === 'owner' || memberRole === 'admin';
}

/**
 * Who sees the nav badge: the guest's answerers (invitations to answer)
 * and the host's readers (new answers in Enviadas). Staff never do.
 */
export function seesCollaborationsBadge(memberRole: string | null | undefined): boolean {
    return memberRole === 'owner' || memberRole === 'admin' || memberRole === 'viewer';
}

/** Badge total: invitations awaiting my answer + unseen answers to mine. */
export function navBadgeCount(summary: Pick<PendingInvitationsSummary, 'count' | 'responses'> | null | undefined): number {
    if (!summary) return 0;
    const pending = Number.isFinite(summary.count) ? Math.max(0, summary.count) : 0;
    const responses = Number.isFinite(summary.responses) ? Math.max(0, summary.responses ?? 0) : 0;
    return pending + responses;
}

// ── Colaboraciones tabs ──

export type CollaborationsTab = 'received' | 'sent' | 'active' | 'history';

export const COLLABORATIONS_TABS: readonly CollaborationsTab[] = ['received', 'sent', 'active', 'history'];

/** Where a collaboration addressed to my org lives: to answer, active, or done. */
export function receivedTabOf(c: Pick<Collaboration, 'status'>): Exclude<CollaborationsTab, 'sent'> {
    if (c.status === 'pending') return 'received';
    if (c.status === 'accepted') return 'active';
    return 'history';
}

export function splitInbox<T extends Pick<Collaboration, 'status'>>(inbox: readonly T[]): {
    received: T[];
    active: T[];
    history: T[];
} {
    const out = { received: [] as T[], active: [] as T[], history: [] as T[] };
    for (const c of inbox) out[receivedTabOf(c)].push(c);
    return out;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * What an email link carries: `?invite=<id>` (guest emails), `?sent=<id>`
 * (host notification emails), or the legacy `?token=` (links sent before
 * invitations were linked by id). Ids that are not uuids are ignored.
 */
export function readCollaborationLink(params: { get(name: string): string | null }): {
    inviteId: string | null;
    sentId: string | null;
    token: string | null;
} {
    const id = (name: string) => {
        const v = params.get(name)?.trim() ?? '';
        return UUID.test(v) ? v.toLowerCase() : null;
    };
    const token = params.get('token')?.trim() || null;
    return { inviteId: id('invite'), sentId: id('sent'), token };
}

/** The tab a link opens: Enviadas for `?sent=`, the invitation's own tab for `?invite=`. */
export function initialTabFor(
    link: { inviteId: string | null; sentId: string | null },
    inbox: readonly Pick<Collaboration, 'id' | 'status'>[] | undefined,
): CollaborationsTab {
    if (link.sentId) return 'sent';
    if (link.inviteId && inbox) {
        const found = inbox.find((c) => c.id === link.inviteId);
        if (found) return receivedTabOf(found);
    }
    return 'received';
}

/** Where the host manages a sent invitation: the dynamic's tab of its event. */
export function dynamicHref(c: Pick<Collaboration, 'eventId' | 'dynamicType' | 'dynamicKind'>): string {
    const kind = dynamicLabelKey(c);
    const tab = kind === 'auction' ? 'auctions' : kind === 'impacto' ? 'impactos' : 'experiences';
    return `/dashboard/events/${c.eventId}/${tab}`;
}

// ── Error copy (never the API's own text) ──

export type CollabErrorKey =
    | 'self'
    | 'idolNotFound'
    | 'idolNoAccount'
    | 'exists'
    | 'notPending'
    | 'expired'
    | 'linkUsed'
    | 'notActive'
    | 'noPermission'
    | 'notFound'
    | 'dynamicNotFound'
    | 'cooldown'
    | 'inviteLimit'
    | 'tooFast'
    | 'notSynced'
    | 'noOrg'
    | 'network'
    | 'generic';

export interface CollabErrorCopy {
    key: CollabErrorKey;
    /** COLLAB_COOLDOWN: when this idol can be invited again (ISO). */
    retryAt?: string;
    /** COLLAB_INVITE_LIMIT: invitations per idol per 24 h. */
    limit?: number;
}

const COLLAB_KEY_BY_CODE: Record<string, CollabErrorKey> = {
    COLLAB_SELF: 'self',
    IDOL_NOT_FOUND: 'idolNotFound',
    IDOL_NO_ACCOUNT: 'idolNoAccount',
    COLLABORATION_EXISTS: 'exists',
    COLLABORATION_NOT_PENDING: 'notPending',
    COLLABORATION_EXPIRED: 'expired',
    INVITE_NOT_FOUND: 'linkUsed',
    COLLABORATION_NOT_ACTIVE: 'notActive',
    ROLE_FORBIDDEN: 'noPermission',
    COLLABORATION_NOT_FOUND: 'notFound',
    EXPERIENCE_NOT_FOUND: 'dynamicNotFound',
    INVALID_DYNAMIC_TYPE: 'dynamicNotFound',
    COLLAB_COOLDOWN: 'cooldown',
    COLLAB_INVITE_LIMIT: 'inviteLimit',
    RATE_LIMITED: 'tooFast',
    NOT_SYNCED: 'notSynced',
    NO_ORGANIZATION: 'noOrg',
};

export function collabErrorCopy(err: unknown): CollabErrorCopy {
    const code = apiErrorCode(err);
    const key = code ? COLLAB_KEY_BY_CODE[code] : undefined;
    if (key) {
        const details = ((err as { details?: Record<string, unknown> }).details ?? {}) as Record<string, unknown>;
        const copy: CollabErrorCopy = { key };
        if (typeof details.retryAt === 'string') copy.retryAt = details.retryAt;
        if (typeof details.limit === 'number') copy.limit = details.limit;
        return copy;
    }
    const status = err && typeof err === 'object' ? (err as { status?: unknown }).status : null;
    if (status === 429) return { key: 'tooFast' };
    switch (apiErrorKind(err)) {
        case 'forbidden': return { key: 'noPermission' };
        case 'notFound': return { key: 'notFound' };
        case 'network': return { key: 'network' };
        default: return { key: 'generic' };
    }
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
    /** Our own copy for a failure (the panel maps the error code); a plain string is the fallback. */
    describe: string | ((err: unknown) => string),
): Promise<QueuedInviteOutcome[]> {
    return Promise.all(
        idols.map(async (idol): Promise<QueuedInviteOutcome> => {
            try {
                await invite(idol.id);
                return { name: idol.name, ok: true };
            } catch (err) {
                const message =
                    typeof describe === 'function'
                        ? describe(err)
                        : err instanceof Error && err.message ? err.message : describe;
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
 * Legacy `?token=` links only. The invitation behind the token: the API has no token lookup,
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
