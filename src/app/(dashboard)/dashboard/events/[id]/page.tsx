'use client';

import type { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Radio } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { eventsApi, analyticsApi } from '@/lib/api-hooks';
import { formatFandis, formatCop } from '@/lib/currency';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { Event } from '@/types/api';

const MONO_11 = 'font-space-mono text-[11px] uppercase tracking-[0.14em]';

export default function EventOverviewPage() {
    const params = useParams();
    const eventId = params.id as string;
    const t = useTranslations('events');

    const { data: event, isLoading } = useQuery({
        queryKey: ['events', eventId],
        queryFn: () => eventsApi.get(eventId),
    });

    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: ['events', eventId, 'analytics'],
        queryFn: () => analyticsApi.getEventSummary(eventId),
        enabled: !!event && event.status !== 'draft',
    });

    const eventTypeLabels: Record<string, string> = {
        football: t('typeFootball'),
        concert: t('typeConcert'),
        other: t('typeOther'),
    };

    const formatDate = (iso: string) =>
        new Intl.DateTimeFormat('es', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(new Date(iso));

    const formatTime = (iso: string | null | undefined) => {
        if (!iso) return null;
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch { return null; }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6">
                {/* Metrics skeleton */}
                <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-[22px] xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                    <Skeleton className="aspect-[16/9] w-full rounded-[18px]" />
                    <Skeleton className="h-full min-h-[320px] w-full rounded-[18px]" />
                </div>
            </div>
        );
    }

    if (!event) return null;

    const isDraft = event.status === 'draft';
    const isLive = event.status === 'live';

    const statValue = (value: ReactNode, skeletonWidth: string) =>
        isDraft ? (
            <span className="font-display mt-2 text-[36px] text-muted-white">--</span>
        ) : summaryLoading ? (
            <Skeleton className={`mt-2 h-9 ${skeletonWidth}`} />
        ) : (
            <span className="font-display tabular mt-2 text-[36px] text-ink">{value}</span>
        );

    const timeline = buildTimeline(event);
    const place = event.venue
        ? event.city
            ? `${event.venue}, ${event.city}`
            : event.venue
        : null;

    return (
        <div className="flex flex-col gap-6">
            {/* ── Stat blocks ── */}
            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
                {/* Total Recaudado */}
                <div className="block-white flex flex-col px-5 py-4">
                    <span className="label-mono text-muted-white">{t('totalRaised')}</span>
                    {statValue(`${formatFandis(summary?.totalRaised ?? 0)} F`, 'w-32')}
                    {!isDraft && !summaryLoading && (
                        <span className="mt-1.5 font-space-mono text-[10px] text-muted-white">
                            ≈ {formatCop(summary?.totalRaised ?? 0)}
                        </span>
                    )}
                </div>

                {/* Participantes */}
                <div className="block-white flex flex-col px-5 py-4">
                    <span className="label-mono text-muted-white">{t('participants')}</span>
                    {statValue(formatCount(summary?.uniqueParticipants ?? 0), 'w-20')}
                    {!isDraft && !summaryLoading && (
                        <span className="mt-1.5 font-space-mono text-[10px] uppercase text-muted-white">
                            {t('overview.participated')}
                        </span>
                    )}
                </div>

                {/* Oportunidades */}
                <Link
                    href={`/dashboard/events/${eventId}/experiences`}
                    className="block-white press group flex flex-col px-5 py-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
                >
                    <span className="label-mono text-muted-white">{t('tabs.experiences')}</span>
                    {statValue(summary?.experienceCount ?? 0, 'w-16')}
                    <span className="mt-1.5 font-space-mono text-[10px] uppercase text-blue group-hover:underline">
                        {t('overview.view')}
                    </span>
                </Link>

                {/* Subastas */}
                <Link
                    href={`/dashboard/events/${eventId}/auctions`}
                    className="block-white press group flex flex-col px-5 py-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
                >
                    <span className="label-mono text-muted-white">{t('tabs.auctions')}</span>
                    {statValue(summary?.auctionCount ?? 0, 'w-16')}
                    <span className="mt-1.5 font-space-mono text-[10px] uppercase text-blue group-hover:underline">
                        {t('overview.view')}
                    </span>
                </Link>
            </div>

            {/* ── Live room link ── */}
            {isLive && (
                <Button asChild size="lg" className="self-start">
                    <Link href={`/dashboard/events/${eventId}/live`}>
                        <Radio size={16} />
                        {t('viewLiveDashboard')}
                    </Link>
                </Button>
            )}

            {/* ── Poster + details ── */}
            <div className="grid grid-cols-1 gap-[22px] xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                {/* Poster */}
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[18px] border-2 border-ink bg-ink shadow-ext-lg xl:aspect-auto xl:h-full xl:min-h-[360px]">
                    {event.coverImageUrl ? (
                        <Image
                            src={event.coverImageUrl}
                            alt={event.name}
                            fill
                            unoptimized
                            className="object-cover"
                        />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3">
                            <Calendar size={56} className="text-dash-ink" />
                            <span className="label-mono text-muted-ink">
                                {t('coverImage')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="surface-white flex flex-col gap-4 overflow-hidden rounded-[18px] border-2 border-ink bg-white px-[22px] py-5 text-ink shadow-ext-lg">
                    <div className="grid grid-cols-2 gap-3.5">
                        {event.eventType && (
                            <DetailField label={t('eventType')}>
                                {eventTypeLabels[event.eventType] || event.eventType}
                            </DetailField>
                        )}
                        <DetailField label={t('date')}>
                            <span className="capitalize">{formatDate(event.eventDate)}</span>
                            {formatTime(event.eventDate) && (
                                <span className="tabular"> · {formatTime(event.eventDate)}</span>
                            )}
                        </DetailField>
                        {place && (
                            <DetailField label={t('venue')} wide>
                                {place}
                            </DetailField>
                        )}
                    </div>

                    {/* One timeline, two tracks (§7) */}
                    {timeline && (
                        <div className="border-t-2 border-line-white pt-3.5">
                            <span className="label-mono text-muted-white">{t('overview.schedule')}</span>
                            <div className="mt-2.5 flex justify-between font-space-mono text-[9px] text-muted-white">
                                {timeline.ticks.map((tick, i) => (
                                    <span key={i}>{tick}</span>
                                ))}
                            </div>
                            <div className="relative mt-1.5 h-[66px] border-x-2 border-line-white">
                                {timeline.ticket && (
                                    <TimelineTrack
                                        top={4}
                                        left={timeline.ticket.left}
                                        width={timeline.ticket.width}
                                        tone="ticket"
                                        label={`${t('overview.ticketTrack')} · ${timeline.ticket.range}`}
                                    />
                                )}
                                {timeline.fandi && (
                                    <TimelineTrack
                                        top={36}
                                        left={timeline.fandi.left}
                                        width={timeline.fandi.width}
                                        tone="fandi"
                                        label={`${t('overview.fandiTrack')} · ${timeline.fandi.range}`}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {event.description && (
                        <div className="border-t-2 border-line-white pt-3.5">
                            <span className="label-mono text-muted-white">{t('description')}</span>
                            <p className="mt-1.5 text-sm leading-relaxed text-body-white [text-wrap:pretty]">
                                {event.description}
                            </p>
                        </div>
                    )}

                    {/* Created at */}
                    <div className="mt-auto border-t-2 border-line-white pt-3.5">
                        <span className={`${MONO_11} text-muted-white`}>
                            {t('overview.createdAt', {
                                date: new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(event.createdAt)),
                            })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Detail field (mono label + bold value) ──

function DetailField({
    label,
    wide,
    children,
}: {
    label: string;
    wide?: boolean;
    children: ReactNode;
}) {
    return (
        <div className={wide ? 'col-span-2' : undefined}>
            <div className="label-mono text-muted-white">{label}</div>
            <div className="mt-1 text-[17px] font-extrabold leading-tight">{children}</div>
        </div>
    );
}

// ── Timeline track ──

function TimelineTrack({
    top,
    left,
    width,
    tone,
    label,
}: {
    top: number;
    left: number;
    width: number;
    tone: 'ticket' | 'fandi';
    label: string;
}) {
    return (
        <div
            title={label}
            className={`absolute flex h-6 items-center overflow-hidden rounded-[6px] border-2 border-ink px-2 text-[11px] font-extrabold ${
                tone === 'ticket' ? 'bg-line-white text-ink' : 'bg-blue text-white'
            }`}
            style={{ top, left: `${left}%`, width: `${width}%` }}
        >
            <span className="truncate">{label}</span>
        </div>
    );
}

// ── Timeline maths (presentation only) ──

type TimelineSpan = { left: number; width: number; range: string };

function buildTimeline(event: Event): {
    ticks: string[];
    ticket: TimelineSpan | null;
    fandi: TimelineSpan | null;
} | null {
    const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);
    const tStart = ms(event.eventDate);
    const tEnd = ms(event.eventEndDate);
    const fStart = ms(event.fandiOpensAt);
    const fEnd = ms(event.fandiClosesAt);
    const hasTicket = Number.isFinite(tStart) && Number.isFinite(tEnd) && tEnd > tStart;
    const hasFandi = Number.isFinite(fStart) && Number.isFinite(fEnd) && fEnd > fStart;
    if (!hasTicket && !hasFandi) return null;

    const points = [
        ...(hasTicket ? [tStart, tEnd] : []),
        ...(hasFandi ? [fStart, fEnd] : []),
    ];
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min;
    const multiDay =
        span > 24 * 60 * 60 * 1000 ||
        new Date(min).toDateString() !== new Date(max).toDateString();

    const fmt = (v: number) => {
        const d = new Date(v);
        const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
        if (!multiDay) return time;
        const day = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })
            .format(d)
            .replace(/\./g, '')
            .replace(/ de /g, ' ');
        return `${day} ${time}`;
    };
    const place = (a: number, b: number): TimelineSpan => ({
        left: ((a - min) / span) * 100,
        width: ((b - a) / span) * 100,
        range: `${fmt(a)} – ${fmt(b)}`,
    });

    return {
        ticks: [0, 1, 2, 3, 4].map((i) => fmt(min + (span * i) / 4)),
        ticket: hasTicket ? place(tStart, tEnd) : null,
        fandi: hasFandi ? place(fStart, fEnd) : null,
    };
}

function formatCount(n: number): string {
    return new Intl.NumberFormat('es-CO').format(n);
}
