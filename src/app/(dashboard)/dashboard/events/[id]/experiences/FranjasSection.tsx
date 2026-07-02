'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { eventsApi, slotsApi } from '@/lib/api-hooks';
import { ApiError } from '@/lib/api';
import type { ExperienceSlot, CreateSlotDto } from '@/types/api';
import { isoToDatetimeLocal, datetimeLocalToIso } from '@/lib/event-datetime';
import { Input } from '@/components/ui/input';

type SlotViolation = 'SLOT_WINDOW_INVALID' | 'SLOT_OUTSIDE_FANDI_WINDOW';

/**
 * Slot (Franja) window violations, mirrored from the backend so the form
 * blocks before the request. Compares datetime-local strings (fixed-width
 * ⇒ lexicographic == chronological).
 */
function slotViolation(
    opens: string,
    closes: string,
    fandiOpens: string,
    fandiCloses: string,
): SlotViolation | null {
    if (!opens || !closes) return null;
    if (opens >= closes) return 'SLOT_WINDOW_INVALID';
    if (fandiOpens && fandiCloses && (opens < fandiOpens || closes > fandiCloses)) {
        return 'SLOT_OUTSIDE_FANDI_WINDOW';
    }
    return null;
}

const SLOT_CODES = ['SLOT_WINDOW_INVALID', 'SLOT_OUTSIDE_FANDI_WINDOW'];

export function FranjasSection({ eventId }: { eventId: string }) {
    const t = useTranslations('franjas');
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState<ExperienceSlot | null>(null);
    const [showForm, setShowForm] = useState(false);

    const { data: event } = useQuery({
        queryKey: ['events', eventId],
        queryFn: () => eventsApi.get(eventId),
    });
    const { data: slots = [] } = useQuery({
        queryKey: ['events', eventId, 'slots'],
        queryFn: () => slotsApi.list(eventId),
    });

    const fmt = (iso: string) =>
        new Intl.DateTimeFormat('es-CO', {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(iso));

    const onClose = () => {
        setShowForm(false);
        setEditing(null);
    };

    return (
        <section className="flex flex-col gap-4 border-b border-[#1E1E1E] pb-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Clock size={18} className="text-[#2D00F7]" />
                    <h2 className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#A0A0A0]">
                        {t('title')} ({slots.length})
                    </h2>
                </div>
                <button
                    onClick={() => {
                        setEditing(null);
                        setShowForm(true);
                    }}
                    className="flex cursor-pointer items-center gap-2 bg-[#2D00F7] px-4 py-2 font-space-mono text-[12px] uppercase tracking-[1px] text-white transition-all hover:bg-[#2400C5]"
                >
                    <Plus size={14} />
                    {t('add')}
                </button>
            </div>

            <p className="font-space-mono text-[12px] leading-relaxed text-[#737373]">
                {t('help')}
            </p>

            {slots.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {slots.map((slot) => (
                        <div
                            key={slot.id}
                            className="flex items-start justify-between border border-[#1E1E1E] bg-[#0A0A0A] p-4"
                        >
                            <div className="flex flex-col gap-1">
                                <span className="font-sora text-lg font-bold text-white">
                                    {slot.label}
                                </span>
                                <span className="font-space-mono text-[12px] text-[#A0A0A0]">
                                    {fmt(slot.opensAt)} → {fmt(slot.closesAt)}
                                </span>
                                <span className="font-space-mono text-[11px] uppercase tracking-[1px] text-[#737373]">
                                    {t('opportunityCount', { count: slot.experienceCount })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setEditing(slot);
                                        setShowForm(true);
                                    }}
                                    aria-label={t('edit')}
                                    className="cursor-pointer border border-[#2A2A2A] p-2 text-[#A0A0A0] transition-colors hover:border-[#2D00F7] hover:text-white"
                                >
                                    <Pencil size={13} />
                                </button>
                                <DeleteSlotButton slot={slot} eventId={eventId} t={t} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="border border-dashed border-[#2A2A2A] bg-[#121212] p-4 text-center font-space-mono text-[12px] text-[#4A4A4A]">
                    {t('empty')}
                </p>
            )}

            {showForm && (
                <SlotFormDialog
                    eventId={eventId}
                    existing={editing}
                    fandiOpensAt={event?.fandiOpensAt ?? null}
                    fandiClosesAt={event?.fandiClosesAt ?? null}
                    onClose={onClose}
                    onSaved={() => {
                        queryClient.invalidateQueries({
                            queryKey: ['events', eventId, 'slots'],
                        });
                        queryClient.invalidateQueries({
                            queryKey: ['events', eventId, 'experiences'],
                        });
                        onClose();
                    }}
                />
            )}
        </section>
    );
}

function DeleteSlotButton({
    slot,
    eventId,
    t,
}: {
    slot: ExperienceSlot;
    eventId: string;
    t: ReturnType<typeof useTranslations>;
}) {
    const queryClient = useQueryClient();
    const { mutate, isPending } = useMutation({
        mutationFn: () => slotsApi.delete(slot.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'slots'] });
            queryClient.invalidateQueries({
                queryKey: ['experiences', eventId],
            });
            toast.success(t('deleted'));
        },
        onError: () => toast.error(t('deleteError')),
    });
    return (
        <button
            onClick={() => {
                if (confirm(t('deleteConfirm'))) mutate();
            }}
            disabled={isPending}
            aria-label={t('delete')}
            className="cursor-pointer border border-[#2A2A2A] p-2 text-[#FF3366] transition-colors hover:border-[#FF3366] disabled:opacity-50"
        >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
    );
}

function SlotFormDialog({
    eventId,
    existing,
    fandiOpensAt,
    fandiClosesAt,
    onClose,
    onSaved,
}: {
    eventId: string;
    existing: ExperienceSlot | null;
    fandiOpensAt: string | null;
    fandiClosesAt: string | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const t = useTranslations('franjas');
    const isEditing = !!existing;
    const [label, setLabel] = useState(existing?.label ?? '');
    const [opens, setOpens] = useState(isoToDatetimeLocal(existing?.opensAt));
    const [closes, setCloses] = useState(isoToDatetimeLocal(existing?.closesAt));

    const fandiOpensLocal = isoToDatetimeLocal(fandiOpensAt);
    const fandiClosesLocal = isoToDatetimeLocal(fandiClosesAt);
    const violation = useMemo(
        () => slotViolation(opens, closes, fandiOpensLocal, fandiClosesLocal),
        [opens, closes, fandiOpensLocal, fandiClosesLocal],
    );
    const canSave = Boolean(label.trim()) && Boolean(opens) && Boolean(closes) && !violation;

    const save = useMutation({
        mutationFn: () => {
            const dto: CreateSlotDto = {
                label: label.trim(),
                opensAt: datetimeLocalToIso(opens)!,
                closesAt: datetimeLocalToIso(closes)!,
            };
            return isEditing
                ? slotsApi.update(existing!.id, dto)
                : slotsApi.create(eventId, dto);
        },
        onSuccess: () => {
            toast.success(isEditing ? t('updated') : t('created'));
            onSaved();
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError && SLOT_CODES.includes(err.code)) {
                toast.error(t(`validation.${err.code}`));
            } else {
                toast.error(t('saveError'));
            }
        },
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="flex w-full max-w-md flex-col gap-5 border border-[#2D00F7] bg-[#0A0A0A] p-6 shadow-[0_0_30px_rgba(45,0,247,0.2)]">
                <h3 className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#2D00F7]">
                    {isEditing ? t('editTitle') : t('createTitle')}
                </h3>

                <div className="flex flex-col gap-2">
                    <label className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                        {t('label')} *
                    </label>
                    <Input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder={t('labelPlaceholder')}
                        className="h-12 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-base text-white focus:border-[#2D00F7] focus:ring-0"
                    />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('opensAt')} *
                        </label>
                        <Input
                            type="datetime-local"
                            value={opens}
                            onChange={(e) => setOpens(e.target.value)}
                            className="h-12 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-base text-white focus:border-[#2D00F7] focus:ring-0 [color-scheme:dark]"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('closesAt')} *
                        </label>
                        <Input
                            type="datetime-local"
                            value={closes}
                            onChange={(e) => setCloses(e.target.value)}
                            className="h-12 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-base text-white focus:border-[#2D00F7] focus:ring-0 [color-scheme:dark]"
                        />
                    </div>
                </div>

                {violation && (
                    <span className="font-space-mono text-xs text-[#FF3366]">
                        {t(`validation.${violation}`)}
                    </span>
                )}

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => save.mutate()}
                        disabled={!canSave || save.isPending}
                        className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 bg-[#2D00F7] font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all hover:bg-[#2400C5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {save.isPending && <Loader2 size={14} className="animate-spin" />}
                        {t('save')}
                    </button>
                    <button
                        onClick={onClose}
                        className="h-12 cursor-pointer border border-[#2A2A2A] px-6 font-space-mono text-[13px] uppercase tracking-[1px] text-[#A0A0A0] transition-colors hover:text-white"
                    >
                        {t('cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
}
