'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Users, TrendingUp, Gavel, Activity, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { eventsApi, analyticsApi, auctionsApi } from '@/lib/api-hooks';
import { useWebSocket } from '@/hooks/use-websocket';
import { formatFandis, formatUsd } from '@/lib/currency';
import { Skeleton } from '@/components/ui/skeleton';
import type { WsConnectionStatus, Auction } from '@/types/api';

// ── Escuadra config ──
const ESCUADRA = {
    4: { label: 'VIP',   color: '#FFD700', glow: 'rgba(255,215,0,0.5)' },
    3: { label: 'Alta',  color: '#2D00F7', glow: 'rgba(45,0,247,0.5)' },
    2: { label: 'Media', color: '#22C55E', glow: 'rgba(34,197,94,0.5)' },
    1: { label: 'Base',  color: '#737373', glow: 'rgba(115,115,115,0.3)' },
} as const;

// ── Connection status indicator ──
function ConnectionDot({ status }: { status: WsConnectionStatus }) {
    const t = useTranslations('live');
    const cfg = {
        connected:    { color: '#22C55E', label: t('connected'),    pulse: true },
        connecting:   { color: '#EAB308', label: t('connecting'),   pulse: false },
        reconnecting: { color: '#EAB308', label: t('reconnecting'), pulse: false },
        disconnected: { color: '#737373', label: t('disconnected'), pulse: false },
        disabled:     { color: '#737373', label: t('disconnected'), pulse: false },
    }[status];

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <span
                    className={`h-2 w-2 rounded-full ${cfg.pulse ? 'animate-pulse' : ''}`}
                    style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }}
                />
                <span className="font-space-mono text-[12px] uppercase tracking-[1px]" style={{ color: cfg.color }}>
                    {cfg.label}
                </span>
            </div>
            <span className="font-space-mono text-[10px] text-[#4A4A4A]">
                · {t('pollingActive')}
            </span>
        </div>
    );
}

// ── Big number stat card ──
function StatCard({
    label, value, sub, icon: Icon, glowColor,
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ElementType;
    glowColor?: string;
}) {
    return (
        <div className="flex flex-col gap-3 border border-[#1E1E1E] bg-[#141414] p-6">
            <div className="flex items-center gap-2">
                <Icon size={14} className="text-[#4A4A4A]" />
                <span className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                    {label}
                </span>
            </div>
            <span
                className="font-sora text-[48px] font-semibold leading-none tabular-nums text-white"
                style={{
                    textShadow: glowColor
                        ? `0 0 20px ${glowColor}, 0 0 40px ${glowColor}40`
                        : '0 0 20px rgba(45,0,247,0.4)',
                }}
            >
                {value}
            </span>
            {sub && (
                <span className="font-space-mono text-[11px] text-[#4A4A4A]">{sub}</span>
            )}
        </div>
    );
}

// ── Auction countdown ──
function AuctionTimer({ endsAt }: { endsAt: string }) {
    const [remaining, setRemaining] = useState(() =>
        Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000)),
    );

    useEffect(() => {
        const id = setInterval(() => {
            setRemaining(Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000)));
        }, 1000);
        return () => clearInterval(id);
    }, [endsAt]);

    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    const display = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const isUrgent = remaining < 30 && remaining > 0;
    const isAlarm  = remaining < 10 && remaining > 0;

    return (
        <span
            className={`font-space-mono text-[18px] tabular-nums tracking-[3px] ${isUrgent ? 'animate-pulse' : ''}`}
            style={{
                color: isUrgent ? '#FF3366' : '#A0A0A0',
                textShadow: isAlarm ? '0 0 10px rgba(255,51,102,0.8)' : 'none',
            }}
        >
            {display}
        </span>
    );
}

// ── Active auction card ──
function AuctionLiveCard({ auction }: { auction: Auction }) {
    const t = useTranslations('live');
    return (
        <div className="hud-card hud-brackets-magenta relative flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-3">
                <span className="font-sora text-[16px] font-bold text-white leading-tight">
                    {auction.name}
                </span>
                {auction.endsAt && <AuctionTimer endsAt={auction.endsAt} />}
            </div>

            <div className="flex items-end justify-between">
                <div className="flex flex-col gap-1">
                    <span className="font-space-mono text-[10px] uppercase tracking-[1px] text-[#4A4A4A]">
                        {t('totalRaised')}
                    </span>
                    <span
                        className="font-sora text-[32px] font-bold tabular-nums leading-none"
                        style={{
                            color: '#FF0055',
                            textShadow: '0 0 15px rgba(255,0,85,0.6), 0 0 30px rgba(255,0,85,0.2)',
                        }}
                    >
                        {formatFandis(auction.currentPrice ?? auction.startingPrice)} F
                    </span>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <span className="font-space-mono text-[12px] text-[#A0A0A0]">
                        {t('bidCount', { count: auction.bidCount })}
                    </span>
                    {auction.currentBidderName && (
                        <span className="font-space-mono text-[11px] text-[#737373]">
                            ↑ {auction.currentBidderName}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Escuadra progress bars ──
function EscuadraProgress({
    distribution,
}: {
    distribution: { level: number; count: number; minAmount: number }[];
}) {
    const t = useTranslations('live');
    const sorted = [...distribution].sort((a, b) => b.level - a.level);
    const maxCount = Math.max(...sorted.map((e) => e.count), 1);

    return (
        <div className="flex flex-col gap-3">
            {sorted.map((esc) => {
                const cfg = ESCUADRA[esc.level as keyof typeof ESCUADRA];
                if (!cfg) return null;
                const widthPct = Math.max(4, (esc.count / maxCount) * 100);

                return (
                    <div key={esc.level} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <span
                                className="font-space-mono text-[10px] uppercase tracking-[1px]"
                                style={{ color: cfg.color }}
                            >
                                {cfg.label}
                            </span>
                            <span className="font-space-mono text-[10px] text-[#4A4A4A]">
                                {esc.count} {t('fans')}
                                {esc.minAmount > 0 && (
                                    <> · {formatFandis(esc.minAmount)} F {t('minAmount')}</>
                                )}
                            </span>
                        </div>
                        <div className="h-2 w-full bg-[#1A1A1A]">
                            <motion.div
                                className="h-full"
                                style={{
                                    background: cfg.color,
                                    boxShadow: `0 0 12px ${cfg.glow}`,
                                    width: `${widthPct}%`,
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${widthPct}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Activity feed row ──
function FeedRow({
    children,
    isNew,
    accentColor,
}: {
    children: React.ReactNode;
    isNew?: boolean;
    accentColor?: string;
}) {
    return (
        <motion.div
            layout
            initial={isNew ? { opacity: 0, y: -10 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-between gap-4 border-b border-[#141414] px-4 py-2.5"
            style={{ background: '#0A0A0A' }}
        >
            {children}
        </motion.div>
    );
}

// ── Loading skeleton ──
function LoadingSkeleton() {
    return (
        <div className="flex flex-col gap-8 p-8">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-36 w-full rounded-none bg-[#1E1E1E]" />
                ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Skeleton className="h-64 w-full rounded-none bg-[#1E1E1E]" />
                <Skeleton className="h-64 w-full rounded-none bg-[#1E1E1E]" />
            </div>
            <Skeleton className="h-80 w-full rounded-none bg-[#1E1E1E]" />
        </div>
    );
}

// ── Main Page ──
export default function LiveDashboardPage() {
    const { id: eventId } = useParams() as { id: string };
    const router = useRouter();
    const t = useTranslations('live');
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'contributions' | 'bids'>('contributions');

    // ── Event (reuse cached query from layout) ──
    const { data: event, isLoading: eventLoading } = useQuery({
        queryKey: ['events', eventId],
        queryFn: () => eventsApi.get(eventId),
    });

    // Guard: redirect if not live
    useEffect(() => {
        if (!eventLoading && event && event.status !== 'live') {
            router.replace(`/dashboard/events/${eventId}`);
        }
    }, [event, eventLoading, eventId, router]);

    // ── Live pulse (primary, every 5s) ──
    const { data: pulse, isLoading: pulseLoading, isError } = useQuery({
        queryKey: ['events', eventId, 'live'],
        queryFn: () => analyticsApi.getLivePulse(eventId),
        refetchInterval: 5_000,
        enabled: event?.status === 'live',
    });

    // ── Experience breakdown (every 10s) ──
    const { data: experienceBreakdown } = useQuery({
        queryKey: ['events', eventId, 'experiences', 'analytics'],
        queryFn: () => analyticsApi.getExperienceBreakdown(eventId),
        refetchInterval: 10_000,
        enabled: event?.status === 'live',
    });

    // ── Auctions (every 5s) ──
    const { data: auctions } = useQuery({
        queryKey: ['events', eventId, 'auctions'],
        queryFn: () => auctionsApi.list(eventId),
        refetchInterval: 5_000,
        enabled: event?.status === 'live',
    });

    // ── WebSocket — enhances polling with instant invalidation ──
    const { connectionStatus } = useWebSocket({
        topics: [`event:${eventId}`],
        enabled: event?.status === 'live',
        onMessage: (msg) => {
            if (['event_pulse', 'auction_update', 'experience_update', 'surprise_revealed'].includes(msg.type)) {
                queryClient.invalidateQueries({ queryKey: ['events', eventId, 'live'] });
            }
            if (msg.type === 'auction_update') {
                queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
            }
            if (['experience_update', 'surprise_revealed'].includes(msg.type)) {
                queryClient.invalidateQueries({ queryKey: ['events', eventId, 'experiences', 'analytics'] });
            }
            if (['event_update', 'event_live'].includes(msg.type)) {
                queryClient.invalidateQueries({ queryKey: ['events', eventId] });
            }
        },
    });

    // ── Derived ──
    const activeAuctions  = (auctions ?? []).filter((a) => a.status === 'active');
    const activeExperiences = (experienceBreakdown ?? []).filter((e) => e.status === 'active');

    // ── Loading state ──
    if (eventLoading || (pulseLoading && !pulse)) {
        return <LoadingSkeleton />;
    }

    // ── Error state ──
    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 p-16">
                <p className="font-space-mono text-[14px] uppercase tracking-[2px] text-[#FF3366]">
                    Error al cargar datos en vivo
                </p>
                <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['events', eventId, 'live'] })}
                    className="border border-[#2D00F7] bg-transparent px-6 py-3 font-space-mono text-[13px] uppercase tracking-[1px] text-[#2D00F7] transition-all hover:bg-[#2D00F710]"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 p-8">

            {/* ── Page Header ── */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                    <h1 className="font-sora text-4xl font-extrabold tracking-[-1px] text-white">
                        {t('title').toUpperCase()}
                    </h1>
                    {event && (
                        <p className="font-space-mono text-[12px] uppercase tracking-[1px] text-[#4A4A4A]">
                            {event.name}
                        </p>
                    )}
                </div>
                <ConnectionDot status={connectionStatus} />
            </div>

            {/* ── Big Number Cards ── */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard
                    label={t('totalRaised')}
                    value={`${formatFandis(pulse?.totalRaised ?? 0)} F`}
                    sub={`≈ ${formatUsd(pulse?.totalRaised ?? 0)}`}
                    icon={TrendingUp}
                    glowColor="rgba(45,0,247,0.6)"
                />
                <StatCard
                    label={t('participants')}
                    value={pulse?.uniqueParticipants ?? 0}
                    icon={Users}
                />
                <StatCard
                    label={t('contributions')}
                    value={pulse?.contributionsCount ?? 0}
                    icon={Activity}
                />
                <StatCard
                    label={t('bids')}
                    value={pulse?.bidsCount ?? 0}
                    icon={Gavel}
                />
            </div>

            {/* ── Middle Row: Experiences + Auctions ── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* Experience Progress */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Radio size={14} className="text-[#00FF88]" />
                        <h2 className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#737373]">
                            {t('activeExperiences')} ({activeExperiences.length})
                        </h2>
                    </div>

                    {activeExperiences.length === 0 ? (
                        <div className="border border-dashed border-[#1E1E1E] px-5 py-10 text-center">
                            <p className="font-space-mono text-[12px] text-[#4A4A4A]">{t('noActivity')}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {activeExperiences.map((exp) => (
                                <div
                                    key={exp.experienceId}
                                    className="flex flex-col gap-4 border border-[#1E1E1E] bg-[#0A0A0A] p-5"
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="font-sora text-[18px] font-semibold text-white leading-tight">
                                            {exp.experienceName}
                                        </span>
                                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                                            <span
                                                className="font-sora text-[22px] font-bold tabular-nums"
                                                style={{
                                                    color: '#00FF88',
                                                    textShadow: '0 0 12px rgba(0,255,136,0.5)',
                                                }}
                                            >
                                                {formatFandis(exp.totalRaised)} F
                                            </span>
                                            <span className="font-space-mono text-[10px] text-[#4A4A4A]">
                                                {exp.contributorCount} {t('fans')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Escuadra bars */}
                                    {exp.escuadraDistribution.length > 0 && (
                                        <EscuadraProgress distribution={exp.escuadraDistribution} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Active Auctions */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF0055]" />
                        <h2 className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#737373]">
                            {t('activeAuctions')} ({activeAuctions.length})
                        </h2>
                    </div>

                    {activeAuctions.length === 0 ? (
                        <div className="border border-dashed border-[#1E1E1E] px-5 py-10 text-center">
                            <p className="font-space-mono text-[12px] text-[#4A4A4A]">{t('noActivity')}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {activeAuctions.map((auction) => (
                                <AuctionLiveCard key={auction.id} auction={auction} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Activity Feed ── */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <Zap size={14} className="text-[#2D00F7]" />
                    <h2 className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#737373]">
                        {t('activityFeed')}
                    </h2>
                </div>

                {/* Tab strip */}
                <div className="flex border-b border-[#1E1E1E]">
                    {(['contributions', 'bids'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className="px-6 py-3 font-space-mono text-[12px] uppercase tracking-[1px] transition-colors"
                            style={{
                                color: activeTab === tab ? '#FFFFFF' : '#4A4A4A',
                                borderBottom: activeTab === tab ? '2px solid #2D00F7' : '2px solid transparent',
                            }}
                        >
                            {tab === 'contributions' ? t('tabContributions') : t('tabBids')}
                        </button>
                    ))}
                </div>

                {/* Feed container — .scanlines overlay, pure black background */}
                <div
                    className="scanlines relative overflow-hidden border border-[#1A1A1A]"
                    style={{ background: '#000000', minHeight: '280px' }}
                >
                    {activeTab === 'contributions' && (
                        <>
                            {(!pulse?.latestContributions || pulse.latestContributions.length === 0) ? (
                                <div className="flex items-center justify-center py-16">
                                    <span className="font-space-mono text-[12px] text-[#2A2A2A]">
                                        {t('noActivity')}
                                    </span>
                                </div>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {pulse.latestContributions.map((entry, i) => (
                                        <FeedRow key={`${entry.userName}-${entry.createdAt}`} isNew={i === 0}>
                                            <span className="font-space-mono text-[13px] text-[#A3A3A3] leading-relaxed">
                                                <span className="text-[#A3A3A3]">{entry.userName}</span>
                                                {' '}aportó{' '}
                                                <span style={{ color: '#22C55E' }}>
                                                    {formatFandis(entry.amount)} F
                                                </span>
                                                {' '}→{' '}
                                                <span className="text-[#737373]">{entry.experienceName}</span>
                                            </span>
                                            <span
                                                className="font-space-mono text-[11px] shrink-0"
                                                style={{ color: '#4A4A4A' }}
                                            >
                                                {formatDistanceToNow(new Date(entry.createdAt), {
                                                    addSuffix: true,
                                                    locale: es,
                                                })}
                                            </span>
                                        </FeedRow>
                                    ))}
                                </AnimatePresence>
                            )}
                        </>
                    )}

                    {activeTab === 'bids' && (
                        <>
                            {(!pulse?.latestBids || pulse.latestBids.length === 0) ? (
                                <div className="flex items-center justify-center py-16">
                                    <span className="font-space-mono text-[12px] text-[#2A2A2A]">
                                        {t('noActivity')}
                                    </span>
                                </div>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {pulse.latestBids.map((entry, i) => (
                                        <FeedRow key={`${entry.userName}-${entry.createdAt}`} isNew={i === 0}>
                                            <span className="font-space-mono text-[13px] text-[#A3A3A3] leading-relaxed">
                                                <span className="text-[#A3A3A3]">{entry.userName}</span>
                                                {' '}pujó{' '}
                                                <span style={{ color: '#FF0055' }}>
                                                    {formatFandis(entry.amount)} F
                                                </span>
                                                {' '}en{' '}
                                                <span className="text-[#737373]">{entry.auctionName}</span>
                                            </span>
                                            <span
                                                className="font-space-mono text-[11px] shrink-0"
                                                style={{ color: '#4A4A4A' }}
                                            >
                                                {formatDistanceToNow(new Date(entry.createdAt), {
                                                    addSuffix: true,
                                                    locale: es,
                                                })}
                                            </span>
                                        </FeedRow>
                                    ))}
                                </AnimatePresence>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
