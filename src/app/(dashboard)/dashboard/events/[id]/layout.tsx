'use client';

import { useParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle, Check, X as XIcon, Loader2, Pencil, Trash2, Timer, Zap, Award } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { eventsApi, badgeAwardingApi } from '@/lib/api-hooks';
import { ApiError } from '@/lib/api';
import { eventDateViolations, isoToDatetimeLocal } from '@/lib/event-datetime';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

type TabDef = {
    key: string;
    path: string;
    label: string;
    /**
     * Hidden from viewer/staff. Reserved for surfaces that fire
     * broadcast/write actions (notifications today) — read-only
     * analytics is intentionally NOT gated here so viewers can
     * still consume post-event numbers.
     */
    writeOnly?: boolean;
};

const TABS: readonly TabDef[] = [
    { key: 'resumen', path: '', label: 'tabs.overview' },
    { key: 'oportunidades', path: '/experiences', label: 'tabs.experiences' },
    { key: 'impactos', path: '/impactos', label: 'tabs.impactos' },
    { key: 'subastas', path: '/auctions', label: 'tabs.auctions' },
    { key: 'insignias', path: '/badges', label: 'tabs.badges' },
    { key: 'ganadores', path: '/winners', label: 'tabs.winners' },
    {
        key: 'analitica',
        path: '/analytics',
        label: 'tabs.analytics',
        // Visible to ALL roles. The analytics page is read-only —
        // viewers consume post-event numbers, staff may need it
        // on event day. Do NOT add a redirect on the page itself.
    },
    {
        key: 'notificaciones',
        path: '/notifications',
        label: 'tabs.notifications',
        writeOnly: true,
    },
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
            // Surface the typed date/publish-gate codes as localized copy.
            const DATE_CODES = [
                'EVENT_END_REQUIRED',
                'EVENT_END_BEFORE_START',
                'FANDI_OPENS_BEFORE_EVENT',
                'FANDI_CLOSES_AFTER_EVENT',
                'FANDI_WINDOW_INVALID',
            ];
            if (err instanceof ApiError && DATE_CODES.includes(err.code)) {
                toast.error(t(`validation.${err.code}`));
                return;
            }
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

    // Filter tabs by role. Write-only tabs (Analytics,
    // Notifications) disappear from the strip for viewer/staff so
    // they can't even see they exist.
    const visibleTabs = TABS.filter((tab) => !tab.writeOnly || isWriteRole);

    // Determine active tab from pathname
    const activeTab = visibleTabs.find((tab) => {
        if (tab.path === '') {
            return pathname === `/dashboard/events/${eventId}`;
        }
        return pathname.endsWith(tab.path);
    })?.key || 'resumen';

    const handleTabChange = (value: string) => {
        const tab = visibleTabs.find((t) => t.key === value);
        if (tab) {
            const path = tab.path
                ? `/dashboard/events/${eventId}${tab.path}`
                : `/dashboard/events/${eventId}`;
            router.push(path);
        }
    };

    // ── Sala en vivo ──
    // The live route renders its own full-width ink control-room bar
    // (event name, clock, countdown, Salir), so the per-event header,
    // section tabs and EndsInCountdown are not rendered there.
    if (pathname.endsWith('/live')) {
        return <>{children}</>;
    }

    // ── Loading ──
    if (isLoading) {
        return (
            <div className="flex flex-col gap-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-96 max-w-full" />
                <Skeleton className="h-11 w-[560px] max-w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    // ── Error ──
    if (error || !event) {
        return (
            <div className="flex flex-col gap-5">
                <BackToEvents
                    label={t('backToEvents')}
                    onClick={() => router.push('/dashboard/events')}
                />
                <div className="block-ink flex flex-col items-center justify-center gap-4 p-8">
                    <AlertCircle size={32} className="text-alert" />
                    <p className="text-base font-semibold text-muted-ink">
                        {(error as Error)?.message || 'Event not found'}
                    </p>
                </div>
            </div>
        );
    }

    // Publish gate (Step 6.1): city + end date present + all date invariants
    // hold. Mirrors the backend so the button reflects what the API enforces.
    const dateViolations = eventDateViolations({
        eventDate: isoToDatetimeLocal(event.eventDate),
        eventEndDate: isoToDatetimeLocal(event.eventEndDate),
        fandiOpensAt: isoToDatetimeLocal(event.fandiOpensAt),
        fandiClosesAt: isoToDatetimeLocal(event.fandiClosesAt),
    });
    const publishBlockReason: string | null = !event.cityId
        ? t('form.cityRequired')
        : !event.eventEndDate
          ? t('validation.EVENT_END_REQUIRED')
          : dateViolations.length > 0
            ? t(`validation.${dateViolations[0]}`)
            : null;
    const canPublish = publishBlockReason === null;

    // Mono meta line under the title: date · time · venue, city.
    const place = event.venue
        ? event.city
            ? `${event.venue}, ${event.city}`
            : event.venue
        : event.city;
    const metaLine = [formatMetaDate(event.eventDate), place]
        .filter(Boolean)
        .join(' · ');

    return (
        <div className="flex flex-col gap-5">
            {/* ── Back ── */}
            <BackToEvents
                label={t('backToEvents')}
                onClick={() => router.push('/dashboard/events')}
            />

            {/* ── Header ── */}
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <div className="flex min-w-0 flex-col gap-2.5">
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
                        <h1 className="font-hero min-w-0 break-words text-[36px] text-white lg:text-[44px]">
                            {event.name}
                        </h1>
                        <StatusBadge status={event.status} />
                        {event.status === 'live' && event.fandiClosesAt && (
                            <EndsInCountdown
                                target={event.fandiClosesAt}
                                label={t('endsIn')}
                            />
                        )}
                    </div>
                    {metaLine && (
                        <p className="font-space-mono text-[11px] uppercase tracking-[0.14em] text-lilac">{metaLine}</p>
                    )}
                </div>

                {/* ── Action Buttons ── */}
                {isWriteRole && (
                    <div className="flex shrink-0 flex-wrap items-start gap-3">
                        {/* Edit — only for draft or published */}
                        {(event.status === 'draft' || event.status === 'published') && (
                            <Button
                                variant="secondary"
                                onClick={() => router.push(`/dashboard/events/edit/${eventId}`)}
                            >
                                <Pencil size={15} />
                                {t('editEvent')}
                            </Button>
                        )}

                        {/* Delete — draft only */}
                        {event.status === 'draft' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={isDeleting}>
                                        <Trash2 size={15} />
                                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : t('deleteEvent')}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="surface-white">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="font-display text-[22px]">{t('deleteEvent')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('confirmDelete')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>
                                            Cancelar
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            variant="destructive"
                                            onClick={() => deleteEvent()}
                                        >
                                            {t('deleteEvent')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}

                        {/* Status transitions */}
                        {event.status === 'draft' && (
                            <div className="flex flex-col items-end gap-2">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button disabled={isUpdatingStatus || !canPublish}>
                                            {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                                            {t('publish')}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="surface-white">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="font-display text-[22px]">{t('publish')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {t('confirmPublish')}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                Cancelar
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => updateStatus('published')}
                                                disabled={!canPublish}
                                            >
                                                {t('publish')}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                {!canPublish && publishBlockReason && (
                                    <span className="max-w-64 rounded-[10px] bg-ink px-3 py-1.5 text-right font-space-mono text-[11px] text-alert">
                                        {publishBlockReason}
                                    </span>
                                )}
                            </div>
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
                            <Button
                                variant="secondary"
                                onClick={() => retryBadges()}
                                disabled={isRetrying}
                            >
                                {isRetrying ? <Loader2 size={14} className="animate-spin" /> : <Award size={15} />}
                                {t('retryBadges')}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Fandi Countdown ── */}
            {event.fandiOpensAt && (event.status === 'published' || event.status === 'draft') && (
                <FandiCountdown fandiOpensAt={event.fandiOpensAt} />
            )}

            {/* ── Tabs (ink segmented bar, §7) ── */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="max-w-full justify-start overflow-x-auto">
                    {visibleTabs.map((tab) => (
                        <TabsTrigger
                            key={tab.key}
                            value={tab.key}
                            className="flex-none cursor-pointer px-3.5"
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

// ── Header helpers ──

function BackToEvents({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex cursor-pointer items-center gap-1.5 self-start font-space-mono text-[11px] uppercase tracking-[0.14em] text-lilac transition-colors duration-150 hover:text-white"
        >
            <ArrowLeft size={13} />
            {label}
        </button>
    );
}

/** "sáb 26 sep 2026 · 21:00" (rendered uppercase by the meta line). */
function formatMetaDate(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const date = new Intl.DateTimeFormat('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
        .format(d)
        .replace(/\./g, '')
        .replace(/,/g, '')
        .replace(/ de /g, ' ');
    const time = d.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    return `${date} · ${time}`;
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

    // Mirrors the API gate in events.service.updateStatus: the event needs
    // at least one thing for a fan to DO, an Oportunidad or a Subasta,
    // either one. Requiring an experience specifically left auction-only
    // events permanently un-launchable.
    const hasContent = stats
        ? stats.experienceCount + stats.auctionCount > 0
        : false;
    const allPassed = stats
        ? hasContent &&
          stats.experiencesReady &&
          stats.isPublished &&
          stats.badgesReady
        : false;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    onClick={handleOpen}
                    disabled={isUpdatingStatus}
                >
                    {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                    {t('goLive')}
                </Button>
            </DialogTrigger>
            <DialogContent className="surface-white">
                <DialogHeader>
                    <DialogTitle className="font-display text-[22px]">
                        {t('preLiveChecklist')}
                    </DialogTitle>
                </DialogHeader>

                {loadingStats ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-blue" />
                    </div>
                ) : stats ? (
                    <div className="flex flex-col gap-2.5">
                        <ChecklistItem
                            label={t('checkContent', {
                                experiences: stats.experienceCount,
                                auctions: stats.auctionCount,
                            })}
                            passed={hasContent && stats.experiencesReady}
                        />
                        <ChecklistItem
                            label={t('checkPublished')}
                            passed={stats.isPublished}
                        />
                        <ChecklistItem
                            label={
                                stats.badgesReady
                                    ? t('checkBadges')
                                    : `${t('checkBadges')} — ${stats.missingBadges
                                          .map((code) => t(`missingBadge.${code}`))
                                          .join(', ')}`
                            }
                            passed={stats.badgesReady}
                        />
                        <ChecklistItem
                            label={t('checkAuctions')}
                            passed={stats.auctionCount > 0}
                            optional
                        />
                        <div className="mt-4 flex justify-end gap-3">
                            <Button
                                size="lg"
                                onClick={() => updateStatus('live')}
                                disabled={!allPassed || isUpdatingStatus}
                            >
                                {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                                {t('goLive')}
                            </Button>
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
                <Button variant="destructive" disabled={isUpdatingStatus}>
                    {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                    {t('endEvent')}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="surface-white">
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-[22px]">{t('endEvent')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('confirmEnd')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-col gap-2">
                    <label className="label-mono text-muted-white">
                        {t('typeToConfirm')}
                    </label>
                    <Input
                        type="text"
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        placeholder={`Escribe "${eventName}" para confirmar`}
                        className="h-12"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        onClick={() => updateStatus('ended')}
                        disabled={confirmName !== eventName}
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
        <div className="flex items-center gap-3 rounded-[12px] border-2 border-line-white bg-white px-4 py-3">
            {passed ? (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-[8px] border-2 border-ink bg-lime text-ink">
                    <Check size={14} strokeWidth={3} />
                </span>
            ) : optional ? (
                <span className="size-6 shrink-0 rounded-[8px] border-2 border-dashed border-muted-ink" />
            ) : (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-[8px] border-2 border-alert-white text-alert-white">
                    <XIcon size={14} strokeWidth={3} />
                </span>
            )}
            <span className={`text-sm font-bold ${passed ? 'text-ink' : optional ? 'text-muted-white' : 'text-body-white'}`}>
                {label}
                {optional && !passed && (
                    <span className="label-mono ml-2 text-muted-white">(opcional)</span>
                )}
            </span>
        </div>
    );
}

// ── Live "ends in" countdown (to the Fandi close = auto event end) ──

function EndsInCountdown({
    target,
    label,
}: {
    target: string | Date;
    label: string;
}) {
    const [left, setLeft] = useState<string | null>(null);

    useEffect(() => {
        const end = new Date(target).getTime();
        const tick = () => {
            const diff = end - Date.now();
            if (diff <= 0) {
                setLeft('00:00:00');
                return;
            }
            const d = Math.floor(diff / 86_400_000);
            const h = Math.floor((diff / 3_600_000) % 24);
            const m = Math.floor((diff / 60_000) % 60);
            const s = Math.floor((diff / 1000) % 60);
            const pad = (n: number) => String(n).padStart(2, '0');
            setLeft(
                (d > 0 ? `${d}d ` : '') + `${pad(h)}:${pad(m)}:${pad(s)}`,
            );
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [target]);

    if (!left) return null;
    return (
        <div className="flex items-center gap-2 rounded-full bg-ink px-3 py-1">
            <Timer size={13} className="text-alert" />
            <span className="label-mono text-muted-ink">
                {label}
            </span>
            <span className="tabular font-space-mono text-[13px] font-bold text-white">
                {left}
            </span>
        </div>
    );
}

// ── Fandi Countdown Timer ──

function FandiCountdown({ fandiOpensAt }: { fandiOpensAt: string | Date }) {
    const t = useTranslations('events');
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
            <div className="block-ink flex items-center gap-3 self-start px-5 py-3">
                <Zap size={16} className="text-lime" />
                <span className="font-space-mono text-[11px] uppercase tracking-[0.14em] text-white">
                    {t('fandiReady')}
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
        <div className="block-ink flex items-center gap-4 self-start px-5 py-3">
            <div className="flex items-center gap-2">
                <Timer size={16} className="text-lime" />
                <span className="label-mono text-muted-ink">
                    {t('fandiOpensIn')}
                </span>
            </div>
            <div className="flex items-center gap-1">
                {units.map((u) => (
                    <div key={u.label} className="flex items-baseline gap-0.5">
                        <span className="tabular min-w-[28px] text-center font-space-mono text-[22px] font-bold text-lime">
                            {String(u.value).padStart(2, '0')}
                        </span>
                        <span className="font-space-mono text-[9px] text-muted-ink">{u.label}</span>
                        {u.label !== 'S' && (
                            <span className="mx-0.5 font-space-mono text-[18px] text-dash-ink">:</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
