'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
    Award,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Crown,
    Loader2,
    Lock,
    MapPin,
    Trophy,
    Users,
    X,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { orgApi } from '@/lib/api-hooks';
import type { FanTier, RichTopFanRow } from '@/types/api';

const PAGE_SIZE = 50;

const TIER_KEYS: (FanTier | 'none')[] = [
    'leyenda',
    'elite',
    'superfan',
    'fan_real',
    'none',
];

const tierStyle: Record<FanTier, string> = {
    leyenda:
        'border-[var(--color-tactical-magenta)] text-[var(--color-tactical-magenta)]',
    elite: 'border-[#6C63FF] text-[#6C63FF]',
    superfan:
        'border-[var(--color-tactical-acid)] text-[var(--color-tactical-acid)]',
    fan_real: 'border-white text-white',
};

/**
 * Step 7.5.3 — Top Fans CRM. The artist's reward surface, upgraded:
 * aggregate cards, city/tier filters, rich ranked rows, per-fan
 * drill-down. NO spend anywhere (locked) — rank encodes engagement,
 * so formatFandis is deliberately absent from this file.
 */
export default function TopFansPage() {
    const t = useTranslations('topFans');
    const tTiers = useTranslations('fanTiers');
    const { organization } = useAuth();
    const orgId = organization?.id;

    const [page, setPage] = useState(1);
    const [cityId, setCityId] = useState<string>('');
    const [tier, setTier] = useState<string>('');
    const [selectedFan, setSelectedFan] = useState<RichTopFanRow | null>(null);

    const analyticsQuery = useQuery({
        queryKey: ['fan-analytics'],
        queryFn: orgApi.getFanAnalytics,
        enabled: !!orgId,
    });
    const analytics = analyticsQuery.data;

    const fansQuery = useQuery({
        queryKey: ['top-fans-rich', page, cityId, tier],
        queryFn: () =>
            orgApi.getTopFansRich({
                page,
                limit: PAGE_SIZE,
                ...(cityId ? { cityId } : {}),
                ...(tier ? { tier: tier as FanTier | 'none' } : {}),
            }),
        enabled: !!orgId,
        placeholderData: keepPreviousData,
    });
    const data = fansQuery.data;

    const detailQuery = useQuery({
        queryKey: ['fan-detail', selectedFan?.userId, orgId],
        queryFn: () => orgApi.getFanDetail(selectedFan!.userId, orgId!),
        enabled: !!selectedFan && !!orgId,
    });

    const mostDevoted =
        page === 1 && !cityId && !tier ? (data?.entries[0] ?? null) : null;
    const topCity = analytics?.topCities[0] ?? null;

    const setFilter = (next: () => void) => {
        next();
        setPage(1);
        setSelectedFan(null);
    };

    const sinceLabel = (iso: string | null) =>
        iso
            ? new Date(iso).toLocaleDateString(undefined, {
                  month: 'short',
                  year: 'numeric',
              })
            : null;

    return (
        <div className="flex flex-col gap-12">
            {/* ── Page Header ── */}
            <div className="flex flex-col gap-2">
                <h1 className="animate-glitch font-sora text-[64px] font-black leading-none tracking-[-3px] text-white">
                    {t('title')}
                </h1>
                <p className="font-space-mono text-sm uppercase tracking-[2px] text-[#737373]">
                    {t('subtitle')}
                </p>
            </div>

            {/* ── Aggregate cards ── */}
            <div className="grid gap-4 md:grid-cols-4">
                <StatCard
                    icon={<Users size={16} className="text-[var(--color-tactical-acid)]" />}
                    label={t('stats.totalFans')}
                    value={analytics ? String(analytics.totalRankedFans) : '—'}
                    testId="stat-total"
                />
                <StatCard
                    icon={<Trophy size={16} className="text-[var(--color-tactical-acid)]" />}
                    label={t('stats.newThisMonth')}
                    value={analytics ? `+${analytics.newFansThisMonth}` : '—'}
                    testId="stat-new"
                />
                <StatCard
                    icon={<MapPin size={16} className="text-[var(--color-tactical-acid)]" />}
                    label={t('stats.topCity')}
                    value={
                        topCity
                            ? `${topCity.cityName ?? topCity.cityId} (${topCity.fanCount})`
                            : '—'
                    }
                    testId="stat-city"
                />
                <div className="hud-card hud-brackets flex flex-col gap-2 rounded-none p-5">
                    <span className="font-space-mono text-[10px] uppercase tracking-[2px] text-[#737373]">
                        {t('stats.tierDistribution')}
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {analytics
                            ? (
                                  [
                                      ['leyenda', analytics.tierDistribution.leyenda],
                                      ['elite', analytics.tierDistribution.elite],
                                      ['superfan', analytics.tierDistribution.superfan],
                                      ['fan_real', analytics.tierDistribution.fanReal],
                                  ] as [FanTier, number][]
                              ).map(([key, count]) => (
                                  <span
                                      key={key}
                                      className={`rounded-none border px-2 py-0.5 font-space-mono text-[10px] uppercase tracking-[1px] ${tierStyle[key]}`}>
                                      {tTiers(key)} {count}
                                  </span>
                              ))
                            : '—'}
                    </div>
                </div>
            </div>

            {/* ── Insights strip ── */}
            {(mostDevoted || topCity) && (
                <div className="flex flex-wrap gap-6 border border-[#1E1E1E] bg-[#0A0A0A] px-6 py-4">
                    {mostDevoted ? (
                        <span className="flex items-center gap-2 font-space-mono text-xs text-[#A0A0A0]">
                            <Crown size={14} className="text-[var(--color-tactical-magenta)]" />
                            {t('stats.mostDevoted')}:{' '}
                            <span className="text-white">
                                {mostDevoted.isPrivate
                                    ? t('privateFan')
                                    : (mostDevoted.firstName ?? t('anonymousFan'))}
                            </span>
                        </span>
                    ) : null}
                    {topCity ? (
                        <span className="flex items-center gap-2 font-space-mono text-xs text-[#A0A0A0]">
                            <MapPin size={14} className="text-[var(--color-tactical-acid)]" />
                            {t('stats.topCity')}:{' '}
                            <span className="text-white">
                                {topCity.cityName ?? topCity.cityId}
                            </span>
                        </span>
                    ) : null}
                </div>
            )}

            {/* ── Filters ── */}
            <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 font-space-mono text-[11px] uppercase tracking-[1px] text-[#737373]">
                    {t('filters.city')}
                    <select
                        value={cityId}
                        onChange={(e) => setFilter(() => setCityId(e.target.value))}
                        className="rounded-none border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 font-space-mono text-xs text-white outline-none focus:border-[var(--color-tactical-acid)]"
                        data-testid="filter-city">
                        <option value="">{t('filters.allCities')}</option>
                        {(analytics?.topCities ?? []).map((city) => (
                            <option key={city.cityId} value={city.cityId}>
                                {city.cityName ?? city.cityId}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex items-center gap-2 font-space-mono text-[11px] uppercase tracking-[1px] text-[#737373]">
                    {t('filters.tier')}
                    <select
                        value={tier}
                        onChange={(e) => setFilter(() => setTier(e.target.value))}
                        className="rounded-none border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 font-space-mono text-xs text-white outline-none focus:border-[var(--color-tactical-acid)]"
                        data-testid="filter-tier">
                        <option value="">{t('filters.allTiers')}</option>
                        {TIER_KEYS.map((key) => (
                            <option key={key} value={key}>
                                {key === 'none' ? t('filters.noTier') : tTiers(key)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                {/* ── Ranked rows ── */}
                <div className="hud-card hud-brackets rounded-none">
                    <div className="flex items-center gap-4 border-b border-[#2A2A2A] px-6 py-4">
                        <Trophy size={16} className="text-[var(--color-tactical-acid)]" />
                        <span className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                            {t('rankedFans', { count: data?.total ?? 0 })}
                        </span>
                    </div>

                    {fansQuery.isLoading && (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-[#737373]" />
                        </div>
                    )}
                    {fansQuery.isError && (
                        <p className="px-6 py-16 text-center font-space-mono text-sm text-[#FF3366]">
                            {t('errorLoading')}
                        </p>
                    )}
                    {data && data.entries.length === 0 && !fansQuery.isLoading && (
                        <p className="px-6 py-16 text-center font-space-mono text-sm text-[#4A4A4A]">
                            {t('empty')}
                        </p>
                    )}

                    {data?.entries.map((entry) => (
                        <button
                            key={entry.userId}
                            onClick={() => setSelectedFan(entry)}
                            className={`flex w-full cursor-pointer items-center gap-4 border-b border-[#1E1E1E] px-6 py-4 text-left transition-colors hover:bg-[#141414] ${
                                selectedFan?.userId === entry.userId
                                    ? 'bg-[#141414]'
                                    : ''
                            }`}
                            data-testid={`fan-row-${entry.rank}`}>
                            <span className="w-14 font-space-mono text-sm font-bold text-[var(--color-tactical-acid)]">
                                #{entry.rank}
                            </span>
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                {entry.isPrivate ? (
                                    <span className="flex items-center gap-2 font-sora text-sm text-[#737373]">
                                        <Lock size={12} />
                                        {t('privateFan')}
                                    </span>
                                ) : (
                                    <>
                                        <span className="truncate font-sora text-sm font-semibold text-white">
                                            {entry.firstName ?? t('anonymousFan')}
                                        </span>
                                        <span className="font-space-mono text-[10px] text-[#737373]">
                                            {t('rowMeta', {
                                                badges: entry.badgesCount ?? 0,
                                                events: entry.eventsParticipated ?? 0,
                                            })}
                                            {entry.memberSince
                                                ? ` · ${t('rowSince', { date: sinceLabel(entry.memberSince) ?? '' })}`
                                                : ''}
                                        </span>
                                    </>
                                )}
                            </div>
                            {entry.tier && (
                                <span
                                    className={`rounded-none border px-3 py-0.5 font-space-mono text-[10px] uppercase tracking-[1px] ${tierStyle[entry.tier]}`}>
                                    {tTiers(entry.tier)}
                                </span>
                            )}
                        </button>
                    ))}

                    {/* Pagination */}
                    {data && data.total > PAGE_SIZE && (
                        <div className="flex items-center justify-between px-6 py-4">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="flex cursor-pointer items-center gap-1 rounded-none border border-[#2A2A2A] px-4 py-2 font-space-mono text-[11px] uppercase tracking-[1px] text-white transition-colors hover:bg-[#1A1A1A] disabled:opacity-30">
                                <ChevronLeft size={12} />
                                {t('previous')}
                            </button>
                            <span className="font-space-mono text-[11px] text-[#737373]">
                                {t('pageOf', {
                                    page,
                                    pages: Math.max(1, Math.ceil(data.total / PAGE_SIZE)),
                                })}
                            </span>
                            <button
                                onClick={() => setPage((p) => p + 1)}
                                disabled={!data.hasMore}
                                className="flex cursor-pointer items-center gap-1 rounded-none border border-[#2A2A2A] px-4 py-2 font-space-mono text-[11px] uppercase tracking-[1px] text-white transition-colors hover:bg-[#1A1A1A] disabled:opacity-30">
                                {t('next')}
                                <ChevronRight size={12} />
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Drill-down panel ── */}
                {selectedFan && (
                    <div
                        className="hud-card hud-brackets h-fit rounded-none p-6"
                        data-testid="fan-detail-panel">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#737373]">
                                {t('fanDetail.title')}
                            </h3>
                            <button
                                onClick={() => setSelectedFan(null)}
                                className="cursor-pointer text-[#737373] hover:text-white"
                                data-testid="fan-detail-close">
                                <X size={16} />
                            </button>
                        </div>

                        {detailQuery.isLoading && (
                            <Loader2 size={20} className="animate-spin text-[#737373]" />
                        )}

                        {detailQuery.data && (
                            <div className="flex flex-col gap-5">
                                <div className="flex items-center gap-3">
                                    <span className="font-sora text-xl font-black text-white">
                                        {detailQuery.data.isPrivate
                                            ? t('privateFan')
                                            : (detailQuery.data.firstName ?? t('anonymousFan'))}
                                    </span>
                                    {detailQuery.data.rank.tier && (
                                        <span
                                            className={`rounded-none border px-2 py-0.5 font-space-mono text-[10px] uppercase tracking-[1px] ${tierStyle[detailQuery.data.rank.tier]}`}>
                                            {tTiers(detailQuery.data.rank.tier)}
                                        </span>
                                    )}
                                </div>
                                {detailQuery.data.rank.rank !== null && (
                                    <p className="font-space-mono text-xs text-[#A0A0A0]">
                                        #{detailQuery.data.rank.rank} / {detailQuery.data.rank.total}
                                    </p>
                                )}

                                {detailQuery.data.isPrivate ? (
                                    <p className="font-space-mono text-xs text-[#737373]">
                                        {t('fanDetail.privateBody')}
                                    </p>
                                ) : (
                                    <>
                                        {detailQuery.data.superlatives && (
                                            <div className="grid grid-cols-3 gap-2">
                                                <MiniStat
                                                    icon={<CalendarDays size={12} />}
                                                    value={detailQuery.data.superlatives.eventsParticipated}
                                                    label={t('fanDetail.events')}
                                                />
                                                <MiniStat
                                                    icon={<Trophy size={12} />}
                                                    value={detailQuery.data.superlatives.experiencesWon}
                                                    label={t('fanDetail.wins')}
                                                />
                                                <MiniStat
                                                    icon={<Award size={12} />}
                                                    value={detailQuery.data.superlatives.auctionsWon}
                                                    label={t('fanDetail.auctionsWon')}
                                                />
                                            </div>
                                        )}
                                        {detailQuery.data.superlatives?.fanSince ? (
                                            <p className="font-space-mono text-[11px] text-[#737373]">
                                                {t('fanDetail.fanSince', {
                                                    year: detailQuery.data.superlatives.fanSince,
                                                })}
                                            </p>
                                        ) : null}

                                        <div className="flex flex-col gap-2">
                                            <span className="font-space-mono text-[10px] uppercase tracking-[2px] text-[#737373]">
                                                {t('fanDetail.badges')}
                                            </span>
                                            {detailQuery.data.badges.length === 0 ? (
                                                <span className="font-space-mono text-[11px] text-[#4A4A4A]">
                                                    {t('fanDetail.noBadges')}
                                                </span>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {detailQuery.data.badges.map((badge) => (
                                                        <span
                                                            key={badge.id}
                                                            className="rounded-none border border-[#2A2A2A] px-2 py-1 font-space-mono text-[10px] text-[#A0A0A0]">
                                                            {badge.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    testId,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    testId?: string;
}) {
    return (
        <div
            className="hud-card hud-brackets flex flex-col gap-2 rounded-none p-5"
            data-testid={testId}>
            <span className="flex items-center gap-2 font-space-mono text-[10px] uppercase tracking-[2px] text-[#737373]">
                {icon}
                {label}
            </span>
            <span className="font-sora text-2xl font-black text-white">{value}</span>
        </div>
    );
}

function MiniStat({
    icon,
    value,
    label,
}: {
    icon: React.ReactNode;
    value: number;
    label: string;
}) {
    return (
        <div className="flex flex-col items-center gap-1 border border-[#1E1E1E] bg-[#0A0A0A] px-2 py-3">
            <span className="flex items-center gap-1 font-sora text-lg font-black text-white">
                {value}
            </span>
            <span className="flex items-center gap-1 text-center font-space-mono text-[9px] uppercase tracking-[1px] text-[#737373]">
                {icon}
                {label}
            </span>
        </div>
    );
}
