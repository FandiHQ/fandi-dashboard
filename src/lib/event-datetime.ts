// Shared helpers for the event forms (Step 6.1) and the publish gate.
//
// `datetime-local` inputs hold "YYYY-MM-DDTHH:MM" with no zone. Here that
// value is ALWAYS the wall clock of the event's zone (event.timezone, or
// the chosen city's), never the browser's: see lib/event-time-zone.ts.
// Invariants compare instants, so they hold across a DST change too, and
// every value sent to the API is an ISO instant with Z.

import { utcToZonedLocal, zonedLocalToUtc } from './event-time-zone.ts';

export type EventDateFields = {
    eventDate?: string | null;
    eventEndDate?: string | null;
    fandiOpensAt?: string | null;
    fandiClosesAt?: string | null;
};

export type EventDateViolation =
    | 'EVENT_END_BEFORE_START'
    | 'FANDI_WINDOW_INVALID';

/** Publish gate codes, in the order the API checks them (events.service assertPublishable). */
export type EventPublishBlocker =
    | 'EVENT_END_REQUIRED'
    | 'EVENT_CITY_REQUIRED'
    | 'EVENT_TIMEZONE_REQUIRED'
    | 'FANDI_WINDOW_REQUIRED'
    | EventDateViolation;

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN);

function violationsOf(start: number, end: number, opens: number, closes: number): EventDateViolation[] {
    const v: EventDateViolation[] = [];
    if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
        v.push('EVENT_END_BEFORE_START');
    }
    // The Fandi window may open before the event and close after it: it is
    // NOT constrained to the event window, only its own span must be positive.
    if (Number.isFinite(opens) && Number.isFinite(closes) && opens >= closes) {
        v.push('FANDI_WINDOW_INVALID');
    }
    return v;
}

/**
 * Every cross-field invariant violated by the given (partial) form values,
 * datetime-local wall clocks in `timeZone`. A pair is only checked when
 * both ends are present, so a draft with an empty end / Fandi window is
 * valid here (the publish gate enforces presence). Mirror of the backend
 * `events.service` invariants.
 */
export function eventDateViolations(f: EventDateFields, timeZone?: string | null): EventDateViolation[] {
    const at = (local?: string | null) => ms(zonedLocalToUtc(local, timeZone));
    return violationsOf(at(f.eventDate), at(f.eventEndDate), at(f.fandiOpensAt), at(f.fandiClosesAt));
}

/** Same invariants, on the ISO instants an event carries. */
export function eventInstantViolations(f: EventDateFields): EventDateViolation[] {
    return violationsOf(ms(f.eventDate), ms(f.eventEndDate), ms(f.fandiOpensAt), ms(f.fandiClosesAt));
}

/**
 * Why a saved event cannot be published yet, first reason first (the
 * order of the API's checks): end date, city, its zone, the Fandi window,
 * then the date invariants. Empty = the dates and place allow publishing.
 */
export function eventPublishBlockers(event: EventDateFields & {
    cityId?: string | null;
    timezone?: string | null;
}): EventPublishBlocker[] {
    const blockers: EventPublishBlocker[] = [];
    if (!event.eventEndDate) blockers.push('EVENT_END_REQUIRED');
    if (!event.cityId) blockers.push('EVENT_CITY_REQUIRED');
    else if (!event.timezone) blockers.push('EVENT_TIMEZONE_REQUIRED');
    if (!event.fandiOpensAt || !event.fandiClosesAt) blockers.push('FANDI_WINDOW_REQUIRED');
    return [...blockers, ...eventInstantViolations(event)];
}

/** ISO instant → datetime-local value ("YYYY-MM-DDTHH:MM") on the event zone's clock (Bogotá when unset). */
export function isoToDatetimeLocal(iso?: string | null, timeZone?: string | null): string {
    return utcToZonedLocal(iso, timeZone);
}

/** datetime-local value on the event zone's clock → ISO instant with Z, or undefined if empty/invalid. */
export function datetimeLocalToIso(v?: string | null, timeZone?: string | null): string | undefined {
    return zonedLocalToUtc(v, timeZone) ?? undefined;
}

/**
 * Whole days + remaining whole hours between two datetime-local values in
 * `timeZone` (real elapsed time, so a DST night counts its 23 or 25 h).
 * Returns null when either is missing or the span is non-positive.
 */
export function eventDurationParts(
    startLocal?: string | null,
    endLocal?: string | null,
    timeZone?: string | null,
): { days: number; hours: number } | null {
    const start = ms(zonedLocalToUtc(startLocal, timeZone));
    const end = ms(zonedLocalToUtc(endLocal, timeZone));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    const totalMinutes = Math.round((end - start) / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    return { days, hours };
}

/**
 * A countdown in seconds as the live room shows it: "6d 06:00:00" beyond a
 * day, "2:05:09" beyond an hour, else "05:09".
 */
export function formatRemaining(totalSeconds: number): string {
    const total = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
    const pad = (n: number) => String(n).padStart(2, '0');
    const d = Math.floor(total / 86_400);
    const h = Math.floor((total % 86_400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
