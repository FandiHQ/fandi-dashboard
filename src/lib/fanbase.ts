/**
 * Fanbase (fandi-api RFC §8): who an idol's fans are — aggregates only.
 * Response types of /dashboard/fanbase/* and the pure helpers the page
 * needs. The API already withholds small groups: "<5" is 1–4 fans and
 * "hidden" is a group withheld so a "<5" can't be recovered by
 * subtraction; neither ever gets a bar or a percentage here.
 */
import type { ReportedCount } from '../types/api';

export type { ReportedCount };
export type ReportedTotal = number | '<5';

// ─── API shapes ──────────────────────────────────────────────

export interface FanbaseOverview {
    generatedAt: string;
    totals: {
        fans: ReportedTotal;
        confirmed: ReportedCount;
        inferred: ReportedCount;
        viaCollaborations: ReportedTotal;
    };
    newPerMonth: { month: string; newFans: ReportedTotal }[];
    loyalty: {
        returning: ReportedCount;
        oneTime: ReportedCount;
        inactive90: ReportedTotal;
    };
    events: FanbaseEventPoint[];
}

export interface FanbaseEventPoint {
    eventId: string;
    name: string;
    date: string;
    hosted: boolean;
    fans: ReportedTotal;
    newFans: ReportedCount;
    returningFans: ReportedCount;
    cameBack: ReportedTotal;
}

export interface FanbaseCity {
    cityId: string;
    name: string;
    stateCode: string | null;
    countryCode: string;
    fans: number;
    played: boolean;
}

export interface FanbaseGeography {
    generatedAt: string;
    located: ReportedCount;
    unlocated: ReportedCount;
    cities: FanbaseCity[];
    otherCities: ReportedTotal;
    countries: { countryId: string; name: string; iso2: string | null; fans: number }[];
    otherCountries: ReportedTotal;
    demandGaps: FanbaseCity[];
}

export type ValueBucket = 'upTo20' | 'upTo60' | 'upTo200' | 'upTo1000' | 'over1000';
export type DynamicKind = 'oportunidad' | 'impacto' | 'subasta';

export interface FanbaseValue {
    generatedAt: string;
    payingFans: ReportedTotal;
    revenueCop: number;
    avgPerFanCop: number | null;
    distribution: { bucket: ValueBucket; fans: ReportedCount }[];
    byDynamicType: { type: DynamicKind; revenueCop: number; fans: ReportedTotal }[];
}

export interface FanbaseAlsoFollows {
    generatedAt: string;
    computedAt: string | null;
    minSharedFans: number;
    idols: {
        orgId: string;
        name: string;
        avatarUrl: string | null;
        sharedFans: number;
        jaccard: number;
    }[];
}

export interface FanbaseKnowledge {
    generatedAt: string;
    oportunidades: number;
    answers: number;
    accuracy: number | null;
    questions: {
        questionId: string;
        prompt: string;
        experienceId: string;
        experienceName: string;
        answers: number;
        correctRate: number;
    }[];
    fewAnswers: number;
}

// ─── Tabs ────────────────────────────────────────────────────

/** Tab order on the page; `top` (the ranking) is owner/admin only. */
export const FANBASE_TABS = [
    'overview',
    'top',
    'loyalty',
    'where',
    'value',
    'affinity',
    'knowledge',
] as const;
export type FanbaseTab = (typeof FANBASE_TABS)[number];

/** Roles that see the named ranking (the API's own rule). */
export const RANKING_ROLES: readonly string[] = ['owner', 'admin'];

export function visibleTabs(memberRole: string | null): FanbaseTab[] {
    const ranking = memberRole !== null && RANKING_ROLES.includes(memberRole);
    return FANBASE_TABS.filter((tab) => tab !== 'top' || ranking);
}

/** The tab a `?tab=` value opens; anything unknown or not allowed → overview. */
export function tabFromParam(param: string | null, memberRole: string | null): FanbaseTab {
    const tabs = visibleTabs(memberRole);
    return tabs.find((tab) => tab === param) ?? 'overview';
}

// ─── Numbers ─────────────────────────────────────────────────

export function isShown(value: ReportedCount): value is number {
    return typeof value === 'number';
}

/** 0–1 share of a group, or null when either side is withheld or empty. */
export function shareOf(part: ReportedCount, whole: ReportedCount): number | null {
    if (!isShown(part) || !isShown(whole) || whole <= 0) return null;
    return part / whole;
}

/** Any of these withheld, so the section can explain why. */
export function anyWithheld(values: ReportedCount[]): boolean {
    return values.some((value) => !isShown(value));
}

/** The month axis label ("sep 26" / "Sep 26"), for a "YYYY-MM" key. */
export function monthLabel(month: string, locale: string): string {
    const [year, m] = month.split('-').map(Number);
    const parts = new Intl.DateTimeFormat(locale, {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
    }).formatToParts(new Date(Date.UTC(year, m - 1, 15)));
    // Parts, not format(): es-CO writes "ene de 26".
    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${part('month').replace('.', '')} ${part('year')}`;
}

export interface GrowthBar {
    month: string;
    label: string;
    /** null when the month reads "<5" (no bar is drawn for it). */
    value: number | null;
    small: boolean;
}

export function growthBars(
    points: FanbaseOverview['newPerMonth'],
    locale: string,
): GrowthBar[] {
    return points.map((point) => ({
        month: point.month,
        label: monthLabel(point.month, locale),
        value: isShown(point.newFans) ? point.newFans : null,
        small: !isShown(point.newFans),
    }));
}

/** True when every month is 0 — nothing to chart yet. */
export function growthIsEmpty(points: FanbaseOverview['newPerMonth']): boolean {
    return points.every((point) => point.newFans === 0);
}

/** Share of an event's fans who came back to a later event. */
export function retentionOf(event: FanbaseEventPoint): number | null {
    return shareOf(event.cameBack, event.fans);
}

/** Per-fan spend buckets in Fandis (the API buckets in COP: 5.000 = 1 F). */
export const VALUE_BUCKET_RANGES: Record<ValueBucket, { min: number; max: number | null }> = {
    upTo20: { min: 1, max: 20 },
    upTo60: { min: 21, max: 60 },
    upTo200: { min: 61, max: 200 },
    upTo1000: { min: 201, max: 1000 },
    over1000: { min: 1001, max: null },
};

/**
 * Bars for a partition. `width` (0–1) is relative to the largest shown
 * group, so withheld groups get no bar and reveal nothing; `share` (the
 * percentage of the whole) only exists when no group is withheld.
 */
export function partitionBars<K extends string>(
    groups: { key: K; value: ReportedCount }[],
): { key: K; value: ReportedCount; share: number | null; width: number | null }[] {
    const shown = groups.map((g) => g.value).filter(isShown);
    const total = shown.reduce((sum, n) => sum + n, 0);
    const top = maxOf(shown);
    const withheld = shown.length < groups.length;
    return groups.map((g) => ({
        ...g,
        share: !withheld && isShown(g.value) && total > 0 ? g.value / total : null,
        width: isShown(g.value) ? g.value / top : null,
    }));
}

/** The largest value of a list, for relative bars (never 0). */
export function maxOf(values: number[]): number {
    return Math.max(1, ...values);
}
