'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Calendar, MapPin, Tag } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { eventsApi } from '@/lib/api-hooks';
import type { CreateEventDto } from '@/types/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select';

export default function CreateEventPage() {
    const router = useRouter();
    const t = useTranslations('events');
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
                name: z.string().min(1, 'Este campo es requerido').max(255),
                eventType: z.enum(['football', 'concert', 'other']).optional(),
                eventDate: z.string().min(1, 'Este campo es requerido'),
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
        formState: { errors, isValid },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        mode: 'onChange',
        defaultValues: {
            name: '',
            eventDate: '',
            venue: '',
            description: '',
            coverImageUrl: '',
        },
    });

    const watchAll = watch();
    const coverImageUrl = watchAll.coverImageUrl;

    const { mutate: createEvent, isPending } = useMutation({
        mutationFn: (dto: CreateEventDto) => eventsApi.create(dto),
        onSuccess: (event) => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            router.push(`/dashboard/events/${event.id}`);
            toast.success(t('created'));
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Error';
            toast.error(message);
        },
    });

    const onSubmit = (data: FormValues) => {
        const dto: CreateEventDto = {
            name: data.name,
            eventDate: new Date(data.eventDate).toISOString(),
            venue: data.venue,
            ...(data.eventType && { eventType: data.eventType }),
            ...(data.description && { description: data.description }),
            ...(data.coverImageUrl && { coverImageUrl: data.coverImageUrl }),
        };
        createEvent(dto);
    };

    const eventTypeLabels: Record<string, string> = {
        football: t('typeFootball'),
        concert: t('typeConcert'),
        other: t('typeOther'),
    };

    const formatPreviewDate = (iso: string) => {
        if (!iso) return null;
        try {
            return new Intl.DateTimeFormat('es', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(new Date(iso));
        } catch {
            return null;
        }
    };

    if (memberRole && !isWriteRole) return null;

    return (
        <div className="flex flex-col gap-8 p-14">
            {/* ── Header ── */}
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => router.push('/dashboard/events')}
                    className="flex cursor-pointer items-center gap-2 self-start font-space-mono text-xs uppercase tracking-[1px] text-[#737373] transition-colors duration-150 hover:text-white"
                >
                    <ArrowLeft size={14} />
                    {t('backToEvents')}
                </button>
                <h1 className="font-sora text-[64px] font-extrabold leading-none tracking-[-2px] text-white">
                    {t('create').toUpperCase()}
                </h1>
            </div>

            {/* ── Two-column: Form + Preview ── */}
            <div className="grid grid-cols-1 gap-12 xl:grid-cols-2">
                {/* ── Left: Form ── */}
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex flex-col gap-7"
                >
                    {/* Name */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('name')} *
                        </label>
                        <Input
                            {...register('name')}
                            placeholder={t('name')}
                            className="h-14 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-lg text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:shadow-[0_0_12px_rgba(45,0,247,0.3)] focus:ring-0"
                        />
                        {errors.name && (
                            <span className="font-space-mono text-sm text-[#FF3366]">
                                {errors.name.message}
                            </span>
                        )}
                    </div>

                    {/* Event Type */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('eventType')}
                        </label>
                        <Select onValueChange={(val) => setValue('eventType', val as 'football' | 'concert' | 'other')}>
                            <SelectTrigger className="h-14 cursor-pointer rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-lg text-white">
                                <SelectValue placeholder={t('eventType')} />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-[#1E1E1E] bg-[#121212]">
                                <SelectItem value="football" className="cursor-pointer py-3 font-sora text-base text-white hover:bg-[#1A1A1A]">
                                    {t('typeFootball')}
                                </SelectItem>
                                <SelectItem value="concert" className="cursor-pointer py-3 font-sora text-base text-white hover:bg-[#1A1A1A]">
                                    {t('typeConcert')}
                                </SelectItem>
                                <SelectItem value="other" className="cursor-pointer py-3 font-sora text-base text-white hover:bg-[#1A1A1A]">
                                    {t('typeOther')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Event Date */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('date')} *
                        </label>
                        <Input
                            type="datetime-local"
                            {...register('eventDate')}
                            className="h-14 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-lg text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:shadow-[0_0_12px_rgba(45,0,247,0.3)] focus:ring-0 [color-scheme:dark]"
                        />
                        {errors.eventDate && (
                            <span className="font-space-mono text-sm text-[#FF3366]">
                                {errors.eventDate.message}
                            </span>
                        )}
                    </div>

                    {/* Venue */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('venue')} *
                        </label>
                        <Input
                            {...register('venue')}
                            placeholder={t('venue')}
                            className="h-14 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-lg text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:shadow-[0_0_12px_rgba(45,0,247,0.3)] focus:ring-0"
                        />
                        {errors.venue && (
                            <span className="font-space-mono text-sm text-[#FF3366]">
                                {errors.venue.message}
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('description')}
                        </label>
                        <Textarea
                            {...register('description')}
                            rows={4}
                            placeholder={t('description')}
                            className="rounded-none border-[#2A2A2A] bg-[#141414] p-4 font-sora text-lg text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:shadow-[0_0_12px_rgba(45,0,247,0.3)] focus:ring-0"
                        />
                    </div>

                    {/* Cover Image */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('coverImage')}
                        </label>
                        <ImageUpload
                            value={coverImageUrl || null}
                            onChange={(url) => setValue('coverImageUrl', url || '')}
                            folder="events"
                            disabled={isPending}
                            aspect="landscape"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={!isValid || isPending}
                        className="flex h-16 cursor-pointer items-center justify-center gap-2 rounded-none bg-[#2D00F7] px-8 font-space-mono text-[14px] uppercase tracking-[1px] text-white transition-all duration-200 hover:bg-[#2400C5] hover:shadow-[0_0_30px_rgba(45,0,247,0.6)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isPending ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                {t('creating')}
                            </>
                        ) : (
                            t('create')
                        )}
                    </button>
                </form>

                {/* ── Right: Live Preview ── */}
                <div className="hidden xl:block">
                    <div className="sticky top-8 flex flex-col gap-6">
                        <h2 className="font-space-mono text-xs uppercase tracking-[2px] text-[#737373]">
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
                                {/* Event name */}
                                <h3 className="font-sora text-3xl font-bold text-white">
                                    {watchAll.name || t('name')}
                                </h3>

                                {/* Meta row */}
                                <div className="flex flex-wrap items-center gap-4">
                                    {watchAll.eventType && (
                                        <div className="flex items-center gap-2">
                                            <Tag size={16} className="text-[#2D00F7]" />
                                            <span className="font-space-mono text-sm text-[#A0A0A0]">
                                                {eventTypeLabels[watchAll.eventType] || watchAll.eventType}
                                            </span>
                                        </div>
                                    )}
                                    {watchAll.venue && (
                                        <div className="flex items-center gap-2">
                                            <MapPin size={16} className="text-[#2D00F7]" />
                                            <span className="font-space-mono text-sm text-[#A0A0A0]">
                                                {watchAll.venue}
                                            </span>
                                        </div>
                                    )}
                                    {watchAll.eventDate && (
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-[#2D00F7]" />
                                            <span className="font-space-mono text-sm text-[#A0A0A0]">
                                                {formatPreviewDate(watchAll.eventDate)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                {watchAll.description && (
                                    <p className="font-sora text-base leading-relaxed text-[#737373]">
                                        {watchAll.description}
                                    </p>
                                )}

                                {/* Status badge */}
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="inline-flex rounded-none bg-[#73737320] px-2 py-0.5 font-space-mono text-[10px] uppercase tracking-[1px] text-[#737373]">
                                        Borrador
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
