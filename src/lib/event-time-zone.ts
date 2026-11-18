/**
 * Event times in the EVENT's zone, whatever the browser's.
 *
 * Every datetime is stored and sent as an instant (ISO with Z). People read
 * and type it on the wall clock of the city where the event happens: an
 * organizer on a laptop in Madrid who types "21:00" for a concert in
 * Medellín means 21:00 in Medellín, not in Madrid. `new Date(local)` and
 * `getHours()` would use the computer's zone and move the event by hours,
 * so nothing here does.
 *
 * Intl is only used to read the wall clock of an instant in a zone. When
 * the zone is missing or unknown (or Intl has no zone data), everything
 * falls back to America/Bogota's fixed UTC-5 (Colombia has had no DST
 * since 1993), the only zone venues use today. Mirrors fandi-api
 * `src/common/event-time.ts`. Pure (no React), for node --test.
 */

export const DEFAULT_EVENT_ZONE = 'America/Bogota';
const BOGOTA_OFFSET_MINUTES = -5 * 60;

type InstantLike = string | number | Date | null | undefined;

interface WallClock {
    year: number;
    /** 1-12 */
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat | null>();

function partsFormatter(zone: string): Intl.DateTimeFormat | null {
    if (!partsFormatters.has(zone)) {
        let fmt: Intl.DateTimeFormat | null = null;
        try {
            fmt = new Intl.DateTimeFormat('en-US', {
                timeZone: zone,
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hourCycle: 'h23',
            });
        } catch {
            fmt = null; // RangeError: unknown zone
        }
        partsFormatters.set(zone, fmt);
    }
    return partsFormatters.get(zone) ?? null;
}

function toMs(value: InstantLike): number {
    if (value === null || value === undefined || value === '') return NaN;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    return Date.parse(value);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A real IANA zone this runtime knows ("America/Bogota"), not an empty or made-up one. */
export function isValidTimeZone(zone: unknown): zone is string {
    return typeof zone === 'string' && zone.trim() !== '' && partsFormatter(zone) !== null;
}

/** The zone to use for an event: its own when valid, else Bogotá. */
export function resolveEventZone(zone?: string | null): string {
    return isValidTimeZone(zone) ? zone : DEFAULT_EVENT_ZONE;
}

function fixedBogota(ms: number): WallClock {
    const d = new Date(ms + BOGOTA_OFFSET_MINUTES * 60_000);
    return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
        hour: d.getUTCHours(),
        minute: d.getUTCMinutes(),
        second: d.getUTCSeconds(),
    };
}

/** The wall clock `ms` reads in `zone` (fixed UTC-5 when unreadable). */
function wallClockOf(ms: number, zone: string): WallClock {
    const fmt = partsFormatter(zone);
    if (fmt) {
        try {
            const p: Record<string, string> = {};
            for (const part of fmt.formatToParts(ms)) p[part.type] = part.value;
            const wc = {
                year: Number(p.year),
                month: Number(p.month),
                day: Number(p.day),
                hour: Number(p.hour) % 24, // some engines write midnight as 24
                minute: Number(p.minute),
                second: Number(p.second),
            };
            if (Object.values(wc).every(Number.isFinite)) return wc;
        } catch {
            // fall through to the fixed offset
        }
    }
    return fixedBogota(ms);
}

/**
 * Minutes east of UTC that `zone` is at `instant` (Bogotá: -300). DST-aware:
 * Madrid is +60 in January and +120 in July.
 */
export function zoneOffsetMinutes(instant: InstantLike, zone?: string | null): number {
    let ms = toMs(instant);
    if (!Number.isFinite(ms)) ms = Date.now();
    const wc = wallClockOf(ms, resolveEventZone(zone));
    const asUtc = Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, wc.second);
    return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000);
}

/** "UTC-5", "UTC+5:30", "UTC" (ASCII hyphen-minus, never a dash). */
export function formatUtcOffset(minutes: number): string {
    if (!Number.isFinite(minutes) || minutes === 0) return 'UTC';
    const sign = minutes < 0 ? '-' : '+';
    const abs = Math.abs(Math.round(minutes));
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `UTC${sign}${h}${m ? `:${pad(m)}` : ''}`;
}

/** The offset label of `zone` at `instant` (now when missing): "UTC-5". */
export function zoneOffsetLabel(zone?: string | null, instant?: InstantLike): string {
    return formatUtcOffset(zoneOffsetMinutes(instant ?? Date.now(), zone));
}

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * A datetime-local value ("YYYY-MM-DDTHH:MM") read on the wall clock of
 * `zone` → the instant as ISO with Z ("2026-12-05T02:00:00.000Z"). Null
 * when empty or not a real date/time. Independent of the browser's zone.
 * A wall time skipped by a DST change moves forward by the gap.
 */
export function zonedLocalToUtc(local: string | null | undefined, zone?: string | null): string | null {
    if (!local) return null;
    const m = LOCAL_RE.exec(local.trim());
    if (!m) return null;
    const [year, month, day, hour, minute] = m.slice(1, 6).map(Number);
    const second = m[6] ? Number(m[6]) : 0;
    if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59 || day < 1) return null;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day > daysInMonth) return null;

    const z = resolveEventZone(zone);
    // The wall clock read as if it were UTC; the instant is that minus the
    // zone's offset. Try the offsets in force a day before and a day after
    // (they differ only around a DST change) and keep the ones that read
    // back as this wall clock: the earlier when the hour repeats, and the
    // offset from before the change when the hour does not exist (so the
    // time moves forward by the gap, like Temporal's "compatible").
    const wall = Date.UTC(year, month - 1, day, hour, minute, second);
    const before = zoneOffsetMinutes(wall - 86_400_000, z);
    const after = zoneOffsetMinutes(wall + 86_400_000, z);
    const valid = [...new Set([before, after])]
        .map((offset) => wall - offset * 60_000)
        .filter((ms) => wall - zoneOffsetMinutes(ms, z) * 60_000 === ms)
        .sort((a, b) => a - b);
    const ms = valid[0] ?? wall - before * 60_000;
    return new Date(ms).toISOString();
}

/** An instant → the datetime-local value ("YYYY-MM-DDTHH:MM") on `zone`'s wall clock; '' when empty/invalid. */
export function utcToZonedLocal(iso: InstantLike, zone?: string | null): string {
    const ms = toMs(iso);
    if (!Number.isFinite(ms)) return '';
    const wc = wallClockOf(ms, resolveEventZone(zone));
    return `${wc.year}-${pad(wc.month)}-${pad(wc.day)}T${pad(wc.hour)}:${pad(wc.minute)}`;
}

/** next-intl locale → Intl tag ('es' → 'es-CO', 'en' → 'en-US'). */
export function intlLocaleTag(locale?: string | null): string {
    if (!locale || locale === 'es') return 'es-CO';
    if (locale === 'en') return 'en-US';
    return locale;
}

/**
 * Formats an instant on the event zone's wall clock with Intl options
 * (the zone always wins over any `timeZone` in `options`). Null when the
 * instant is missing or invalid.
 */
export function formatInEventZone(
    iso: InstantLike,
    zone: string | null | undefined,
    locale?: string | null,
    options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string | null {
    const ms = toMs(iso);
    if (!Number.isFinite(ms)) return null;
    const tag = intlLocaleTag(locale);
    try {
        return new Intl.DateTimeFormat(tag, { ...options, timeZone: resolveEventZone(zone) }).format(ms);
    } catch {
        // No zone data in this runtime: Bogotá's fixed offset, read as UTC.
        return new Intl.DateTimeFormat(tag, { ...options, timeZone: 'UTC' }).format(ms + BOGOTA_OFFSET_MINUTES * 60_000);
    }
}

/** "YYYY-MM-DD" of an instant in `zone` (for "is it today there?"). */
export function zonedDayKey(iso: InstantLike, zone?: string | null): string | null {
    const local = utcToZonedLocal(iso, zone);
    return local ? local.slice(0, 10) : null;
}

/** Both instants fall on the same calendar day in `zone`. */
export function sameZonedDay(a: InstantLike, b: InstantLike, zone?: string | null): boolean {
    const ka = zonedDayKey(a, zone);
    return ka !== null && ka === zonedDayKey(b, zone);
}

/** The computer's IANA zone, or null when the runtime cannot say. */
export function browserTimeZone(): string | null {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
        return null;
    }
}

/**
 * True when the computer's clock reads differently from the event zone's,
 * now or at any of `instants` (a laptop in New York matches Bogotá in
 * winter but not in July). A different zone with the same offset
 * (Lima, Panamá) shows the same hours, so it does not count.
 */
export function browserZoneDiffers(
    zone: string | null | undefined,
    instants: InstantLike[] = [],
    browserZone: string | null = browserTimeZone(),
    now: number = Date.now(),
): boolean {
    if (!isValidTimeZone(browserZone)) return false;
    const z = resolveEventZone(zone);
    if (browserZone === z) return false;
    const points = [now, ...instants.map(toMs).filter(Number.isFinite)];
    return points.some((p) => zoneOffsetMinutes(p, z) !== zoneOffsetMinutes(p, browserZone));
}

export type ZoneLabelKey = 'zoneLabel' | 'zoneLabelColombia' | 'zoneLabelEvent';

/**
 * Which `eventTime.*` label names the zone, with its params: "Hora de
 * Medellín (UTC-5)" when the city is known, "Hora de Colombia (UTC-5)"
 * for Bogotá's zone without a city (venues are Colombia-only), else "Hora
 * del evento (UTC+1)". The offset is the one at `instant` (now when missing).
 */
export function eventZoneLabel(
    zone: string | null | undefined,
    city: string | null | undefined,
    instant?: InstantLike,
): { key: ZoneLabelKey; city: string; offset: string } {
    const resolved = resolveEventZone(zone);
    const offset = zoneOffsetLabel(resolved, instant);
    const name = city?.trim() ?? '';
    if (name) return { key: 'zoneLabel', city: name, offset };
    if (resolved === DEFAULT_EVENT_ZONE) return { key: 'zoneLabelColombia', city: '', offset };
    return { key: 'zoneLabelEvent', city: '', offset };
}

/** The city name an event carries (the cities row first, then the legacy free text). */
export function eventCityName(
    event: { cityRef?: { name?: string | null } | null; city?: string | null } | null | undefined,
): string | null {
    const name = event?.cityRef?.name?.trim() || event?.city?.trim();
    return name || null;
}
