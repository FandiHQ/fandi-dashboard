/**
 * Turns an `ApiError` (see `lib/api.ts`) into a small set of kinds the pages
 * can map to plain copy. The API's own messages are English developer text
 * ("This user is already a member of the organization"), so they are never
 * shown to people as-is.
 *
 * Duck-typed (no import of `api.ts`) so it can be unit-tested with node --test.
 */
export type ApiErrorKind =
    | 'network'
    | 'forbidden'
    | 'notFound'
    | 'conflict'
    | 'invalid'
    | 'server'
    | 'unknown';

export function apiErrorKind(err: unknown): ApiErrorKind {
    const e = (err && typeof err === 'object' ? err : {}) as { status?: unknown; code?: unknown };
    const status = typeof e.status === 'number' ? e.status : -1;
    const code = typeof e.code === 'string' ? e.code : '';
    if (code === 'NETWORK_ERROR' || status === 0) return 'network';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'notFound';
    if (status === 409) return 'conflict';
    if (status === 400 || status === 422) return 'invalid';
    if (status >= 500) return 'server';
    return 'unknown';
}

/** The API's typed error code, when it sent one (e.g. LINEUP_ENTRY_IN_USE). */
export function apiErrorCode(err: unknown): string | null {
    const e = (err && typeof err === 'object' ? err : {}) as { code?: unknown };
    return typeof e.code === 'string' && e.code !== 'ERROR' && e.code !== 'NETWORK_ERROR' ? e.code : null;
}
