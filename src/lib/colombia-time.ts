/**
 * Dates on invitations ("vence el 24 de noviembre a las 3:40 p. m. (hora
 * de Colombia)"). Always in Colombia's zone, whatever the browser's, so
 * the panel says the same as the invitation email. Pure (Intl only), for
 * node --test.
 */
export const COLOMBIA_TIME_ZONE = 'America/Bogota';

export interface ColombiaDateTime {
    /** "24 de noviembre" (the year only when it is not the current one). */
    date: string;
    /** "3:40 p. m." / "3:40 PM". */
    time: string;
}

function yearIn(zone: string, d: Date): string {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric' }).format(d);
}

export function colombiaDateTime(
    value: string | Date | null | undefined,
    locale: string,
    now: Date = new Date(),
): ColombiaDateTime | null {
    if (!value) return null;
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return null;
    const tag = locale === 'en' ? 'en-US' : 'es-CO';
    const sameYear = yearIn(COLOMBIA_TIME_ZONE, d) === yearIn(COLOMBIA_TIME_ZONE, now);
    const date = new Intl.DateTimeFormat(tag, {
        timeZone: COLOMBIA_TIME_ZONE,
        day: 'numeric',
        month: 'long',
        ...(sameYear ? {} : { year: 'numeric' }),
    }).format(d);
    const time = new Intl.DateTimeFormat(tag, {
        timeZone: COLOMBIA_TIME_ZONE,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(d);
    return { date, time };
}
