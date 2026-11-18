/**
 * Equipo: the rules of the invitations list and the copy for a failed team
 * action, pure so they run under node --test.
 *
 * Invitations are our own (fandi-api RFC invitations-and-admin): a 7-day
 * single-use link, resent at most 3 times per 24 h, cancelled from here.
 * People join only by accepting, so the members list is active members.
 */
import type { TeamInvitation } from '../types/api';
import { apiErrorCode, apiErrorKind } from './api-error-kind.ts';

/** What the row says about an invitation. */
export type InvitationRowState = 'needsResend' | 'pending' | 'expired';

/**
 * The rows worth showing: still pending, or expired (it can be resent or
 * cleared). Accepted ones are in the members list; cancelled ones are gone.
 * Pending first, then the newest.
 */
export function visibleInvitations(items: readonly TeamInvitation[]): TeamInvitation[] {
    const rank = (i: TeamInvitation) => (i.status === 'pending' ? 0 : 1);
    return items
        .filter((i) => i.status === 'pending' || i.status === 'expired')
        .slice()
        .sort((a, b) => rank(a) - rank(b) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/**
 * Pending with no live link (moved from the old system) reads "Necesita
 * reenvío"; a pending one past its date reads expired even before the
 * API's sweep marks it.
 */
export function invitationRowState(
    i: Pick<TeamInvitation, 'status' | 'needsResend' | 'expiresAt'>,
    now: number = Date.now(),
): InvitationRowState {
    if (i.status === 'expired') return 'expired';
    const expires = Date.parse(i.expiresAt);
    if (!Number.isNaN(expires) && expires <= now) return 'expired';
    if (i.needsResend) return 'needsResend';
    return 'pending';
}

/** The resend cap (3 emails per 24 h) is reached until this moment, else null. */
export function resendBlockedUntil(
    i: Pick<TeamInvitation, 'resendAvailableAt'>,
    now: number = Date.now(),
): string | null {
    if (!i.resendAvailableAt) return null;
    const at = Date.parse(i.resendAvailableAt);
    return !Number.isNaN(at) && at > now ? i.resendAvailableAt : null;
}

export type TeamErrorKey =
    | 'noOrg'
    | 'noPermission'
    | 'roleNotAllowed'
    | 'eventScope'
    | 'eventNotInOrg'
    | 'alreadyMember'
    | 'invitationPending'
    | 'orgRateLimited'
    | 'tooFast'
    | 'invitationNotFound'
    | 'invitationNotPending'
    | 'resendLimit'
    | 'notFound'
    | 'invalid'
    | 'emailFailed'
    | 'network'
    | 'generic';

export interface TeamErrorCopy {
    key: TeamErrorKey;
    /** RESEND_LIMIT: when the next email is allowed (ISO). */
    retryAt?: string;
    /** INVITATION_RATE_LIMITED: invitations per org per 24 h. */
    limit?: number;
    /** INVITATION_PENDING: the invitation that already exists. */
    invitationId?: string;
}

const KEY_BY_CODE: Record<string, TeamErrorKey> = {
    NO_ORGANIZATION: 'noOrg',
    ROLE_FORBIDDEN: 'noPermission',
    ROLE_NOT_ALLOWED: 'roleNotAllowed',
    EVENT_SCOPE_NOT_ALLOWED: 'eventScope',
    EVENT_NOT_IN_ORG: 'eventNotInOrg',
    ALREADY_MEMBER: 'alreadyMember',
    INVITATION_PENDING: 'invitationPending',
    INVITATION_RATE_LIMITED: 'orgRateLimited',
    RATE_LIMITED: 'tooFast',
    INVITATION_NOT_FOUND: 'invitationNotFound',
    INVITATION_NOT_PENDING: 'invitationNotPending',
    RESEND_LIMIT: 'resendLimit',
};

/**
 * The copy key for a failed invite / resend / cancel / member change.
 * Typed codes first; untyped failures by HTTP kind. `sendsEmail`: a 5xx
 * most likely means the email did not go out.
 */
export function teamErrorCopy(err: unknown, sendsEmail = false): TeamErrorCopy {
    const code = apiErrorCode(err);
    const details = ((err && typeof err === 'object' ? (err as { details?: unknown }).details : null) ?? {}) as Record<
        string,
        unknown
    >;
    const key = code ? KEY_BY_CODE[code] : undefined;
    if (key) {
        const copy: TeamErrorCopy = { key };
        if (typeof details.retryAt === 'string') copy.retryAt = details.retryAt;
        if (typeof details.limit === 'number') copy.limit = details.limit;
        if (typeof details.invitationId === 'string' && details.invitationId) copy.invitationId = details.invitationId;
        return copy;
    }
    switch (apiErrorKind(err)) {
        case 'conflict': return { key: 'alreadyMember' };
        case 'forbidden': return { key: 'noPermission' };
        case 'notFound': return { key: 'notFound' };
        case 'invalid': return { key: 'invalid' };
        case 'server': return { key: sendsEmail ? 'emailFailed' : 'generic' };
        case 'network': return { key: 'network' };
        default: return { key: 'generic' };
    }
}
