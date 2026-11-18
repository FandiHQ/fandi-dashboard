/**
 * The /invitacion page (fandi-api RFC invitations-and-admin): pure rules,
 * no Supabase or React, so they run under node --test.
 *
 * The email links to {DASHBOARD_URL}/invitacion#t=<token>. The token lives
 * in the fragment (never in server logs, proxies or Referer); the page
 * reads it once, drops it from the address bar and asks the API what the
 * invitation looks like. Exactly one view is rendered at a time.
 */
import type { InvitationPreview, OrgRole } from '../types/api';
import { apiErrorKind } from './api-error-kind.ts';

/** Longest token the API accepts (its DTO caps it at 200; real ones are 43). */
const MAX_TOKEN_LENGTH = 200;

/**
 * The token from the link fragment ("#t=…"), or null when there is none.
 * Tolerates a leading "#", other fragment keys and percent-encoding (some
 * mail clients rewrite links), never anything that is not base64url.
 */
export function readInvitationToken(hash: string | null | undefined): string | null {
    if (!hash) return null;
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    let value: string | null;
    try {
        value = new URLSearchParams(raw).get('t');
    } catch {
        return null;
    }
    const token = value?.trim() ?? '';
    if (!token || token.length > MAX_TOKEN_LENGTH) return null;
    return /^[A-Za-z0-9_-]+$/.test(token) ? token : null;
}

/**
 * Whether a signed-in email could be the invited one, judged from the
 * masked hint ("j***@gmail.com": first letter + domain). Only a hint we
 * can read rules an email out; the API decides for real at accept time.
 */
export function emailMatchesHint(email: string | null | undefined, hint: string | null | undefined): boolean {
    if (!email) return false;
    const m = /^(.)\*{3}(@.+)$/.exec(hint?.trim() ?? '');
    if (!m) return true;
    const normalized = email.trim().toLowerCase();
    return normalized.startsWith(m[1].toLowerCase()) && normalized.endsWith(m[2].toLowerCase());
}

/** Everything the page can show; one at a time. */
export type InvitationView =
    | 'createPassword'
    | 'signIn'
    | 'accept'
    | 'otherAccount'
    | 'expired'
    | 'revoked'
    | 'accepted'
    | 'invalid'
    | 'alreadyMember'
    | 'otherTeam'
    | 'fanAccount'
    | 'notEligible';

/** Views that still lead to joining (the invitation is live). */
export const LIVE_VIEWS: readonly InvitationView[] = ['createPassword', 'signIn', 'accept', 'otherAccount'];

/**
 * The view for a preview, given who is signed in here (null: nobody).
 * A live invitation for an email with no login asks for a password; one
 * with a login asks to sign in; someone already signed in accepts, unless
 * it is clearly another person (no login exists for the invited email,
 * or the email does not fit the hint).
 */
export function viewForPreview(
    preview: Pick<InvitationPreview, 'state' | 'accountExists' | 'emailHint'>,
    sessionEmail: string | null,
): InvitationView {
    if (preview.state !== 'valid') return preview.state;
    if (sessionEmail) {
        return preview.accountExists !== false && emailMatchesHint(sessionEmail, preview.emailHint)
            ? 'accept'
            : 'otherAccount';
    }
    return preview.accountExists ? 'signIn' : 'createPassword';
}

/** Inline messages on the create-password / sign-in / accept forms. */
export type InvitationMessageKey =
    | 'weakPassword'
    | 'termsRequired'
    | 'authUnavailable'
    | 'accountConflict'
    | 'tooManyAttempts'
    | 'network'
    | 'server'
    | 'generic';

export type InvitationOutcome =
    | { kind: 'view'; view: InvitationView; note?: 'accountExists' }
    | { kind: 'message'; key: InvitationMessageKey };

const VIEW_BY_CODE: Record<string, InvitationView> = {
    INVITATION_INVALID: 'invalid',
    INVITATION_EXPIRED: 'expired',
    INVITATION_REVOKED: 'revoked',
    INVITATION_ACCEPTED: 'accepted',
    INVITATION_EMAIL_MISMATCH: 'otherAccount',
    EMAIL_IS_FAN_ACCOUNT: 'fanAccount',
    ACCOUNT_NOT_ELIGIBLE: 'notEligible',
    ACCOUNT_DELETED: 'notEligible',
    ALREADY_MEMBER: 'alreadyMember',
    ALREADY_IN_ANOTHER_TEAM: 'otherTeam',
};

const MESSAGE_BY_CODE: Record<string, InvitationMessageKey> = {
    WEAK_PASSWORD: 'weakPassword',
    TERMS_REQUIRED: 'termsRequired',
    AUTH_UNAVAILABLE: 'authUnavailable',
    ACCOUNT_CONFLICT: 'accountConflict',
    RATE_LIMITED: 'tooManyAttempts',
};

/**
 * What a failed claim-account or accept call means for the page: another
 * view (the invitation changed, or the account cannot join), or a message
 * on the current form. Never the API's own text.
 */
export function invitationOutcome(err: unknown): InvitationOutcome {
    const e = (err && typeof err === 'object' ? err : {}) as { code?: unknown; status?: unknown };
    const code = typeof e.code === 'string' ? e.code : '';
    if (code === 'ACCOUNT_EXISTS') return { kind: 'view', view: 'signIn', note: 'accountExists' };
    const view = VIEW_BY_CODE[code];
    if (view) return { kind: 'view', view };
    const message = MESSAGE_BY_CODE[code];
    if (message) return { kind: 'message', key: message };
    if (e.status === 429) return { kind: 'message', key: 'tooManyAttempts' };
    switch (apiErrorKind(err)) {
        case 'network': return { kind: 'message', key: 'network' };
        case 'server': return { kind: 'message', key: 'server' };
        default: return { kind: 'message', key: 'generic' };
    }
}

/** Views after a failed accept that leave the person without this team: keep the session only if it has a panel. */
export function isDeadEndView(view: InvitationView): boolean {
    return !LIVE_VIEWS.includes(view);
}

/** bcrypt (Supabase) reads 72 bytes at most; the API refuses longer passwords. */
export const PASSWORD_MAX_BYTES = 72;

export function passwordTooLong(password: string): boolean {
    return new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES;
}

/** Where the person lands after joining (staff work from the scanner). */
export function landingPathFor(role: OrgRole | string | null | undefined): string {
    return role === 'staff' ? '/staff' : '/dashboard';
}
