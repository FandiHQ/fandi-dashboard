'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Trophy, Lock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { orgApi } from '@/lib/api-hooks';
import type { FanTier, LeaderboardEntry } from '@/types/api';

const PAGE_SIZE = 50;

/**
 * Step 7.2 — Top Fans: the artist's reward surface.
 *
 * Shows first name + rank + tier ONLY. NO spend, ever — the ranking
 * endpoint doesn't return it and this view must never derive it.
 * Private fans keep their rank but render "Perfil privado · #N"
 * (the privacy default hides identity from the artist too).
 */
export default function TopFansPage() {
    const t = useTranslations('topFans');
    const tTiers = useTranslations('fanTiers');
    const { organization } = useAuth();
    const [page, setPage] = useState(1);

    const orgId = organization?.id;
    const { data, isLoading, isError } = useQuery({
        queryKey: ['top-fans', orgId, page],
        queryFn: () => orgApi.getLeaderboard(orgId!, { page, limit: PAGE_SIZE }),
        enabled: !!orgId,
        placeholderData: keepPreviousData,
    });

    const tierStyle: Record<FanTier, string> = {
        leyenda:
            'border-[var(--color-tactical-magenta)] text-[var(--color-tactical-magenta)]',
        elite: 'border-[#6C63FF] text-[#6C63FF]',
        superfan:
            'border-[var(--color-tactical-acid)] text-[var(--color-tactical-acid)]',
        fan_real: 'border-white text-white',
    };

    const tierLabel = (tier: FanTier | null) =>
        tier ? tTiers(tier) : null;

    const renderRow = (entry: LeaderboardEntry) => (
        <div
            key={entry.userId}
            className="flex items-center gap-4 border-b border-[#1E1E1E] px-6 py-4"
        >
            {/* Rank */}
            <span className="w-16 font-space-mono text-sm font-bold text-[var(--color-tactical-acid)]">
                #{entry.rank}
            </span>

            {/* Identity — privacy-first */}
            {entry.isPrivate ? (
                <span className="flex items-center gap-2 font-sora text-sm text-[#737373]">
                    <Lock size={12} />
                    {t('privateFan')}
                </span>
            ) : (
                <span className="font-sora text-sm font-semibold text-white">
                    {entry.firstName ?? t('anonymousFan')}
                </span>
            )}

            {/* Tier badge */}
            {entry.tier && (
                <span
                    className={`ml-auto rounded-none border px-3 py-0.5 font-space-mono text-[10px] uppercase tracking-[1px] ${tierStyle[entry.tier]}`}
                >
                    {tierLabel(entry.tier)}
                </span>
            )}
        </div>
    );

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

            <div className="hud-card hud-brackets rounded-none">
                {/* Header row */}
                <div className="flex items-center gap-4 border-b border-[#2A2A2A] px-6 py-4">
                    <Trophy size={16} className="text-[var(--color-tactical-acid)]" />
                    <span className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                        {t('rankedFans', { count: data?.total ?? 0 })}
                    </span>
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-[#737373]" />
                    </div>
                )}

                {isError && (
                    <p className="px-6 py-16 text-center font-space-mono text-sm text-[#FF3366]">
                        {t('errorLoading')}
                    </p>
                )}

                {data && data.entries.length === 0 && (
                    <p className="px-6 py-16 text-center font-space-mono text-sm text-[#4A4A4A]">
                        {t('empty')}
                    </p>
                )}

                {data?.entries.map(renderRow)}

                {/* Pagination */}
                {data && data.total > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-6 py-4">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex cursor-pointer items-center gap-1 rounded-none border border-[#2A2A2A] px-4 py-2 font-space-mono text-[11px] uppercase tracking-[1px] text-white transition-colors duration-150 hover:bg-[#1A1A1A] disabled:opacity-30"
                        >
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
                            className="flex cursor-pointer items-center gap-1 rounded-none border border-[#2A2A2A] px-4 py-2 font-space-mono text-[11px] uppercase tracking-[1px] text-white transition-colors duration-150 hover:bg-[#1A1A1A] disabled:opacity-30"
                        >
                            {t('next')}
                            <ChevronRight size={12} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
