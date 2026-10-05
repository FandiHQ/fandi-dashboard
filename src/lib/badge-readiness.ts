/**
 * Badge gate (fandi-api events.service `computeBadgeReadiness`): an event
 * can't be published or go live until every badge it can award has an
 * active template. Oportunidades need winner + participation, impactos
 * participation only, subastas winner + participation. The API answers
 * 400 `EVENT_BADGES_NOT_READY` with `missingBadges` (same codes as the
 * pre-live stats), and the dashboard turns those codes into plain copy
 * plus a link to the event's Insignias tab.
 *
 * Duck-typed (no import of `api.ts`) so it can be unit-tested with node --test.
 */

export const BADGES_NOT_READY_CODE = 'EVENT_BADGES_NOT_READY';

/** API order; also the order the notice lists them in. */
export const MISSING_BADGE_CODES = [
    'experience_winner',
    'experience_participation',
    'auction_winner',
    'auction_participation',
] as const;

export type MissingBadgeCode = (typeof MISSING_BADGE_CODES)[number];

/** Known codes only, de-duplicated, in API order. */
export function knownMissingBadges(codes: readonly unknown[] | null | undefined): MissingBadgeCode[] {
    const present = new Set(codes ?? []);
    return MISSING_BADGE_CODES.filter((code) => present.has(code));
}

/**
 * `missingBadges` from an EVENT_BADGES_NOT_READY `ApiError`, or null when
 * the error is anything else. An empty list (unexpected body) still means
 * "badges are the problem", so the caller can show the generic notice.
 */
export function missingBadgesFromError(err: unknown): MissingBadgeCode[] | null {
    const e = (err && typeof err === 'object' ? err : {}) as { code?: unknown; details?: unknown };
    if (e.code !== BADGES_NOT_READY_CODE) return null;
    const details = (e.details && typeof e.details === 'object' ? e.details : {}) as { missingBadges?: unknown };
    return knownMissingBadges(Array.isArray(details.missingBadges) ? details.missingBadges : []);
}

/**
 * What the event header should warn about: the missing badges while the
 * event can still be published or go live (draft / published), [] once
 * it is live or ended, or while the stats are loading.
 */
export function badgeBlockers(
    status: string | null | undefined,
    stats: { badgesReady: boolean; missingBadges: readonly string[] } | null | undefined,
): MissingBadgeCode[] {
    if (!stats || stats.badgesReady) return [];
    if (status !== 'draft' && status !== 'published') return [];
    return knownMissingBadges(stats.missingBadges);
}

/** The event's Insignias tab. */
export function badgesTabPath(eventId: string): string {
    return `/dashboard/events/${eventId}/badges`;
}
