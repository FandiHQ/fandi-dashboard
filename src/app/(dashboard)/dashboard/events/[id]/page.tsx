'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Tag, FileText, Clock, Radio, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { eventsApi, analyticsApi } from '@/lib/api-hooks';
import { formatFandis, formatUsd } from '@/lib/currency';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';

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
            return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch { return null; }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-8">
                {/* Metrics skeleton */}
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-none bg-[#1E1E1E]" />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                    <div className="xl:col-span-2">
                        <Skeleton className="aspect-[16/9] w-full rounded-none bg-[#1E1E1E]" />
                    </div>
                    <div className="flex flex-col gap-4">
                        <Skeleton className="h-8 w-48 rounded-none bg-[#1E1E1E]" />
                        <Skeleton className="h-6 w-32 rounded-none bg-[#1E1E1E]" />
                        <Skeleton className="h-6 w-40 rounded-none bg-[#1E1E1E]" />
                        <Skeleton className="h-6 w-36 rounded-none bg-[#1E1E1E]" />
                        <Skeleton className="h-20 w-full rounded-none bg-[#1E1E1E]" />
                    </div>
                </div>
            </div>
        );
    }

    if (!event) return null;

    const isDraft = event.status === 'draft';
    const isLive = event.status === 'live';

    return (
        <div className="flex flex-col gap-8">
            {/* ── Metrics Cards ── */}
            <div className={isLive ? 'live-pulse-container rounded-none border border-[#1E1E1E] p-4' : ''}>
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                    {/* Total Recaudado */}
                    <div className="hud-card flex flex-col gap-1 rounded-none p-5">
                        <span className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#737373]">
                            {t('totalRaised')}
                        </span>
                        {isDraft ? (
                            <span className="font-sora text-[32px] font-semibold text-[#4A4A4A]">--</span>
                        ) : summaryLoading ? (
                            <Skeleton className="h-10 w-32 rounded-none bg-[#1E1E1E]" />
                        ) : (
                            <div className="flex flex-col">
                                <span className="font-sora text-[32px] font-semibold text-white">
                                    {formatFandis(summary?.totalRaised ?? 0)} F
                                </span>
                                <span className="font-space-mono text-[11px] text-[#737373]">
                                    ≈ {formatUsd(summary?.totalRaised ?? 0)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Participantes */}
                    <div className="hud-card flex flex-col gap-1 rounded-none p-5">
                        <span className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#737373]">
                            {t('participants')}
                        </span>
                        {isDraft ? (
                            <span className="font-sora text-[32px] font-semibold text-[#4A4A4A]">--</span>
                        ) : summaryLoading ? (
                            <Skeleton className="h-10 w-20 rounded-none bg-[#1E1E1E]" />
                        ) : (
                            <span className="font-sora text-[32px] font-semibold text-white">
                                {summary?.uniqueParticipants ?? 0}
                            </span>
                        )}
                    </div>

                    {/* Oportunidades */}
                    <div className="hud-card flex flex-col gap-1 rounded-none p-5">
                        <span className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#737373]">
                            {t('tabs.experiences')}
                        </span>
                        {isDraft ? (
                            <span className="font-sora text-[32px] font-semibold text-[#4A4A4A]">--</span>
                        ) : summaryLoading ? (
                            <Skeleton className="h-10 w-16 rounded-none bg-[#1E1E1E]" />
                        ) : (
                            <span className="font-sora text-[32px] font-semibold text-white">
                                {summary?.experienceCount ?? 0}
                            </span>
                        )}
                    </div>

                    {/* Subastas */}
                    <div className="hud-card flex flex-col gap-1 rounded-none p-5">
                        <span className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#737373]">
                            {t('tabs.auctions')}
                        </span>
                        {isDraft ? (
                            <span className="font-sora text-[32px] font-semibold text-[#4A4A4A]">--</span>
                        ) : summaryLoading ? (
                            <Skeleton className="h-10 w-16 rounded-none bg-[#1E1E1E]" />
                        ) : (
                            <span className="font-sora text-[32px] font-semibold text-white">
                                {summary?.auctionCount ?? 0}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Live Dashboard Link ── */}
            {isLive && (
                <Link
                    href={`/dashboard/events/${eventId}/live`}
                    className="btn-tactical flex w-fit cursor-pointer items-center gap-3 rounded-none bg-[var(--color-tactical-magenta)] px-8 py-4 font-space-mono text-[13px] font-bold uppercase tracking-[2px] text-white transition-all hover:shadow-[0_0_30px_rgba(255,0,85,0.8)]"
                >
                    <Radio size={16} className="animate-pulse" />
                    {t('viewLiveDashboard')}
                </Link>
            )}

            {/* ── Event Details Grid ── */}
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                {/* ── Left: Cover Image ── */}
                <div className="xl:col-span-2">
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-none border border-[#1E1E1E] bg-[#141414] shadow-[0_0_40px_rgba(45,0,247,0.08)]">
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
                                <Calendar size={64} className="text-[#1E1E1E]" />
                                <span className="font-space-mono text-sm uppercase tracking-[1px] text-[#4A4A4A]">
                                    {t('coverImage')}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right: Event Details ── */}
                <div className="flex flex-col gap-6">
                    {/* Status */}
                    <div className="flex flex-col gap-2">
                        <span className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#737373]">
                            {t('statusLabel')}
                        </span>
                        <StatusBadge status={event.status} />
                    </div>

                    {/* Event Type */}
                    {event.eventType && (
                        <div className="flex flex-col gap-2">
                            <span className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#737373]">
                                {t('eventType')}
                            </span>
                            <div className="flex items-center gap-2">
                                <Tag size={18} className="text-[#2D00F7]" />
                                <span className="font-sora text-xl text-white">
                                    {eventTypeLabels[event.eventType] || event.eventType}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Date */}
                    <div className="flex flex-col gap-2">
                        <span className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#737373]">
                            {t('date')}
                        </span>
                        <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-[#2D00F7]" />
                            <span className="font-sora text-xl capitalize text-white">
                                {formatDate(event.eventDate)}
                            </span>
                        </div>
                    </div>

                    {/* Two-Clock: Informational hours */}
                    {(formatTime(event.eventDate) || formatTime(event.eventEndDate)) && (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-[#737373]" />
                                <span className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#737373]">
                                    Reloj Informativo (Boletas)
                                </span>
                            </div>
                            <div className="flex items-center gap-2 pl-5">
                                <span className="font-sora text-lg text-white">
                                    {formatTime(event.eventDate)}
                                    {formatTime(event.eventEndDate) && ` — ${formatTime(event.eventEndDate)}`}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Two-Clock: Fandi hours */}
                    {(event.fandiOpensAt || event.fandiClosesAt) && (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Zap size={14} className="text-[#2D00F7]" />
                                <span className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#2D00F7]">
                                    Reloj Fandi (Dinámicas)
                                </span>
                            </div>
                            <div className="flex items-center gap-2 pl-5">
                                <span className="font-sora text-lg text-white">
                                    {formatTime(event.fandiOpensAt) || '--:--'}
                                    {' — '}
                                    {formatTime(event.fandiClosesAt) || '--:--'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Venue + City */}
                    {event.venue && (
                        <div className="flex flex-col gap-2">
                            <span className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#737373]">
                                {t('venue')}
                            </span>
                            <div className="flex items-center gap-2">
                                <MapPin size={18} className="text-[#2D00F7]" />
                                <span className="font-sora text-xl text-white">
                                    {event.city ? `${event.venue}, ${event.city}` : event.venue}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {event.description && (
                        <div className="flex flex-col gap-2">
                            <span className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#737373]">
                                {t('description')}
                            </span>
                            <div className="flex items-start gap-2">
                                <FileText size={18} className="mt-0.5 shrink-0 text-[#2D00F7]" />
                                <p className="font-sora text-lg leading-relaxed text-[#A0A0A0]">
                                    {event.description}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Created at */}
                    <div className="mt-auto border-t border-[#1E1E1E] pt-4">
                        <span className="font-space-mono text-[14px] uppercase tracking-[2px] text-[#4A4A4A]">
                            Creado: {new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(event.createdAt))}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
