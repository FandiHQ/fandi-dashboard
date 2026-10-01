'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Plus, Minus, Loader2, Pencil, Trash2, Info,
    Play, Pause, RotateCcw, Square, Timer, Trophy,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { useWebSocket } from '@/hooks/use-websocket';
import { auctionsApi, eventsApi } from '@/lib/api-hooks';
import { ApiError } from '@/lib/api';
import type { Auction, CreateAuctionDto, UpdateAuctionDto, AuctionStatus, Event } from '@/types/api';
import { ArtistMultiSelect } from '@/components/events/ArtistMultiSelect';
import { IdolCollaborationsSection } from '@/components/collaborations/IdolCollaborationsSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge as EventStatusBadge } from '@/components/ui/status-badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

// ── Helpers ──
// Phase 2 floors — mirror of the api's SOFT_CLOSE_FLOOR_SECONDS /
// EXTENSION_FLOOR_SECONDS (auctions.dto.ts). The api clamps anyway.
const SOFT_CLOSE_FLOOR_SECONDS = 60;
const EXTENSION_FLOOR_SECONDS = 60;

const FANDI_RATE = 5_000;

function isFandiAligned(cop: number): boolean {
    return Number.isFinite(cop) && Number.isInteger(cop) && cop > 0 && cop % FANDI_RATE === 0;
}

function snapToFandi(cop: number): number {
    if (!Number.isFinite(cop) || cop <= 0) return FANDI_RATE;
    return Math.round(cop / FANDI_RATE) * FANDI_RATE;
}

function parseCOPInput(value: string): number {
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly ? Number(digitsOnly) : 0;
}

function formatCOPInput(value: number): string {
    if (!Number.isFinite(value) || value <= 0) return '';
    return new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 0,
    }).format(value);
}

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function copToFandis(cop: number): number {
    return cop / FANDI_RATE;
}

function formatFandis(cop: number): string {
    const f = copToFandis(cop);
    return Number.isInteger(f) ? `${f}` : f.toFixed(1);
}

function formatMMS(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function toLocalScheduledParts(value?: string | null): { date: string; time: string } {
    if (!value) return { date: '', time: '' };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { date: '', time: '' };

    const pad = (n: number) => String(n).padStart(2, '0');
    return {
        date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
        time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    };
}

function combineScheduledStart(date: string, time: string): string | undefined {
    if (!date || !time) return undefined;
    const value = new Date(`${date}T${time}:00`);
    if (Number.isNaN(value.getTime())) return undefined;
    return value.toISOString();
}

/** Two-letter avatar for the winner row (presentation only). */
function initialsOf(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}

const FIELD_LABEL = 'label-mono text-muted-white';
const PILL = 'inline-flex items-center gap-1.5 self-start rounded-full border-2 px-2.5 py-0.5 font-space-mono text-[10px] font-bold uppercase tracking-[0.12em]';

// ── Status pill (the word always carries the state; no orange) ──
const STATUS_PILL: Record<string, string> = {
    pending:   'border-white bg-transparent text-white',
    active:    'border-lime bg-lime text-ink',
    paused:    'border-ink bg-lilac text-ink',
    ended:     'border-ink bg-ink text-white',
    cancelled: 'border-alert-white bg-transparent text-alert-white',
};

function AuctionStatusBadge({ status }: { status: AuctionStatus }) {
    const t = useTranslations('auctions');
    const labels: Record<string, string> = {
        pending: t('statusPending'),
        active: t('statusActive'),
        paused: t('statusPaused'),
        ended: t('statusEnded'),
        cancelled: t('statusCancelled'),
    };
    const c = STATUS_PILL[status] ?? STATUS_PILL.pending;

    return (
        <span className={`${PILL} ${c}`}>
            {status === 'active' && <span className="live-dot text-ink" aria-hidden="true" />}
            {labels[status]}
        </span>
    );
}

// ── Countdown Timer (lives on the ink live card) ──
function CountdownTimer({ endsAt }: { endsAt: string }) {
    const t = useTranslations('auctions');
    const [remaining, setRemaining] = useState<number>(() =>
        Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000)),
    );

    useEffect(() => {
        const id = setInterval(() => {
            setRemaining(Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000)));
        }, 1000);
        return () => clearInterval(id);
    }, [endsAt]);

    const isUrgent = remaining > 0 && remaining < 30;
    const isOver = remaining === 0;

    if (isOver) {
        return (
            <span className="label-mono font-bold text-alert">
                {t('finished')}
            </span>
        );
    }

    return (
        <span
            className={`flex items-center gap-2 font-space-mono text-[22px] font-bold tabular ${isUrgent ? 'text-alert' : 'text-lime'}`}
        >
            <span className={`live-dot ${isUrgent ? 'live-dot-urgent' : ''}`} aria-hidden="true" />
            {formatMMS(remaining)}
        </span>
    );
}

// ── Scheduled-start countdown (pending auctions, on blue) ──
function ScheduledStartCountdown({
    scheduledStart,
    onExpire,
}: {
    scheduledStart: string;
    onExpire: () => void;
}) {
    const t = useTranslations('auctions');
    const [remaining, setRemaining] = useState<number>(() =>
        Math.max(0, Math.floor((new Date(scheduledStart).getTime() - Date.now()) / 1000)),
    );

    useEffect(() => {
        const id = setInterval(() => {
            const r = Math.max(0, Math.floor((new Date(scheduledStart).getTime() - Date.now()) / 1000));
            setRemaining(r);
            if (r === 0) {
                clearInterval(id);
                onExpire();
            }
        }, 1000);
        return () => clearInterval(id);
    }, [scheduledStart, onExpire]);

    // Format: HH:MM:SS when > 1h, else MM:SS
    function formatCountdown(secs: number): string {
        if (secs >= 3600) {
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const s = secs % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return formatMMS(secs);
    }

    // Localized date label — e.g. "Sáb, 5 de mayo · 22:00"
    const dateLabel = new Intl.DateTimeFormat('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date(scheduledStart));

    if (remaining === 0) {
        return (
            <div className="flex items-center gap-2 text-lime">
                <span className="live-dot" aria-hidden="true" />
                <span className="label-mono font-bold">
                    {t('scheduledStartLaunching')}
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
                <span className="label-mono text-lilac">
                    {t('scheduledStartLabel')}
                </span>
                <span className="font-space-mono text-[10px] uppercase text-lilac">{dateLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-white">
                <Timer size={16} />
                <span className="font-space-mono text-[22px] font-bold tabular">
                    {formatCountdown(remaining)}
                </span>
            </div>
        </div>
    );
}

// ── Soft-close tooltip ──
function SoftCloseInfo({ softCloseSeconds, extensionSeconds }: { softCloseSeconds: number; extensionSeconds: number }) {
    const t = useTranslations('auctions');
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        aria-label={t('card.softCloseInfo')}
                        className="shrink-0 cursor-help opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    >
                        <Info size={14} />
                    </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] leading-relaxed">
                    {t('softCloseTooltip', { softClose: softCloseSeconds, extension: extensionSeconds })}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// ── Confirm Dialog (start / pause / resume / end / delete) ──
function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    onConfirm,
    onCancel,
    destructive,
    isPending,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    destructive?: boolean;
    isPending?: boolean;
}) {
    const t = useTranslations('auctions');
    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4"
            onClick={onCancel}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="auction-confirm-title"
                className="surface-white flex w-full max-w-md flex-col rounded-2xl border-2 border-ink bg-white text-ink shadow-ext-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b-2 border-ink px-6 py-4">
                    <h2 id="auction-confirm-title" className="font-display text-[20px]">{title}</h2>
                </div>
                <div className="px-6 py-5">
                    <p className="text-sm leading-relaxed text-body-white">{description}</p>
                </div>
                <div className="flex gap-3 border-t-2 border-line-white px-6 py-4">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1"
                    >
                        {t('panel.cancel')}
                    </Button>
                    <Button
                        variant={destructive ? 'destructive' : 'default'}
                        onClick={onConfirm}
                        disabled={isPending}
                        className="flex-1"
                    >
                        {isPending && <Loader2 size={14} className="animate-spin" />}
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── Stepper: − [value] + (hit areas ≥ 36px) ──
function Stepper({
    onDecrement, onIncrement, decrementLabel, incrementLabel, children,
}: {
    onDecrement: () => void;
    onIncrement: () => void;
    decrementLabel: string;
    incrementLabel: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={onDecrement}
                aria-label={decrementLabel}
                className="press flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[8px] bg-line-white text-ink"
            >
                <Minus size={16} strokeWidth={3} />
            </button>
            <div className="min-w-0 flex-1">{children}</div>
            <button
                type="button"
                onClick={onIncrement}
                aria-label={incrementLabel}
                className="press flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[8px] bg-ink text-white"
            >
                <Plus size={16} strokeWidth={3} />
            </button>
        </div>
    );
}

// ── Create / Edit side panel (§7: always a right side panel) ──
function AuctionFormDialog({
    eventId,
    event,
    existing,
    onClose,
}: {
    eventId: string;
    event?: Event;
    existing?: Auction | null;
    onClose: () => void;
}) {
    const t = useTranslations('auctions');
    const queryClient = useQueryClient();
    const isEditing = !!existing;

    const [name, setName] = useState(existing?.name ?? '');
    const [description, setDescription] = useState(existing?.description ?? '');
    const [startingPrice, setStartingPrice] = useState<number>(existing?.startingPrice ?? 10000);
    const [durationMinutes, setDurationMinutes] = useState<number>(existing?.durationMinutes ?? 15);
    // Phase 2 — bidding rules. 60 s is a hard floor on the api (values
    // under it are raised, not rejected); the form mirrors it so the
    // organizer sees the real rule before saving.
    const [minIncrementFandies, setMinIncrementFandies] = useState<number>(existing?.minIncrementFandies ?? 5);
    const [softCloseSeconds, setSoftCloseSeconds] = useState<number>(existing?.softCloseSeconds ?? 60);
    const [extensionSeconds, setExtensionSeconds] = useState<number>(existing?.extensionSeconds ?? 60);
    const initialScheduledStart = toLocalScheduledParts(existing?.scheduledStart);
    const [scheduledDate, setScheduledDate] = useState(initialScheduledStart.date);
    const [scheduledTime, setScheduledTime] = useState(initialScheduledStart.time);
    const [redemptionInstructions, setRedemptionInstructions] = useState(existing?.redemptionInstructions ?? '');
    const [tagIds, setTagIds] = useState<string[]>(existing?.tagIds ?? []);

    // Fandi-clock window for the scheduled-start tooltip — the auction must
    // start within it, so showing the organizer the exact window saves a
    // round-trip to the event page (and a 400 from the backend).
    const fmtDt = (iso: string) =>
        new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
    const fandiWindowLabel =
        event?.fandiOpensAt && event?.fandiClosesAt
            ? t('fandiWindowTooltip', { opens: fmtDt(event.fandiOpensAt), closes: fmtDt(event.fandiClosesAt) })
            : t('fandiWindowUnknown');

    // Map backend error codes to friendly localized toasts. The Fandi-clock
    // validations return typed codes; anything else falls back to the raw
    // (now-surfaced) message, then a generic string.
    const KNOWN_CODES = [
        'AUCTION_STARTS_BEFORE_FANDI_CLOCK',
        'AUCTION_EXCEEDS_FANDI_CLOCK',
        'EVENT_MISSING_FANDI_CLOCK',
    ];
    const toErrorMessage = (err: unknown): string => {
        if (err instanceof ApiError) {
            if (KNOWN_CODES.includes(err.code)) return t(`errors.${err.code}`);
            return err.message;
        }
        return t('createError');
    };

    const { mutate: create, isPending: isCreating } = useMutation({
        mutationFn: (dto: CreateAuctionDto) => auctionsApi.create(eventId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
            toast.success(t('created'));
            onClose();
        },
        onError: (err: unknown) => toast.error(toErrorMessage(err)),
    });

    const { mutate: update, isPending: isUpdating } = useMutation({
        mutationFn: (dto: UpdateAuctionDto) => auctionsApi.update(existing!.id, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
            toast.success(t('updated'));
            onClose();
        },
        onError: (err: unknown) => toast.error(toErrorMessage(err)),
    });

    const isPending = isCreating || isUpdating;
    const canSubmit =
        Boolean(name.trim()) &&
        startingPrice >= 10000 &&
        durationMinutes >= 1 &&
        minIncrementFandies >= 1 &&
        softCloseSeconds >= SOFT_CLOSE_FLOOR_SECONDS &&
        extensionSeconds >= EXTENSION_FLOOR_SECONDS &&
        isFandiAligned(startingPrice) &&
        !isPending;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        const scheduledStart = combineScheduledStart(scheduledDate, scheduledTime);
        const dto: CreateAuctionDto = {
            name: name.trim(),
            ...(description && { description }),
            startingPrice,
            durationMinutes,
            minIncrementFandies,
            softCloseSeconds,
            extensionSeconds,
            ...(scheduledStart && { scheduledStart }),
            ...(redemptionInstructions && { redemptionInstructions }),
            tagIds,
        };

        if (isEditing) {
            update(dto);
        } else {
            create(dto);
        }
    };

    const stepLabels = { decrementLabel: t('panel.decrease'), incrementLabel: t('panel.increase') };

    return (
        <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
            <SheetContent side="right" className="gap-0 p-0" aria-describedby={undefined}>
                <SheetHeader className="shrink-0 border-b-2 border-ink px-7 py-[22px] pr-16">
                    <SheetTitle className="text-[24px]">
                        {isEditing ? t('panel.editTitle') : t('create')}
                    </SheetTitle>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 overflow-y-auto px-7 py-5">
                        <div className="flex flex-col gap-4">
                            {/* Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className={FIELD_LABEL}>
                                    {t('form.name')} *
                                </label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('form.name')}
                                    className="h-12 border-[3px] border-blue px-3.5 text-base font-bold md:text-base"
                                />
                            </div>

                            {/* Description */}
                            <div className="flex flex-col gap-1.5">
                                <label className={FIELD_LABEL}>
                                    {t('form.description')}
                                </label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    placeholder={t('form.descriptionPlaceholder')}
                                    className="px-3.5 py-2.5 text-sm text-body-white"
                                />
                            </div>

                            {/* Starting Price (COP; must map to whole Fandis) */}
                            <div className="flex flex-col gap-1.5">
                                <label className={FIELD_LABEL}>
                                    {t('form.startingPrice')} *
                                </label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={formatCOPInput(startingPrice)}
                                    onChange={(e) => setStartingPrice(parseCOPInput(e.target.value))}
                                    onBlur={() => {
                                        const v = startingPrice;
                                        if (v >= 10000 && !isFandiAligned(v)) {
                                            setStartingPrice(snapToFandi(v));
                                        }
                                    }}
                                    className="h-12 px-3.5 text-base font-extrabold tabular md:text-base"
                                />
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-space-mono text-[10px] text-muted-white">{t('minPrice')}</p>
                                    {startingPrice >= 10000 && isFandiAligned(startingPrice) && (
                                        <p className="font-space-mono text-[10px] font-bold text-blue">
                                            {t('panel.fandisEquivalent', { fandis: formatFandis(startingPrice) })}
                                        </p>
                                    )}
                                    {startingPrice >= 10000 && !isFandiAligned(startingPrice) && (
                                        <p className="font-space-mono text-[10px] font-bold text-alert-white">
                                            {t('panel.mustBeMultiple', { amount: FANDI_RATE.toLocaleString('es-CO') })}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Duration + min increment (steppers) */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <label className={FIELD_LABEL}>
                                        {t('form.durationMinutes')} *
                                    </label>
                                    <Stepper
                                        onDecrement={() => setDurationMinutes((v) => Math.max(1, v - 1))}
                                        onIncrement={() => setDurationMinutes((v) => v + 1)}
                                        {...stepLabels}
                                    >
                                        <Input
                                            type="number"
                                            min={1}
                                            value={durationMinutes}
                                            onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                            className="h-10 px-2 text-center text-base font-black md:text-base"
                                        />
                                    </Stepper>
                                </div>

                                {/* Phase 2 — bidding rules */}
                                <div className="flex flex-col gap-1.5">
                                    <label className={FIELD_LABEL}>
                                        {t('form.minIncrement')} *
                                    </label>
                                    <Stepper
                                        onDecrement={() => setMinIncrementFandies((v) => Math.max(1, v - 1))}
                                        onIncrement={() => setMinIncrementFandies((v) => v + 1)}
                                        {...stepLabels}
                                    >
                                        <Input
                                            type="number"
                                            min={1}
                                            value={minIncrementFandies}
                                            onChange={(e) => setMinIncrementFandies(Number(e.target.value))}
                                            className="h-10 px-2 text-center text-base font-black md:text-base"
                                        />
                                    </Stepper>
                                </div>
                            </div>
                            <p className="-mt-2 font-space-mono text-[10px] leading-relaxed text-muted-white">
                                {t('form.minIncrementHelp', { fandis: formatFandis(minIncrementFandies * FANDI_RATE) })}
                            </p>

                            {/* Soft close / extension (anti-sniping) */}
                            <div className="flex flex-col gap-3 rounded-[12px] border-2 border-ink p-3.5">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <label className={FIELD_LABEL}>
                                            {t('form.softClose')} *
                                        </label>
                                        <Stepper
                                            onDecrement={() => setSoftCloseSeconds((v) => Math.max(SOFT_CLOSE_FLOOR_SECONDS, v - 15))}
                                            onIncrement={() => setSoftCloseSeconds((v) => v + 15)}
                                            {...stepLabels}
                                        >
                                            <Input
                                                type="number"
                                                min={SOFT_CLOSE_FLOOR_SECONDS}
                                                value={softCloseSeconds}
                                                onChange={(e) => setSoftCloseSeconds(Number(e.target.value))}
                                                className="h-10 px-2 text-center text-base font-black md:text-base"
                                            />
                                        </Stepper>
                                        {softCloseSeconds < SOFT_CLOSE_FLOOR_SECONDS && (
                                            <p className="font-space-mono text-[10px] font-bold text-alert-white">
                                                {t('form.softCloseFloor', { seconds: SOFT_CLOSE_FLOOR_SECONDS })}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className={FIELD_LABEL}>
                                            {t('form.extension')} *
                                        </label>
                                        <Stepper
                                            onDecrement={() => setExtensionSeconds((v) => Math.max(EXTENSION_FLOOR_SECONDS, v - 15))}
                                            onIncrement={() => setExtensionSeconds((v) => v + 15)}
                                            {...stepLabels}
                                        >
                                            <Input
                                                type="number"
                                                min={EXTENSION_FLOOR_SECONDS}
                                                value={extensionSeconds}
                                                onChange={(e) => setExtensionSeconds(Number(e.target.value))}
                                                className="h-10 px-2 text-center text-base font-black md:text-base"
                                            />
                                        </Stepper>
                                        {extensionSeconds < EXTENSION_FLOOR_SECONDS && (
                                            <p className="font-space-mono text-[10px] font-bold text-alert-white">
                                                {t('form.extensionFloor', { seconds: EXTENSION_FLOOR_SECONDS })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <p className="font-space-mono text-[10px] leading-relaxed text-muted-white">
                                    {t('form.softCloseRule', { softClose: softCloseSeconds, extension: extensionSeconds })}
                                </p>
                            </div>

                            {/* Scheduled Start */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <label className={FIELD_LABEL}>
                                        {t('form.scheduledStart')}
                                    </label>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button type="button" className="cursor-help text-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue">
                                                    <Info size={14} />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[260px] leading-relaxed">
                                                {fandiWindowLabel}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <Input
                                        type="date"
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                        className="h-12 px-3.5 text-base md:text-base"
                                    />
                                    <Input
                                        type="time"
                                        value={scheduledTime}
                                        onChange={(e) => setScheduledTime(e.target.value)}
                                        className="h-12 px-3.5 text-base md:text-base"
                                    />
                                </div>
                                <p className="font-space-mono text-[10px] leading-relaxed text-muted-white">{t('scheduledStartHint')}</p>
                            </div>

                            {/* Redemption Instructions */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <label className={FIELD_LABEL}>
                                        {t('redemptionInstructions')}
                                    </label>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button type="button" className="cursor-help text-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue">
                                                    <Info size={14} />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[260px] leading-relaxed">
                                                {t('redemptionTooltip')}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <Textarea
                                    value={redemptionInstructions}
                                    onChange={(e) => setRedemptionInstructions(e.target.value)}
                                    rows={3}
                                    placeholder={t('redemptionPlaceholder')}
                                    className="px-3.5 py-2.5 text-sm text-body-white"
                                />
                            </div>

                            {/* Idol collaborations (RFC §3): real idol accounts,
                                by invitation. They replace the text tags. */}
                            <IdolCollaborationsSection
                                eventId={eventId}
                                dynamicType="auction"
                                dynamicId={existing?.id ?? null}
                            />

                            {/* Legacy lineup text tags (Step 6.4). */}
                            {tagIds.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                    <label className={FIELD_LABEL}>
                                        {t('legacyTags')}
                                    </label>
                                    <ArtistMultiSelect
                                        lineup={event?.lineup ?? []}
                                        value={tagIds}
                                        onChange={setTagIds}
                                        emptyHint={t('artistsEmpty')}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sticky footer. No fan preview exists yet, so
                        "VISTA DEL FAN" is omitted. */}
                    <div className="flex shrink-0 gap-3 border-t-2 border-ink px-7 py-[18px]">
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={onClose}
                            className="flex-1"
                        >
                            {t('panel.cancel')}
                        </Button>
                        <Button
                            type={canSubmit ? 'submit' : 'button'}
                            size="lg"
                            disabled={!canSubmit}
                            aria-disabled={!canSubmit}
                            onClick={(e) => {
                                if (!canSubmit) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            }}
                            className="flex-[2] font-black [font-stretch:112%]"
                        >
                            {isPending && <Loader2 size={14} className="animate-spin" />}
                            {isEditing ? t('panel.save') : t('create')}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}

// ── Auction Card ──
function AuctionCard({
    auction, isWrite, onEdit, onDelete, onAction, onScheduledExpire, index,
}: {
    auction: Auction;
    isWrite: boolean;
    onEdit: (a: Auction) => void;
    onDelete: (a: Auction) => void;
    onAction: (id: string, action: 'activate' | 'pause' | 'resume' | 'end') => void;
    onScheduledExpire: () => void;
    index?: number;
}) {
    const t = useTranslations('auctions');
    const isPending = auction.status === 'pending';
    const isActive = auction.status === 'active';
    const isPaused = auction.status === 'paused';
    const isEnded = auction.status === 'ended';
    const isCancelled = auction.status === 'cancelled';

    const displayPrice = isPending ? auction.startingPrice : (auction.currentPrice ?? auction.startingPrice);
    const priceLabel = isPending ? t('startingPrice') : (isEnded || isCancelled) ? t('finalPrice') : t('currentPrice');

    // Surface by state: live = ink + lime extrusion, paused = ink,
    // finished = white block, scheduled = dashed outline on blue.
    const surface = isActive
        ? 'block-ink shadow-ext-live-xl text-white'
        : isPaused
            ? 'block-ink text-white'
            : (isEnded || isCancelled)
                ? 'block-white text-ink'
                : 'rounded-[18px] border-[3px] border-dashed border-white/60 text-white';

    const incrementLabel = `+${formatFandis(auction.minIncrementFandies * FANDI_RATE)} F`;
    const extensionRule = t('card.extensionRule', {
        softClose: auction.softCloseSeconds,
        extension: auction.extensionSeconds,
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index ?? 0) * 0.08, duration: 0.3 }}
            className={`flex h-full flex-col gap-3.5 p-5 ${surface}`}
        >
            {/* Header: status + live clock / delete */}
            <div className="flex items-start justify-between gap-3">
                <AuctionStatusBadge status={auction.status} />
                {isActive && auction.endsAt && <CountdownTimer endsAt={auction.endsAt} />}
                {isPaused && auction.timeRemaining != null && (
                    <span className="flex items-center gap-2 font-space-mono text-[20px] font-bold tabular text-lilac">
                        <Pause size={16} /> {formatMMS(auction.timeRemaining)}
                    </span>
                )}
                {isWrite && isPending && (
                    <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => onDelete(auction)}
                        aria-label={t('delete')}
                    >
                        <Trash2 size={14} />
                    </Button>
                )}
            </div>

            <h3 className="line-clamp-3 font-display text-[24px] [font-stretch:110%]">{auction.name}</h3>

            {auction.description && (
                <p className={`line-clamp-2 text-[13px] leading-relaxed ${isEnded || isCancelled ? 'text-body-white' : isPending ? 'text-lilac' : 'text-muted-ink'}`}>
                    {auction.description}
                </p>
            )}

            {/* ── Live / paused: price stat on white + bid chips ── */}
            {(isActive || isPaused) && (
                <>
                    <div className="rounded-[14px] bg-white p-4 text-center text-ink">
                        <div className="label-mono tracking-[0.16em] text-muted-white">{priceLabel}</div>
                        <div className="mt-1 font-display text-[54px] leading-none tabular text-blue">
                            {formatFandis(displayPrice)} F
                        </div>
                        <div className="mt-1.5 font-space-mono text-[10px] uppercase text-muted-white">
                            ≈ {formatCOP(displayPrice)}
                            {auction.currentBidderName && <> · {auction.currentBidderName}</>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-[10px] bg-chip-ink px-3 py-2.5">
                            <div className="label-mono text-[9px] text-muted-ink">{t('card.bidsLabel')}</div>
                            <div className="mt-0.5 font-display text-[20px] tabular">{auction.bidCount}</div>
                        </div>
                        <div className="rounded-[10px] bg-chip-ink px-3 py-2.5">
                            <div className="label-mono text-[9px] text-muted-ink">{t('card.incrementLabel')}</div>
                            <div className="mt-0.5 font-display text-[20px] tabular">{incrementLabel}</div>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 font-space-mono text-[10px] uppercase leading-relaxed text-muted-ink">
                        <span className="flex-1">{extensionRule}</span>
                        <SoftCloseInfo
                            softCloseSeconds={auction.softCloseSeconds}
                            extensionSeconds={auction.extensionSeconds}
                        />
                    </div>
                </>
            )}

            {/* ── Finished: final price + winner ── */}
            {(isEnded || isCancelled) && (
                <>
                    <div className="rounded-[14px] border-2 border-ink p-4 text-center">
                        <div className="label-mono tracking-[0.16em] text-muted-white">{priceLabel}</div>
                        <div className="mt-1 font-display text-[54px] leading-none tabular">
                            {formatFandis(displayPrice)} F
                        </div>
                        <div className="mt-1.5 font-space-mono text-[10px] uppercase text-muted-white">
                            ≈ {formatCOP(displayPrice)} · {t('bids', { count: auction.bidCount })}
                        </div>
                    </div>
                    <div
                        className={`flex items-center gap-3 rounded-[12px] border-2 border-ink px-3 py-2.5 ${
                            isEnded && auction.currentBidderName ? 'bg-lime' : 'bg-line-white'
                        }`}
                    >
                        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-black text-lime">
                            {auction.currentBidderName ? initialsOf(auction.currentBidderName) : <Trophy size={14} />}
                        </span>
                        <div className="flex min-w-0 flex-col">
                            <span className="label-mono text-[9px] text-ink">{t('winner')}</span>
                            <span className="truncate text-base font-black">
                                {auction.currentBidderName ?? '—'}
                            </span>
                        </div>
                    </div>
                    {auction.redemptionInstructions && (
                        <div className="flex flex-col gap-1">
                            <span className="label-mono text-muted-white">{t('card.howToClaim')}</span>
                            <p className="text-sm leading-relaxed text-ink">
                                {auction.redemptionInstructions}
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* ── Scheduled: starting price + duration on quiet tiles ── */}
            {isPending && (
                <>
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-[10px] bg-ink/35 px-3 py-2.5">
                            <div className="label-mono text-[9px] text-lilac">{priceLabel}</div>
                            <div className="mt-0.5 font-display text-[20px] tabular">{formatFandis(displayPrice)} F</div>
                            <div className="mt-0.5 font-space-mono text-[10px] text-lilac">≈ {formatCOP(displayPrice)}</div>
                        </div>
                        <div className="rounded-[10px] bg-ink/35 px-3 py-2.5">
                            <div className="label-mono text-[9px] text-lilac">{t('card.durationLabel')}</div>
                            <div className="mt-0.5 font-display text-[20px] tabular">{t('duration', { minutes: auction.durationMinutes })}</div>
                            <div className="mt-0.5 font-space-mono text-[10px] text-lilac">{incrementLabel}</div>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 font-space-mono text-[10px] uppercase leading-relaxed text-lilac">
                        <span className="flex-1">{extensionRule}</span>
                        <SoftCloseInfo
                            softCloseSeconds={auction.softCloseSeconds}
                            extensionSeconds={auction.extensionSeconds}
                        />
                    </div>
                    {auction.scheduledStart ? (
                        <ScheduledStartCountdown
                            scheduledStart={auction.scheduledStart}
                            onExpire={onScheduledExpire}
                        />
                    ) : (
                        <span className="label-mono text-lilac">
                            {t('manualStartLabel')}
                        </span>
                    )}
                </>
            )}

            {/* ── Actions (write access only; each one confirms first) ── */}
            {isWrite && (isPending || isActive || isPaused) && (
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    {isPending && (
                        <>
                            <Button variant="secondary" size="sm" onClick={() => onEdit(auction)}>
                                <Pencil size={13} />
                                {t('edit')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onAction(auction.id, 'activate')}
                                className="text-white"
                            >
                                <Play size={13} />
                                {t('activate')}
                            </Button>
                        </>
                    )}

                    {isActive && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => onAction(auction.id, 'pause')} className="flex-1">
                                <Pause size={13} />
                                {t('pause')}
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => onAction(auction.id, 'end')} className="flex-1">
                                <Square size={13} />
                                {t('end')}
                            </Button>
                        </>
                    )}

                    {isPaused && (
                        <Button size="sm" onClick={() => onAction(auction.id, 'resume')} className="flex-1 border-0 shadow-ext-cta">
                            <RotateCcw size={13} />
                            {t('resume')}
                        </Button>
                    )}
                </div>
            )}
        </motion.div>
    );
}

// ── Section header on blue ──
function SectionHeader({ live, children }: { live?: boolean; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2.5">
            {live && <span className="live-dot text-lime" aria-hidden="true" />}
            <h2 className={`label-mono font-bold ${live ? 'text-lime' : 'text-lilac'}`}>
                {children}
            </h2>
        </div>
    );
}

const CARD_GRID = 'grid grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-3';

// ── Main page ──
export default function AuctionsPage() {
    const tCommon = useTranslations('common');
    const params = useParams();
    const eventId = params.id as string;
    const t = useTranslations('auctions');
    const queryClient = useQueryClient();
    const { memberRole } = useAuth();
    const isWrite = memberRole === 'owner' || memberRole === 'admin';

    const [showForm, setShowForm] = useState(false);
    const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        auctionId: string;
        action: 'activate' | 'pause' | 'resume' | 'end' | 'delete';
        auction?: Auction;
    }>({ open: false, auctionId: '', action: 'activate' });

    const { data: event } = useQuery({
        queryKey: ['events', eventId],
        queryFn: () => eventsApi.get(eventId),
    });

    const { data: auctions, isLoading } = useQuery({
        queryKey: ['events', eventId, 'auctions'],
        queryFn: () => auctionsApi.list(eventId),
        refetchInterval: (query) => {
            const data = query.state.data as Auction[] | undefined;
            return data?.some((a) => a.status === 'active' || a.status === 'pending') ? 5_000 : false;
        },
    });

    // ── WebSocket for live updates ──
    const auctionTopics = useMemo(
        () => [
            `event:${eventId}`,
            ...(auctions ?? []).map((a) => `auction:${a.id}`),
        ],
        [auctions, eventId],
    );

    const { lastMessage } = useWebSocket({
        topics: auctionTopics,
        enabled: Boolean(eventId),
    });

    useEffect(() => {
        if (lastMessage?.type === 'auction_update') {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
        }
    }, [lastMessage, queryClient, eventId]);

    // ── Mutations ──
    const activateMutation = useMutation({
        mutationFn: (id: string) => auctionsApi.activate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
            toast.success(t('activate'));
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : tCommon('error')),
    });

    const pauseMutation = useMutation({
        mutationFn: (id: string) => auctionsApi.pause(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
            toast.success(t('pause'));
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : tCommon('error')),
    });

    const resumeMutation = useMutation({
        mutationFn: (id: string) => auctionsApi.resume(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
            toast.success(t('resume'));
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : tCommon('error')),
    });

    const endMutation = useMutation({
        mutationFn: (id: string) => auctionsApi.end(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
            toast.success(t('end'));
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : tCommon('error')),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => auctionsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
            toast.success(t('deleted'));
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : t('deleteError')),
    });

    const handleAction = useCallback((id: string, action: 'activate' | 'pause' | 'resume' | 'end') => {
        setConfirmState({ open: true, auctionId: id, action });
    }, []);

    const handleDelete = useCallback((auction: Auction) => {
        setConfirmState({ open: true, auctionId: auction.id, action: 'delete', auction });
    }, []);

    const handleConfirm = useCallback(() => {
        const { auctionId, action } = confirmState;
        const mutationMap = { activate: activateMutation, pause: pauseMutation, resume: resumeMutation, end: endMutation, delete: deleteMutation };
        mutationMap[action].mutate(auctionId, {
            onSettled: () => setConfirmState((s) => ({ ...s, open: false })),
        });
    }, [confirmState, activateMutation, pauseMutation, resumeMutation, endMutation, deleteMutation]);

    const handleEdit = useCallback((auction: Auction) => {
        setEditingAuction(auction);
        setShowForm(true);
    }, []);

    const handleCloseForm = useCallback(() => {
        setShowForm(false);
        setEditingAuction(null);
    }, []);

    const handleScheduledExpire = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
    }, [queryClient, eventId]);

    // ── Group by status ──
    const active = auctions?.filter((a) => a.status === 'active') ?? [];
    const pending = auctions?.filter((a) => a.status === 'pending') ?? [];
    const paused = auctions?.filter((a) => a.status === 'paused') ?? [];
    const ended = auctions?.filter((a) => a.status === 'ended' || a.status === 'cancelled') ?? [];

    // ── Confirm dialog content ──
    const confirmConfig: Record<string, { title: string; description: string; destructive: boolean }> = {
        activate: { title: t('activate'), description: t('confirmActivate'), destructive: false },
        pause:    { title: t('pause'),    description: t('confirmPause'),    destructive: false },
        resume:   { title: t('resume'),   description: t('resume'),          destructive: false },
        end:      { title: t('end'),      description: t('confirmEnd'),      destructive: true },
        delete:   { title: t('delete'),   description: t('confirmDelete'),   destructive: true },
    };
    const currentConfirm = confirmConfig[confirmState.action];
    const activeMutation = { activate: activateMutation, pause: pauseMutation, resume: resumeMutation, end: endMutation, delete: deleteMutation }[confirmState.action];

    const canCreate = isWrite && event?.status !== 'ended';

    const renderCards = (list: Auction[]) => list.map((a, idx) => (
        <AuctionCard
            key={a.id} auction={a} isWrite={isWrite}
            onEdit={handleEdit} onDelete={handleDelete} onAction={handleAction}
            onScheduledExpire={handleScheduledExpire}
            index={idx}
        />
    ));

    return (
        <div className="flex flex-col gap-6">
            {/* ── Header ── */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="font-display text-[32px] text-white">
                        {t('title')}
                    </h1>
                    {event && (
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="label-mono text-lilac">{event.name}</span>
                            <EventStatusBadge status={event.status} />
                        </div>
                    )}
                </div>

                {canCreate && (
                    <Button
                        size="lg"
                        onClick={() => { setEditingAuction(null); setShowForm(true); }}
                    >
                        <Plus size={16} strokeWidth={3} />
                        {t('create')}
                    </Button>
                )}
            </div>

            {/* ── Loading ── */}
            {isLoading && (
                <div className={CARD_GRID}>
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-72 w-full rounded-[18px]" />
                    ))}
                </div>
            )}

            {/* ── Empty ── */}
            {!isLoading && (!auctions || auctions.length === 0) && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-[18px] border-[3px] border-dashed border-white/60 px-6 py-16 text-center">
                    <p className="font-display text-[24px] text-white">
                        {t('empty')}
                    </p>
                    <p className="text-sm text-lilac">
                        {t('card.emptyBody')}
                    </p>
                    {canCreate && (
                        <Button
                            variant="secondary"
                            onClick={() => { setEditingAuction(null); setShowForm(true); }}
                            className="mt-2"
                        >
                            <Plus size={16} strokeWidth={3} />
                            {t('create')}
                        </Button>
                    )}
                </div>
            )}

            {/* ── Active section ── */}
            {active.length > 0 && (
                <section className="flex flex-col gap-3">
                    <SectionHeader live>{t('statusActive')} ({active.length})</SectionHeader>
                    <div className={CARD_GRID}>{renderCards(active)}</div>
                </section>
            )}

            {/* ── Paused section ── */}
            {paused.length > 0 && (
                <section className="flex flex-col gap-3">
                    <SectionHeader>{t('statusPaused')} ({paused.length})</SectionHeader>
                    <div className={CARD_GRID}>{renderCards(paused)}</div>
                </section>
            )}

            {/* ── Pending section ── */}
            {pending.length > 0 && (
                <section className="flex flex-col gap-3">
                    <SectionHeader>{t('statusPending')} ({pending.length})</SectionHeader>
                    <div className={CARD_GRID}>{renderCards(pending)}</div>
                </section>
            )}

            {/* ── Ended section ── */}
            {ended.length > 0 && (
                <section className="flex flex-col gap-3">
                    <SectionHeader>{t('statusEnded')} ({ended.length})</SectionHeader>
                    <div className={CARD_GRID}>{renderCards(ended)}</div>
                </section>
            )}

            {/* ── Create / Edit side panel ── */}
            {showForm && (
                <AuctionFormDialog
                    eventId={eventId}
                    event={event}
                    existing={editingAuction}
                    onClose={handleCloseForm}
                />
            )}

            {/* ── Confirm dialog ── */}
            <ConfirmDialog
                open={confirmState.open}
                title={currentConfirm.title}
                description={currentConfirm.description}
                confirmLabel={currentConfirm.title}
                destructive={currentConfirm.destructive}
                isPending={activeMutation.isPending}
                onConfirm={handleConfirm}
                onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
            />
        </div>
    );
}
