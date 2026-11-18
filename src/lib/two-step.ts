/**
 * Two-step verification (authenticator app, TOTP via Supabase `auth.mfa`).
 *
 * Owner decisions 2026-11-17:
 *  - Fandi Admin (users.role 'admin'): always.
 *  - Idol teams: REQUIRED for owner/admin after 14 days of reminders (the
 *    API sends the date as `mfa.requiredAfter` on /users/sync and answers
 *    403 MFA_REQUIRED after it), OPTIONAL for viewer/staff.
 *  - Anyone with a verified factor is asked for the 6-digit code at sign-in.
 *
 * Pure (no Supabase import) so the rules run under `node --test`; the
 * auth context and the pages pass the facts in.
 */
import type { UserSyncResponse } from '../types/api';

/** The sign-in step: enter the code, or turn it on when it is required now. */
export const VERIFICATION_PATH = '/verificacion';

/** Where the factor is managed inside each area. */
export const DASHBOARD_SECURITY_PATH = '/dashboard/settings#verificacion';
export const ADMIN_SECURITY_PATH = '/admin/security';

export const TOTP_CODE_LENGTH = 6;

export interface MfaRequirement {
    required: boolean;
    requiredAfter: string | null;
}

export interface TwoStepFacts {
    /** users.role ('admin' = Fandi Admin). */
    role: UserSyncResponse['role'] | string;
    /** From /users/sync; absent on an API without two-step support. */
    mfa?: MfaRequirement | null;
    /** The session's assurance level ('aal2' = the code was verified). */
    currentLevel: string | null;
    /** The account has a verified factor (Supabase nextLevel 'aal2'). */
    hasVerifiedFactor: boolean;
}

export type TwoStepGate =
    /** Nothing to do. */
    | { kind: 'ok' }
    /** The account has a factor and this session has not used it: ask the code. */
    | { kind: 'verify' }
    /** No factor and it is required now: turn it on before anything else. */
    | { kind: 'enrol' }
    /** Owner/admin in the reminder period: banner with the date. */
    | { kind: 'remind'; deadline: string };

function deadlineOf(mfa: MfaRequirement | null | undefined): Date | null {
    if (!mfa?.required || !mfa.requiredAfter) return null;
    const d = new Date(mfa.requiredAfter);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** Is it required for this account right now (no reminder period left)? */
export function twoStepRequiredNow(facts: Pick<TwoStepFacts, 'role' | 'mfa'>, now: Date = new Date()): boolean {
    if (facts.role === 'admin') return true;
    const deadline = deadlineOf(facts.mfa);
    return deadline !== null && now.getTime() >= deadline.getTime();
}

/** Required for this role at all (now or after the reminder period)? */
export function twoStepRequiredForRole(facts: Pick<TwoStepFacts, 'role' | 'mfa'>): boolean {
    return facts.role === 'admin' || deadlineOf(facts.mfa) !== null;
}

/**
 * What a protected area must do before rendering. The API stays the
 * authority (403 MFA_REQUIRED routes to the same step), so a wrong clock
 * here only moves the banner, never opens anything.
 */
export function twoStepGate(facts: TwoStepFacts, now: Date = new Date()): TwoStepGate {
    if (facts.hasVerifiedFactor) {
        return facts.currentLevel === 'aal2' ? { kind: 'ok' } : { kind: 'verify' };
    }
    if (twoStepRequiredNow(facts, now)) return { kind: 'enrol' };
    const deadline = deadlineOf(facts.mfa);
    if (deadline) return { kind: 'remind', deadline: deadline.toISOString() };
    return { kind: 'ok' };
}

/** What the verification page shows for these facts. */
export type VerificationStep = 'verify' | 'enrol' | 'done';

/**
 * The verification page never bounces someone back while the API would
 * refuse them: with a factor it asks the code until the session is aal2,
 * without one it offers to turn it on whenever the role needs it (even in
 * the reminder period, e.g. after a 403 from a clock ahead of ours).
 */
export function verificationStep(facts: TwoStepFacts): VerificationStep {
    if (facts.hasVerifiedFactor) return facts.currentLevel === 'aal2' ? 'done' : 'verify';
    return twoStepRequiredForRole(facts) ? 'enrol' : 'done';
}

/** How Configuración describes the requirement for this account. */
export type TwoStepRequirementLabel = 'admin' | 'required' | 'requiredFrom' | 'optional';

export function twoStepRequirementLabel(
    facts: Pick<TwoStepFacts, 'role' | 'mfa'>,
    now: Date = new Date(),
): TwoStepRequirementLabel {
    if (facts.role === 'admin') return 'admin';
    const deadline = deadlineOf(facts.mfa);
    if (!deadline) return 'optional';
    return now.getTime() >= deadline.getTime() ? 'required' : 'requiredFrom';
}

/** `/verificacion?next=<path>` (the path stays inside the app). */
export function verificationUrl(next: string | null | undefined): string {
    if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith(VERIFICATION_PATH)) {
        return VERIFICATION_PATH;
    }
    return `${VERIFICATION_PATH}?next=${encodeURIComponent(next)}`;
}

/** Digits only, at most 6 ("123 456" pasted from an app works). */
export function normalizeTotpCode(input: string): string {
    return input.replace(/\D/g, '').slice(0, TOTP_CODE_LENGTH);
}

export function isCompleteTotpCode(code: string): boolean {
    return new RegExp(`^\\d{${TOTP_CODE_LENGTH}}$`).test(code);
}

/** The secret in groups of 4 for typing it by hand ("ABCD EFGH ..."). */
export function groupSecret(secret: string): string {
    return secret.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Supabase returns the QR as `data:image/svg+xml;utf-8,<svg ...>` with the
 * SVG unescaped; encode it so `#` or quotes inside cannot cut the URL.
 */
export function qrImageSrc(qr: string): string {
    const prefix = 'data:image/svg+xml;utf-8,';
    const svg = qr.startsWith(prefix) ? qr.slice(prefix.length) : qr.trimStart().startsWith('<') ? qr : null;
    if (svg === null) return qr;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** A unique name per enrolment (Supabase refuses two factors with one name). */
export function factorFriendlyName(now: Date = new Date()): string {
    return `Fandi ${now.toISOString().slice(0, 16).replace('T', ' ')}`;
}

// ── Error → copy key ──

export type TwoStepErrorKey =
    | 'disabled'
    | 'wrongCode'
    | 'codeExpired'
    | 'tooManyFactors'
    | 'needsCode'
    | 'sessionExpired'
    | 'tooManyAttempts'
    | 'networkError'
    | 'failed';

interface ErrorLike {
    name?: unknown;
    code?: unknown;
    status?: unknown;
    message?: unknown;
}

/** Maps a Supabase `auth.mfa` failure to a `twoStep.errors.*` key. */
export function twoStepErrorKey(err: unknown): TwoStepErrorKey {
    const e = (err && typeof err === 'object' ? err : {}) as ErrorLike;
    const code = typeof e.code === 'string' ? e.code : '';
    const status = typeof e.status === 'number' ? e.status : -1;
    const name = typeof e.name === 'string' ? e.name : '';
    const message = typeof e.message === 'string' ? e.message.toLowerCase() : '';

    // TOTP switched off in the Supabase project (Authentication → MFA).
    if (
        code === 'mfa_totp_enroll_not_enabled' ||
        code === 'mfa_totp_verify_not_enabled' ||
        ((message.includes('mfa') || message.includes('totp')) && message.includes('disabled'))
    ) {
        return 'disabled';
    }
    if (code === 'mfa_verification_failed' || code === 'mfa_verification_rejected' || message.includes('invalid totp')) {
        return 'wrongCode';
    }
    if (code === 'mfa_challenge_expired' || code === 'mfa_factor_not_found') return 'codeExpired';
    if (code === 'too_many_enrolled_mfa_factors') return 'tooManyFactors';
    if (code === 'insufficient_aal') return 'needsCode';
    if (
        name === 'AuthSessionMissingError' ||
        code === 'session_not_found' ||
        code === 'session_expired' ||
        code === 'bad_jwt' ||
        status === 401
    ) {
        return 'sessionExpired';
    }
    if (status === 429 || (code.startsWith('over_') && code.endsWith('_rate_limit'))) return 'tooManyAttempts';
    if (
        name === 'AuthRetryableFetchError' ||
        status === 0 ||
        message.includes('failed to fetch') ||
        message.includes('network')
    ) {
        return 'networkError';
    }
    return 'failed';
}
