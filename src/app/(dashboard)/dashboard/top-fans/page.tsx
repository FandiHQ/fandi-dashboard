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
    ExternalLink,
    Loader2,
    Lock,
    MapPin,
    Trophy,
    Users,
    X,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { orgApi } from '@/lib/api-hooks';
import { Button } from '@/components/ui/button';
import type { FanTier, RichTopFanRow } from '@/types/api';

const PAGE_SIZE = 50;

const TIER_KEYS: (FanTier | 'none')[] = [
    'leyenda',
    'elite',
    'superfan',
    'fan_real',
    'none',
];

// Loyalty tiers borrow the four category colours: equal visual weight,
// ink text + ink outline on every surface (BASE white keeps its outline).
const tierStyle: Record<FanTier, string> = {
    leyenda: 'bg-tier-vip',
    elite: 'bg-tier-alta',
    superfan: 'bg-tier-media',
    fan_real: 'bg-tier-base',
};
const TIER_PILL =
    'label-mono inline-flex shrink-0 items-center rounded-full border-2 border-ink px-2.5 py-0.5 font-bold text-ink';
const FILTER_SELECT =
    'h-10 cursor-pointer rounded-[10px] border-2 border-ink bg-white px-3 text-sm font-semibold normal-case tracking-normal text-ink shadow-ext-sm outline-none focus-visible:ring-2 focus-visible:ring-lime';
const numberFmt = new Intl.NumberFormat('es-CO');

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
        <div className="flex flex-col gap-7">
            {/* ── Page Header ── */}
            <div className="flex flex-col gap-2">
                <h1 className="font-hero text-[44px] text-white lg:text-[48px]">
                    {t('title')}
                </h1>
                <p className="label-mono text-[11px] text-lilac">
                    {t('subtitle')}
                </p>
            </div>

            {/* ── Aggregate cards ── */}
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    icon={<Users size={14} />}
                    label={t('stats.totalFans')}
                    value={analytics ? numberFmt.format(analytics.totalRankedFans) : '—'}
                    testId="stat-total"
                />
                <StatCard
                    icon={<Trophy size={14} />}
                    label={t('stats.newThisMonth')}
                    value={analytics ? `+${numberFmt.format(analytics.newFansThisMonth)}` : '—'}
                    testId="stat-new"
                />
                <StatCard
                    icon={<MapPin size={14} />}
                    label={t('stats.topCity')}
                    value={topCity ? `${topCity.cityName ?? topCity.cityId}` : '—'}
                    sub={topCity ? t('topCityFans', { count: topCity.fanCount }) : undefined}
                    testId="stat-city"
                />
                <div className="block-white flex flex-col gap-3 px-5 py-4">
                    <span className="label-mono text-muted-white">
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
                                      className={`${TIER_PILL} gap-1.5 ${tierStyle[key]}`}>
                                      {tTiers(key)}
                                      <span className="tabular">{numberFmt.format(count)}</span>
                                  </span>
                              ))
                            : <span className="font-display text-[36px] text-ink">—</span>}
                    </div>
                </div>
            </div>

            {/* ── Insights strip ── */}
            {(mostDevoted || topCity) && (
                <div className="block-ink flex flex-wrap gap-x-8 gap-y-3 px-5 py-4">
                    {mostDevoted ? (
                        <span className="label-mono flex items-center gap-2 text-[11px] text-muted-ink">
                            <Crown size={14} className="text-lilac" />
                            {t('stats.mostDevoted')}:{' '}
                            <span className="font-bold text-white">
                                {mostDevoted.firstName ?? t('anonymousFan')}
                            </span>
                        </span>
                    ) : null}
                    {topCity ? (
                        <span className="label-mono flex items-center gap-2 text-[11px] text-muted-ink">
                            <MapPin size={14} className="text-lilac" />
                            {t('stats.topCity')}:{' '}
                            <span className="font-bold text-white">
                                {topCity.cityName ?? topCity.cityId}
                            </span>
                        </span>
                    ) : null}
                </div>
            )}

            {/* ── Filters ── */}
            <div className="flex flex-wrap items-center gap-5">
                <label className="label-mono flex items-center gap-2.5 text-[11px] text-lilac">
                    {t('filters.city')}
                    <select
                        value={cityId}
                        onChange={(e) => setFilter(() => setCityId(e.target.value))}
                        className={FILTER_SELECT}
                        data-testid="filter-city">
                        <option value="">{t('filters.allCities')}</option>
                        {(analytics?.topCities ?? []).map((city) => (
                            <option key={city.cityId} value={city.cityId}>
                                {city.cityName ?? city.cityId}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="label-mono flex items-center gap-2.5 text-[11px] text-lilac">
                    {t('filters.tier')}
                    <select
                        value={tier}
                        onChange={(e) => setFilter(() => setTier(e.target.value))}
                        className={FILTER_SELECT}
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

            <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
                {/* ── Ranked rows ── */}
                <div className="block-white overflow-hidden">
                    <div className="flex items-center justify-between gap-4 border-b-2 border-ink px-5 py-3.5">
                        <span className="font-display text-[17px]">{t('leaderboardTitle')}</span>
                        <span className="font-space-mono text-[10px] uppercase text-muted-white">
                            {t('rankedFans', { count: data?.total ?? 0 })}
                        </span>
                    </div>

                    {fansQuery.isLoading && (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={22} className="animate-spin text-muted-white" />
                        </div>
                    )}
                    {fansQuery.isError && (
                        <p className="label-mono px-6 py-16 text-center text-[11px] text-alert-white">
                            {t('errorLoading')}
                        </p>
                    )}
                    {data && data.entries.length === 0 && !fansQuery.isLoading && (
                        <p className="px-6 py-16 text-center text-sm text-muted-white">
                            {t('empty')}
                        </p>
                    )}

                    {data?.entries.map((entry) => (
                        <button
                            key={entry.userId}
                            onClick={() => setSelectedFan(entry)}
                            className={`flex w-full cursor-pointer items-center gap-4 border-b border-line-white px-5 py-[11px] text-left transition-colors last:border-0 hover:bg-line-white ${
                                selectedFan?.userId === entry.userId
                                    ? 'bg-line-white shadow-[inset_4px_0_0_var(--color-blue)]'
                                    : ''
                            }`}
                            data-testid={`fan-row-${entry.rank}`}>
                            <span className="font-display w-14 shrink-0 text-[20px] text-blue tabular">
                                {entry.rank}
                            </span>
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                {/* Idols always see their fans in full; "private"
                                    only hides the fan from OTHER FANS (RFC §3). */}
                                <span className="flex min-w-0 items-center gap-2 text-sm font-extrabold text-ink">
                                    <span className="truncate">{entry.firstName ?? t('anonymousFan')}</span>
                                    {entry.isPrivate && <PrivateMark label={t('privateMark')} />}
                                </span>
                                <span className="font-space-mono text-[10px] uppercase text-muted-white">
                                    {t('rowMeta', {
                                        badges: entry.badgesCount ?? 0,
                                        events: entry.eventsParticipated ?? 0,
                                    })}
                                    {entry.memberSince
                                        ? ` · ${t('rowSince', { date: sinceLabel(entry.memberSince) ?? '' })}`
                                        : ''}
                                </span>
                            </div>
                            {entry.tier && (
                                <span className={`${TIER_PILL} ${tierStyle[entry.tier]}`}>
                                    {tTiers(entry.tier)}
                                </span>
                            )}
                        </button>
                    ))}

                    {/* Pagination */}
                    {data && data.total > PAGE_SIZE && (
                        <div className="flex items-center justify-between border-t-2 border-line-white px-5 py-3.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}>
                                <ChevronLeft size={12} />
                                {t('previous')}
                            </Button>
                            <span className="font-space-mono text-[11px] uppercase text-muted-white">
                                {t('pageOf', {
                                    page,
                                    pages: Math.max(1, Math.ceil(data.total / PAGE_SIZE)),
                                })}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={!data.hasMore}>
                                {t('next')}
                                <ChevronRight size={12} />
                            </Button>
                        </div>
                    )}
                </div>

                {/* ── Drill-down panel ── */}
                {selectedFan && (
                    <div
                        className="block-ink h-fit p-5"
                        data-testid="fan-detail-panel">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="label-mono text-[11px] text-muted-ink">
                                {t('fanDetail.title')}
                            </h3>
                            <button
                                onClick={() => setSelectedFan(null)}
                                aria-label={t('fanDetail.close')}
                                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[10px] border-2 border-dash-ink text-muted-ink transition-colors hover:border-white hover:text-white"
                                data-testid="fan-detail-close">
                                <X size={16} />
                            </button>
                        </div>

                        {detailQuery.isLoading && (
                            <Loader2 size={20} className="animate-spin text-muted-ink" />
                        )}

                        {detailQuery.data && (
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="font-display text-[26px] text-white">
                                        {detailQuery.data.firstName ?? t('anonymousFan')}
                                    </span>
                                    {detailQuery.data.isPrivate && <PrivateMark label={t('privateMark')} />}
                                    {detailQuery.data.rank.tier && (
                                        <span className={`${TIER_PILL} ${tierStyle[detailQuery.data.rank.tier]}`}>
                                            {tTiers(detailQuery.data.rank.tier)}
                                        </span>
                                    )}
                                </div>
                                {detailQuery.data.rank.rank !== null && (
                                    <p className="font-space-mono text-[11px] text-muted-ink tabular">
                                        <span className="font-display text-[20px] text-lilac">#{detailQuery.data.rank.rank}</span>
                                        {' '}/ {numberFmt.format(detailQuery.data.rank.total)}
                                    </p>
                                )}

                                {detailQuery.data.isPrivate && (
                                    <p className="flex items-start gap-2 text-sm text-muted-ink" data-testid="fan-detail-private">
                                        <Lock size={14} className="mt-0.5 shrink-0" />
                                        {t('fanDetail.privateBody')}
                                    </p>
                                )}
                                {/* Phase 4 — read-only; the api sends it for public
                                    fans, and for every fan to their own idol. */}
                                {detailQuery.data.instagramHandle ? (
                                    <a
                                        href={`https://instagram.com/${detailQuery.data.instagramHandle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 self-start font-space-mono text-xs text-lilac underline decoration-2 underline-offset-4 hover:text-white"
                                        data-testid="fan-detail-instagram">
                                        <ExternalLink size={12} />
                                        @{detailQuery.data.instagramHandle}
                                    </a>
                                ) : null}
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
                                    <p className="label-mono text-[11px] text-muted-ink">
                                        {t('fanDetail.fanSince', {
                                            year: detailQuery.data.superlatives.fanSince,
                                        })}
                                    </p>
                                ) : null}

                                <div className="flex flex-col gap-2">
                                    <span className="label-mono text-muted-ink">
                                        {t('fanDetail.badges')}
                                    </span>
                                    {detailQuery.data.badges.length === 0 ? (
                                        <span className="text-[13px] text-muted-ink">
                                            {t('fanDetail.noBadges')}
                                        </span>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {detailQuery.data.badges.map((badge) => (
                                                <span
                                                    key={badge.id}
                                                    className="rounded-[10px] border-2 border-dash-ink bg-chip-ink px-2.5 py-1 text-[12px] font-bold text-white">
                                                    {badge.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function PrivateMark({ label }: { label: string }) {
    return (
        <span className="flex shrink-0 items-center gap-1 font-space-mono text-[10px] font-normal uppercase text-muted-white">
            <Lock size={10} />
            {label}
        </span>
    );
}

function StatCard({
    icon,
    label,
    value,
    sub,
    testId,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    testId?: string;
}) {
    return (
        <div
            className="block-white flex min-w-0 flex-col px-5 py-4"
            data-testid={testId}>
            <span className="label-mono flex items-center gap-2 text-muted-white">
                {icon}
                {label}
            </span>
            <span className="font-display mt-2 truncate text-[36px] text-ink tabular">{value}</span>
            {sub ? (
                <span className="mt-1.5 font-space-mono text-[10px] uppercase text-muted-white">{sub}</span>
            ) : null}
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
        <div className="flex flex-col items-center gap-1 rounded-[12px] bg-chip-ink px-2 py-3">
            <span className="font-display flex items-center gap-1 text-[22px] text-white tabular">
                {value}
            </span>
            <span className="flex items-center gap-1 text-center font-space-mono text-[9px] uppercase tracking-[0.1em] text-muted-ink">
                {icon}
                {label}
            </span>
        </div>
    );
}
