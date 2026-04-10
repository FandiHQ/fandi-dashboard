'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Plus, Loader2, Pencil, Trash2, Info, X,
    Play, Pause, RotateCcw, Square, Timer, Gavel, Trophy,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { useWebSocket } from '@/hooks/use-websocket';
import { auctionsApi, eventsApi } from '@/lib/api-hooks';
import type { Auction, CreateAuctionDto, UpdateAuctionDto, AuctionStatus } from '@/types/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

// ── Helpers ──
const FANDI_RATE = 5_000;

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

// ── Status badge (same pattern as experiences) ──
const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string }> = {
    pending:   { bg: '#73737320', color: '#737373', border: '#737373' },
    active:    { bg: '#00FF8820', color: '#00FF88', border: '#00FF88' },
    paused:    { bg: '#FF990020', color: '#FF9900', border: '#FF9900' },
    ended:     { bg: '#2D00F720', color: '#7B61FF', border: '#7B61FF' },
    cancelled: { bg: '#FF336620', color: '#FF3366', border: '#FF3366' },
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
    const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

    return (
        <span
            className="inline-flex items-center gap-1.5 px-3 py-1 font-space-mono text-[11px] uppercase tracking-[1px]"
            style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${status === 'active' ? 'animate-pulse' : ''}`}
                style={{ background: c.color }}
            />
            {labels[status]}
        </span>
    );
}

// ── Countdown Timer ──
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
            <span className="font-space-mono text-[20px] uppercase tracking-[2px] text-[#FF3366]">
                {t('finished')}
            </span>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Timer size={18} className={isUrgent ? 'text-[#FF0055]' : 'text-[#00FF88]'} />
            <span
                className={`font-space-mono text-[28px] tabular-nums tracking-[4px] ${isUrgent ? 'animate-glitch-infinite' : ''}`}
                style={{
                    color: isUrgent ? '#FF0055' : '#00FF88',
                    textShadow: isUrgent
                        ? '0 0 20px rgba(255,0,85,0.6), 0 0 40px rgba(255,0,85,0.3)'
                        : '0 0 12px rgba(0,255,136,0.4)',
                }}
            >
                {formatMMS(remaining)}
            </span>
        </div>
    );
}

// ── Scheduled-start countdown (pending auctions) ──
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
            <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00FF88]" />
                <span className="font-space-mono text-[13px] uppercase tracking-[1px] text-[#00FF88]">
                    {t('scheduledStartLaunching')}
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
                <span className="font-space-mono text-[10px] uppercase tracking-[1px] text-[#4A4A4A]">
                    {t('scheduledStartLabel')}
                </span>
                <span className="font-space-mono text-[10px] text-[#737373]">{dateLabel}</span>
            </div>
            <div className="flex items-center gap-2">
                <Timer size={14} className="text-[#2D00F7]" />
                <span
                    className="font-space-mono text-[22px] tabular-nums tracking-[4px]"
                    style={{
                        color: '#2D00F7',
                        textShadow: '0 0 16px rgba(45,0,247,0.5)',
                    }}
                >
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
                    <button type="button" className="cursor-help text-[#2D00F7] transition-colors hover:text-white hover:drop-shadow-[0_0_8px_rgba(45,0,247,0.8)] focus:outline-none">
                        <Info size={14} />
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    className="max-w-[280px] rounded-none border-[#2D00F7] bg-[#020202] py-3 pl-3 pr-4 font-sora text-[12px] leading-relaxed text-[#A0A0A0] shadow-[0_0_20px_rgba(45,0,247,0.2)]"
                >
                    {t('softCloseTooltip', { softClose: softCloseSeconds, extension: extensionSeconds })}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// ── Confirm Dialog (inline, same pattern as experiences) ──
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
    if (!open) return null;
    const accentColor = destructive ? '#FF3366' : '#2D00F7';
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={onCancel}
        >
            <div
                className="flex w-full max-w-md flex-col border bg-[#0A0A0A] shadow-[0_0_60px_rgba(0,0,0,0.8)]"
                style={{ borderColor: `${accentColor}40` }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 border-b px-6 py-4" style={{ borderColor: '#1E1E1E' }}>
                    <div className="h-3 w-1" style={{ background: accentColor }} />
                    <h2 className="font-space-mono text-[14px] uppercase tracking-[2px] text-white">{title}</h2>
                    <div className="ml-auto h-3 w-1" style={{ background: accentColor }} />
                </div>
                <div className="px-6 py-5">
                    <p className="font-sora text-[14px] leading-relaxed text-[#A0A0A0]">{description}</p>
                </div>
                <div className="flex gap-3 border-t border-[#1E1E1E] px-6 py-4">
                    <button
                        onClick={onConfirm}
                        disabled={isPending}
                        className="flex flex-1 cursor-pointer items-center justify-center gap-2 px-6 py-3 font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all disabled:opacity-50"
                        style={{
                            background: accentColor,
                            boxShadow: `0 0 20px ${accentColor}30`,
                        }}
                    >
                        {isPending && <Loader2 size={14} className="animate-spin" />}
                        {confirmLabel}
                    </button>
                    <button
                        onClick={onCancel}
                        className="cursor-pointer border border-[#2A2A2A] bg-transparent px-6 py-3 font-space-mono text-[13px] uppercase tracking-[1px] text-[#A0A0A0] transition-colors hover:border-[#4A4A4A] hover:text-white"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Form Dialog ──
function AuctionFormDialog({
    eventId,
    existing,
    onClose,
}: {
    eventId: string;
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
    const [scheduledStart, setScheduledStart] = useState(existing?.scheduledStart ?? '');
    const [redemptionInstructions, setRedemptionInstructions] = useState(existing?.redemptionInstructions ?? '');

    const { mutate: create, isPending: isCreating } = useMutation({
        mutationFn: (dto: CreateAuctionDto) => auctionsApi.create(eventId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
            toast.success(t('created'));
            onClose();
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : t('createError')),
    });

    const { mutate: update, isPending: isUpdating } = useMutation({
        mutationFn: (dto: UpdateAuctionDto) => auctionsApi.update(existing!.id, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
            toast.success(t('updated'));
            onClose();
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : t('createError')),
    });

    const isPending = isCreating || isUpdating;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || startingPrice < 10000 || durationMinutes < 1) return;

        const dto: CreateAuctionDto = {
            name: name.trim(),
            ...(description && { description }),
            startingPrice,
            durationMinutes,
            ...(scheduledStart && { scheduledStart }),
            ...(redemptionInstructions && { redemptionInstructions }),
        };

        if (isEditing) {
            update(dto);
        } else {
            create(dto);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="flex w-full max-w-lg max-h-[90vh] flex-col border border-[#1E1E1E] bg-[#0A0A0A] shadow-[0_0_60px_rgba(45,0,247,0.1)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HUD bracket header */}
                <div className="flex shrink-0 items-center gap-2 border-b border-[#1E1E1E] px-6 py-4">
                    <div className="h-3 w-1 bg-[#2D00F7]" />
                    <h2 className="font-space-mono text-[14px] uppercase tracking-[2px] text-white">
                        {isEditing ? t('edit') : t('create')}
                    </h2>
                    <div className="ml-auto h-3 w-1 bg-[#2D00F7]" />
                </div>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="flex flex-col gap-5">
                            {/* Name */}
                            <div className="flex flex-col gap-2">
                                <label className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                                    {t('form.name')} *
                                </label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('form.name')}
                                    className="h-12 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-lg text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:ring-0"
                                />
                            </div>

                            {/* Description */}
                            <div className="flex flex-col gap-2">
                                <label className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                                    {t('form.description')}
                                </label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    placeholder={t('form.descriptionPlaceholder')}
                                    className="rounded-none border-[#2A2A2A] bg-[#141414] p-4 font-sora text-base text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:ring-0"
                                />
                            </div>

                            {/* Starting Price */}
                            <div className="flex flex-col gap-2">
                                <label className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                                    {t('form.startingPrice')} *
                                </label>
                                <Input
                                    type="number"
                                    min={10000}
                                    step={1000}
                                    value={startingPrice}
                                    onChange={(e) => setStartingPrice(Number(e.target.value))}
                                    className="h-12 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-lg text-white focus:border-[#2D00F7] focus:ring-0"
                                />
                                <div className="flex items-center justify-between">
                                    <p className="font-space-mono text-[10px] text-[#4A4A4A]">{t('minPrice')}</p>
                                    {startingPrice >= 10000 && (
                                        <p className="font-space-mono text-[10px] text-[#00FF88]">
                                            = {formatFandis(startingPrice)} Fandis
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Duration */}
                            <div className="flex flex-col gap-2">
                                <label className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                                    {t('form.durationMinutes')} *
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                    className="h-12 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-lg text-white focus:border-[#2D00F7] focus:ring-0"
                                />
                            </div>

                            {/* Scheduled Start */}
                            <div className="flex flex-col gap-2">
                                <label className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                                    {t('form.scheduledStart')}
                                </label>
                                <Input
                                    type="datetime-local"
                                    value={scheduledStart}
                                    onChange={(e) => setScheduledStart(e.target.value)}
                                    className="h-12 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-base text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:ring-0"
                                />
                                <p className="font-space-mono text-[10px] text-[#4A4A4A]">{t('scheduledStartHint')}</p>
                            </div>

                            {/* Redemption Instructions */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <label className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                                        {t('redemptionInstructions')}
                                    </label>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button type="button" className="cursor-help text-[#2D00F7] transition-colors hover:text-white hover:drop-shadow-[0_0_8px_rgba(45,0,247,0.8)] focus:outline-none">
                                                    <Info size={14} />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent
                                                className="max-w-[260px] rounded-none border-[#2D00F7] bg-[#020202] py-3 pl-3 pr-4 font-sora text-[12px] leading-relaxed text-[#A0A0A0] shadow-[0_0_20px_rgba(45,0,247,0.2)]"
                                            >
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
                                    className="rounded-none border-[#2A2A2A] bg-[#141414] p-4 font-sora text-base text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:ring-0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sticky footer */}
                    <div className="shrink-0 border-t border-[#1E1E1E] bg-[#0A0A0A] px-6 py-4">
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={!name.trim() || startingPrice < 10000 || isPending}
                                className="flex flex-1 cursor-pointer items-center justify-center gap-2 bg-[#2D00F7] px-6 py-3 font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all hover:bg-[#2400C5] hover:shadow-[0_0_24px_rgba(45,0,247,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isPending && <Loader2 size={14} className="animate-spin" />}
                                {isEditing ? 'Guardar' : t('create')}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="cursor-pointer border border-[#2A2A2A] bg-transparent px-6 py-3 font-space-mono text-[13px] uppercase tracking-[1px] text-[#A0A0A0] transition-colors hover:border-[#4A4A4A] hover:text-white"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Auction Card ──
function AuctionCard({
    auction, isWrite, eventId, onEdit, onDelete, onAction, onScheduledExpire, index,
}: {
    auction: Auction;
    isWrite: boolean;
    eventId: string;
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

    const displayPrice = isPending ? auction.startingPrice : (auction.currentPrice ?? auction.startingPrice);
    const priceLabel = isPending ? t('startingPrice') : isEnded ? t('finalPrice') : t('currentPrice');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index ?? 0) * 0.08, duration: 0.3 }}
            className="group flex flex-col border border-[#1E1E1E] bg-[#0A0A0A] transition-all duration-200 hover:border-[#2A2A2A]"
            style={{
                boxShadow: isActive
                    ? '0 0 40px rgba(0,255,136,0.08), 0 4px 40px rgba(0,0,0,0.6)'
                    : '0 4px 24px rgba(0,0,0,0.4)',
            }}
        >
            {/* Header row */}
            <div className="flex items-start justify-between p-5">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <Gavel size={18} className="text-[#2D00F7]" />
                        <h3 className="font-sora text-xl font-bold text-white">{auction.name}</h3>
                    </div>
                    <AuctionStatusBadge status={auction.status} />
                </div>

                <div className="flex items-center gap-2">
                    {isWrite && isPending && (
                        <>
                            <button
                                onClick={() => onEdit(auction)}
                                className="flex cursor-pointer items-center gap-1.5 border border-[#2A2A2A] bg-transparent px-3 py-2 font-space-mono text-[11px] uppercase tracking-[1px] text-[#A0A0A0] transition-all hover:border-[#2D00F7] hover:text-white hover:shadow-[0_0_12px_rgba(45,0,247,0.2)]"
                            >
                                <Pencil size={13} />
                                {t('edit')}
                            </button>
                            <button
                                onClick={() => onDelete(auction)}
                                className="flex cursor-pointer items-center gap-1.5 border border-[#2A2A2A] bg-transparent px-3 py-2 font-space-mono text-[11px] uppercase tracking-[1px] text-[#FF3366] transition-all hover:border-[#FF3366] hover:shadow-[0_0_12px_rgba(255,51,102,0.2)]"
                            >
                                <Trash2 size={13} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Price + meta stats row */}
            <div className="flex items-center gap-6 border-t border-[#141414] px-5 py-4">
                {/* Price */}
                <div className="flex flex-col gap-1">
                    <span className="font-space-mono text-[10px] uppercase tracking-[1px] text-[#4A4A4A]">
                        {priceLabel}
                    </span>
                    <span
                        className="font-sora font-bold tabular-nums"
                        style={{
                            fontSize: isActive ? '32px' : '22px',
                            color: isActive ? '#00FF88' : '#FFFFFF',
                            textShadow: isActive
                                ? '0 0 20px rgba(0,255,136,0.6), 0 0 40px rgba(0,255,136,0.2)'
                                : 'none',
                            lineHeight: 1.1,
                        }}
                    >
                        {formatCOP(displayPrice)}
                    </span>
                    <span className="font-space-mono text-[11px] text-[#4A4A4A]">
                        = {formatFandis(displayPrice)} Fandis
                    </span>
                </div>

                {/* Divider */}
                <div className="h-10 w-px bg-[#1E1E1E]" />

                {/* Duration + soft-close */}
                <div className="flex flex-col gap-1">
                    <span className="font-space-mono text-[10px] uppercase tracking-[1px] text-[#4A4A4A]">
                        {t('form.durationMinutes')}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="font-space-mono text-[14px] text-[#A0A0A0]">
                            {t('duration', { minutes: auction.durationMinutes })}
                        </span>
                        <SoftCloseInfo
                            softCloseSeconds={auction.softCloseSeconds}
                            extensionSeconds={auction.extensionSeconds}
                        />
                    </div>
                </div>

                {/* Divider */}
                <div className="h-10 w-px bg-[#1E1E1E]" />

                {/* Bids */}
                <div className="flex items-center gap-2">
                    <Gavel size={14} className="text-[#4A4A4A]" />
                    <span className="font-space-mono text-[12px] text-[#A0A0A0]">
                        {t('bids', { count: auction.bidCount })}
                    </span>
                </div>
            </div>

            {/* Pending: scheduled start countdown or manual label */}
            {isPending && (
                <div className="border-t border-[#141414] px-5 py-4">
                    {auction.scheduledStart ? (
                        <ScheduledStartCountdown
                            scheduledStart={auction.scheduledStart}
                            onExpire={onScheduledExpire}
                        />
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="font-space-mono text-[11px] uppercase tracking-[1px] text-[#4A4A4A]">
                                {t('manualStartLabel')}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Active: Live countdown */}
            {isActive && auction.endsAt && (
                <div className="flex items-center justify-between border-t border-[#141414] px-5 py-4">
                    <CountdownTimer endsAt={auction.endsAt} />
                </div>
            )}

            {/* Paused: frozen timer */}
            {isPaused && (
                <div className="flex items-center gap-4 border-t border-[#141414] px-5 py-4">
                    <span className="font-space-mono text-[14px] uppercase tracking-[2px] text-[#FF9900]">
                        {t('paused')}
                    </span>
                    {auction.timeRemaining != null && (
                        <span
                            className="font-space-mono text-[22px] tabular-nums tracking-[4px] text-[#FF9900]"
                            style={{ textShadow: '0 0 12px rgba(255,153,0,0.3)' }}
                        >
                            {formatMMS(auction.timeRemaining)}
                        </span>
                    )}
                </div>
            )}

            {/* Ended: winner info */}
            {isEnded && (
                <div className="flex items-center gap-4 border-t border-[#141414] px-5 py-4">
                    <Trophy size={16} className="text-[#FFD700]" />
                    <div className="flex flex-col gap-0.5">
                        <span className="font-space-mono text-[10px] uppercase tracking-[1px] text-[#4A4A4A]">
                            {t('winner')}
                        </span>
                        <span className="font-sora text-[16px] font-semibold text-white">
                            {auction.currentBidderName ?? '—'}
                        </span>
                    </div>
                </div>
            )}

            {/* Description (if present) */}
            {auction.description && (
                <div className="border-t border-[#141414] px-5 py-3">
                    <p className="font-sora text-sm leading-relaxed text-[#737373]">{auction.description}</p>
                </div>
            )}

            {/* Redemption instructions (visible on ended) */}
            {isEnded && auction.redemptionInstructions && (
                <div className="border-t border-[#141414] px-5 py-3">
                    <span className="font-space-mono text-[10px] uppercase tracking-[1px] text-[#4A4A4A]">
                        {t('redemptionInstructions')}
                    </span>
                    <p className="mt-1 font-sora text-sm text-[#A0A0A0]">{auction.redemptionInstructions}</p>
                </div>
            )}

            {/* Live controls */}
            {isWrite && (isPending || isActive || isPaused) && (
                <div className="flex flex-wrap gap-2 border-t border-[#141414] px-5 py-4">
                    {isPending && (
                        <button
                            onClick={() => onAction(auction.id, 'activate')}
                            className="flex cursor-pointer items-center gap-2 bg-[#2D00F7] px-4 py-2.5 font-space-mono text-[11px] uppercase tracking-[1px] text-white transition-all hover:bg-[#2400C5] hover:shadow-[0_0_24px_rgba(45,0,247,0.5)]"
                        >
                            <Play size={14} />
                            {t('activate')}
                        </button>
                    )}

                    {isActive && (
                        <>
                            <button
                                onClick={() => onAction(auction.id, 'pause')}
                                className="flex cursor-pointer items-center gap-2 border border-[#FF9900] bg-transparent px-4 py-2.5 font-space-mono text-[11px] uppercase tracking-[1px] text-[#FF9900] transition-all hover:bg-[#FF990010] hover:shadow-[0_0_12px_rgba(255,153,0,0.3)]"
                            >
                                <Pause size={14} />
                                {t('pause')}
                            </button>
                            <button
                                onClick={() => onAction(auction.id, 'end')}
                                className="flex cursor-pointer items-center gap-2 border border-[#FF3366] bg-transparent px-4 py-2.5 font-space-mono text-[11px] uppercase tracking-[1px] text-[#FF3366] transition-all hover:bg-[#FF336610] hover:shadow-[0_0_12px_rgba(255,51,102,0.3)]"
                            >
                                <Square size={14} />
                                {t('end')}
                            </button>
                        </>
                    )}

                    {isPaused && (
                        <button
                            onClick={() => onAction(auction.id, 'resume')}
                            className="flex cursor-pointer items-center gap-2 bg-[#2D00F7] px-4 py-2.5 font-space-mono text-[11px] uppercase tracking-[1px] text-white transition-all hover:bg-[#2400C5] hover:shadow-[0_0_24px_rgba(45,0,247,0.5)]"
                        >
                            <RotateCcw size={14} />
                            {t('resume')}
                        </button>
                    )}
                </div>
            )}
        </motion.div>
    );
}

// ── Main page ──
export default function AuctionsPage() {
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
            return data?.some((a) => a.status === 'active') ? 5_000 : false;
        },
    });

    // ── WebSocket for live updates ──
    const activeAuctionTopics = (auctions ?? [])
        .filter((a) => a.status === 'active')
        .map((a) => `auction:${a.id}`);

    const { lastMessage } = useWebSocket({
        topics: activeAuctionTopics,
        enabled: activeAuctionTopics.length > 0,
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
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
    });

    const pauseMutation = useMutation({
        mutationFn: (id: string) => auctionsApi.pause(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
            toast.success(t('pause'));
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
    });

    const resumeMutation = useMutation({
        mutationFn: (id: string) => auctionsApi.resume(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
            toast.success(t('resume'));
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
    });

    const endMutation = useMutation({
        mutationFn: (id: string) => auctionsApi.end(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
            toast.success(t('end'));
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
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

    return (
        <div className="flex flex-col gap-8 p-8">
            {/* ── Header ── */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                    <h1 className="font-sora text-4xl font-extrabold tracking-[-1px] text-white">
                        {t('title').toUpperCase()}
                    </h1>
                    {event && (
                        <p className="font-space-mono text-[12px] uppercase tracking-[1px] text-[#4A4A4A]">
                            {event.name} — {event.status.toUpperCase()}
                        </p>
                    )}
                </div>

                {canCreate && (
                    <button
                        onClick={() => { setEditingAuction(null); setShowForm(true); }}
                        className="flex cursor-pointer items-center gap-2 bg-[#2D00F7] px-5 py-3 font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all hover:bg-[#2400C5] hover:shadow-[0_0_24px_rgba(45,0,247,0.5)]"
                    >
                        <Plus size={16} />
                        {t('create')}
                    </button>
                )}
            </div>

            {/* ── Loading ── */}
            {isLoading && (
                <div className="flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-40 w-full rounded-none bg-[#1E1E1E]" />
                    ))}
                </div>
            )}

            {/* ── Empty ── */}
            {!isLoading && (!auctions || auctions.length === 0) && (
                <div className="flex flex-col items-center justify-center gap-6 border border-dashed border-[#2A2A2A] bg-[#121212] py-24 text-center">
                    <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden border border-[#2D00F7] bg-[#0A0A0A] shadow-[0_0_40px_rgba(45,0,247,0.2)]">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(45,0,247,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(45,0,247,0.1)_1px,transparent_1px)] bg-[size:4px_4px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)] opacity-50" />
                        <Gavel size={40} className="relative z-10 text-[#2D00F7]" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <p className="font-space-mono text-[16px] uppercase tracking-[2px] text-white">
                            {t('empty')}
                        </p>
                        <p className="font-sora text-[14px] text-[#A0A0A0]">
                            Crea la primera subasta para tus fans.
                        </p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => { setEditingAuction(null); setShowForm(true); }}
                            className="flex cursor-pointer items-center gap-2 bg-[#2D00F7] px-5 py-3 font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all hover:bg-[#2400C5] hover:shadow-[0_0_24px_rgba(45,0,247,0.5)]"
                        >
                            <Plus size={16} />
                            {t('create')}
                        </button>
                    )}
                </div>
            )}

            {/* ── Active section ── */}
            {active.length > 0 && (
                <section className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#00FF88]" />
                        <h2 className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#00FF88]">
                            {t('statusActive')} ({active.length})
                        </h2>
                    </div>
                    {active.map((a, idx) => (
                        <AuctionCard
                            key={a.id} auction={a} isWrite={isWrite} eventId={eventId}
                            onEdit={handleEdit} onDelete={handleDelete} onAction={handleAction}
                            onScheduledExpire={handleScheduledExpire}
                            index={idx}
                        />
                    ))}
                </section>
            )}

            {/* ── Paused section ── */}
            {paused.length > 0 && (
                <section className="flex flex-col gap-4">
                    <h2 className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#FF9900]">
                        {t('statusPaused')} ({paused.length})
                    </h2>
                    {paused.map((a, idx) => (
                        <AuctionCard
                            key={a.id} auction={a} isWrite={isWrite} eventId={eventId}
                            onEdit={handleEdit} onDelete={handleDelete} onAction={handleAction}
                            onScheduledExpire={handleScheduledExpire}
                            index={idx}
                        />
                    ))}
                </section>
            )}

            {/* ── Pending section ── */}
            {pending.length > 0 && (
                <section className="flex flex-col gap-4">
                    <h2 className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#737373]">
                        {t('statusPending')} ({pending.length})
                    </h2>
                    {pending.map((a, idx) => (
                        <AuctionCard
                            key={a.id} auction={a} isWrite={isWrite} eventId={eventId}
                            onEdit={handleEdit} onDelete={handleDelete} onAction={handleAction}
                            onScheduledExpire={handleScheduledExpire}
                            index={idx}
                        />
                    ))}
                </section>
            )}

            {/* ── Ended section ── */}
            {ended.length > 0 && (
                <section className="flex flex-col gap-4">
                    <h2 className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#7B61FF]">
                        {t('statusEnded')} ({ended.length})
                    </h2>
                    {ended.map((a, idx) => (
                        <AuctionCard
                            key={a.id} auction={a} isWrite={isWrite} eventId={eventId}
                            onEdit={handleEdit} onDelete={handleDelete} onAction={handleAction}
                            onScheduledExpire={handleScheduledExpire}
                            index={idx}
                        />
                    ))}
                </section>
            )}

            {/* ── Form dialog ── */}
            {showForm && (
                <AuctionFormDialog
                    eventId={eventId}
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
