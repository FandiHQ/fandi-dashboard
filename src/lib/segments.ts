/**
 * Segments per shared event (fandi-api RFC §4): how a shared event's fans
 * split by affinity to the host and a guest idol. Pure helpers for the
 * bars; the numbers come from the API, which already hides small groups
 * from the guest ('<5', and 'hidden' for the group withheld with it).
 */
import type { ReportedCount, SegmentGroup } from '../types/api';

/** Host side first, then the overlap, the guest, and who we can't tell. */
export const SEGMENT_ORDER: readonly SegmentGroup[] = [
    'onlyHost',
    'both',
    'onlyGuest',
    'neither',
    'withoutConsent',
];

export interface SegmentBar {
    group: SegmentGroup;
    value: ReportedCount;
    /** 0–1 of the participants; null when the count is withheld. */
    share: number | null;
}

export function segmentBars(
    counts: Record<SegmentGroup, ReportedCount>,
    participants: number,
): SegmentBar[] {
    return SEGMENT_ORDER.map((group) => {
        const value = counts[group];
        const share =
            typeof value === 'number' && participants > 0 ? value / participants : null;
        return { group, value, share };
    });
}

/** Any group withheld, so the page can explain why. */
export function hasWithheld(counts: Record<SegmentGroup, ReportedCount>): boolean {
    return SEGMENT_ORDER.some((group) => typeof counts[group] !== 'number');
}

/** Whole percent, never "0 %" for a non-empty group. */
export function percentLabel(share: number | null): string | null {
    if (share === null) return null;
    if (share > 0 && share < 0.01) return '<1 %';
    return `${Math.round(share * 100)} %`;
}
