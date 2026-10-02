/**
 * Pure helpers for the account flows (login, forgot/reset password, invite
 * accept, change password). No Supabase import here so the rules can be
 * unit-tested with `node --test`; the pages pass errors/URLs in.
 */
import type { UserSyncResponse } from '../types/api';

/** One rule for every "new password" form (reset, invite, settings). */
export const PASSWORD_MIN_LENGTH = 8;

export type NewPasswordProblem = 'tooShort' | 'mismatch';

export function validateNewPassword(password: string, confirm: string): NewPasswordProblem | null {
    if (password.length < PASSWORD_MIN_LENGTH) return 'tooShort';
    if (password !== confirm) return 'mismatch';
    return null;
}

/** The live checklist under a "new password" form (ticks as the person types). */
export function newPasswordChecks(password: string, confirm: string): { length: boolean; match: boolean } {
    return {
        length: password.length >= PASSWORD_MIN_LENGTH,
        match: confirm.length > 0 && password === confirm,
    };
}

export type PasswordChangeProblem = 'currentRequired' | NewPasswordProblem | 'sameAsCurrent';

/** Settings → change password: current one first, then the new-password rules. */
export function validatePasswordChange(
    current: string,
    password: string,
    confirm: string,
): PasswordChangeProblem | null {
    if (!current) return 'currentRequired';
    const problem = validateNewPassword(password, confirm);
    if (problem) return problem;
    if (password === current) return 'sameAsCurrent';
    return null;
}

/** Loose "looks like an email" check before calling Supabase or the API (they validate for real). */
export function looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Where the recovery email sends people back to (must be in Supabase's Redirect URLs). */
export function resetPasswordRedirectUrl(origin: string): string {
    return `${origin.replace(/\/+$/, '')}/reset-password`;
}

// ── Dashboard access (after a CORRECT password) ──

export type DashboardAccess = 'ok' | 'fan' | 'noOrg';

/**
 * Who may enter the panel. Fans never do (the panel is for idols and their
 * teams); everyone else needs an organization membership.
 */
export function dashboardAccessOf(user: Pick<UserSyncResponse, 'role' | 'organization'>): DashboardAccess {
    if (user.role === 'fan') return 'fan';
    if (!user.organization) return 'noOrg';
    return 'ok';
}

/**
 * Thrown by `login()` when the password was right but the account has no
 * panel. Saying why is safe at that point (the caller proved they own the
 * account), unlike a wrong-password failure.
 */
export class DashboardAccessError extends Error {
    readonly reason: Exclude<DashboardAccess, 'ok'>;

    constructor(reason: Exclude<DashboardAccess, 'ok'>) {
        super('NO_DASHBOARD_ACCESS');
        this.name = 'DashboardAccessError';
        this.reason = reason;
    }
}

/**
 * Thrown by `login()` when the password was right but our API (`/users/sync`)
 * did not answer. The Supabase session is closed before this is thrown, so
 * nothing stays half signed in.
 */
export class SyncFailedError extends Error {
    /** True for "could not reach Fandi" (offline, timeout, 5xx, restarting API). */
    readonly unavailable: boolean;

    constructor(cause: unknown) {
        super('SYNC_FAILED');
        this.name = 'SyncFailedError';
        this.unavailable = isTransientApiError(cause);
    }
}

/** Network failure, timeout or 5xx: worth one more try, and "try again later" copy. */
export function isTransientApiError(err: unknown): boolean {
    const { status } = errorFields(err);
    return isNetworkError(err) || status >= 500;
}

/**
 * Runs `fn`; if it fails with a transient API error, waits `delayMs` and
 * tries exactly once more. Other errors are rethrown straight away.
 */
export async function withOneRetry<T>(
    fn: () => Promise<T>,
    delayMs = 1000,
    wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<T> {
    try {
        return await fn();
    } catch (err) {
        if (!isTransientApiError(err)) throw err;
        await wait(delayMs);
        return fn();
    }
}

/**
 * Page load with an existing session whose `/users/sync` failed: only an
 * actual rejection (401/403/…) closes the session. Offline, timeout, 5xx or
 * a restarting API keep it and offer a retry, so a deploy logs nobody out.
 */
export function sessionSyncFailure(err: unknown): 'keepAndRetry' | 'signOut' {
    return isTransientApiError(err) ? 'keepAndRetry' : 'signOut';
}

// ── Error → copy key ──

/** Duck-typed Supabase AuthError / our ApiError. */
interface ErrorLike {
    name?: unknown;
    code?: unknown;
    status?: unknown;
    message?: unknown;
}

function errorFields(err: unknown): { name: string; code: string; status: number; message: string } {
    const e = (err && typeof err === 'object' ? err : {}) as ErrorLike;
    return {
        name: typeof e.name === 'string' ? e.name : '',
        code: typeof e.code === 'string' ? e.code : '',
        status: typeof e.status === 'number' ? e.status : -1,
        message: typeof e.message === 'string' ? e.message.toLowerCase() : '',
    };
}

function isNetworkError(err: unknown): boolean {
    const { name, code, status, message } = errorFields(err);
    return (
        name === 'AuthRetryableFetchError' ||
        code === 'NETWORK_ERROR' ||
        status === 0 ||
        message.includes('failed to fetch') ||
        message.includes('network')
    );
}

function isRateLimited(err: unknown): boolean {
    const { code, status } = errorFields(err);
    return status === 429 || (code.startsWith('over_') && code.endsWith('_rate_limit'));
}

export type LoginErrorKey =
    | 'invalidCredentials'
    | 'noAccessFan'
    | 'noAccessNoOrg'
    | 'emailNotConfirmed'
    | 'tooManyAttempts'
    | 'networkError'
    | 'apiUnavailable'
    | 'loginFailed';

/**
 * Maps a login failure to an `auth.*` message key. Anything that is not
 * clearly "password was right but…" stays the neutral invalidCredentials,
 * so the form never reveals whether an email has an account.
 */
export function loginErrorKey(err: unknown): LoginErrorKey {
    if (err instanceof DashboardAccessError) {
        return err.reason === 'fan' ? 'noAccessFan' : 'noAccessNoOrg';
    }
    if (err instanceof SyncFailedError) {
        return err.unavailable ? 'apiUnavailable' : 'loginFailed';
    }
    const { code } = errorFields(err);
    // GoTrue only reports this after the password matched.
    if (code === 'email_not_confirmed') return 'emailNotConfirmed';
    if (isRateLimited(err)) return 'tooManyAttempts';
    if (isNetworkError(err)) return 'networkError';
    return 'invalidCredentials';
}

export type PasswordUpdateErrorKey =
    | 'samePassword'
    | 'weakPassword'
    | 'reauthNeeded'
    | 'linkExpired'
    | 'tooManyAttempts'
    | 'networkError'
    | 'updateFailed';

export type ResetRequestOutcome = 'sent' | 'tooManyAttempts' | 'networkError';

/**
 * Forgot password: what to tell the person after `resetPasswordForEmail`.
 * Anything that is not a rate limit or a dead connection reads as "sent",
 * so the screen never says whether that email has an account.
 */
export function resetRequestOutcome(err: unknown): ResetRequestOutcome {
    if (!err) return 'sent';
    if (isRateLimited(err)) return 'tooManyAttempts';
    if (isNetworkError(err)) return 'networkError';
    return 'sent';
}

export type CurrentPasswordErrorKey = 'currentWrong' | 'tooManyAttempts' | 'networkError';

/** Settings → change password: the check of the current password failed. */
export function currentPasswordErrorKey(err: unknown): CurrentPasswordErrorKey {
    if (isRateLimited(err)) return 'tooManyAttempts';
    if (isNetworkError(err)) return 'networkError';
    return 'currentWrong';
}

/** An email link that came back with an error: expired, or otherwise unusable. */
export function authLinkProblem(errorCode: string | null): 'expired' | 'invalid' {
    return errorCode === 'otp_expired' ? 'expired' : 'invalid';
}

/** Maps a `supabase.auth.updateUser({ password })` failure to a message key. */
export function passwordUpdateErrorKey(err: unknown): PasswordUpdateErrorKey {
    const { name, code, status } = errorFields(err);
    if (code === 'same_password') return 'samePassword';
    if (code === 'weak_password' || name === 'AuthWeakPasswordError') return 'weakPassword';
    if (code === 'reauthentication_needed' || code === 'reauthentication_not_valid') return 'reauthNeeded';
    if (
        name === 'AuthSessionMissingError' ||
        code === 'session_not_found' ||
        code === 'session_expired' ||
        code === 'bad_jwt' ||
        code === 'user_not_found' ||
        status === 401
    ) {
        return 'linkExpired';
    }
    if (isRateLimited(err)) return 'tooManyAttempts';
    if (isNetworkError(err)) return 'networkError';
    return 'updateFailed';
}

// ── Recovery / invite link parsing ──

export type AuthLink =
    | { kind: 'tokens'; accessToken: string; refreshToken: string; type: string | null }
    | { kind: 'tokenHash'; tokenHash: string; type: string }
    | { kind: 'code'; code: string }
    | { kind: 'error'; errorCode: string | null }
    | { kind: 'none' };

/**
 * Reads what Supabase put on the redirect URL. Handles the three shapes a
 * recovery/invite email can land with:
 *   - implicit flow:  #access_token=…&refresh_token=…&type=recovery
 *   - custom template: ?token_hash=…&type=recovery
 *   - PKCE flow:      ?code=…
 * and the failure shape (#error=access_denied&error_code=otp_expired…),
 * which Supabase sends in the hash or the query.
 */
export function parseAuthLink(href: string): AuthLink {
    let url: URL;
    try {
        url = new URL(href);
    } catch {
        return { kind: 'none' };
    }
    const hash = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
    const query = url.searchParams;
    const get = (key: string) => hash.get(key) ?? query.get(key);

    if (get('error') || get('error_code') || get('error_description')) {
        return { kind: 'error', errorCode: get('error_code') };
    }

    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    if (accessToken && refreshToken) {
        return { kind: 'tokens', accessToken, refreshToken, type: hash.get('type') };
    }

    const tokenHash = query.get('token_hash');
    if (tokenHash) {
        return { kind: 'tokenHash', tokenHash, type: query.get('type') ?? 'recovery' };
    }

    const code = query.get('code');
    if (code) return { kind: 'code', code };

    return { kind: 'none' };
}
