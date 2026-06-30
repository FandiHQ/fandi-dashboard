// Shared helpers for the multi-day event forms (Step 6.1).
//
// `datetime-local` inputs produce "YYYY-MM-DDTHH:MM" in the browser's
// local time. The format is fixed-width and zero-padded, so lexicographic
// string comparison equals chronological comparison — the invariant checks
// below rely on that (and mirror the backend `assertEventDatesValid`).

export type EventDateFields = {
    eventDate?: string;
    eventEndDate?: string;
    fandiOpensAt?: string;
    fandiClosesAt?: string;
};

export type EventDateViolation =
    | 'EVENT_END_BEFORE_START'
    | 'FANDI_OPENS_BEFORE_EVENT'
    | 'FANDI_CLOSES_AFTER_EVENT'
    | 'FANDI_WINDOW_INVALID';

/**
 * Every cross-field invariant violated by the given (partial) datetimes.
 * A pair is only checked when both endpoints are present, so a draft with
 * an empty end / Fandi window is valid here (the publish gate enforces
 * presence). Mirror of the backend `events.service` invariants.
 */
export function eventDateViolations(f: EventDateFields): EventDateViolation[] {
    const v: EventDateViolation[] = [];
    const { eventDate, eventEndDate, fandiOpensAt, fandiClosesAt } = f;
    if (eventEndDate && eventDate && eventEndDate <= eventDate) {
        v.push('EVENT_END_BEFORE_START');
    }
    if (fandiOpensAt && eventDate && fandiOpensAt < eventDate) {
        v.push('FANDI_OPENS_BEFORE_EVENT');
    }
    if (fandiClosesAt && eventEndDate && fandiClosesAt > eventEndDate) {
        v.push('FANDI_CLOSES_AFTER_EVENT');
    }
    if (fandiOpensAt && fandiClosesAt && fandiOpensAt >= fandiClosesAt) {
        v.push('FANDI_WINDOW_INVALID');
    }
    return v;
}

/** ISO timestamp → datetime-local value ("YYYY-MM-DDTHH:MM") in local time. */
export function isoToDatetimeLocal(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours(),
    )}:${pad(d.getMinutes())}`;
}

/** datetime-local value (local time) → ISO timestamp, or undefined if empty/invalid. */
export function datetimeLocalToIso(v?: string): string | undefined {
    if (!v) return undefined;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
}

/**
 * Whole days + remaining whole hours between two datetime-local values.
 * Returns null when either is missing or the span is non-positive.
 */
export function eventDurationParts(
    startLocal?: string,
    endLocal?: string,
): { days: number; hours: number } | null {
    if (!startLocal || !endLocal) return null;
    const start = new Date(startLocal).getTime();
    const end = new Date(endLocal).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
    const totalMinutes = Math.round((end - start) / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    return { days, hours };
}
