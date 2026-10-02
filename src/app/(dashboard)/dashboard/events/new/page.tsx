'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Calendar, MapPin, Tag, Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { eventsApi } from '@/lib/api-hooks';
import { eventSaveErrorKey, isEventValidationCode } from '@/lib/event-save-error';
import type { CreateEventDto } from '@/types/api';
import {
    datetimeLocalToIso,
    eventDurationParts,
} from '@/lib/event-datetime';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { CityAutocomplete, type CityAutocompleteValue } from '@/components/places/CityAutocomplete';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select';

export default function CreateEventPage() {
    const router = useRouter();
    const t = useTranslations('events');
    const locale = useLocale();
    const { memberRole } = useAuth();
    const queryClient = useQueryClient();

    const isWriteRole = memberRole === 'owner' || memberRole === 'admin';
    useEffect(() => {
        if (memberRole && !isWriteRole) {
            router.replace('/dashboard/events');
        }
    }, [memberRole, isWriteRole, router]);

    const schema = useMemo(
        () =>
            z.object({
                name: z.string().trim().min(1, t('validation.required')).max(255, t('validation.maxLength', { max: 255 })),
                eventType: z.enum(['football', 'concert', 'other']).optional(),
                // Full datetimes (Step 6.1) — datetime-local "YYYY-MM-DDTHH:MM".
                // Fixed-width format ⇒ lexicographic compare == chronological.
                // Only the event start is required at draft save; end + Fandi
                // window become required at the publish gate (backend-enforced).
                eventDate: z.string().min(1, t('validation.required')),
                eventEndDate: z.string().optional().or(z.literal('')),
                fandiOpensAt: z.string().optional().or(z.literal('')),
                fandiClosesAt: z.string().optional().or(z.literal('')),
                venue: z.string().trim().min(1, t('validation.required')),
                cityId: z.string().regex(/^\d+$/, 'cityId must be numeric').nullable().optional(),
                status: z.enum(['draft', 'published', 'live', 'ended']).optional(),
                description: z.string().optional(),
                coverImageUrl: z
                    .string()
                    .url(t('validation.invalidUrl'))
                    .optional()
                    .or(z.literal('')),
            }).superRefine((data, ctx) => {
                // Mirror the backend invariants (events.service assertEventDatesValid).
                // Messages are typed codes resolved to localized copy at render.
                const { eventDate, eventEndDate, fandiOpensAt, fandiClosesAt } = data;
                if (eventEndDate && eventDate && eventEndDate <= eventDate) {
                    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'EVENT_END_BEFORE_START', path: ['eventEndDate'] });
                }
                // The Fandi window may open before / close after the event; only
                // its own span must be positive.
                if (fandiOpensAt && fandiClosesAt && fandiOpensAt >= fandiClosesAt) {
                    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'FANDI_WINDOW_INVALID', path: ['fandiClosesAt'] });
                }
                if ((data.status === 'published' || data.status === 'live') && !data.cityId) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'events.form.cityRequired',
                        path: ['cityId'],
                    });
                }
            }),
        [t],
    );

    type FormValues = z.infer<typeof schema>;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        // Errors appear once a field is left (not while typing the first
        // time), then update live. The save button is never silently greyed.
        mode: 'onTouched',
        defaultValues: {
            name: '',
            eventDate: '',
            eventEndDate: '',
            fandiOpensAt: '',
            fandiClosesAt: '',
            venue: '',
            cityId: null,
            status: 'draft',
            description: '',
            coverImageUrl: '',
        },
    });

    const [selectedCity, setSelectedCity] = useState<CityAutocompleteValue | null>(null);
    const watchAll = watch();
    const coverImageUrl = watchAll.coverImageUrl;
    const formatFieldError = (message?: string) => {
        if (!message) return message;
        if (message === 'events.form.cityRequired') return t('form.cityRequired');
        if (isEventValidationCode(message)) return t(`validation.${message}`);
        return message;
    };

    const { mutate: createEvent, isPending } = useMutation({
        mutationFn: (dto: CreateEventDto) => eventsApi.create(dto),
        onSuccess: (event) => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            router.push(`/dashboard/events/${event.id}`);
            toast.success(t('created'));
        },
        onError: (err: unknown) => toast.error(t(eventSaveErrorKey(err))),
    });

    const onSubmit = (data: FormValues) => {
        const eventDateTime = datetimeLocalToIso(data.eventDate);
        if (!eventDateTime) return;

        const dto: CreateEventDto = {
            name: data.name,
            eventDate: eventDateTime,
            venue: data.venue,
            cityId: data.cityId ?? null,
            ...(data.eventType && { eventType: data.eventType }),
            ...(data.description && { description: data.description }),
            ...(data.coverImageUrl && { coverImageUrl: data.coverImageUrl }),
        };

        // Full datetimes (Step 6.1) — sent only when provided; the publish
        // gate (backend) requires the end date + a valid Fandi window.
        const endDt = datetimeLocalToIso(data.eventEndDate);
        if (endDt) dto.eventEndDate = endDt;

        const opensDt = datetimeLocalToIso(data.fandiOpensAt);
        if (opensDt) dto.fandiOpensAt = opensDt;

        const closesDt = datetimeLocalToIso(data.fandiClosesAt);
        if (closesDt) dto.fandiClosesAt = closesDt;

        createEvent(dto);
    };

    const eventTypeLabels: Record<string, string> = {
        football: t('typeFootball'),
        concert: t('typeConcert'),
        other: t('typeOther'),
    };

    // Format a datetime-local value ("YYYY-MM-DDTHH:MM") for the preview.
    const formatDateTime = (local: string) => {
        if (!local) return null;
        const d = new Date(local);
        if (isNaN(d.getTime())) return null;
        return new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
        }).format(d);
    };

    // Live duration readout ("Dura 2 días 3 h").
    const durationParts = eventDurationParts(watchAll.eventDate, watchAll.eventEndDate);
    const durationText = durationParts
        ? t('durationLabel', {
              value: [
                  durationParts.days > 0
                      ? `${durationParts.days} ${t(durationParts.days === 1 ? 'durationDay' : 'durationDays')}`
                      : '',
                  `${durationParts.hours} ${t('durationHour')}`,
              ]
                  .filter(Boolean)
                  .join(' '),
          })
        : null;

    if (memberRole && !isWriteRole) return null;

    return (
        <div className="flex flex-col gap-6">
            {/* ── Header ── */}
            <div className="flex flex-col gap-3">
                <button
                    type="button"
                    onClick={() => router.push('/dashboard/events')}
                    className="label-mono flex cursor-pointer items-center gap-2 self-start text-[11px] text-lilac transition-colors duration-150 hover:text-white"
                >
                    <ArrowLeft size={14} />
                    {t('backToEvents')}
                </button>
                <div>
                    <h1 className="font-hero text-[40px] leading-none text-white md:text-[48px]">
                        {t('create')}
                    </h1>
                    <p className="label-mono mt-2 text-[11px] text-lilac">{t('form.createSubtitle')}</p>
                </div>
            </div>

            {/* ── Two-column: Form + Preview ── */}
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
                {/* ── Left: Form ── */}
                <form
                    onSubmit={handleSubmit(onSubmit, () => toast.error(t('form.fixErrors')))}
                    noValidate
                    className="flex min-w-0 flex-col gap-6"
                >
                    {/* ── Block: event details ── */}
                    <section className="block-white overflow-hidden">
                        <div className="flex items-center gap-2.5 border-b-2 border-ink px-5 py-3.5">
                            <Tag size={16} className="text-ink" />
                            <h2 className="font-display text-[17px]">{t('form.detailsSection')}</h2>
                        </div>
                        <div className="flex flex-col gap-5 p-5">
                            {/* Name */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="event-name" className="label-mono text-muted-white">
                                    {t('name')} *
                                </label>
                                <Input
                                    id="event-name"
                                    aria-invalid={errors.name ? true : undefined}
                                    {...register('name')}
                                    placeholder={t('name')}
                                    className="h-12 text-base"
                                />
                                {errors.name && (
                                    <span className="font-space-mono text-[11px] text-alert-white">
                                        {errors.name.message}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                {/* Event Type */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="event-type" className="label-mono text-muted-white">
                                        {t('eventType')}
                                    </label>
                                    <Select onValueChange={(val) => setValue('eventType', val as 'football' | 'concert' | 'other')}>
                                        <SelectTrigger id="event-type" className="w-full cursor-pointer text-base data-[size=default]:h-12">
                                            <SelectValue placeholder={t('eventType')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="football" className="cursor-pointer py-2.5">
                                                {t('typeFootball')}
                                            </SelectItem>
                                            <SelectItem value="concert" className="cursor-pointer py-2.5">
                                                {t('typeConcert')}
                                            </SelectItem>
                                            <SelectItem value="other" className="cursor-pointer py-2.5">
                                                {t('typeOther')}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Venue */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="event-venue" className="label-mono text-muted-white">
                                        {t('venue')} *
                                    </label>
                                    <Input
                                        id="event-venue"
                                        aria-invalid={errors.venue ? true : undefined}
                                        {...register('venue')}
                                        placeholder={t('venue')}
                                        className="h-12 text-base"
                                    />
                                    {errors.venue && (
                                        <span className="font-space-mono text-[11px] text-alert-white">
                                            {errors.venue.message}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* City */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="event-city" className="label-mono text-muted-white">
                                    {t('form.city')}
                                </label>
                                <CityAutocomplete
                                    id="event-city"
                                    value={selectedCity}
                                    onChange={(city) => {
                                        setSelectedCity(city);
                                        setValue('cityId', city?.id ?? null, {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        });
                                    }}
                                    error={formatFieldError(errors.cityId?.message)}
                                />
                            </div>

                            {/* Description */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="event-description" className="label-mono text-muted-white">
                                    {t('description')}
                                </label>
                                <Textarea
                                    id="event-description"
                                    {...register('description')}
                                    rows={4}
                                    placeholder={t('description')}
                                    className="p-3 text-base"
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── RELOJ INFORMATIVO (Boletas) — full datetimes ── */}
                    <section className="block-white overflow-hidden">
                        <div className="flex items-center gap-2.5 border-b-2 border-ink px-5 py-3.5">
                            <Clock size={16} className="text-muted-white" />
                            <h2 className="font-display text-[17px]">{t('infoTimezoneSection')}</h2>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="event-start" className="label-mono text-muted-white">
                                        {t('eventStart')} *
                                    </label>
                                    <Input
                                        id="event-start"
                                        aria-invalid={errors.eventDate ? true : undefined}
                                        type="datetime-local"
                                        {...register('eventDate')}
                                        className="h-12 font-space-mono text-sm"
                                    />
                                    {errors.eventDate && (
                                        <span className="font-space-mono text-[11px] text-alert-white">
                                            {formatFieldError(errors.eventDate.message)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="event-end" className="label-mono text-muted-white">
                                        {t('eventEnd')}
                                    </label>
                                    <Input
                                        id="event-end"
                                        aria-invalid={errors.eventEndDate ? true : undefined}
                                        type="datetime-local"
                                        {...register('eventEndDate')}
                                        className="h-12 font-space-mono text-sm"
                                    />
                                    {errors.eventEndDate && (
                                        <span className="font-space-mono text-[11px] text-alert-white">
                                            {formatFieldError(errors.eventEndDate.message)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {durationText && (
                                <p className="label-mono mt-4 inline-flex rounded-full bg-line-white px-2.5 py-1 font-bold text-ink">
                                    {durationText}
                                </p>
                            )}
                        </div>
                    </section>

                    {/* ── RELOJ FANDI (Dinámicas) — full datetimes ── */}
                    <section className="block-white overflow-hidden">
                        <div className="flex items-center gap-2.5 border-b-2 border-ink px-5 py-3.5">
                            <Zap size={16} className="text-blue" />
                            <h2 className="font-display text-[17px]">{t('fandiTimezoneSection')}</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="event-fandi-opens" className="label-mono text-blue">
                                    {t('fandiOpensAt')}
                                </label>
                                <Input
                                    id="event-fandi-opens"
                                    aria-invalid={errors.fandiOpensAt ? true : undefined}
                                    type="datetime-local"
                                    {...register('fandiOpensAt')}
                                    className="h-12 font-space-mono text-sm"
                                />
                                {errors.fandiOpensAt && (
                                    <span className="font-space-mono text-[11px] text-alert-white">
                                        {formatFieldError(errors.fandiOpensAt.message)}
                                    </span>
                                )}
                                <p className="font-space-mono text-[10px] leading-relaxed text-muted-white">
                                    {t('fandiOpensHint')}
                                </p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="event-fandi-closes" className="label-mono text-blue">
                                    {t('fandiClosesAt')}
                                </label>
                                <Input
                                    id="event-fandi-closes"
                                    aria-invalid={errors.fandiClosesAt ? true : undefined}
                                    type="datetime-local"
                                    {...register('fandiClosesAt')}
                                    className="h-12 font-space-mono text-sm"
                                />
                                {errors.fandiClosesAt && (
                                    <span className="font-space-mono text-[11px] text-alert-white">
                                        {formatFieldError(errors.fandiClosesAt.message)}
                                    </span>
                                )}
                                <p className="font-space-mono text-[10px] leading-relaxed text-muted-white">
                                    {t('fandiClosesHint')}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Cover Image */}
                    <section className="block-white overflow-hidden">
                        <div className="flex items-center gap-2.5 border-b-2 border-ink px-5 py-3.5">
                            <Calendar size={16} className="text-ink" />
                            <h2 className="font-display text-[17px]">{t('coverImage')}</h2>
                        </div>
                        <div className="p-5">
                            <ImageUpload
                                value={coverImageUrl || null}
                                onChange={(url) => setValue('coverImageUrl', url || '')}
                                folder="events"
                                disabled={isPending}
                                aspect="landscape"
                            />
                        </div>
                    </section>

                    {/* ── Sticky footer: the lime save CTA ── */}
                    <div className="block-ink sticky bottom-4 z-10 flex items-center justify-end gap-3 px-5 py-3.5">
                        <p className="mr-auto font-space-mono text-[11px] text-muted-ink">{t('form.requiredNote')}</p>
                        <Button
                            type="submit"
                            size="lg"
                            disabled={isPending}
                            className="border-0 shadow-ext-cta"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    {t('creating')}
                                </>
                            ) : (
                                t('form.saveDraft')
                            )}
                        </Button>
                    </div>
                </form>

                {/* ── Right: Live Preview ── */}
                <div className="hidden xl:block">
                    <div className="sticky top-8 flex flex-col gap-3">
                        <h2 className="label-mono text-[11px] text-lilac">
                            {t('form.fanPreview')}
                        </h2>

                        <div className="block-ink flex flex-col overflow-hidden shadow-ext-lg">
                            {/* Preview cover image */}
                            <div className="relative aspect-[16/9] w-full bg-chip-ink">
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
                                        <Calendar size={40} className="text-dash-ink" />
                                    </div>
                                )}
                            </div>

                            {/* Preview content */}
                            <div className="flex flex-col gap-4 p-5">
                                {/* Event name */}
                                <h3 className="font-hero break-words text-[28px] text-white">
                                    {watchAll.name || t('name')}
                                </h3>

                                {/* Meta row */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                    {watchAll.eventType && (
                                        <div className="flex items-center gap-1.5">
                                            <Tag size={14} className="text-lilac" />
                                            <span className="font-space-mono text-[11px] uppercase text-muted-ink">
                                                {eventTypeLabels[watchAll.eventType] || watchAll.eventType}
                                            </span>
                                        </div>
                                    )}
                                    {watchAll.venue && (
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={14} className="text-lilac" />
                                            <span className="font-space-mono text-[11px] uppercase text-muted-ink">
                                                {watchAll.venue}
                                            </span>
                                        </div>
                                    )}
                                    {watchAll.eventDate && (
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} className="text-lilac" />
                                            <span className="font-space-mono text-[11px] uppercase text-muted-ink">
                                                {formatDateTime(watchAll.eventDate)}
                                                {watchAll.eventEndDate && ` → ${formatDateTime(watchAll.eventEndDate)}`}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Time previews */}
                                {durationText && (
                                    <div className="flex items-center gap-2 border-t border-line-ink pt-3">
                                        <Clock size={14} className="text-muted-ink" />
                                        <span className="font-space-mono text-[11px] uppercase text-muted-ink">
                                            {durationText}
                                        </span>
                                    </div>
                                )}
                                {(watchAll.fandiOpensAt || watchAll.fandiClosesAt) && (
                                    <div className="flex items-center gap-2">
                                        <Zap size={14} className="text-lilac" />
                                        <span className="label-mono font-bold text-lilac">
                                            Fandi
                                        </span>
                                        <span className="font-space-mono text-[11px] uppercase text-muted-ink">
                                            {formatDateTime(watchAll.fandiOpensAt || '')}
                                            {watchAll.fandiClosesAt && ` → ${formatDateTime(watchAll.fandiClosesAt)}`}
                                        </span>
                                    </div>
                                )}

                                {/* Description */}
                                {watchAll.description && (
                                    <p className="text-[15px] leading-relaxed text-muted-ink">
                                        {watchAll.description}
                                    </p>
                                )}

                                {/* Status badge */}
                                <div className="mt-1 flex items-center gap-2">
                                    <StatusBadge status="draft" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
