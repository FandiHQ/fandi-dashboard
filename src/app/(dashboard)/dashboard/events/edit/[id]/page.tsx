'use client';

import { useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Calendar, MapPin, Tag, Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { eventsApi } from '@/lib/api-hooks';
import type { UpdateEventDto } from '@/types/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select';

/** Combine a date (YYYY-MM-DD) and time (HH:MM) into ISO string, preserving local time */
function combineDateAndTime(date: string, time: string): string | undefined {
    if (!date || !time) return undefined;
    // Create date in local timezone and serialize preserving the intended time
    const d = new Date(`${date}T${time}:00`);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
}

/** Extract HH:MM from an ISO/date string using LOCAL time */
function isoToTime(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch { return ''; }
}

/** Extract YYYY-MM-DD from an ISO/date string using LOCAL time */
function isoToDate(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch { return ''; }
}

export default function EditEventPage() {
    const params = useParams();
    const router = useRouter();
    const t = useTranslations('events');
    const { memberRole } = useAuth();
    const queryClient = useQueryClient();
    const eventId = params.id as string;

    const isWriteRole = memberRole === 'owner' || memberRole === 'admin';
    useEffect(() => {
        if (memberRole && !isWriteRole) {
            router.replace(`/dashboard/events/${eventId}`);
        }
    }, [memberRole, isWriteRole, router, eventId]);

    // Fetch current event data
    const { data: event, isLoading: loadingEvent } = useQuery({
        queryKey: ['events', eventId],
        queryFn: () => eventsApi.get(eventId),
    });

    const schema = useMemo(
        () =>
            z.object({
                name: z.string().min(1, 'Este campo es requerido').max(255),
                eventType: z.string().optional(),
                eventDate: z.string().min(1, 'Este campo es requerido'), // YYYY-MM-DD
                eventStartTime: z.string().min(1, 'Este campo es requerido'), // HH:MM
                eventEndTime: z.string().optional().or(z.literal('')),
                fandiOpensTime: z.string().optional().or(z.literal('')),
                fandiClosesTime: z.string().optional().or(z.literal('')),
                venue: z.string().min(1, 'Este campo es requerido'),
                description: z.string().optional(),
                coverImageUrl: z
                    .string()
                    .url('URL no válida')
                    .optional()
                    .or(z.literal('')),
            }),
        [],
    );

    type FormValues = z.infer<typeof schema>;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isDirty },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        mode: 'onChange',
        defaultValues: {
            name: '',
            eventDate: '',
            eventStartTime: '',
            eventEndTime: '',
            fandiOpensTime: '',
            fandiClosesTime: '',
            venue: '',
            description: '',
            coverImageUrl: '',
        },
    });

    // Populate form when event data loads
    useEffect(() => {
        if (event) {
            reset({
                name: event.name,
                eventType: event.eventType || undefined,
                eventDate: isoToDate(event.eventDate),
                eventStartTime: isoToTime(event.eventDate),
                eventEndTime: isoToTime(event.eventEndDate),
                fandiOpensTime: isoToTime(event.fandiOpensAt),
                fandiClosesTime: isoToTime(event.fandiClosesAt),
                venue: event.venue || '',
                description: event.description || '',
                coverImageUrl: event.coverImageUrl || '',
            });
        }
    }, [event, reset]);

    const watchAll = watch();
    const coverImageUrl = watchAll.coverImageUrl;

    const { mutate: updateEvent, isPending } = useMutation({
        mutationFn: (dto: UpdateEventDto) => eventsApi.update(eventId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            router.push(`/dashboard/events/${eventId}`);
            toast.success(t('updated'));
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Error';
            toast.error(message);
        },
    });

    const onSubmit = (data: FormValues) => {
        const eventDateTime = combineDateAndTime(data.eventDate, data.eventStartTime);
        if (!eventDateTime) return;

        const dto: UpdateEventDto = {
            name: data.name,
            eventDate: eventDateTime,
            venue: data.venue,
            eventType: (data.eventType || undefined) as UpdateEventDto['eventType'],
            description: data.description || undefined,
            coverImageUrl: data.coverImageUrl || undefined,
            eventEndDate: combineDateAndTime(data.eventDate, data.eventEndTime ?? '') || undefined,
            fandiOpensAt: combineDateAndTime(data.eventDate, data.fandiOpensTime ?? '') || undefined,
            fandiClosesAt: combineDateAndTime(data.eventDate, data.fandiClosesTime ?? '') || undefined,
        };
        updateEvent(dto);
    };

    const eventTypeLabels: Record<string, string> = {
        football: t('typeFootball'),
        concert: t('typeConcert'),
        other: t('typeOther'),
    };

    const formatPreviewDate = (date: string) => {
        if (!date) return null;
        try {
            // Append T12:00:00 to avoid UTC-midnight parsing of date-only strings
            return new Intl.DateTimeFormat('es', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }).format(new Date(date + 'T12:00:00'));
        } catch {
            return null;
        }
    };

    const formatTimeDisplay = (time: string) => {
        if (!time) return null;
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${h12}:${m} ${ampm}`;
    };

    if (memberRole && !isWriteRole) return null;

    if (loadingEvent) {
        return (
            <div className="flex flex-col gap-8 p-14">
                <Skeleton className="h-4 w-24 rounded-none bg-[#1E1E1E]" />
                <Skeleton className="h-16 w-96 rounded-none bg-[#1E1E1E]" />
                <div className="grid grid-cols-1 gap-12 xl:grid-cols-2">
                    <div className="flex flex-col gap-7">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full rounded-none bg-[#1E1E1E]" />
                        ))}
                    </div>
                    <Skeleton className="hidden aspect-square w-full rounded-none bg-[#1E1E1E] xl:block" />
                </div>
            </div>
        );
    }

    if (!event) return null;

    return (
        <div className="flex flex-col gap-8 p-14">
            {/* ── Header ── */}
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => router.push(`/dashboard/events/${eventId}`)}
                    className="flex cursor-pointer items-center gap-2 self-start font-space-mono text-sm uppercase tracking-[1px] text-[#737373] transition-colors duration-150 hover:text-white"
                >
                    <ArrowLeft size={14} />
                    {t('backToEvents')}
                </button>
                <h1 className="font-sora text-[64px] font-extrabold leading-none tracking-[-2px] text-white">
                    {t('editEvent').toUpperCase()}
                </h1>
            </div>

            {/* ── Two-column: Form + Preview ── */}
            <div className="grid grid-cols-1 gap-12 xl:grid-cols-2">
                {/* ── Left: Form ── */}
                <form
                    onSubmit={handleSubmit(onSubmit, (formErrors) => {
                        console.error('Form validation errors:', formErrors);
                        toast.error('Error de validación, revisa los campos');
                    })}
                    className="flex flex-col gap-7"
                >
                    {/* Name */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('name')} *
                        </label>
                        <Input
                            {...register('name')}
                            placeholder={t('name')}
                            className="h-14 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-xl text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:shadow-[0_0_12px_rgba(45,0,247,0.3)] focus:ring-0"
                        />
                        {errors.name && (
                            <span className="font-space-mono text-base text-[#FF3366]">
                                {errors.name.message}
                            </span>
                        )}
                    </div>

                    {/* Event Type */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('eventType')}
                        </label>
                        <Select
                            value={watchAll.eventType || ''}
                            onValueChange={(val) => setValue('eventType', val as 'football' | 'concert' | 'other', { shouldDirty: true })}
                        >
                            <SelectTrigger className="h-14 cursor-pointer rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-xl text-white">
                                <SelectValue placeholder={t('eventType')} />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-[#1E1E1E] bg-[#121212]">
                                <SelectItem value="football" className="cursor-pointer py-3 font-sora text-lg text-white hover:bg-[#1A1A1A]">
                                    {t('typeFootball')}
                                </SelectItem>
                                <SelectItem value="concert" className="cursor-pointer py-3 font-sora text-lg text-white hover:bg-[#1A1A1A]">
                                    {t('typeConcert')}
                                </SelectItem>
                                <SelectItem value="other" className="cursor-pointer py-3 font-sora text-lg text-white hover:bg-[#1A1A1A]">
                                    {t('typeOther')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Event Date (date only) */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('date')} *
                        </label>
                        <Input
                            type="date"
                            {...register('eventDate')}
                            className="h-14 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-xl text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:shadow-[0_0_12px_rgba(45,0,247,0.3)] focus:ring-0 [color-scheme:dark]"
                        />
                        {errors.eventDate && (
                            <span className="font-space-mono text-base text-[#FF3366]">
                                {errors.eventDate.message}
                            </span>
                        )}
                    </div>

                    {/* Venue */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('venue')} *
                        </label>
                        <Input
                            {...register('venue')}
                            placeholder={t('venue')}
                            className="h-14 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-xl text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:shadow-[0_0_12px_rgba(45,0,247,0.3)] focus:ring-0"
                        />
                        {errors.venue && (
                            <span className="font-space-mono text-base text-[#FF3366]">
                                {errors.venue.message}
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('description')}
                        </label>
                        <Textarea
                            {...register('description')}
                            rows={4}
                            placeholder={t('description')}
                            className="rounded-none border-[#2A2A2A] bg-[#141414] p-4 font-sora text-xl text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:shadow-[0_0_12px_rgba(45,0,247,0.3)] focus:ring-0"
                        />
                    </div>

                    {/* ── HORAS RELOJ INFORMATIVO (Boletas) ── */}
                    <div className="mt-2 border-t border-[#1E1E1E] pt-6">
                        <div className="mb-4 flex items-center gap-3">
                            <Clock size={18} className="text-[#737373]" />
                            <span className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#737373]">
                                {t('infoTimezoneSection')}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#A0A0A0]">
                                    Inicio *
                                </label>
                                <Input
                                    type="time"
                                    {...register('eventStartTime')}
                                    className="h-14 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-xl text-white focus:border-[#2D00F7] focus:shadow-[0_0_12px_rgba(45,0,247,0.3)] focus:ring-0 [color-scheme:dark]"
                                />
                                {errors.eventStartTime && (
                                    <span className="font-space-mono text-xs text-[#FF3366]">
                                        {errors.eventStartTime.message}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#A0A0A0]">
                                    Fin
                                </label>
                                <Input
                                    type="time"
                                    {...register('eventEndTime')}
                                    className="h-14 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-xl text-white focus:border-[#2D00F7] focus:shadow-[0_0_12px_rgba(45,0,247,0.3)] focus:ring-0 [color-scheme:dark]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── HORAS RELOJ FANDI (Dinámicas) ── */}
                    <div className="border-t border-[#1E1E1E] pt-6">
                        <div className="mb-4 flex items-center gap-3">
                            <Zap size={18} className="text-[#2D00F7]" />
                            <span className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#2D00F7]">
                                {t('fandiTimezoneSection')}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#2D00F7]">
                                    {t('fandiOpensAt')} *
                                </label>
                                <Input
                                    type="time"
                                    {...register('fandiOpensTime')}
                                    className="h-14 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-xl text-white focus:border-[#2D00F7] focus:shadow-[0_0_12px_rgba(45,0,247,0.3)] focus:ring-0 [color-scheme:dark]"
                                />
                                <p className="mt-1 font-space-mono text-[11px] leading-relaxed text-[#737373]">
                                    {t('fandiOpensHint')}
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#2D00F7]">
                                    {t('fandiClosesAt')} *
                                </label>
                                <Input
                                    type="time"
                                    {...register('fandiClosesTime')}
                                    className="h-14 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-xl text-white focus:border-[#2D00F7] focus:shadow-[0_0_12px_rgba(45,0,247,0.3)] focus:ring-0 [color-scheme:dark]"
                                />
                                <p className="mt-1 font-space-mono text-[11px] leading-relaxed text-[#737373]">
                                    {t('fandiClosesHint')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Cover Image */}
                    <div className="flex flex-col gap-2 border-t border-[#1E1E1E] pt-6">
                        <label className="font-space-mono text-[15px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('coverImage')}
                        </label>
                        <ImageUpload
                            value={coverImageUrl || null}
                            onChange={(url) => setValue('coverImageUrl', url || '', { shouldDirty: true })}
                            folder="events"
                            disabled={isPending}
                            aspect="landscape"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={!isDirty || isPending}
                            className="flex h-16 flex-1 cursor-pointer items-center justify-center gap-2 rounded-none bg-[#2D00F7] px-8 font-space-mono text-[16px] uppercase tracking-[1px] text-white transition-all duration-200 hover:bg-[#2400C5] hover:shadow-[0_0_30px_rgba(45,0,247,0.6)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    {t('saving')}
                                </>
                            ) : (
                                'GUARDAR'
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push(`/dashboard/events/${eventId}`)}
                            className="flex h-16 cursor-pointer items-center justify-center rounded-none border border-[#2A2A2A] bg-transparent px-8 font-space-mono text-[16px] uppercase tracking-[1px] text-[#A0A0A0] transition-colors duration-150 hover:border-[#4A4A4A] hover:text-white"
                        >
                            CANCELAR
                        </button>
                    </div>
                </form>

                {/* ── Right: Live Preview ── */}
                <div className="hidden xl:block">
                    <div className="sticky top-8 flex flex-col gap-6">
                        <h2 className="font-space-mono text-sm uppercase tracking-[2px] text-[#737373]">
                            Vista previa
                        </h2>

                        <div className="flex flex-col overflow-hidden rounded-none border border-[#1E1E1E] bg-[#0A0A0A] shadow-[0_0_40px_rgba(45,0,247,0.08)]">
                            {/* Preview cover image */}
                            <div className="relative aspect-[16/9] w-full bg-[#141414]">
                                {coverImageUrl ? (
                                    <Image
                                        src={coverImageUrl}
                                        alt="Preview"
                                        fill
                                        unoptimized
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <Calendar size={48} className="text-[#1E1E1E]" />
                                    </div>
                                )}
                            </div>

                            {/* Preview content */}
                            <div className="flex flex-col gap-4 p-6">
                                <h3 className="font-sora text-3xl font-bold text-white">
                                    {watchAll.name || t('name')}
                                </h3>

                                <div className="flex flex-wrap items-center gap-4">
                                    {watchAll.eventType && (
                                        <div className="flex items-center gap-2">
                                            <Tag size={16} className="text-[#2D00F7]" />
                                            <span className="font-space-mono text-base text-[#A0A0A0]">
                                                {eventTypeLabels[watchAll.eventType] || watchAll.eventType}
                                            </span>
                                        </div>
                                    )}
                                    {watchAll.venue && (
                                        <div className="flex items-center gap-2">
                                            <MapPin size={16} className="text-[#2D00F7]" />
                                            <span className="font-space-mono text-base text-[#A0A0A0]">
                                                {watchAll.venue}
                                            </span>
                                        </div>
                                    )}
                                    {watchAll.eventDate && (
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-[#2D00F7]" />
                                            <span className="font-space-mono text-base text-[#A0A0A0]">
                                                {formatPreviewDate(watchAll.eventDate)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Time previews */}
                                {(watchAll.eventStartTime || watchAll.eventEndTime) && (
                                    <div className="flex items-center gap-2 border-t border-[#1E1E1E] pt-3">
                                        <Clock size={14} className="text-[#737373]" />
                                        <span className="font-space-mono text-[11px] uppercase tracking-[1px] text-[#737373]">
                                            Boletas:
                                        </span>
                                        <span className="font-sora text-sm text-[#A0A0A0]">
                                            {formatTimeDisplay(watchAll.eventStartTime || '')}
                                            {watchAll.eventEndTime && ` — ${formatTimeDisplay(watchAll.eventEndTime)}`}
                                        </span>
                                    </div>
                                )}
                                {(watchAll.fandiOpensTime || watchAll.fandiClosesTime) && (
                                    <div className="flex items-center gap-2">
                                        <Zap size={14} className="text-[#2D00F7]" />
                                        <span className="font-space-mono text-[11px] uppercase tracking-[1px] text-[#2D00F7]">
                                            Fandi:
                                        </span>
                                        <span className="font-sora text-sm text-[#A0A0A0]">
                                            {formatTimeDisplay(watchAll.fandiOpensTime || '')}
                                            {watchAll.fandiClosesTime && ` — ${formatTimeDisplay(watchAll.fandiClosesTime)}`}
                                        </span>
                                    </div>
                                )}

                                {watchAll.description && (
                                    <p className="font-sora text-lg leading-relaxed text-[#737373]">
                                        {watchAll.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
