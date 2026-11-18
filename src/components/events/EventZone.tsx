'use client';

/**
 * Event times on the event zone's wall clock, with the label that says so
 * ("Hora de Medellín (UTC-5)"). The pure maths lives in
 * lib/event-time-zone.ts; this is the React + i18n glue every event screen
 * uses, so a laptop in Madrid never shifts or misreads an event in Medellín.
 */
import { useMemo, useSyncExternalStore } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import {
    browserZoneDiffers,
    eventZoneLabel,
    formatInEventZone,
    resolveEventZone,
    sameZonedDay,
    utcToZonedLocal,
    zonedLocalToUtc,
} from '@/lib/event-time-zone';

type InstantLike = string | number | Date | null | undefined;

const noopSubscribe = () => () => {};

/** False on the server render, true in the browser (the computer's zone is only known there). */
function useIsClient(): boolean {
    return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export interface EventTime {
    /** The zone in use (the event's, or Bogotá). */
    zone: string;
    city: string | null;
    /** "Hora de Medellín (UTC-5)", with the offset at `instant` (now when missing). */
    label: (instant?: InstantLike) => string;
    /** Intl formatting on the event clock (null for a missing instant). */
    format: (iso: InstantLike, options?: Intl.DateTimeFormatOptions) => string | null;
    /** Instant → datetime-local value on the event clock. */
    toLocal: (iso: InstantLike) => string;
    /** datetime-local value on the event clock → ISO instant with Z. */
    toUtc: (local: string | null | undefined) => string | null;
    /** Same calendar day in the event zone. */
    sameDay: (a: InstantLike, b: InstantLike) => boolean;
}

/** Formatting and labels for one event's zone. `zone` missing → Bogotá. */
export function useEventTime(zone: string | null | undefined, city?: string | null): EventTime {
    const t = useTranslations('eventTime');
    const locale = useLocale();
    const resolved = resolveEventZone(zone);
    const cityName = city?.trim() || null;
    return useMemo<EventTime>(() => ({
        zone: resolved,
        city: cityName,
        label: (instant) => {
            const l = eventZoneLabel(resolved, cityName, instant);
            return t(l.key, { city: l.city, offset: l.offset });
        },
        format: (iso, options) => formatInEventZone(iso, resolved, locale, options),
        toLocal: (iso) => utcToZonedLocal(iso, resolved),
        toUtc: (local) => zonedLocalToUtc(local, resolved),
        sameDay: (a, b) => sameZonedDay(a, b, resolved),
    }), [t, locale, resolved, cityName]);
}

/**
 * Under a datetime input: "Hora de Medellín (UTC-5)". The offset is the
 * one in force at the typed value (a DST zone changes it by date).
 */
export function ZoneHint({
    zone,
    city,
    local,
    className = 'text-muted-white',
}: {
    zone: string | null | undefined;
    city?: string | null;
    /** The input's datetime-local value, if any. */
    local?: string | null;
    className?: string;
}) {
    const time = useEventTime(zone, city);
    return (
        <p className={`font-space-mono text-[10px] font-bold uppercase tracking-[0.08em] ${className}`} data-testid="zone-hint">
            {time.label(time.toUtc(local) ?? undefined)}
        </p>
    );
}

/**
 * A list cell: "26 sept 2026 · 21:00" and, under it, "Hora de Medellín
 * (UTC-5)", both on the event's clock.
 */
export function EventWhen({
    iso,
    zone,
    city,
    labelClassName = 'text-muted-white',
}: {
    iso: string | null | undefined;
    zone: string | null | undefined;
    city?: string | null;
    labelClassName?: string;
}) {
    const time = useEventTime(zone, city);
    const date = time.format(iso, { day: 'numeric', month: 'short', year: 'numeric' });
    const clock = time.format(iso, { hour: '2-digit', minute: '2-digit', hour12: false });
    if (!date) return null;
    return (
        <span className="flex flex-col gap-0.5">
            <span>{clock ? `${date} · ${clock}` : date}</span>
            <span className={`text-[9px] tracking-[0.06em] ${labelClassName}`}>{time.label(iso)}</span>
        </span>
    );
}

/**
 * "Tu computador está en otra zona horaria; estas horas son de Medellín."
 * Only when the computer's clock reads differently from the event zone's,
 * now or at the given instants. Renders nothing on the server.
 */
export function BrowserZoneWarning({
    zone,
    city,
    instants = [],
    className = '',
}: {
    zone: string | null | undefined;
    city?: string | null;
    instants?: InstantLike[];
    className?: string;
}) {
    const t = useTranslations('eventTime');
    const isClient = useIsClient();
    if (!isClient || !browserZoneDiffers(zone, instants)) return null;
    const label = eventZoneLabel(zone, city);
    const message =
        label.key === 'zoneLabel'
            ? t('browserDiffers', { city: label.city })
            : label.key === 'zoneLabelColombia'
              ? t('browserDiffersColombia')
              : t('browserDiffersEvent');
    return (
        <p
            role="note"
            data-testid="browser-zone-warning"
            className={`flex items-start gap-2 rounded-[12px] border-2 border-ink bg-lilac px-3.5 py-2.5 text-[13px] font-semibold leading-snug text-ink ${className}`}
        >
            <Globe size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{message}</span>
        </p>
    );
}
