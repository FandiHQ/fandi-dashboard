'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Tag, FileText, Clock } from 'lucide-react';
import Image from 'next/image';
import { eventsApi } from '@/lib/api-hooks';
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
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(iso));

    if (isLoading) {
        return (
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
        );
    }

    if (!event) return null;

    return (
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
                    <span className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#737373]">
                        {t('statusLabel')}
                    </span>
                    <StatusBadge status={event.status} />
                </div>

                {/* Event Type */}
                {event.eventType && (
                    <div className="flex flex-col gap-2">
                        <span className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#737373]">
                            {t('eventType')}
                        </span>
                        <div className="flex items-center gap-2">
                            <Tag size={18} className="text-[#2D00F7]" />
                            <span className="font-sora text-lg text-white">
                                {eventTypeLabels[event.eventType] || event.eventType}
                            </span>
                        </div>
                    </div>
                )}

                {/* Date */}
                <div className="flex flex-col gap-2">
                    <span className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#737373]">
                        {t('date')}
                    </span>
                    <div className="flex items-center gap-2">
                        <Clock size={18} className="text-[#2D00F7]" />
                        <span className="font-sora text-lg capitalize text-white">
                            {formatDate(event.eventDate)}
                        </span>
                    </div>
                </div>

                {/* Venue */}
                {event.venue && (
                    <div className="flex flex-col gap-2">
                        <span className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#737373]">
                            {t('venue')}
                        </span>
                        <div className="flex items-center gap-2">
                            <MapPin size={18} className="text-[#2D00F7]" />
                            <span className="font-sora text-lg text-white">
                                {event.venue}
                            </span>
                        </div>
                    </div>
                )}

                {/* Description */}
                {event.description && (
                    <div className="flex flex-col gap-2">
                        <span className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#737373]">
                            {t('description')}
                        </span>
                        <div className="flex items-start gap-2">
                            <FileText size={18} className="mt-0.5 shrink-0 text-[#2D00F7]" />
                            <p className="font-sora text-base leading-relaxed text-[#A0A0A0]">
                                {event.description}
                            </p>
                        </div>
                    </div>
                )}

                {/* Created at */}
                <div className="mt-auto border-t border-[#1E1E1E] pt-4">
                    <span className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#4A4A4A]">
                        Creado: {new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(event.createdAt))}
                    </span>
                </div>
            </div>
        </div>
    );
}
