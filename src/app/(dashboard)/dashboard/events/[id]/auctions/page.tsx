'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Plus, Loader2, Pencil, Trash2, Info,
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
    const canSubmit =
        Boolean(name.trim()) &&
        startingPrice >= 10000 &&
        durationMinutes >= 1 &&
        isFandiAligned(startingPrice) &&
        !isPending;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

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
                                    className="h-12 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-lg text-white focus:border-[#2D00F7] focus:ring-0"
                                />
                                <div className="flex items-center justify-between">
                                    <p className="font-space-mono text-[10px] text-[#4A4A4A]">{t('minPrice')}</p>
                                    {startingPrice >= 10000 && isFandiAligned(startingPrice) && (
                                        <p className="font-space-mono text-[10px] text-[#00FF88]">
                                            = {formatFandis(startingPrice)} Fandis
                                        </p>
                                    )}
                                    {startingPrice >= 10000 && !isFandiAligned(startingPrice) && (
                                        <p className="font-space-mono text-[10px] text-[#FF9900]">
                                            Debe ser múltiplo de {FANDI_RATE.toLocaleString('es-CO')}
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
                                type={canSubmit ? 'submit' : 'button'}
                                disabled={!canSubmit}
                                aria-disabled={!canSubmit}
                                onClick={(e) => {
                                    if (!canSubmit) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }
                                }}
                                className="flex flex-1 items-center justify-center gap-2 bg-[#2D00F7] px-6 py-3 font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all hover:bg-[#2400C5] hover:shadow-[0_0_24px_rgba(45,0,247,0.5)] enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#2D00F7] disabled:hover:shadow-none"
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

    // Accent colors for dynamic styling
    const getThemeColors = () => {
        if (isActive) return { border: 'border-[#00FF88]/40 hover:border-[#00FF88]/80', glow: 'shadow-[0_0_20px_rgba(0,255,136,0.1)]', heroText: 'text-[#00FF88]', heroShadow: 'drop-shadow-[0_0_15px_rgba(0,255,136,0.6)]' };
        if (isPaused) return { border: 'border-[#FF9900]/40 hover:border-[#FF9900]/80', glow: 'shadow-[0_0_20px_rgba(255,153,0,0.1)]', heroText: 'text-[#FFFFFF]', heroShadow: 'none' };
        if (isEnded || isCancelled) return { border: 'border-[#2D00F7]/40 hover:border-[#2D00F7]/80', glow: 'shadow-[0_0_20px_rgba(45,0,247,0.1)]', heroText: 'text-[#FFFFFF]', heroShadow: 'none' };
        return { border: 'border-[#1E1E1E] hover:border-[#2A2A2A]', glow: 'shadow-lg', heroText: 'text-[#FFFFFF]', heroShadow: 'none' };
    };

    const theme = getThemeColors();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index ?? 0) * 0.08, duration: 0.3 }}
            className={`group relative flex h-full flex-col bg-[#0A0A0A] transition-all duration-300 border ${theme.border} ${theme.glow}`}
        >
            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-3">
                <div className="flex flex-col items-start gap-3 w-3/4">
                    <AuctionStatusBadge status={auction.status} />
                    <h3 className="line-clamp-2 font-sora text-lg font-bold leading-tight text-white">{auction.name}</h3>
                </div>
                {/* Actions Top Right */}
                <div className="flex shrink-0 items-center gap-1.5 opacity-60 transition-opacity group-hover:opacity-100">
                    {isWrite && isPending && (
                        <>
                            <button
                                onClick={() => onEdit(auction)}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center border border-[#2A2A2A] bg-[#141414] text-[#A0A0A0] transition-colors hover:border-[#2D00F7] hover:text-white"
                            >
                                <Pencil size={13} />
                            </button>
                            <button
                                onClick={() => onDelete(auction)}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center border border-[#2A2A2A] bg-[#141414] text-[#FF3366] transition-colors hover:border-[#FF3366] hover:bg-[#FF3366]/10"
                            >
                                <Trash2 size={13} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Description */}
            {auction.description && (
                <div className="px-5 pb-4">
                     <p className="line-clamp-2 font-sora text-xs leading-relaxed text-[#737373]">{auction.description}</p>
                </div>
            )}

            {/* HERO STAT (The visual center of the widget) */}
            <div className="flex flex-col items-center justify-center border-y border-[#141414] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)] py-8 text-center">
                <span className="mb-2 font-space-mono text-[10px] uppercase tracking-[2px] text-[#737373]">
                    {priceLabel}
                </span>
                <span
                    className={`font-sora text-4xl font-extrabold tabular-nums tracking-tighter ${theme.heroText} ${theme.heroShadow}`}
                >
                    {formatCOP(displayPrice)}
                </span>
                <span className="mt-2 font-space-mono text-[11px] text-[#4A4A4A]">
                    = {formatFandis(displayPrice)} Fandis
                </span>
            </div>

            {/* Middle Stats Grid */}
            <div className="grid grid-cols-2 gap-px border-b border-[#141414] bg-[#1E1E1E]">
                <div className="flex flex-col gap-1.5 bg-[#0A0A0A] p-5">
                    <span className="font-space-mono text-[10px] uppercase tracking-[1px] text-[#4A4A4A]">
                        {t('bids', { count: '' })}
                    </span>
                    <div className="flex items-center gap-2">
                        <Gavel size={14} className="text-[#A0A0A0]" />
                        <span className="font-space-mono text-base font-semibold text-white">
                            {auction.bidCount}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col gap-1.5 bg-[#0A0A0A] p-5">
                     <span className="font-space-mono text-[10px] uppercase tracking-[1px] text-[#4A4A4A]">
                        {t('form.durationMinutes')}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="font-space-mono text-base text-white">
                            {auction.durationMinutes} m
                        </span>
                        <SoftCloseInfo
                            softCloseSeconds={auction.softCloseSeconds}
                            extensionSeconds={auction.extensionSeconds}
                        />
                    </div>
                </div>
            </div>

            {/* Dynamic Footer Area (Pushes to bottom) */}
            <div className="mt-auto flex flex-col">
                {/* Pending */}
                {isPending && (
                    <div className="flex items-center justify-center bg-[#121212]/50 px-5 py-5">
                        {auction.scheduledStart ? (
                            <ScheduledStartCountdown
                                scheduledStart={auction.scheduledStart}
                                onExpire={onScheduledExpire}
                            />
                        ) : (
                            <span className="font-space-mono text-[11px] uppercase tracking-[1px] text-[#4A4A4A]">
                                {t('manualStartLabel')}
                            </span>
                        )}
                    </div>
                )}
                
                {/* Paused */}
                {isPaused && (
                    <div className="flex items-center justify-between bg-[#121212]/50 px-5 py-5">
                        <span className="flex items-center gap-2 font-space-mono text-[12px] uppercase tracking-[1px] text-[#FF9900]">
                            <Pause size={14} /> {t('paused')}
                        </span>
                        {auction.timeRemaining != null && (
                            <span
                                className="font-space-mono text-xl tabular-nums tracking-[2px] text-[#FF9900]"
                                style={{ textShadow: '0 0 12px rgba(255,153,0,0.3)' }}
                            >
                                {formatMMS(auction.timeRemaining)}
                            </span>
                        )}
                    </div>
                )}

                {/* Active */}
                {isActive && auction.endsAt && (
                    <div className="flex justify-center bg-[#00FF88]/5 px-5 py-5">
                         <CountdownTimer endsAt={auction.endsAt} />
                    </div>
                )}

                {/* Ended Winner info */}
                {(isEnded || isCancelled) && (
                    <div className="flex flex-col gap-3 bg-[#121212]/50 px-5 py-5">
                        <div className="flex items-center gap-3">
                            <Trophy size={16} className={isCancelled ? "text-[#FF3366]" : "text-[#FFD700]"} />
                            <div className="flex flex-col">
                                <span className="font-space-mono text-[10px] uppercase tracking-[1px] text-[#4A4A4A]">
                                    {t('winner')}
                                </span>
                                <span className="font-sora text-base font-semibold text-white">
                                    {auction.currentBidderName ?? '—'}
                                </span>
                            </div>
                        </div>
                        {auction.redemptionInstructions && (
                            <div className="mt-1 flex flex-col gap-1">
                                <span className="font-space-mono text-[10px] uppercase tracking-[1px] text-[#4A4A4A]">REDEMPTION INSTRUCTIONS</span>
                                <p className="text-xs leading-relaxed text-[#A0A0A0]">
                                    {auction.redemptionInstructions}
                                </p>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Actions Bar (Write Access Only) */}
                {isWrite && (isPending || isActive || isPaused) && (
                    <div className="flex w-full overflow-hidden border-t border-[#1E1E1E]">
                        {isPending && (
                            <button
                                onClick={() => onAction(auction.id, 'activate')}
                                className="flex flex-1 cursor-pointer items-center justify-center gap-2 bg-[#2D00F7] px-4 py-3.5 font-space-mono text-[11px] uppercase tracking-[2px] text-white transition-all hover:bg-[#2400C5] hover:shadow-[0_0_24px_rgba(45,0,247,0.5)]"
                            >
                                <Play size={14} />
                                {t('activate')}
                            </button>
                        )}

                        {isActive && (
                            <>
                                <button
                                    onClick={() => onAction(auction.id, 'pause')}
                                    className="group/btn flex flex-1 cursor-pointer items-center justify-center gap-2 bg-[#1A1A1A] px-4 py-3.5 font-space-mono text-[11px] uppercase tracking-[1px] text-[#FF9900] transition-colors hover:bg-[#FF9900]/10"
                                >
                                    <Pause size={14} className="transition-transform group-hover/btn:scale-110" />
                                    {t('pause')}
                                </button>
                                <button
                                    onClick={() => onAction(auction.id, 'end')}
                                    className="group/btn flex flex-1 cursor-pointer items-center justify-center gap-2 bg-[#1A1A1A] border-l border-[#1E1E1E] px-4 py-3.5 font-space-mono text-[11px] uppercase tracking-[1px] text-[#FF3366] transition-colors hover:bg-[#FF3366]/10"
                                >
                                    <Square size={14} className="transition-transform group-hover/btn:scale-110" />
                                    {t('end')}
                                </button>
                            </>
                        )}

                        {isPaused && (
                            <button
                                onClick={() => onAction(auction.id, 'resume')}
                                className="flex flex-1 cursor-pointer items-center justify-center gap-2 bg-[#2D00F7] px-4 py-3.5 font-space-mono text-[11px] uppercase tracking-[2px] text-white transition-all hover:bg-[#2400C5] hover:shadow-[0_0_24px_rgba(45,0,247,0.5)]"
                            >
                                <RotateCcw size={14} />
                                {t('resume')}
                            </button>
                        )}
                    </div>
                )}
            </div>
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
                <section className="flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#00FF88] shadow-[0_0_12px_rgba(0,255,136,0.8)]" />
                        <h2 className="font-space-mono text-[14px] uppercase tracking-[2px] text-[#00FF88]">
                            {t('statusActive')} ({active.length})
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {active.map((a, idx) => (
                            <AuctionCard
                                key={a.id} auction={a} isWrite={isWrite}
                                onEdit={handleEdit} onDelete={handleDelete} onAction={handleAction}
                                onScheduledExpire={handleScheduledExpire}
                                index={idx}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Paused section ── */}
            {paused.length > 0 && (
                <section className="flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#FF9900]" />
                        <h2 className="font-space-mono text-[14px] uppercase tracking-[2px] text-[#FF9900]">
                            {t('statusPaused')} ({paused.length})
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {paused.map((a, idx) => (
                            <AuctionCard
                                key={a.id} auction={a} isWrite={isWrite}
                                onEdit={handleEdit} onDelete={handleDelete} onAction={handleAction}
                                onScheduledExpire={handleScheduledExpire}
                                index={idx}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Pending section ── */}
            {pending.length > 0 && (
                <section className="flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                         <span className="h-2.5 w-2.5 rounded-full border-2 border-[#737373] bg-transparent" />
                        <h2 className="font-space-mono text-[14px] uppercase tracking-[2px] text-[#737373]">
                            {t('statusPending')} ({pending.length})
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {pending.map((a, idx) => (
                            <AuctionCard
                                key={a.id} auction={a} isWrite={isWrite}
                                onEdit={handleEdit} onDelete={handleDelete} onAction={handleAction}
                                onScheduledExpire={handleScheduledExpire}
                                index={idx}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Ended section ── */}
            {ended.length > 0 && (
                <section className="flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <Square size={12} fill="currentColor" className="text-[#2D00F7]" />
                        <h2 className="font-space-mono text-[14px] uppercase tracking-[2px] text-[#7B61FF]">
                            {t('statusEnded')} ({ended.length})
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {ended.map((a, idx) => (
                            <AuctionCard
                                key={a.id} auction={a} isWrite={isWrite}
                                onEdit={handleEdit} onDelete={handleDelete} onAction={handleAction}
                                onScheduledExpire={handleScheduledExpire}
                                index={idx}
                            />
                        ))}
                    </div>
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
