/**
 * Fandi Admin screens (fandi-api RFC invitations-and-admin): pure rules,
 * no React or axios, so they run under node --test. The pages turn API
 * error codes into their own copy (`fandiAdmin.errors.*`), never the API's
 * message, and build the query strings and payloads here.
 */

export const ADMIN_ORGS_PAGE_SIZE = 25;
export const ADMIN_TOPUPS_PAGE_SIZE = 50;
export const ADMIN_AUDIT_PAGE_SIZE = 50;
/** GET /admin/users needs at least this many characters (QUERY_TOO_SHORT). */
export const USER_SEARCH_MIN = 3;
/** KYC flag reason and decision notes: the API's DTO limits. */
export const KYC_REASON_MIN = 3;
export const KYC_REASON_MAX = 500;
export const IDOL_NAME_MAX = 255;
export const OWNER_NAME_MAX = 100;
export const EMAIL_MAX = 320;

// ── Errors → copy keys ──

export type AdminErrorKey =
    | 'adminRequired'
    | 'mfaRequired'
    | 'unknownCategory'
    | 'nothingToUpdate'
    | 'organizationNotFound'
    | 'emailRequired'
    | 'resendLimit'
    | 'invitationPending'
    | 'invitationNotPending'
    | 'queryTooShort'
    | 'userNotFound'
    | 'verificationNotFound'
    | 'notFound'
    | 'tooManyRequests'
    | 'invalid'
    | 'network'
    | 'server'
    | 'generic';

/** Every key above, for the copy test (each one must exist in es and en). */
export const ADMIN_ERROR_KEYS: readonly AdminErrorKey[] = [
    'adminRequired', 'mfaRequired', 'unknownCategory', 'nothingToUpdate', 'organizationNotFound',
    'emailRequired', 'resendLimit', 'invitationPending', 'invitationNotPending', 'queryTooShort',
    'userNotFound', 'verificationNotFound', 'notFound', 'tooManyRequests', 'invalid', 'network',
    'server', 'generic',
];

const CODE_KEYS: Record<string, AdminErrorKey> = {
    ADMIN_REQUIRED: 'adminRequired',
    MFA_REQUIRED: 'mfaRequired',
    UNKNOWN_CATEGORY: 'unknownCategory',
    NOTHING_TO_UPDATE: 'nothingToUpdate',
    ORGANIZATION_NOT_FOUND: 'organizationNotFound',
    EMAIL_REQUIRED: 'emailRequired',
    RESEND_LIMIT: 'resendLimit',
    INVITATION_PENDING: 'invitationPending',
    INVITATION_NOT_PENDING: 'invitationNotPending',
    QUERY_TOO_SHORT: 'queryTooShort',
    USER_NOT_FOUND: 'userNotFound',
    VERIFICATION_NOT_FOUND: 'verificationNotFound',
};

/** Duck-typed ApiError (lib/api.ts): { code, status }. */
function fields(err: unknown): { code: string; status: number } {
    const e = (err && typeof err === 'object' ? err : {}) as { code?: unknown; status?: unknown };
    return {
        code: typeof e.code === 'string' ? e.code : '',
        status: typeof e.status === 'number' ? e.status : -1,
    };
}

/**
 * The `fandiAdmin.errors.*` key for a failed admin call: the typed code
 * first, then the HTTP status (a 404 without a code, e.g. a top-up the
 * reconcile endpoint does not know; the throttler's bare 429; validation).
 */
export function adminErrorKey(err: unknown): AdminErrorKey {
    const { code, status } = fields(err);
    const byCode = CODE_KEYS[code];
    if (byCode) return byCode;
    if (code === 'NETWORK_ERROR' || status === 0) return 'network';
    if (status === 403) return 'adminRequired';
    if (status === 404) return 'notFound';
    if (status === 429) return 'tooManyRequests';
    if (status === 400 || status === 422) return 'invalid';
    if (status >= 500) return 'server';
    return 'generic';
}

/** RESEND_LIMIT carries `retryAt` (ISO) in its body (ApiError.details). */
export function resendRetryAt(err: unknown): string | null {
    const e = (err && typeof err === 'object' ? err : {}) as { details?: unknown };
    const details = e.details && typeof e.details === 'object' ? (e.details as Record<string, unknown>) : {};
    const value = details.retryAt;
    if (typeof value !== 'string') return null;
    return Number.isNaN(new Date(value).getTime()) ? null : value;
}

// ── Crear ídolo ──

export interface CreateIdolInput {
    name: string;
    categoryId: string;
    isPublic: boolean;
    ownerEmail: string;
    ownerName: string;
}

export interface CreateIdolPayload {
    name: string;
    categoryId?: string;
    isPublic: boolean;
    ownerEmail: string;
    ownerName?: string;
}

export type FieldProblem = 'required' | 'invalid' | 'tooLong';

export interface CreateIdolProblems {
    name?: FieldProblem;
    ownerEmail?: FieldProblem;
    ownerName?: FieldProblem;
}

/** Loose email check before the API (which validates for real). */
export function looksLikeEmailAddress(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function emailProblem(value: string, required: boolean): FieldProblem | undefined {
    const email = value.trim();
    if (!email) return required ? 'required' : undefined;
    if (email.length > EMAIL_MAX) return 'tooLong';
    return looksLikeEmailAddress(email) ? undefined : 'invalid';
}

/** Problems per field; null when the form can be sent. */
export function validateCreateIdol(input: CreateIdolInput): CreateIdolProblems | null {
    const problems: CreateIdolProblems = {};
    const name = input.name.trim();
    if (!name) problems.name = 'required';
    else if (name.length > IDOL_NAME_MAX) problems.name = 'tooLong';
    const email = emailProblem(input.ownerEmail, true);
    if (email) problems.ownerEmail = email;
    if (input.ownerName.trim().length > OWNER_NAME_MAX) problems.ownerName = 'tooLong';
    return Object.keys(problems).length > 0 ? problems : null;
}

/** The POST /admin/organizations body: trimmed, optional fields left out when empty. */
export function createIdolPayload(input: CreateIdolInput): CreateIdolPayload {
    const ownerName = input.ownerName.trim();
    return {
        name: input.name.trim(),
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        isPublic: input.isPublic,
        ownerEmail: input.ownerEmail.trim().toLowerCase(),
        ...(ownerName ? { ownerName } : {}),
    };
}

/**
 * The success state after Crear ídolo: the invitation went out, or the
 * org exists but the email did not (Resend down, sandbox sender): say so
 * and offer the resend. The API sends a boolean; 0/1 are tolerated.
 */
export function createdOutcome(result: { emailed: boolean | number | null | undefined }): 'sent' | 'notSent' {
    return result.emailed === true || result.emailed === 1 ? 'sent' : 'notSent';
}

// ── Owner invitation ──

export interface OwnerInvitationLike {
    status: string;
    expiresAt: string;
    needsResend: boolean;
}

export type OwnerInvitationState = 'none' | 'pending' | 'needsResend' | 'expired';

/**
 * What the Ídolos list says about the owner invitation. `needsResend` is
 * a pending invitation without a live link (a legacy one from the
 * migration): it must be resent before anyone can use it.
 */
export function ownerInvitationState(
    invitation: OwnerInvitationLike | null | undefined,
    now: Date = new Date(),
): OwnerInvitationState {
    if (!invitation) return 'none';
    if (invitation.status === 'expired') return 'expired';
    const expires = new Date(invitation.expiresAt).getTime();
    if (!Number.isNaN(expires) && expires <= now.getTime()) return 'expired';
    if (invitation.needsResend) return 'needsResend';
    return 'pending';
}

export interface OwnerInvitationInput {
    email: string;
    name: string;
}

/**
 * The POST /admin/organizations/:id/owner-invitation body. Same email (or
 * none) = resend the current invitation ({}); another email = cancel it
 * and invite that one. An org with no invitation left needs an email.
 */
export function ownerInvitationPayload(
    input: OwnerInvitationInput,
    currentEmail: string | null | undefined,
): { email?: string; name?: string } {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    const current = (currentEmail ?? '').trim().toLowerCase();
    const changed = Boolean(email) && email !== current;
    return {
        ...(changed ? { email } : {}),
        ...(changed && name ? { name } : {}),
    };
}

export function validateOwnerInvitation(
    input: OwnerInvitationInput,
    currentEmail: string | null | undefined,
): { email?: FieldProblem; name?: FieldProblem } | null {
    const problems: { email?: FieldProblem; name?: FieldProblem } = {};
    const email = emailProblem(input.email, !currentEmail);
    if (email) problems.email = email;
    if (input.name.trim().length > OWNER_NAME_MAX) problems.name = 'tooLong';
    return Object.keys(problems).length > 0 ? problems : null;
}

// ── Paging, queries ──

export function pageCount(total: number, pageSize: number): number {
    if (!Number.isFinite(total) || total <= 0 || pageSize <= 0) return 1;
    return Math.ceil(total / pageSize);
}

/** "26 a 50 de 120": the rows this page shows (1-based); null when empty. */
export function pageRange(page: number, pageSize: number, total: number): { from: number; to: number } | null {
    if (total <= 0) return null;
    const from = (page - 1) * pageSize + 1;
    if (from > total) return null;
    return { from, to: Math.min(total, page * pageSize) };
}

/** Drops empty/undefined values so the query string only carries filters in use. */
export function cleanParams(params: Record<string, string | number | null | undefined>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        const text = String(value).trim();
        if (!text) continue;
        if (key === 'page' && text === '1') continue;
        out[key] = text;
    }
    return out;
}

export interface AuditFilters {
    action: string;
    targetType: string;
    targetId: string;
}

export function auditQueryParams(page: number, filters: AuditFilters): Record<string, string> {
    return cleanParams({
        page,
        action: filters.action,
        targetType: filters.targetType,
        targetId: filters.targetId,
    });
}

/** Whether the Fans search may run (the API refuses fewer than 3 characters). */
export function canSearchUsers(q: string): boolean {
    return q.trim().length >= USER_SEARCH_MIN;
}

// ── Formatting ──

/** "12 min", "2 h 05 min", "3 d 4 h": how long a top-up has waited. */
export function formatWaiting(minutes: number): string {
    const total = Math.max(0, Math.floor(Number.isFinite(minutes) ? minutes : 0));
    if (total < 60) return `${total} min`;
    const days = Math.floor(total / 1440);
    const hours = Math.floor((total % 1440) / 60);
    const mins = total % 60;
    if (days > 0) return hours > 0 ? `${days} d ${hours} h` : `${days} d`;
    return `${hours} h ${String(mins).padStart(2, '0')} min`;
}

/** A birth date ("YYYY-MM-DD") as written, in the reader's locale, no time zone shift. */
export function formatDateOnly(value: string | null | undefined, locale: string): string | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const d = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
        timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric',
    }).format(d);
}

/**
 * One line out of an audit row's `details` ("query: ana · results: 3"):
 * at most `maxEntries` keys, each value shortened; nested values as JSON.
 */
export function auditDetailsSummary(
    details: Record<string, unknown> | null | undefined,
    maxEntries = 3,
    maxValue = 40,
): string {
    if (!details || typeof details !== 'object') return '';
    const entries = Object.entries(details).filter(([, v]) => v !== undefined);
    const shorten = (text: string) => (text.length > maxValue ? `${text.slice(0, maxValue - 1)}…` : text);
    const parts = entries.slice(0, maxEntries).map(([key, value]) => {
        const text =
            value === null ? 'null'
                : typeof value === 'object' ? JSON.stringify(value)
                    : String(value);
        return `${key}: ${shorten(text)}`;
    });
    if (entries.length > maxEntries) parts.push(`+${entries.length - maxEntries}`);
    return parts.join(' · ');
}

/** The audit actions the API writes today (the filter's options). */
export const AUDIT_ACTIONS = [
    'org.create',
    'org.update',
    'org.owner_invite',
    'user.search',
    'user.view',
    'kyc.flag',
    'kyc.unflag',
    'kyc.decide',
    'topup.reconcile',
    'withdrawal.approve',
    'withdrawal.reject',
    'withdrawal.reconcile',
    'classification.category_create',
    'classification.category_rename',
    'classification.category_delete',
    'classification.idol_set',
] as const;

export const AUDIT_TARGET_TYPES = [
    'organization',
    'user',
    'kyc_verification',
    'topup',
    'withdrawal',
    'category',
] as const;

/**
 * The copy key of an audit action ("org.create" → "org_create": next-intl
 * reads dots as nesting); null for an action this panel does not know yet
 * (the raw code is shown then).
 */
export function auditActionKey(action: string): string | null {
    return (AUDIT_ACTIONS as readonly string[]).includes(action) ? action.replace(/\./g, '_') : null;
}

export function auditTargetKey(targetType: string | null | undefined): string | null {
    return targetType && (AUDIT_TARGET_TYPES as readonly string[]).includes(targetType) ? targetType : null;
}

/** Where an audit target can be opened in the admin area, when it has a page. */
export function auditTargetHref(targetType: string | null, targetId: string | null): string | null {
    if (!targetId) return null;
    if (targetType === 'user') return `/admin/fans/${encodeURIComponent(targetId)}`;
    return null;
}

// ── KYC ──

export const KYC_STATUSES = [
    'not_started', 'in_progress', 'in_review', 'approved', 'declined', 'expired', 'abandoned',
] as const;

export function kycStatusKey(status: string | null | undefined): string {
    return status && (KYC_STATUSES as readonly string[]).includes(status) ? status : 'none';
}

export function validKycReason(reason: string): boolean {
    const text = reason.trim();
    return text.length >= KYC_REASON_MIN && text.length <= KYC_REASON_MAX;
}

// ── Top-ups ──

export type ReconcileOutcome = 'completed' | 'failed' | 'expired' | 'pending';

/** POST /wallet/topups/:id/reconcile answers the top-up's status after the check. */
export function reconcileOutcome(status: string | null | undefined): ReconcileOutcome {
    if (status === 'completed' || status === 'failed' || status === 'expired') return status;
    return 'pending';
}
