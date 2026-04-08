'use client';

import { useParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle, Check, X as XIcon, Loader2, Pencil, Trash2, Timer, Zap, Award } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { eventsApi, badgeAwardingApi } from '@/lib/api-hooks';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import type { PreLiveStatsResponse } from '@/types/api';
import { useState, useEffect } from 'react';

const TABS = [
    { key: 'resumen', path: '', label: 'tabs.overview' },
    { key: 'oportunidades', path: '/experiences', label: 'tabs.experiences' },
    { key: 'subastas', path: '/auctions', label: 'tabs.auctions' },
    { key: 'insignias', path: '/badges', label: 'tabs.badges' },
    { key: 'ganadores', path: '/winners', label: 'tabs.winners' },
] as const;

export default function EventDetailLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations('events');
    const eventId = params.id as string;
    const { memberRole } = useAuth();
    const queryClient = useQueryClient();
    const isWriteRole = memberRole === 'owner' || memberRole === 'admin';

    const { data: event, isLoading, error } = useQuery({
        queryKey: ['events', eventId],
        queryFn: () => eventsApi.get(eventId),
    });

    const { mutate: updateStatus, isPending: isUpdatingStatus } = useMutation({
        mutationFn: (status: string) => eventsApi.updateStatus(eventId, status as 'published' | 'live' | 'ended'),
        onSuccess: (_data, status) => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            if (status === 'live') {
                toast.success(t('eventLive'));
                router.push(`/dashboard/events/${eventId}/live`);
            } else {
                toast.success(t('updated'));
            }
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Error';
            toast.error(message);
        },
    });

    const { mutate: deleteEvent, isPending: isDeleting } = useMutation({
        mutationFn: () => eventsApi.delete(eventId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            toast.success(t('deleted'));
            router.push('/dashboard/events');
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Error';
            toast.error(message);
        },
    });

    const { mutate: retryBadges, isPending: isRetrying } = useMutation({
        mutationFn: () => badgeAwardingApi.awardBadges(eventId),
        onSuccess: (result) => {
            toast.success(
                `${result.badgesCreated} insignias otorgadas a ${result.fansNotified} fans`,
            );
        },
        onError: (err: unknown) => {
            toast.error(err instanceof Error ? err.message : 'Error al otorgar insignias');
        },
    });

    // Determine active tab from pathname
    const activeTab = TABS.find((tab) => {
        if (tab.path === '') {
            return pathname === `/dashboard/events/${eventId}`;
        }
        return pathname.endsWith(tab.path);
    })?.key || 'resumen';

    const handleTabChange = (value: string) => {
        const tab = TABS.find((t) => t.key === value);
        if (tab) {
            const path = tab.path
                ? `/dashboard/events/${eventId}${tab.path}`
                : `/dashboard/events/${eventId}`;
            router.push(path);
        }
    };

    // ── Loading ──
    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-14">
                <Skeleton className="h-4 w-24 rounded-none bg-[#1E1E1E]" />
                <Skeleton className="h-12 w-96 rounded-none bg-[#1E1E1E]" />
                <Skeleton className="h-10 w-full rounded-none bg-[#1E1E1E]" />
                <Skeleton className="h-64 w-full rounded-none bg-[#1E1E1E]" />
            </div>
        );
    }

    // ── Error ──
    if (error || !event) {
        return (
            <div className="flex flex-col gap-6 p-14">
                <button
                    onClick={() => router.push('/dashboard/events')}
                    className="flex cursor-pointer items-center gap-2 self-start font-space-mono text-xs uppercase tracking-[1px] text-[#737373] transition-colors duration-150 hover:text-white"
                >
                    <ArrowLeft size={14} />
                    {t('backToEvents')}
                </button>
                <div className="flex flex-col items-center justify-center gap-4 rounded-none border border-[#1E1E1E] bg-[#141414] p-8">
                    <AlertCircle size={32} className="text-[#FF3366]" />
                    <p className="font-sora text-base text-[#A0A0A0]">
                        {(error as Error)?.message || 'Event not found'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-14">
            {/* ── Back ── */}
            <button
                onClick={() => router.push('/dashboard/events')}
                className="flex cursor-pointer items-center gap-2 self-start font-space-mono text-xs uppercase tracking-[1px] text-[#737373] transition-colors duration-150 hover:text-white"
            >
                <ArrowLeft size={14} />
                {t('backToEvents')}
            </button>

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="font-sora text-[50px] font-bold leading-none tracking-[-1px] text-white">
                        {event.name}
                    </h1>
                    <StatusBadge status={event.status} />
                </div>

                {/* ── Action Buttons ── */}
                {isWriteRole && (
                    <div className="flex shrink-0 items-center gap-3">
                        {/* Edit — only for draft or published */}
                        {(event.status === 'draft' || event.status === 'published') && (
                            <button
                                onClick={() => router.push(`/dashboard/events/edit/${eventId}`)}
                                className="flex cursor-pointer items-center gap-2 rounded-none border border-[#2A2A2A] bg-transparent px-6 py-3.5 font-space-mono text-[15px] uppercase tracking-[1px] text-[#A0A0A0] transition-all duration-150 hover:border-[#2D00F7] hover:text-white hover:shadow-[0_0_20px_rgba(45,0,247,0.3)]"
                            >
                                <Pencil size={15} />
                                {t('editEvent')}
                            </button>
                        )}

                        {/* Delete — draft only */}
                        {event.status === 'draft' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button
                                        disabled={isDeleting}
                                        className="flex cursor-pointer items-center gap-2 rounded-none border border-[#2A2A2A] bg-transparent px-6 py-3.5 font-space-mono text-[15px] uppercase tracking-[1px] text-[#FF3366] transition-all duration-150 hover:border-[#FF3366] hover:shadow-[0_0_20px_rgba(255,51,102,0.3)] disabled:opacity-50"
                                    >
                                        <Trash2 size={15} />
                                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : t('deleteEvent')}
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-none border border-[var(--color-tactical-acid)] bg-[#121212] shadow-[0_0_20px_rgba(204,255,0,0.15)]">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="font-sora text-xl text-white">{t('deleteEvent')}</AlertDialogTitle>
                                        <AlertDialogDescription className="font-space-mono text-sm text-[#A0A0A0]">
                                            {t('confirmDelete')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-none border-[#2A2A2A] bg-transparent font-space-mono text-sm uppercase tracking-[1px] text-white hover:bg-[#1A1A1A] hover:text-white">
                                            Cancelar
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => deleteEvent()}
                                            className="rounded-none bg-[#FF3366] font-space-mono text-sm uppercase tracking-[1px] text-white hover:bg-[#CC2952]"
                                        >
                                            {t('deleteEvent')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}

                        {/* Status transitions */}
                        {event.status === 'draft' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button
                                        disabled={isUpdatingStatus}
                                        className="flex cursor-pointer items-center gap-2 rounded-none bg-[#2D00F7] px-7 py-3.5 font-space-mono text-[15px] uppercase tracking-[1px] text-white transition-all duration-200 hover:bg-[#2400C5] hover:shadow-[0_0_30px_rgba(45,0,247,0.6)] disabled:opacity-50"
                                    >
                                        {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                                        {t('publish')}
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-none border border-[var(--color-tactical-acid)] bg-[#121212] shadow-[0_0_20px_rgba(204,255,0,0.15)]">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="font-sora text-xl text-white">{t('publish')}</AlertDialogTitle>
                                        <AlertDialogDescription className="font-space-mono text-sm text-[#A0A0A0]">
                                            {t('confirmPublish')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-none border-[#2A2A2A] bg-transparent font-space-mono text-sm uppercase tracking-[1px] text-white hover:bg-[#1A1A1A] hover:text-white">
                                            Cancelar
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => updateStatus('published')}
                                            className="rounded-none bg-[#2D00F7] font-space-mono text-sm uppercase tracking-[1px] text-white hover:bg-[#2400C5]"
                                        >
                                            {t('publish')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}

                        {event.status === 'published' && (
                            <GoLiveButton eventId={eventId} t={t} isUpdatingStatus={isUpdatingStatus} updateStatus={updateStatus} />
                        )}

                        {event.status === 'live' && (
                            <EndEventDialog
                                eventName={event.name}
                                isUpdatingStatus={isUpdatingStatus}
                                updateStatus={updateStatus}
                                t={t}
                            />
                        )}

                        {event.status === 'ended' && (
                            <button
                                onClick={() => retryBadges()}
                                disabled={isRetrying}
                                className="flex cursor-pointer items-center gap-2 rounded-none border border-[#2A2A2A] bg-transparent px-6 py-3.5 font-space-mono text-[15px] uppercase tracking-[1px] text-[#A0A0A0] transition-all duration-150 hover:border-[#2D00F7] hover:text-white hover:shadow-[0_0_20px_rgba(45,0,247,0.3)] disabled:opacity-50"
                            >
                                {isRetrying ? <Loader2 size={14} className="animate-spin" /> : <Award size={15} />}
                                {t('retryBadges')}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Fandi Countdown ── */}
            {event.fandiOpensAt && (event.status === 'published' || event.status === 'draft') && (
                <FandiCountdown fandiOpensAt={event.fandiOpensAt} />
            )}

            {/* ── Tabs ── */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="w-full justify-start gap-0 rounded-none border-b border-[#1E1E1E] bg-transparent">
                    {TABS.map((tab) => (
                        <TabsTrigger
                            key={tab.key}
                            value={tab.key}
                            className="cursor-pointer rounded-none border-b-2 border-transparent px-5 py-3 font-space-mono text-sm uppercase tracking-[1px] text-[#737373] hover:text-[#A0A0A0] data-[state=active]:border-[#2D00F7] data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-[0_2px_12px_rgba(45,0,247,0.3)]"
                        >
                            {t(tab.label)}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* ── Children (nested route content) ── */}
            <div>{children}</div>
        </div>
    );
}

// ── Go Live Button with Pre-live Checklist Dialog ──

function GoLiveButton({
    eventId,
    t,
    isUpdatingStatus,
    updateStatus,
}: {
    eventId: string;
    t: ReturnType<typeof useTranslations>;
    isUpdatingStatus: boolean;
    updateStatus: (status: string) => void;
}) {
    const [stats, setStats] = useState<PreLiveStatsResponse | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    const handleOpen = async () => {
        setLoadingStats(true);
        try {
            const data = await eventsApi.getPreLiveStats(eventId);
            setStats(data);
        } catch {
            toast.error('Error loading checklist');
        } finally {
            setLoadingStats(false);
        }
    };

    const allPassed = stats ? stats.experienceCount > 0 && stats.experiencesReady && stats.isPublished : false;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    onClick={handleOpen}
                    disabled={isUpdatingStatus}
                    className="btn-tactical flex cursor-pointer items-center gap-2 rounded-none bg-[var(--color-tactical-magenta)] px-7 py-3.5 font-space-mono text-[15px] uppercase tracking-[1px] text-white transition-all duration-200 hover:shadow-[0_0_30px_rgba(255,0,85,0.8)] disabled:opacity-50"
                >
                    {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                    {t('goLive')}
                </button>
            </DialogTrigger>
            <DialogContent className="rounded-none border border-[var(--color-tactical-acid)] bg-[#121212] shadow-[0_0_20px_rgba(204,255,0,0.15)]">
                <DialogHeader>
                    <DialogTitle className="font-sora text-xl text-white">
                        {t('preLiveChecklist')}
                    </DialogTitle>
                </DialogHeader>

                {loadingStats ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-[var(--color-tactical-magenta)]" />
                    </div>
                ) : stats ? (
                    <div className="scanlines relative flex flex-col gap-4">
                        <ChecklistItem
                            label={`${t('checkExperiences')} (${stats.experienceCount})`}
                            passed={stats.experienceCount > 0 && stats.experiencesReady}
                        />
                        <ChecklistItem
                            label={t('checkPublished')}
                            passed={stats.isPublished}
                        />
                        <ChecklistItem
                            label={t('checkAuctions')}
                            passed={stats.auctionCount > 0}
                            optional
                        />
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                onClick={() => updateStatus('live')}
                                disabled={!allPassed || isUpdatingStatus}
                                className="btn-tactical flex cursor-pointer items-center gap-2 rounded-none bg-[var(--color-tactical-magenta)] px-7 py-3.5 font-space-mono text-[15px] uppercase tracking-[1px] text-white transition-all duration-200 hover:shadow-[0_0_30px_rgba(255,0,85,0.8)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                                {t('goLive')}
                            </button>
                        </div>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

// ── End Event Dialog with type-to-confirm ──

function EndEventDialog({
    eventName,
    isUpdatingStatus,
    updateStatus,
    t,
}: {
    eventName: string;
    isUpdatingStatus: boolean;
    updateStatus: (status: string) => void;
    t: ReturnType<typeof useTranslations>;
}) {
    const [confirmName, setConfirmName] = useState('');
    const [open, setOpen] = useState(false);

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) setConfirmName('');
    };

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogTrigger asChild>
                <button
                    disabled={isUpdatingStatus}
                    className="flex cursor-pointer items-center gap-2 rounded-none bg-[#FF3366] px-7 py-3.5 font-space-mono text-[15px] uppercase tracking-[1px] text-white transition-all duration-200 hover:bg-[#CC2952] hover:shadow-[0_0_30px_rgba(255,51,102,0.4)] disabled:opacity-50"
                >
                    {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                    {t('endEvent')}
                </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-none border border-[var(--color-tactical-magenta)] bg-[#121212] shadow-[0_0_20px_rgba(255,0,85,0.2)]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-sora text-xl text-white">{t('endEvent')}</AlertDialogTitle>
                    <AlertDialogDescription className="font-space-mono text-sm text-[#A0A0A0]">
                        {t('confirmEnd')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-col gap-2">
                    <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                        {t('typeToConfirm')}
                    </label>
                    <input
                        type="text"
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        placeholder={`Escribe "${eventName}" para confirmar`}
                        className="h-12 w-full rounded-none border border-[#1A1A1A] bg-[#0A0A0A] px-4 font-space-mono text-sm text-white placeholder:text-[#4A4A4A] focus:border-[var(--color-tactical-magenta)] focus:outline-none focus:ring-0"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-none border-[#2A2A2A] bg-transparent font-space-mono text-sm uppercase tracking-[1px] text-white hover:bg-[#1A1A1A] hover:text-white">
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => updateStatus('ended')}
                        disabled={confirmName !== eventName}
                        className="rounded-none bg-[#FF3366] font-space-mono text-sm uppercase tracking-[1px] text-white hover:bg-[#CC2952] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {t('endEvent')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function ChecklistItem({ label, passed, optional }: { label: string; passed: boolean; optional?: boolean }) {
    return (
        <div className="flex items-center gap-3 rounded-none border border-[#1E1E1E] bg-[#141414] px-4 py-3">
            {passed ? (
                <Check size={16} className="text-[#22C55E]" />
            ) : optional ? (
                <div className="flex h-4 w-4 items-center justify-center rounded-full border border-[#4A4A4A]" />
            ) : (
                <XIcon size={16} className="text-[#FF3366]" />
            )}
            <span className={`font-space-mono text-sm ${passed ? 'text-white' : optional ? 'text-[#4A4A4A]' : 'text-[#737373]'}`}>
                {label}
                {optional && !passed && (
                    <span className="ml-2 text-[11px] text-[#4A4A4A]">(opcional)</span>
                )}
            </span>
        </div>
    );
}

// ── Fandi Countdown Timer ──

function FandiCountdown({ fandiOpensAt }: { fandiOpensAt: string | Date }) {
    const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
    const [isPast, setIsPast] = useState(false);

    useEffect(() => {
        const target = new Date(fandiOpensAt).getTime();

        const tick = () => {
            const now = Date.now();
            const diff = target - now;

            if (diff <= 0) {
                setIsPast(true);
                setTimeLeft(null);
                return;
            }

            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / (1000 * 60)) % 60);
            const s = Math.floor((diff / 1000) % 60);
            setTimeLeft({ d, h, m, s });
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [fandiOpensAt]);

    if (isPast) {
        return (
            <div className="flex items-center gap-3 border border-[#2D00F7] bg-[#2D00F710] px-5 py-3">
                <Zap size={16} className="text-[#2D00F7]" />
                <span className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#2D00F7]">
                    Dinámicas Fandi listas para activar
                </span>
            </div>
        );
    }

    if (!timeLeft) return null;

    const units = [
        { label: 'D', value: timeLeft.d },
        { label: 'H', value: timeLeft.h },
        { label: 'M', value: timeLeft.m },
        { label: 'S', value: timeLeft.s },
    ];

    return (
        <div className="flex items-center gap-4 border border-[#1E1E1E] bg-[#0A0A0A] px-5 py-3">
            <div className="flex items-center gap-2">
                <Timer size={16} className="text-[#2D00F7]" />
                <span className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                    Fandi abre en
                </span>
            </div>
            <div className="flex items-center gap-1">
                {units.map((u) => (
                    <div key={u.label} className="flex items-baseline gap-0.5">
                        <span className="min-w-[28px] text-center font-sora text-[22px] font-bold tabular-nums text-white">
                            {String(u.value).padStart(2, '0')}
                        </span>
                        <span className="font-space-mono text-[9px] text-[#4A4A4A]">{u.label}</span>
                        {u.label !== 'S' && (
                            <span className="mx-0.5 font-sora text-[18px] font-light text-[#2A2A2A]">:</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
