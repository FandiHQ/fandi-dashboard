'use client';

/**
 * Analytics page ("08 Analitica"). Visible to every dashboard role.
 *
 * Sections:
 *   1. Stat blocks (4) — recaudado (F + COP) / participantes /
 *      ganadores / premios reclamados (redemptionRate).
 *   2. Revenue split — Recharts donut, Aportes (blue) vs Subastas
 *      (lilac), flat fills, inside a white block.
 *   3. Per-opportunity breakdown — ink block, one stacked bar per
 *      opportunity in the 4 category colours; rows expand to the
 *      per-category detail.
 *
 * No "revenue over time" section: preflight E confirmed no
 * `/analytics/revenue-over-time` endpoint exists.
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
} from 'recharts';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { eventsApi, analyticsApi } from '@/lib/api-hooks';
import { formatFandis, formatCop } from '@/lib/currency';
import {
    chartColors,
    escuadraColors,
    escuadraDefaultNames,
    experienceStatusColors,
} from '@/lib/chart-colors';
import { HudTooltip } from '@/components/charts/hud-tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import type {
    EventSummaryResponse,
    ExperienceBreakdownItem,
} from '@/types/api';

/** Category order for bars + legend: VIP first (§2 — equal weight). */
const CATEGORY_LEVELS = [4, 3, 2, 1] as const;

/** Ink hairline around chart slices (§7). SVG attribute, so a literal:
 *  chart-colors.ts has no ink constant. */
const CHART_INK = '#0B0B0F';

// ─── Page ────────────────────────────────────────────────────

export default function AnalyticsPage() {
    const { id: eventId } = useParams() as { id: string };
    const t = useTranslations('analytics');

    const { data: event } = useQuery({
        queryKey: ['events', eventId],
        queryFn: () => eventsApi.get(eventId),
    });

    const isDraft = event?.status === 'draft';

    const { data: summary } = useQuery({
        queryKey: ['events', eventId, 'analytics'],
        queryFn: () => analyticsApi.getEventSummary(eventId),
        enabled: !isDraft,
    });

    const { data: breakdown } = useQuery({
        queryKey: ['events', eventId, 'experiences', 'analytics'],
        queryFn: () => analyticsApi.getExperienceBreakdown(eventId),
        enabled: !isDraft,
    });

    if (isDraft) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="block-white px-8 py-6">
                    <p className="label-mono text-muted-white">
                        {t('unavailableOnDraft')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-[18px]">
            <SummaryCards summary={summary} t={t} />
            <div className="grid grid-cols-1 gap-[22px] xl:grid-cols-[420px_minmax(0,1fr)]">
                <RevenueBreakdown summary={summary} t={t} />
                <ExperienceBreakdownSection breakdown={breakdown} t={t} />
            </div>
        </div>
    );
}

// ─── Summary cards ───────────────────────────────────────────

interface SummaryCardsProps {
    summary: EventSummaryResponse | undefined;
    t: ReturnType<typeof useTranslations>;
}

function SummaryCards({ summary, t }: SummaryCardsProps) {
    if (!summary) {
        return (
            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
                label={t('totalRaised')}
                value={`${formatFandis(summary.totalRaised)} F`}
                sub={`≈ ${formatCop(summary.totalRaised)}`}
            />
            <SummaryCard
                label={t('participants')}
                value={formatCount(summary.uniqueParticipants)}
                sub={t('stat.participantsSub')}
            />
            <SummaryCard
                label={t('stat.winners')}
                value={formatCount(summary.winnersCount)}
                sub={t('stat.winnersSub', {
                    experiences: summary.experienceCount,
                    auctions: summary.auctionCount,
                })}
            />
            <SummaryCard
                label={t('stat.claimed')}
                value={`${Math.round(summary.redemptionRate)}%`}
                sub={t('redemptionRate')}
            />
        </div>
    );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div className="block-white flex flex-col px-5 py-4">
            <span className="label-mono text-muted-white">{label}</span>
            <span className="font-display tabular mt-2 text-[36px] text-ink">{value}</span>
            <span className="mt-1.5 font-space-mono text-[10px] uppercase text-muted-white">
                {sub}
            </span>
        </div>
    );
}

// ─── Revenue breakdown (PieChart) ────────────────────────────

interface RevenueBreakdownProps {
    summary: EventSummaryResponse | undefined;
    t: ReturnType<typeof useTranslations>;
}

function RevenueBreakdown({ summary, t }: RevenueBreakdownProps) {
    const total =
        (summary?.totalRaisedContributions ?? 0) +
        (summary?.totalRaisedAuctions ?? 0);

    if (!summary || total === 0) {
        return (
            <section className="surface-white flex flex-col gap-4 rounded-[18px] border-2 border-ink bg-white px-[22px] py-5 text-ink shadow-ext-lg">
                <SectionTitle text={t('revenueSource')} />
                <div className="flex h-[200px] items-center justify-center">
                    <span className="label-mono text-muted-white">
                        {summary ? t('noRevenueYet') : t('loading')}
                    </span>
                </div>
            </section>
        );
    }

    const data = [
        {
            name: t('contributions'),
            value: summary.totalRaisedContributions,
            color: chartColors.contribution,
        },
        {
            name: t('auctions'),
            value: summary.totalRaisedAuctions,
            color: chartColors.auction,
        },
    ];

    return (
        <section className="surface-white flex flex-col gap-4 rounded-[18px] border-2 border-ink bg-white px-[22px] py-5 text-ink shadow-ext-lg">
            <SectionTitle text={t('revenueSource')} />
            <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={100}
                            paddingAngle={0}
                            stroke={CHART_INK}
                            strokeWidth={2}
                            isAnimationActive={false}
                        >
                            {data.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                            ))}
                        </Pie>
                        {/* Recharts' default Tooltip is bypassed via the
                            `content` prop — see TASK C contract. */}
                        <RechartsTooltip
                            content={
                                <HudTooltip
                                    formatValue={(v) =>
                                        `${formatFandis(v)} F · ${pct(v, total)}%`
                                    }
                                />
                            }
                            cursor={false}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Custom legend (NOT Recharts' default). */}
            <div className="flex flex-col gap-2">
                {data.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2.5">
                        <span
                            aria-hidden
                            className="inline-block size-3.5 shrink-0 rounded-[3px] border-2 border-ink"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="flex-1 text-sm font-bold">{entry.name}</span>
                        <span className="flex flex-col items-end">
                            <span className="tabular text-[15px] font-black">
                                {formatFandis(entry.value)} F
                            </span>
                            <span className="tabular font-space-mono text-[10px] text-muted-white">
                                {formatCop(entry.value)}
                            </span>
                        </span>
                        <span className="tabular w-10 text-right font-space-mono text-[10px] text-muted-white">
                            {pct(entry.value, total)}%
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function pct(part: number, whole: number): string {
    if (whole === 0) return '0';
    return Math.round((part / whole) * 100).toString();
}

function formatCount(n: number): string {
    return new Intl.NumberFormat('es-CO').format(n);
}

// ─── Experience breakdown (ink block) ────────────────────────

interface ExperienceBreakdownSectionProps {
    breakdown: ExperienceBreakdownItem[] | undefined;
    t: ReturnType<typeof useTranslations>;
}

function ExperienceBreakdownSection({
    breakdown,
    t,
}: ExperienceBreakdownSectionProps) {
    return (
        <section className="surface-ink flex min-w-0 flex-col gap-1 overflow-hidden rounded-[18px] bg-ink px-[22px] py-5 text-white">
            <div className="mb-2 flex items-baseline justify-between gap-4">
                <SectionTitle text={t('experienceBreakdown')} />
                <span className="label-mono text-muted-ink">{t('fansByCategory')}</span>
            </div>

            {!breakdown ? (
                <div className="flex flex-col gap-2">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-14 w-full bg-chip-ink" />
                    ))}
                </div>
            ) : breakdown.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                    <span className="label-mono text-muted-ink">{t('exp.empty')}</span>
                </div>
            ) : (
                <div className="flex flex-col">
                    {breakdown.map((row) => (
                        <ExperienceRow key={row.experienceId} row={row} t={t} />
                    ))}
                </div>
            )}

            {/* Category legend */}
            <div className="mt-auto flex flex-wrap gap-4 pt-3">
                {CATEGORY_LEVELS.map((level) => (
                    <span
                        key={level}
                        className="flex items-center gap-1.5 font-space-mono text-[10px] uppercase text-muted-ink"
                    >
                        <span
                            aria-hidden
                            className="inline-block size-2.5 rounded-[2px]"
                            style={{ backgroundColor: escuadraColors[level] }}
                        />
                        {escuadraDefaultNames[level]}
                    </span>
                ))}
            </div>
        </section>
    );
}

function ExperienceRow({
    row,
    t,
}: {
    row: ExperienceBreakdownItem;
    t: ReturnType<typeof useTranslations>;
}) {
    const [expanded, setExpanded] = useState(false);
    const statusColor = experienceStatusColors[row.status];
    const total = row.escuadraDistribution.reduce((s, d) => s + d.count, 0);

    return (
        <div className="flex flex-col border-t border-line-ink">
            <button
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="flex cursor-pointer flex-col gap-2 rounded-[10px] py-3 text-left transition-colors hover:bg-chip-ink/60"
            >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="flex min-w-0 items-center gap-2">
                        {expanded ? (
                            <ChevronDown size={14} className="shrink-0 text-muted-ink" />
                        ) : (
                            <ChevronRight size={14} className="shrink-0 text-muted-ink" />
                        )}
                        <span className="font-display truncate text-[16px]">
                            {row.experienceName}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 font-space-mono text-[10px] uppercase text-muted-ink">
                            <span
                                aria-hidden
                                className="inline-block size-2 rounded-full"
                                style={{ backgroundColor: statusColor }}
                            />
                            {t(`exp.statusLabel.${row.status}`)}
                        </span>
                    </span>
                    <span className="flex flex-none flex-wrap items-baseline gap-4 font-space-mono text-[11px] text-muted-ink">
                        <span className="tabular font-bold text-white">
                            {formatFandis(row.totalRaised)} F
                        </span>
                        <span className="tabular">{formatCop(row.totalRaised)}</span>
                        <span className="tabular uppercase">
                            {t('exp.contributorsCount', { count: row.contributorCount })}
                        </span>
                        <span className="tabular uppercase">
                            {t('exp.winnersCount', { count: row.winnersCount })}
                        </span>
                    </span>
                </div>

                {/* Stacked bar: fans per category */}
                <div className="flex h-3.5 gap-[2px] overflow-hidden rounded-[4px]">
                    {total === 0 ? (
                        <span className="block flex-1 bg-chip-ink" />
                    ) : (
                        CATEGORY_LEVELS.map((level) => {
                            const count =
                                row.escuadraDistribution.find((d) => d.level === level)?.count ?? 0;
                            if (count === 0) return null;
                            return (
                                <span
                                    key={level}
                                    className="block"
                                    style={{ flex: count, backgroundColor: escuadraColors[level] }}
                                />
                            );
                        })
                    )}
                </div>
            </button>

            {expanded && (
                <div className="flex flex-col gap-2 pb-4 pt-1">
                    <EscuadraBars distribution={row.escuadraDistribution} t={t} />
                </div>
            )}
        </div>
    );
}

function EscuadraBars({
    distribution,
    t,
}: {
    distribution: ExperienceBreakdownItem['escuadraDistribution'];
    t: ReturnType<typeof useTranslations>;
}) {
    // Render levels 4 → 1 (top tier first).
    const ordered = CATEGORY_LEVELS;
    const maxCount = Math.max(...distribution.map((d) => d.count), 1);

    return (
        <div className="flex flex-col gap-2">
            {ordered.map((level) => {
                const entry = distribution.find((d) => d.level === level);
                const count = entry?.count ?? 0;
                const minAmount = entry?.minAmount ?? 0;
                const widthPct = Math.max(2, (count / maxCount) * 100);
                const color = escuadraColors[level];

                return (
                    <div key={level} className="flex items-center gap-3">
                        <span className="w-14 font-space-mono text-[10px] font-bold uppercase text-white">
                            {escuadraDefaultNames[level]}
                        </span>
                        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-chip-ink">
                            <div
                                className="h-full rounded-full"
                                style={{ backgroundColor: color, width: `${widthPct}%` }}
                            />
                        </div>
                        <span
                            className={`tabular w-64 text-right font-space-mono text-[11px] ${
                                count > 0 ? 'text-muted-ink' : 'text-nav-inactive'
                            }`}
                        >
                            {count > 0
                                ? t('exp.escuadraSummary', {
                                      level,
                                      count,
                                      min: `${formatFandis(minAmount)} F`,
                                  })
                                : t('exp.escuadraEmpty')}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Section title ───────────────────────────────────────────

function SectionTitle({ text }: { text: string }) {
    return <h2 className="font-display text-[17px]">{text}</h2>;
}
