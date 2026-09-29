'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { eventsApi, slotsApi, experiencesApi } from '@/lib/api-hooks';
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
    // Shares the cache with the Oportunidades list, so membership + counts
    // update the moment an opportunity is (re)assigned to a franja.
    const { data: experiences = [] } = useQuery({
        queryKey: ['experiences', eventId],
        queryFn: () => experiencesApi.list(eventId),
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
        <section className="flex flex-col gap-4 border-b-2 border-ink pb-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Clock size={18} className="text-lime" />
                    <h2 className="font-display text-[17px] text-white">
                        {t('title')} ({slots.length})
                    </h2>
                </div>
                <button
                    onClick={() => {
                        setEditing(null);
                        setShowForm(true);
                    }}
                    className="press flex cursor-pointer items-center gap-2 rounded-[10px] border-2 border-ink bg-white px-4 py-2 text-[13px] font-black uppercase text-ink shadow-ext-sm [font-stretch:108%]"
                >
                    <Plus size={14} />
                    {t('add')}
                </button>
            </div>

            <p className="max-w-[720px] text-sm leading-relaxed text-lilac">
                {t('help')}
            </p>

            {slots.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {slots.map((slot) => {
                        const members = experiences.filter(
                            (e) => e.slotId === slot.id,
                        );
                        return (
                        <div
                            key={slot.id}
                            className="block-ink flex items-start justify-between p-4"
                        >
                            <div className="flex flex-col gap-1">
                                <span className="font-display text-lg text-white">
                                    {slot.label}
                                </span>
                                <span className="font-space-mono text-[12px] text-lime">
                                    {fmt(slot.opensAt)} → {fmt(slot.closesAt)}
                                </span>
                                <span className="font-space-mono text-[11px] uppercase tracking-[1px] text-muted-ink">
                                    {t('opportunityCount', { count: members.length })}
                                </span>
                                {members.length > 0 && (
                                    <ul className="mt-1 flex flex-col gap-0.5">
                                        {members.map((e) => (
                                            <li
                                                key={e.id}
                                                className="text-[13px] text-muted-ink"
                                            >
                                                · {e.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setEditing(slot);
                                        setShowForm(true);
                                    }}
                                    aria-label={t('edit')}
                                    className="cursor-pointer rounded-[8px] border-2 border-dash-ink p-2 text-muted-ink transition-colors hover:border-white hover:text-white"
                                >
                                    <Pencil size={13} />
                                </button>
                                <DeleteSlotButton slot={slot} eventId={eventId} t={t} />
                            </div>
                        </div>
                        );
                    })}
                </div>
            ) : (
                <p className="rounded-2xl border-2 border-dashed border-lilac/45 p-4 text-center font-space-mono text-[12px] text-lilac">
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
            className="cursor-pointer rounded-[8px] border-2 border-alert p-2 text-alert transition-colors hover:bg-alert/10 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4">
            <div className="surface-white flex w-full max-w-md flex-col gap-5 rounded-2xl border-2 border-ink bg-white p-6 text-ink shadow-ext-lg">
                <h3 className="font-display text-2xl text-ink">
                    {isEditing ? t('editTitle') : t('createTitle')}
                </h3>

                <div className="flex flex-col gap-2">
                    <label className="label-mono font-bold text-muted-white">
                        {t('label')} *
                    </label>
                    <Input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder={t('labelPlaceholder')}
                        className="h-12 px-4 text-base"
                    />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                        <label className="label-mono font-bold text-muted-white">
                            {t('opensAt')} *
                        </label>
                        <Input
                            type="datetime-local"
                            value={opens}
                            onChange={(e) => setOpens(e.target.value)}
                            className="h-12 px-4 text-base"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="label-mono font-bold text-muted-white">
                            {t('closesAt')} *
                        </label>
                        <Input
                            type="datetime-local"
                            value={closes}
                            onChange={(e) => setCloses(e.target.value)}
                            className="h-12 px-4 text-base"
                        />
                    </div>
                </div>

                {violation && (
                    <span className="font-space-mono text-xs text-alert-white">
                        {t(`validation.${violation}`)}
                    </span>
                )}

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => save.mutate()}
                        disabled={!canSave || save.isPending}
                        className="press flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[12px] border-2 border-ink bg-lime text-[14px] font-black uppercase text-ink shadow-ext-md [font-stretch:108%] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {save.isPending && <Loader2 size={14} className="animate-spin" />}
                        {t('save')}
                    </button>
                    <button
                        onClick={onClose}
                        className="h-12 cursor-pointer rounded-[12px] border-2 border-ink px-6 text-[14px] font-black uppercase text-ink [font-stretch:108%] hover:bg-line-white"
                    >
                        {t('cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
}
