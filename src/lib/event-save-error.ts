/**
 * Create/edit event: which `events.*` message explains a failed save.
 * The API's typed codes win (they have their own copy); everything else is
 * mapped by kind, never shown as the API's raw English message.
 */
import { apiErrorCode, apiErrorKind } from './api-error-kind.ts';

const VALIDATION_CODES = new Set([
    'EVENT_END_BEFORE_START',
    'FANDI_OPENS_BEFORE_EVENT',
    'FANDI_CLOSES_AFTER_EVENT',
    'FANDI_WINDOW_INVALID',
    'EVENT_END_REQUIRED',
    'CONTEST_BANK_INCOMPLETE',
    // Publish gate: the zone comes from the city; Fandi needs both ends.
    'EVENT_CITY_REQUIRED',
    'EVENT_TIMEZONE_REQUIRED',
    'FANDI_WINDOW_REQUIRED',
    // A datetime the API could not read as an instant (no Z / offset).
    'INVALID_INSTANT',
]);

/** Field-level codes the form itself produces (zod superRefine). */
export function isEventValidationCode(message: string | undefined): message is string {
    return !!message && VALIDATION_CODES.has(message);
}

/**
 * The API's 400 for a datetime without an explicit zone (IsIsoInstant,
 * fandi-api common/validators). It is a validation message, not a typed
 * code, so it is recognised by its wording.
 */
export function isInstantFormatError(err: unknown): boolean {
    const e = (err && typeof err === 'object' ? err : {}) as { status?: unknown; message?: unknown };
    return (
        e.status === 400 &&
        typeof e.message === 'string' &&
        /ISO 8601/.test(e.message) &&
        /zona horaria/i.test(e.message)
    );
}

/**
 * The typed date/publish-gate code of a failed save or status change
 * (INVALID_INSTANT for the instant-format 400), or null.
 */
export function eventDateErrorCode(err: unknown): string | null {
    const code = apiErrorCode(err);
    if (code && VALIDATION_CODES.has(code)) return code;
    if (isInstantFormatError(err)) return 'INVALID_INSTANT';
    return null;
}

/** Returns a key inside the `events` namespace. */
export function eventSaveErrorKey(err: unknown): string {
    const code = apiErrorCode(err);
    if (code === 'LINEUP_ENTRY_IN_USE') return 'lineupInUse';
    const dateCode = eventDateErrorCode(err);
    if (dateCode) return `validation.${dateCode}`;
    switch (apiErrorKind(err)) {
        case 'network': return 'form.networkError';
        case 'forbidden': return 'form.noPermission';
        default: return 'form.saveError';
    }
}
