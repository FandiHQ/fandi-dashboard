'use client';

/**
 * The Fanbase metric tabs (fandi-api RFC §8). Each tab reads one
 * aggregate route when it opens; nothing names a fan here (the named
 * ranking is the Top fans tab). Money is the idol's own events only.
 */
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
    Bar as RechartsBar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { CalendarPlus, MapPin } from 'lucide-react';
import { fanbaseApi } from '@/lib/fanbase-api';
import {
    VALUE_BUCKET_RANGES,
    anyWithheld,
    growthBars,
    growthIsEmpty,
    maxOf,
    partitionBars,
    retentionOf,
    type DynamicKind,
    type GrowthBar,
    type ReportedCount,
} from '@/lib/fanbase';
import { percentLabel } from '@/lib/segments';
import { chartColors } from '@/lib/chart-colors';
import { formatCop, formatFandis } from '@/lib/currency';
import {
    Avatar,
    Bar,
    EmptyState,
    QueryState,
    Section,
    StatBlock,
    StatGrid,
    WithheldNote,
    useNumberFormat,
    useReported,
} from './blocks';

/** Ink hairline around chart marks (§7). SVG attribute, so a literal. */
const CHART_INK = '#0B0B0F';
const AXIS_TICK = { fontSize: 10, fill: '#55555E', fontFamily: 'var(--font-space-mono)' };
const STALE_MS = 60_000;

const DYNAMIC_TONE: Record<DynamicKind, string> = {
    oportunidad: 'bg-blue',
    impacto: 'bg-tier-alta',
    subasta: 'bg-tier-vip',
};

function useDateFormat() {
    const locale = useLocale();
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

const fandis = (cop: number) => `${formatFandis(cop)} F`;

// ─── Resumen: size, growth, confirmed vs inferred ────────────

export function OverviewTab() {
    const t = useTranslations('fanbase.overview');
    const reported = useReported();
    const query = useQuery({
        queryKey: ['fanbase', 'overview'],
        queryFn: fanbaseApi.overview,
        staleTime: STALE_MS,
    });
    return (
        <QueryState query={query}>
            {(data) =>
                data.totals.fans === 0 ? (
                    <EmptyState title={t('emptyTitle')} body={t('empty')} testId="fanbase-overview-empty" />
                ) : (
                    <div className="flex flex-col gap-[18px]" data-testid="fanbase-overview">
                        <StatGrid>
                            <StatBlock
                                label={t('fans')}
                                value={reported(data.totals.fans)}
                                sub={t('fansSub')}
                                testId="fanbase-stat-fans"
                            />
                            <StatBlock
                                label={t('confirmed')}
                                value={reported(data.totals.confirmed)}
                                sub={t('confirmedSub')}
                                testId="fanbase-stat-confirmed"
                            />
                            <StatBlock
                                label={t('inferred')}
                                value={reported(data.totals.inferred)}
                                sub={t('inferredSub')}
                                testId="fanbase-stat-inferred"
                            />
                            <StatBlock
                                label={t('viaCollaborations')}
                                value={reported(data.totals.viaCollaborations)}
                                sub={t('viaCollaborationsSub')}
                            />
                        </StatGrid>
                        <div className="grid grid-cols-1 gap-[22px] xl:grid-cols-[minmax(0,1fr)_380px]">
                            <GrowthChart points={data.newPerMonth} />
                            <ConfirmedSplit
                                confirmed={data.totals.confirmed}
                                inferred={data.totals.inferred}
                            />
                        </div>
                    </div>
                )
            }
        </QueryState>
    );
}

function GrowthChart({ points }: { points: Parameters<typeof growthBars>[0] }) {
    const t = useTranslations('fanbase.overview');
    const locale = useLocale();
    const bars = growthBars(points, locale === 'en' ? 'en-US' : 'es-CO');
    return (
        <Section title={t('growthTitle')} aside={t('growthAside')} testId="fanbase-growth">
            {growthIsEmpty(points) ? (
                <p className="label-mono py-16 text-center text-muted-white">{t('growthEmpty')}</p>
            ) : (
                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bars} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="#EAEAF0" />
                            <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={{ stroke: CHART_INK, strokeWidth: 2 }}
                                tick={AXIS_TICK}
                                interval="preserveStartEnd"
                            />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} />
                            <RechartsTooltip
                                cursor={{ fill: 'rgba(11, 11, 15, 0.06)' }}
                                content={<GrowthTooltip />}
                            />
                            <RechartsBar
                                dataKey="value"
                                fill={chartColors.contribution}
                                stroke={CHART_INK}
                                strokeWidth={2}
                                radius={[4, 4, 0, 0]}
                                isAnimationActive={false}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            {points.some((p) => p.newFans === '<5') && (
                <p className="font-space-mono text-[10px] uppercase text-muted-white">{t('growthSmall')}</p>
            )}
        </Section>
    );
}

/** The shared ink tooltip (charts §7), with "<5" for withheld months. */
function GrowthTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: { payload?: GrowthBar }[];
}) {
    const t = useTranslations('fanbase');
    const numbers = useNumberFormat();
    const bar = payload?.[0]?.payload;
    if (!active || !bar) return null;
    return (
        <div className="surface-ink min-w-[140px] rounded-[10px] border-2 border-ink bg-ink px-3 py-2 text-white shadow-ext-sm">
            <div className="label-mono mb-1 text-muted-ink">{bar.label}</div>
            <div className="flex items-center gap-2 font-space-mono text-[12px]">
                <span className="text-muted-ink">{t('overview.newFans')}</span>
                <span className="tabular ml-auto font-bold">
                    {bar.small ? t('small') : numbers.format(bar.value ?? 0)}
                </span>
            </div>
        </div>
    );
}

function ConfirmedSplit({ confirmed, inferred }: { confirmed: ReportedCount; inferred: ReportedCount }) {
    const t = useTranslations('fanbase.overview');
    const reported = useReported();
    const bars = partitionBars([
        { key: 'confirmed' as const, value: confirmed },
        { key: 'inferred' as const, value: inferred },
    ]);
    return (
        <Section title={t('splitTitle')} tone="ink" testId="fanbase-split">
            <div className="flex flex-col gap-3">
                {bars.map((bar) => (
                    <div key={bar.key} className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="font-bold">{t(bar.key)}</span>
                            <span className="font-space-mono text-xs tabular">
                                {reported(bar.value)}
                                {bar.share !== null && ` · ${percentLabel(bar.share)}`}
                            </span>
                        </div>
                        <Bar
                            share={bar.width}
                            tone={bar.key === 'confirmed' ? 'bg-white' : 'bg-tier-vip'}
                            track="bg-chip-ink"
                        />
                    </div>
                ))}
            </div>
            <p className="text-[13px] leading-relaxed text-muted-ink">{t('splitBody')}</p>
            {anyWithheld([confirmed, inferred]) && <WithheldNote tone="ink" />}
        </Section>
    );
}

// ─── Lealtad: returning, inactive, retention per event ───────

export function LoyaltyTab() {
    const t = useTranslations('fanbase.loyalty');
    const reported = useReported();
    const dates = useDateFormat();
    const query = useQuery({
        queryKey: ['fanbase', 'overview'],
        queryFn: fanbaseApi.overview,
        staleTime: STALE_MS,
    });
    return (
        <QueryState query={query}>
            {(data) =>
                data.events.length === 0 ? (
                    <EmptyState title={t('emptyTitle')} body={t('empty')} testId="fanbase-loyalty-empty" />
                ) : (
                    <div className="flex flex-col gap-[18px]" data-testid="fanbase-loyalty">
                        <StatGrid>
                            <StatBlock
                                label={t('returning')}
                                value={reported(data.loyalty.returning)}
                                sub={t('returningSub')}
                                testId="fanbase-stat-returning"
                            />
                            <StatBlock
                                label={t('oneTime')}
                                value={reported(data.loyalty.oneTime)}
                                sub={t('oneTimeSub')}
                            />
                            <StatBlock
                                label={t('inactive')}
                                value={reported(data.loyalty.inactive90)}
                                sub={t('inactiveSub')}
                            />
                        </StatGrid>
                        <Section title={t('eventsTitle')} aside={t('eventsAside')} testId="fanbase-events">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-left text-sm">
                                    <thead>
                                        <tr className="label-mono text-muted-white">
                                            <th className="pb-2 pr-3 font-normal">{t('col.event')}</th>
                                            <th className="pb-2 pr-3 text-right font-normal">{t('col.fans')}</th>
                                            <th className="pb-2 pr-3 text-right font-normal">{t('col.new')}</th>
                                            <th className="pb-2 pr-3 text-right font-normal">{t('col.returning')}</th>
                                            <th className="pb-2 text-right font-normal">{t('col.cameBack')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...data.events].reverse().map((event) => {
                                            const retention = retentionOf(event);
                                            return (
                                                <tr
                                                    key={event.eventId}
                                                    className="border-t border-line-white"
                                                    data-testid={`fanbase-event-${event.eventId}`}>
                                                    <td className="py-[11px] pr-3">
                                                        <span className="flex flex-wrap items-center gap-2 font-extrabold">
                                                            {event.name}
                                                            {!event.hosted && (
                                                                <span className="label-mono rounded-full border-2 border-ink bg-tier-vip px-2 py-0.5 text-[9px] text-ink">
                                                                    {t('shared')}
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="font-space-mono text-[10px] uppercase text-muted-white">
                                                            {dates.format(new Date(event.date))}
                                                        </span>
                                                    </td>
                                                    <td className="tabular py-[11px] pr-3 text-right font-bold">
                                                        {reported(event.fans)}
                                                    </td>
                                                    <td className="tabular py-[11px] pr-3 text-right">
                                                        {reported(event.newFans)}
                                                    </td>
                                                    <td className="tabular py-[11px] pr-3 text-right">
                                                        {reported(event.returningFans)}
                                                    </td>
                                                    <td className="tabular py-[11px] text-right">
                                                        {reported(event.cameBack)}
                                                        {retention !== null && (
                                                            <span className="ml-1.5 font-space-mono text-[10px] text-muted-white">
                                                                {percentLabel(retention)}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[13px] text-muted-white">{t('eventsBody')}</p>
                            {anyWithheld(
                                data.events.flatMap((e) => [e.fans, e.newFans, e.returningFans, e.cameBack]),
                            ) && <WithheldNote />}
                        </Section>
                    </div>
                )
            }
        </QueryState>
    );
}

// ─── Dónde: cities, countries, demand where you haven't played ──

export function WhereTab() {
    const t = useTranslations('fanbase.where');
    const reported = useReported();
    const numbers = useNumberFormat();
    const query = useQuery({
        queryKey: ['fanbase', 'geography'],
        queryFn: fanbaseApi.geography,
        staleTime: STALE_MS,
    });
    return (
        <QueryState query={query}>
            {(data) => {
                const nobody = data.located === 0 && data.unlocated === 0;
                if (nobody || (data.cities.length === 0 && data.countries.length === 0)) {
                    return (
                        <EmptyState
                            title={t('emptyTitle')}
                            body={nobody ? t('emptyNoFans') : t('empty')}
                            testId="fanbase-where-empty"
                        />
                    );
                }
                const top = maxOf(data.cities.map((c) => c.fans));
                return (
                    <div className="flex flex-col gap-[18px]" data-testid="fanbase-where">
                        <StatGrid>
                            <StatBlock label={t('located')} value={reported(data.located)} sub={t('locatedSub')} />
                            <StatBlock
                                label={t('unlocated')}
                                value={reported(data.unlocated)}
                                sub={t('unlocatedSub')}
                            />
                        </StatGrid>
                        <div className="grid grid-cols-1 items-start gap-[22px] xl:grid-cols-[minmax(0,1fr)_380px]">
                            <Section title={t('citiesTitle')} aside={t('citiesAside')} testId="fanbase-cities">
                                {data.cities.length === 0 ? (
                                    <p className="text-sm text-muted-white">{t('noCities')}</p>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {data.cities.map((city) => (
                                            <div key={city.cityId} className="flex flex-col gap-1">
                                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                                    <span className="flex min-w-0 items-center gap-2 font-bold">
                                                        <span className="truncate">{city.name}</span>
                                                        <span className="font-space-mono text-[10px] font-normal uppercase text-muted-white">
                                                            {[city.stateCode, city.countryCode].filter(Boolean).join(' · ')}
                                                        </span>
                                                        {city.played && (
                                                            <span className="label-mono shrink-0 rounded-full border-2 border-ink px-2 py-0.5 text-[9px]">
                                                                {t('played')}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="tabular font-space-mono text-xs">
                                                        {numbers.format(city.fans)}
                                                    </span>
                                                </div>
                                                <Bar share={city.fans / top} />
                                            </div>
                                        ))}
                                        {data.otherCities !== 0 && (
                                            <p className="font-space-mono text-[10px] uppercase text-muted-white">
                                                {t('otherCities', { count: reported(data.otherCities) })}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </Section>
                            <div className="flex flex-col gap-[22px]">
                                <Section title={t('gapsTitle')} tone="ink" testId="fanbase-gaps">
                                    {data.demandGaps.length === 0 ? (
                                        <p className="text-[13px] text-muted-ink">{t('noGaps')}</p>
                                    ) : (
                                        <div className="flex flex-col">
                                            {data.demandGaps.map((city) => (
                                                <div
                                                    key={city.cityId}
                                                    className="flex items-center gap-3 border-b border-line-ink py-2.5 last:border-0">
                                                    <MapPin size={16} className="shrink-0 text-lilac" />
                                                    <span className="flex min-w-0 flex-1 flex-col">
                                                        <span className="truncate font-bold">{city.name}</span>
                                                        <span className="font-space-mono text-[10px] uppercase text-muted-ink">
                                                            {t('gapFans', { count: numbers.format(city.fans) })}
                                                        </span>
                                                    </span>
                                                    <Link
                                                        href="/dashboard/events/new"
                                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border-2 border-dash-ink px-2.5 py-1.5 font-space-mono text-[10px] uppercase text-white transition-colors hover:border-white">
                                                        <CalendarPlus size={12} />
                                                        {t('planEvent')}
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-[13px] leading-relaxed text-muted-ink">{t('gapsBody')}</p>
                                </Section>
                                <Section title={t('countriesTitle')} testId="fanbase-countries">
                                    <div className="flex flex-col">
                                        {data.countries.map((country) => (
                                            <div
                                                key={country.countryId}
                                                className="flex items-baseline justify-between gap-3 border-b border-line-white py-2 text-sm last:border-0">
                                                <span className="font-bold">{country.name}</span>
                                                <span className="tabular font-space-mono text-xs">
                                                    {numbers.format(country.fans)}
                                                </span>
                                            </div>
                                        ))}
                                        {data.otherCountries !== 0 && (
                                            <p className="pt-2 font-space-mono text-[10px] uppercase text-muted-white">
                                                {t('otherCountries', { count: reported(data.otherCountries) })}
                                            </p>
                                        )}
                                    </div>
                                </Section>
                            </div>
                        </div>
                        {anyWithheld([data.located, data.unlocated, data.otherCities, data.otherCountries]) && (
                            <WithheldNote />
                        )}
                    </div>
                );
            }}
        </QueryState>
    );
}

// ─── Valor: own revenue per fan and by dynamic ───────────────

export function ValueTab() {
    const t = useTranslations('fanbase.value');
    const reported = useReported();
    const query = useQuery({
        queryKey: ['fanbase', 'value'],
        queryFn: fanbaseApi.value,
        staleTime: STALE_MS,
    });
    return (
        <QueryState query={query}>
            {(data) => {
                if (data.payingFans === 0) {
                    return <EmptyState title={t('emptyTitle')} body={t('empty')} testId="fanbase-value-empty" />;
                }
                const buckets = partitionBars(data.distribution.map((d) => ({ key: d.bucket, value: d.fans })));
                const topRevenue = maxOf(data.byDynamicType.map((d) => d.revenueCop));
                return (
                    <div className="flex flex-col gap-[18px]" data-testid="fanbase-value">
                        <StatGrid>
                            <StatBlock
                                label={t('revenue')}
                                value={fandis(data.revenueCop)}
                                sub={`≈ ${formatCop(data.revenueCop)}`}
                                testId="fanbase-stat-revenue"
                            />
                            <StatBlock label={t('paying')} value={reported(data.payingFans)} sub={t('payingSub')} />
                            <StatBlock
                                label={t('average')}
                                value={data.avgPerFanCop === null ? '—' : fandis(data.avgPerFanCop)}
                                sub={
                                    data.avgPerFanCop === null
                                        ? t('averageHidden')
                                        : `≈ ${formatCop(data.avgPerFanCop)}`
                                }
                            />
                        </StatGrid>
                        <div className="grid grid-cols-1 gap-[22px] xl:grid-cols-2">
                            <Section title={t('distributionTitle')} aside={t('distributionAside')}>
                                <div className="flex flex-col gap-3">
                                    {buckets.map((bucket) => {
                                        const range = VALUE_BUCKET_RANGES[bucket.key];
                                        return (
                                            <div key={bucket.key} className="flex flex-col gap-1">
                                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                                    <span className="font-bold">
                                                        {range.max === null
                                                            ? t('bucketOver', { min: range.min - 1 })
                                                            : t('bucketRange', { min: range.min, max: range.max })}
                                                    </span>
                                                    <span className="font-space-mono text-xs tabular">
                                                        {reported(bucket.value)}
                                                        {bucket.share !== null && ` · ${percentLabel(bucket.share)}`}
                                                    </span>
                                                </div>
                                                <Bar share={bucket.width} />
                                            </div>
                                        );
                                    })}
                                </div>
                                {anyWithheld(data.distribution.map((d) => d.fans)) && <WithheldNote />}
                            </Section>
                            <Section title={t('byTypeTitle')} aside={t('byTypeAside')}>
                                <div className="flex flex-col gap-3">
                                    {data.byDynamicType.map((row) => (
                                        <div key={row.type} className="flex flex-col gap-1">
                                            <div className="flex items-baseline justify-between gap-3 text-sm">
                                                <span className="font-bold">{t(`type.${row.type}`)}</span>
                                                <span className="font-space-mono text-xs tabular">
                                                    {fandis(row.revenueCop)} ·{' '}
                                                    {t('typeFans', { count: reported(row.fans) })}
                                                </span>
                                            </div>
                                            <Bar share={row.revenueCop / topRevenue} tone={DYNAMIC_TONE[row.type]} />
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        </div>
                        <p className="label-mono text-lilac" data-testid="fanbase-value-note">
                            {t('hostOnly')}
                        </p>
                    </div>
                );
            }}
        </QueryState>
    );
}

// ─── Afinidad: "Tus fans también siguen a…" ──────────────────

export function AffinityTab() {
    const t = useTranslations('fanbase.affinity');
    const numbers = useNumberFormat();
    const dates = useDateFormat();
    const query = useQuery({
        queryKey: ['fanbase', 'also-follows'],
        queryFn: fanbaseApi.alsoFollows,
        staleTime: STALE_MS,
    });
    return (
        <QueryState query={query}>
            {(data) =>
                data.idols.length === 0 ? (
                    <EmptyState
                        title={t('emptyTitle')}
                        body={t('empty', { min: data.minSharedFans })}
                        testId="fanbase-affinity-empty"
                    />
                ) : (
                    <Section
                        title={t('title')}
                        aside={data.computedAt ? t('computedAt', { date: dates.format(new Date(data.computedAt)) }) : undefined}
                        testId="fanbase-affinity">
                        <div className="flex flex-col">
                            {data.idols.map((idol) => (
                                <div
                                    key={idol.orgId}
                                    className="flex items-center gap-4 border-b border-line-white py-3 last:border-0">
                                    <Avatar name={idol.name} url={idol.avatarUrl} />
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate font-extrabold">{idol.name}</span>
                                        <span className="font-space-mono text-[10px] uppercase text-muted-white">
                                            {t('shared', { count: numbers.format(idol.sharedFans) })}
                                        </span>
                                    </span>
                                    <span className="flex w-36 shrink-0 flex-col items-end gap-1">
                                        <span className="font-space-mono text-xs tabular">
                                            {t('overlap', { percent: percentLabel(idol.jaccard) ?? '0 %' })}
                                        </span>
                                        {/* Relative to the closest idol: overlaps are small numbers. */}
                                        <Bar
                                            share={idol.jaccard / Math.max(...data.idols.map((i) => i.jaccard), 0.001)}
                                            tone="bg-tier-vip"
                                        />
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p className="text-[13px] text-muted-white">{t('body', { min: data.minSharedFans })}</p>
                    </Section>
                )
            }
        </QueryState>
    );
}

// ─── Conocimiento: the questions fans miss most ──────────────

export function KnowledgeTab() {
    const t = useTranslations('fanbase.knowledge');
    const numbers = useNumberFormat();
    const query = useQuery({
        queryKey: ['fanbase', 'knowledge'],
        queryFn: fanbaseApi.knowledge,
        staleTime: STALE_MS,
    });
    return (
        <QueryState query={query}>
            {(data) =>
                data.oportunidades === 0 ? (
                    <EmptyState title={t('emptyTitle')} body={t('empty')} testId="fanbase-knowledge-empty" />
                ) : (
                    <div className="flex flex-col gap-[18px]" data-testid="fanbase-knowledge">
                        <StatGrid>
                            <StatBlock label={t('oportunidades')} value={numbers.format(data.oportunidades)} />
                            <StatBlock label={t('answers')} value={numbers.format(data.answers)} />
                            <StatBlock
                                label={t('accuracy')}
                                value={data.accuracy === null ? '—' : (percentLabel(data.accuracy) ?? '0 %')}
                                sub={data.accuracy === null ? t('accuracyHidden') : t('accuracySub')}
                            />
                        </StatGrid>
                        <Section title={t('missedTitle')} aside={t('missedAside')} testId="fanbase-questions">
                            {data.questions.length === 0 ? (
                                <p className="text-sm text-muted-white">{t('noQuestions')}</p>
                            ) : (
                                <ol className="flex flex-col">
                                    {data.questions.map((q, i) => (
                                        <li
                                            key={q.questionId}
                                            className="flex items-center gap-4 border-b border-line-white py-3 last:border-0">
                                            <span className="font-display w-8 shrink-0 text-[20px] text-blue tabular">
                                                {i + 1}
                                            </span>
                                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                                <span className="font-bold">{q.prompt}</span>
                                                <span className="font-space-mono text-[10px] uppercase text-muted-white">
                                                    {q.experienceName} ·{' '}
                                                    {t('answerCount', { count: numbers.format(q.answers) })}
                                                </span>
                                            </span>
                                            <span className="flex w-36 shrink-0 flex-col items-end gap-1">
                                                <span className="font-space-mono text-xs tabular">
                                                    {t('correct', { percent: percentLabel(q.correctRate) ?? '0 %' })}
                                                </span>
                                                <Bar share={q.correctRate} />
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                            {data.fewAnswers > 0 && (
                                <p className="font-space-mono text-[10px] uppercase text-muted-white">
                                    {t('fewAnswers', { count: data.fewAnswers })}
                                </p>
                            )}
                        </Section>
                    </div>
                )
            }
        </QueryState>
    );
}
