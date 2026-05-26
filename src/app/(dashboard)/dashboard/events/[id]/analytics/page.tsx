'use client';

/**
 * Analytics page — Step 4.14. Visible to every dashboard role.
 *
 * Sections:
 *   1. Summary cards (4) — totalRaised / auctions / participants / redemptionRate.
 *      Drops the prompt's "Contribuciones" card because EventSummaryResponse
 *      has no `contributionsCount` field (only `experienceCount`, which is
 *      configuration count, not activity count — semantics differ).
 *   2. Revenue split — Recharts PieChart, contributions vs auctions.
 *   3. Experience breakdown — table with expandable escuadra distribution.
 *
 * No "revenue over time" section: preflight E confirmed no
 * `/analytics/revenue-over-time` endpoint exists.
 *
 * Money: rendered in Fandies via `formatFandis` to match Step 4.13's
 * dashboard convention.
 *
 * Not wired into the event-detail tab nav yet — reachable via URL
 * only. Flagged follow-up.
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
import { formatFandis } from '@/lib/currency';
import {
    chartColors,
    escuadraColors,
    escuadraDefaultNames,
    experienceStatusColors,
    textColors,
} from '@/lib/chart-colors';
import { HudTooltip } from '@/components/charts/hud-tooltip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type {
    EventSummaryResponse,
    ExperienceBreakdownItem,
} from '@/types/api';

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
                <div className="hud-card hud-brackets px-8 py-6">
                    <p
                        className="font-space-mono text-sm uppercase tracking-[1px]"
                        style={{ color: textColors.secondary }}
                    >
                        {t('unavailableOnDraft')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 py-6">
            <SummaryCards summary={summary} t={t} />
            <RevenueBreakdown summary={summary} t={t} />
            <ExperienceBreakdownSection breakdown={breakdown} t={t} />
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
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton
                        key={i}
                        className="h-32 w-full rounded-none bg-[#1E1E1E]"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <SummaryCard
                label={t('totalRaised')}
                value={`${formatFandis(summary.totalRaised)} F`}
            />
            <SummaryCard
                label={t('auctions')}
                value={summary.auctionCount.toString()}
            />
            <SummaryCard
                label={t('participants')}
                value={summary.uniqueParticipants.toString()}
            />
            <SummaryCard
                label={t('redemptionRate')}
                value={`${Math.round(summary.redemptionRate)}%`}
            />
        </div>
    );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="hud-card hud-brackets flex flex-col gap-3 px-5 py-5">
            <span
                className="font-space-mono text-[11px] uppercase tracking-[2px]"
                style={{ color: textColors.muted }}
            >
                {label}
            </span>
            <span
                className="font-sora text-[32px] font-bold leading-none tabular-nums"
                style={{
                    color: textColors.primary,
                    textShadow: '0 0 18px rgba(45,0,247,0.35)',
                }}
            >
                {value}
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
            <section className="flex flex-col gap-4">
                <SectionTitle text={t('revenueBreakdown')} />
                <div
                    className="hud-card hud-brackets flex h-[200px] items-center justify-center"
                    style={{ color: textColors.muted }}
                >
                    <span className="font-space-mono text-sm">
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
        <section className="flex flex-col gap-4">
            <SectionTitle text={t('revenueBreakdown')} />
            <div className="hud-card hud-brackets flex flex-col gap-4 px-6 py-6">
                <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                strokeWidth={0}
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
                        <div
                            key={entry.name}
                            className="flex items-center gap-3"
                        >
                            <span
                                aria-hidden
                                className="inline-block h-3 w-3 shrink-0"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span
                                className="font-space-mono text-xs uppercase tracking-[1px]"
                                style={{ color: textColors.secondary }}
                            >
                                {entry.name}
                            </span>
                            <span
                                className="ml-auto font-sora text-sm tabular-nums"
                                style={{ color: textColors.primary }}
                            >
                                {formatFandis(entry.value)} F
                            </span>
                            <span
                                className="w-12 text-right font-space-mono text-xs tabular-nums"
                                style={{ color: textColors.muted }}
                            >
                                {pct(entry.value, total)}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function pct(part: number, whole: number): string {
    if (whole === 0) return '0';
    return Math.round((part / whole) * 100).toString();
}

// ─── Experience breakdown table ──────────────────────────────

interface ExperienceBreakdownSectionProps {
    breakdown: ExperienceBreakdownItem[] | undefined;
    t: ReturnType<typeof useTranslations>;
}

function ExperienceBreakdownSection({
    breakdown,
    t,
}: ExperienceBreakdownSectionProps) {
    if (!breakdown) {
        return (
            <section className="flex flex-col gap-4">
                <SectionTitle text={t('experienceBreakdown')} />
                <div className="flex flex-col gap-2">
                    {[0, 1, 2].map((i) => (
                        <Skeleton
                            key={i}
                            className="h-14 w-full rounded-none bg-[#1E1E1E]"
                        />
                    ))}
                </div>
            </section>
        );
    }

    if (breakdown.length === 0) {
        return (
            <section className="flex flex-col gap-4">
                <SectionTitle text={t('experienceBreakdown')} />
                <div className="hud-card flex items-center justify-center px-6 py-8">
                    <span
                        className="font-space-mono text-sm"
                        style={{ color: textColors.muted }}
                    >
                        {t('exp.empty')}
                    </span>
                </div>
            </section>
        );
    }

    return (
        <section className="flex flex-col gap-4">
            <SectionTitle text={t('experienceBreakdown')} />
            <div className="flex flex-col gap-2">
                {breakdown.map((row) => (
                    <ExperienceRow key={row.experienceId} row={row} t={t} />
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

    return (
        <div className="hud-card flex flex-col">
            <button
                onClick={() => setExpanded((v) => !v)}
                className="grid cursor-pointer grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[#0A0A0A]"
            >
                {expanded ? (
                    <ChevronDown size={14} className="text-[#737373]" />
                ) : (
                    <ChevronRight size={14} className="text-[#737373]" />
                )}
                <span className="font-sora text-sm font-medium text-white">
                    {row.experienceName}
                </span>
                <Badge
                    variant="outline"
                    className="rounded-none font-space-mono text-[10px] uppercase tracking-[1px]"
                    style={{ color: statusColor, borderColor: statusColor }}
                >
                    {t(`exp.statusLabel.${row.status}`)}
                </Badge>
                <span
                    className="font-sora text-sm tabular-nums"
                    style={{ color: textColors.primary }}
                >
                    {formatFandis(row.totalRaised)} F
                </span>
                <span
                    className="font-space-mono text-xs tabular-nums"
                    style={{ color: textColors.muted }}
                >
                    {t('exp.contributorsCount', { count: row.contributorCount })}
                </span>
                <span
                    className="font-space-mono text-xs tabular-nums"
                    style={{ color: textColors.muted }}
                >
                    {t('exp.winnersCount', { count: row.winnersCount })}
                </span>
            </button>

            {expanded && (
                <div className="flex flex-col gap-2 border-t border-[#1A1A1A] px-5 py-4">
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
    const ordered = [4, 3, 2, 1] as const;
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
                        <span
                            className="w-16 font-space-mono text-[10px] uppercase tracking-[1px]"
                            style={{ color }}
                        >
                            {escuadraDefaultNames[level]}
                        </span>
                        <div className="relative h-2 flex-1 bg-[#141414]">
                            <div
                                className="h-full"
                                style={{
                                    background: color,
                                    width: `${widthPct}%`,
                                    boxShadow:
                                        count > 0 ? `0 0 8px ${color}80` : 'none',
                                }}
                            />
                        </div>
                        <span
                            className="w-72 text-right font-space-mono text-[11px] tabular-nums"
                            style={{
                                color: count > 0 ? textColors.secondary : textColors.dim,
                            }}
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
    return (
        <h2
            className="font-space-mono text-[13px] uppercase tracking-[2px]"
            style={{ color: textColors.muted }}
        >
            {text}
        </h2>
    );
}
