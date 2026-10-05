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
]);

/** Field-level codes the form itself produces (zod superRefine). */
export function isEventValidationCode(message: string | undefined): message is string {
    return !!message && VALIDATION_CODES.has(message);
}

/** Returns a key inside the `events` namespace. */
export function eventSaveErrorKey(err: unknown): string {
    const code = apiErrorCode(err);
    if (code === 'LINEUP_ENTRY_IN_USE') return 'lineupInUse';
    if (code && VALIDATION_CODES.has(code)) return `validation.${code}`;
    switch (apiErrorKind(err)) {
        case 'network': return 'form.networkError';
        case 'forbidden': return 'form.noPermission';
        default: return 'form.saveError';
    }
}
