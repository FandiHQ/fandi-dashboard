'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { eventsApi, analyticsApi, auctionsApi } from '@/lib/api-hooks';
import { useWebSocket } from '@/hooks/use-websocket';
import { formatFandis, formatCop } from '@/lib/currency';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { WsConnectionStatus, Auction, LivePulseResponse } from '@/types/api';

// ── Categoría config (code keeps the escuadra name; UI says Categorías) ──
const ESCUADRA = {
    4: { label: 'VIP',   bar: 'bg-tier-vip' },
    3: { label: 'ALTA',  bar: 'bg-tier-alta' },
    2: { label: 'MEDIA', bar: 'bg-tier-media' },
    1: { label: 'BASE',  bar: 'bg-tier-base' },
} as const;

const fmtInt = (n: number) => new Intl.NumberFormat('es-CO').format(n);

// ── Wall clock, ticking once a second (display only) ──
function subscribeSecond(cb: () => void) {
    const id = setInterval(cb, 1000);
    return () => clearInterval(id);
}
function useNow(): number | null {
    return useSyncExternalStore(
        subscribeSecond,
        () => Math.floor(Date.now() / 1000) * 1000,
        () => null,
    );
}

function pad2(n: number) {
    return String(n).padStart(2, '0');
}

function formatRemaining(totalSeconds: number) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

// ── Reloj Fandi (top bar) ──
function FandiClock({ timeZone }: { timeZone: string }) {
    const now = useNow();
    const label = now === null
        ? '--:--:--'
        : new Intl.DateTimeFormat('es-CO', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone,
        }).format(now);
    return (
        <span className="font-space-mono text-[18px] font-bold tabular text-white">{label}</span>
    );
}

// ── Fandi window countdown + progress (display only) ──
function WindowCountdown({
    opensAt, closesAt, label,
}: {
    opensAt: string | null;
    closesAt: string;
    label: string;
}) {
    const now = useNow();
    const end = new Date(closesAt).getTime();
    const start = opensAt ? new Date(opensAt).getTime() : null;
    const remaining = now === null ? null : Math.max(0, Math.floor((end - now) / 1000));
    const pct = now !== null && start !== null && end > start
        ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
        : null;

    return (
        <>
            <div className="shrink-0 text-right">
                <div className="label-mono text-[11px] text-lilac">{label}</div>
                <div className="font-space-mono text-[40px] font-bold leading-none tabular text-lime xl:text-[54px]">
                    {remaining === null ? '--:--' : formatRemaining(remaining)}
                </div>
            </div>
            {pct !== null && (
                <div className="order-last h-2.5 w-full basis-full overflow-hidden rounded-full border-2 border-ink bg-ink/40">
                    <div className="h-full bg-lime" style={{ width: `${pct}%` }} />
                </div>
            )}
        </>
    );
}

// ── Connection status indicator ──
function ConnectionDot({ status }: { status: WsConnectionStatus }) {
    const t = useTranslations('live');
    const cfg = {
        connected:    { tone: 'text-lime',  label: t('connected'),    pulse: true },
        connecting:   { tone: 'text-lilac', label: t('connecting'),   pulse: false },
        reconnecting: { tone: 'text-lilac', label: t('reconnecting'), pulse: false },
        disconnected: { tone: 'text-alert', label: t('disconnected'), pulse: false },
        disabled:     { tone: 'text-alert', label: t('disconnected'), pulse: false },
    }[status];

    return (
        <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 ${cfg.tone}`}>
                {cfg.pulse ? (
                    <span className="live-dot" aria-hidden />
                ) : (
                    <span className="inline-block size-[7px] rounded-[2px] bg-current" aria-hidden />
                )}
                <span className="label-mono text-[11px] font-bold">
                    {cfg.label}
                </span>
            </div>
            <span className="font-space-mono text-[10px] text-muted-ink">
                · {t('pollingActive')}
            </span>
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
            className={`font-space-mono text-[11px] tabular ${isUrgent ? 'text-alert motion-safe:animate-pulse' : 'text-lime'} ${isAlarm ? 'font-bold' : ''}`}
        >
            {display}
        </span>
    );
}

// ── Active auction mini card ──
function AuctionLiveCard({ auction }: { auction: Auction }) {
    const t = useTranslations('live');
    const price = auction.currentPrice ?? auction.startingPrice;
    return (
        <div className="block-ink flex flex-col gap-2 rounded-[14px] px-4 py-3.5 shadow-ext-live">
            <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-lime">
                    <span className="live-dot" aria-hidden />
                    <span className="label-mono font-bold">{t('auctionLiveTag')}</span>
                </span>
                {auction.endsAt && <AuctionTimer endsAt={auction.endsAt} />}
            </div>

            <span className="font-display text-[17px] leading-none">
                {auction.name}
            </span>

            <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-[26px] tabular">
                    {formatFandis(price)} <span className="text-lime">F</span>
                </span>
                <span className="text-right font-space-mono text-[10px] text-muted-ink">
                    {t('bidCount', { count: auction.bidCount })}
                </span>
            </div>
            <div className="flex items-center justify-between gap-3 font-space-mono text-[10px] text-muted-ink">
                <span>≈ {formatCop(price)}</span>
                {auction.currentBidderName && (
                    <span className="truncate">↑ {auction.currentBidderName}</span>
                )}
            </div>
        </div>
    );
}

// ── Category blocks for one active oportunidad ──
function EscuadraBlocks({
    distribution,
}: {
    distribution: { level: number; count: number; minAmount: number }[];
}) {
    const t = useTranslations('live');
    const sorted = [...distribution].sort((a, b) => b.level - a.level);

    return (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {sorted.map((esc) => {
                const cfg = ESCUADRA[esc.level as keyof typeof ESCUADRA];
                if (!cfg) return null;

                return (
                    <div
                        key={esc.level}
                        className="block-ink relative overflow-hidden rounded-[14px] py-3 pl-5 pr-3.5"
                    >
                        <span className={`absolute inset-y-0 left-0 w-1.5 ${cfg.bar}`} aria-hidden />
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="font-display text-[17px]">{cfg.label}</span>
                            {esc.minAmount > 0 && (
                                <span className="font-space-mono text-[10px] text-muted-ink">
                                    {t('fromAmount', { amount: formatFandis(esc.minAmount) })}
                                </span>
                            )}
                        </div>
                        <div className="font-display mt-1.5 text-[28px] tabular">{fmtInt(esc.count)}</div>
                        <div className="mt-1 font-space-mono text-[9px] uppercase text-muted-ink">
                            {t('fans')}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Aggregated activity (no names, no individual amounts) ──
type FeedItem = { key: string; kind: 'contribution' | 'bid'; name: string; count: number; at: string };

function aggregateFeed(pulse: LivePulseResponse | undefined): FeedItem[] {
    const groups = new Map<string, FeedItem>();
    const add = (kind: FeedItem['kind'], name: string, at: string) => {
        const key = `${kind}:${name}`;
        const prev = groups.get(key);
        if (!prev) {
            groups.set(key, { key, kind, name, count: 1, at });
        } else {
            prev.count += 1;
            if (new Date(at).getTime() > new Date(prev.at).getTime()) prev.at = at;
        }
    };
    for (const entry of pulse?.latestContributions ?? []) add('contribution', entry.experienceName, entry.createdAt);
    for (const entry of pulse?.latestBids ?? []) add('bid', entry.auctionName, entry.createdAt);
    return [...groups.values()].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

// ── Loading skeleton ──
function LoadingSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <Skeleton className="h-56 w-full rounded-[18px]" />
                        <Skeleton className="h-56 w-full rounded-2xl" />
                    </div>
                    <Skeleton className="h-40 w-full rounded-2xl" />
                </div>
                <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
        </div>
    );
}

// ── Main Page ──
export default function LiveDashboardPage() {
    const { id: eventId } = useParams() as { id: string };
    const router = useRouter();
    const t = useTranslations('live');
    const tCommon = useTranslations('common');
    const queryClient = useQueryClient();

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
    // Display only: what is still waiting to open (no action exists yet).
    const queuedExperiences = (experienceBreakdown ?? []).filter((e) => e.status === 'pending');
    const queuedAuctions = (auctions ?? []).filter((a) => a.status === 'pending');
    const feed = aggregateFeed(pulse);

    // ── Loading state ──
    if (eventLoading || (pulseLoading && !pulse)) {
        return <LoadingSkeleton />;
    }

    // ── Error state ──
    if (isError) {
        return (
            <div className="block-white mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-8 py-10 text-center">
                <p className="label-mono text-[12px] font-bold text-alert-white">
                    {t('loadError')}
                </p>
                <Button
                    variant="secondary"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['events', eventId, 'live'] })}
                >
                    {tCommon('retry')}
                </Button>
            </div>
        );
    }

    const timeZone = event?.timezone || 'America/Bogota';

    return (
        <div className="flex flex-col gap-6">

            {/* ── Ink top bar ── */}
            <header className="block-ink flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3.5">
                <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="flex items-center gap-2 rounded-full bg-lime px-3 py-1 text-ink">
                        <span className="live-dot" aria-hidden />
                        <span className="label-mono text-[11px] font-bold">{t('livePill')}</span>
                    </span>
                    {event && (
                        <span className="font-display truncate text-[18px]">{event.name}</span>
                    )}
                    {event?.venue && (
                        <span className="font-space-mono text-[11px] uppercase text-muted-ink">{event.venue}</span>
                    )}
                    <ConnectionDot status={connectionStatus} />
                </div>
                <div className="flex items-center gap-3.5">
                    <span className="label-mono text-[11px] text-muted-ink">{t('fandiClock')}</span>
                    <FandiClock timeZone={timeZone} />
                    <Link
                        href={`/dashboard/events/${eventId}`}
                        className="rounded-[10px] border-2 border-dash-ink px-3 py-1.5 text-[13px] font-extrabold text-muted-ink transition-colors hover:border-muted-ink hover:text-white"
                    >
                        {t('exit')}
                    </Link>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">

                {/* ── Main column ── */}
                <div className="flex min-w-0 flex-col gap-[18px]">

                    {/* Title + countdown */}
                    <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-4">
                        <div className="min-w-0">
                            <div className="label-mono text-[11px] text-lilac">
                                {t('roomKicker', { experiences: activeExperiences.length, auctions: activeAuctions.length })}
                            </div>
                            <h1 className="font-hero mt-2 text-[40px] text-white xl:text-[44px]">
                                {t('title')}
                            </h1>
                        </div>
                        {event?.fandiClosesAt && (
                            <WindowCountdown
                                opensAt={event.fandiOpensAt ?? event.liveAt}
                                closesAt={event.fandiClosesAt}
                                label={t('closesIn')}
                            />
                        )}
                    </div>

                    {/* Hero + recaudado */}
                    <div className="grid grid-cols-1 items-stretch gap-[22px] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                        <div className="block-white tilt-hero flex flex-col justify-center rounded-[18px] px-6 py-5 text-center shadow-ext-xl">
                            <div className="label-mono text-[12px] font-bold tracking-[0.2em] text-muted-white">
                                {t('participants')}
                            </div>
                            <div
                                className="font-display text-[72px] tracking-[-0.03em] text-blue tabular xl:text-[80px] 2xl:text-[112px]"
                                aria-live="polite"
                                aria-atomic="true"
                            >
                                {fmtInt(pulse?.uniqueParticipants ?? 0)}
                            </div>
                            <div className="mt-1.5 flex items-center justify-center gap-2 text-ink">
                                <span className="live-dot" aria-hidden />
                                <span className="font-space-mono text-[12px] uppercase text-body-white">
                                    {t('heroTicker', {
                                        contributions: fmtInt(pulse?.contributionsCount ?? 0),
                                        bids: fmtInt(pulse?.bidsCount ?? 0),
                                    })}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3.5">
                            <div className="block-ink flex items-center justify-between gap-4 px-5 py-4">
                                <div>
                                    <div className="label-mono text-muted-ink">{t('totalRaised')}</div>
                                    <div className="font-display mt-1.5 text-[38px] leading-none tabular">
                                        {formatFandis(pulse?.totalRaised ?? 0)} <span className="text-lime">F</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="label-mono text-muted-ink">{t('copApprox')}</div>
                                    <div className="mt-1.5 text-[18px] font-extrabold tabular">
                                        {formatCop(pulse?.totalRaised ?? 0)}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="block-ink rounded-[14px] px-4 py-3">
                                    <div className="label-mono text-muted-ink">{t('activeExperiences')}</div>
                                    <div className="font-display mt-1.5 text-[28px] tabular">{activeExperiences.length}</div>
                                </div>
                                <div className="block-ink rounded-[14px] px-4 py-3">
                                    <div className="label-mono text-muted-ink">{t('activeAuctions')}</div>
                                    <div className="font-display mt-1.5 text-[28px] tabular">{activeAuctions.length}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Categorías per active oportunidad */}
                    {activeExperiences.length === 0 ? (
                        <div className="block-quiet px-5 py-8 text-center">
                            <p className="font-space-mono text-[12px] uppercase text-lilac">{t('noActivity')}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {activeExperiences.map((exp) => (
                                <section key={exp.experienceId} className="flex flex-col gap-3">
                                    <div className="flex flex-wrap items-end justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="label-mono text-[11px] text-lilac">
                                                {t('experienceKicker', { winners: exp.winnersCount })}
                                            </div>
                                            <h2 className="font-display mt-1.5 text-[24px] text-white">
                                                {exp.experienceName}
                                            </h2>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-display text-[24px] tabular text-white">
                                                {formatFandis(exp.totalRaised)} <span className="text-lime">F</span>
                                            </div>
                                            <div className="font-space-mono text-[10px] uppercase text-lilac">
                                                ≈ {formatCop(exp.totalRaised)} · {fmtInt(exp.contributorCount)} {t('fans')}
                                            </div>
                                        </div>
                                    </div>

                                    {exp.escuadraDistribution.length > 0 && (
                                        <EscuadraBlocks distribution={exp.escuadraDistribution} />
                                    )}
                                </section>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Side column (moves under the main column below 1280) ── */}
                <aside className="flex min-w-0 flex-col gap-3.5">
                    <h2 className="font-display text-[17px] text-white">{t('queue')}</h2>
                    {queuedExperiences.length === 0 && queuedAuctions.length === 0 ? (
                        <div className="block-quiet px-4 py-5">
                            <p className="font-space-mono text-[11px] uppercase text-lilac">{t('queueEmpty')}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {queuedExperiences.map((exp) => (
                                <div key={exp.experienceId} className="block-white flex flex-col gap-2 rounded-[14px] px-4 py-3.5 shadow-ext-md">
                                    <div className="flex justify-between gap-3">
                                        <span className="label-mono font-bold text-muted-white">{t('queueExperience')}</span>
                                        <span className="font-space-mono text-[10px] text-muted-white">
                                            {t('winnersShort', { count: exp.winnersCount })}
                                        </span>
                                    </div>
                                    <span className="font-display text-[17px] leading-none">{exp.experienceName}</span>
                                </div>
                            ))}
                            {queuedAuctions.map((auction) => (
                                <div key={auction.id} className="block-white flex flex-col gap-2 rounded-[14px] px-4 py-3.5 shadow-ext-md">
                                    <span className="label-mono font-bold text-muted-white">
                                        {t('queueAuction')}
                                        {auction.scheduledStart && (
                                            <> · {new Intl.DateTimeFormat('es-CO', {
                                                hour: '2-digit', minute: '2-digit', hour12: false, timeZone,
                                            }).format(new Date(auction.scheduledStart))}</>
                                        )}
                                    </span>
                                    <span className="font-display text-[17px] leading-none">{auction.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeAuctions.length > 0 && (
                        <div className="flex flex-col gap-3">
                            {activeAuctions.map((auction) => (
                                <AuctionLiveCard key={auction.id} auction={auction} />
                            ))}
                        </div>
                    )}

                    <h2 className="font-display mt-1 text-[17px] text-white">{t('activityFeed')}</h2>
                    <div className="block-quiet rounded-[14px] px-4 py-1.5">
                        {feed.length === 0 ? (
                            <p className="py-8 text-center font-space-mono text-[11px] uppercase text-lilac">
                                {t('noActivity')}
                            </p>
                        ) : (
                            feed.map((item) => (
                                <div
                                    key={item.key}
                                    className="flex items-center justify-between gap-4 border-b border-white/10 py-2.5 last:border-b-0"
                                >
                                    <span className="flex min-w-0 items-center gap-2.5">
                                        <span
                                            className={`inline-block size-2 shrink-0 rounded-[2px] ${item.kind === 'contribution' ? 'bg-lime' : 'bg-tier-vip'}`}
                                            aria-hidden
                                        />
                                        <span className="truncate text-[13px] font-semibold text-white">
                                            {item.kind === 'contribution'
                                                ? t('feedContributions', { count: item.count, name: item.name })
                                                : t('feedBids', { count: item.count, name: item.name })}
                                        </span>
                                    </span>
                                    <span className="shrink-0 font-space-mono text-[10px] uppercase text-lilac">
                                        {formatDistanceToNow(new Date(item.at), {
                                            addSuffix: true,
                                            locale: es,
                                        })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}
