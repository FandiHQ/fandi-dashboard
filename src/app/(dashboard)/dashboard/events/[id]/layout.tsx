'use client';

import { useParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle, Check, X as XIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { eventsApi } from '@/lib/api-hooks';
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
import { useState } from 'react';

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            toast.success(t('updated'));
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Error';
            toast.error(message);
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
                    <h1 className="font-sora text-[48px] font-bold leading-none tracking-[-1px] text-white">
                        {event.name}
                    </h1>
                    <StatusBadge status={event.status} />
                </div>

                {/* ── Action Buttons ── */}
                {isWriteRole && (
                    <div className="flex shrink-0 items-center gap-3">
                        {event.status === 'draft' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button
                                        disabled={isUpdatingStatus}
                                        className="flex cursor-pointer items-center gap-2 rounded-none bg-[#2D00F7] px-7 py-3.5 font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all duration-200 hover:bg-[#2400C5] hover:shadow-[0_0_30px_rgba(45,0,247,0.6)] disabled:opacity-50"
                                    >
                                        {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                                        {t('publish')}
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-none border-[#1A1A1A] bg-[#121212]">
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
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button
                                        disabled={isUpdatingStatus}
                                        className="flex cursor-pointer items-center gap-2 rounded-none bg-[#FF3366] px-7 py-3.5 font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all duration-200 hover:bg-[#CC2952] hover:shadow-[0_0_30px_rgba(255,51,102,0.4)] disabled:opacity-50"
                                    >
                                        {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                                        {t('endEvent')}
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-none border-[#1A1A1A] bg-[#121212]">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="font-sora text-xl text-white">{t('endEvent')}</AlertDialogTitle>
                                        <AlertDialogDescription className="font-space-mono text-sm text-[#A0A0A0]">
                                            {t('confirmEnd')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-none border-[#2A2A2A] bg-transparent font-space-mono text-sm uppercase tracking-[1px] text-white hover:bg-[#1A1A1A] hover:text-white">
                                            Cancelar
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => updateStatus('ended')}
                                            className="rounded-none bg-[#FF3366] font-space-mono text-sm uppercase tracking-[1px] text-white hover:bg-[#CC2952]"
                                        >
                                            {t('endEvent')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                )}
            </div>

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

    const allPassed = stats ? stats.experienceCount > 0 && stats.isPublished : false;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    onClick={handleOpen}
                    disabled={isUpdatingStatus}
                    className="flex cursor-pointer items-center gap-2 rounded-none bg-[#2D00F7] px-7 py-3.5 font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all duration-200 hover:bg-[#2400C5] hover:shadow-[0_0_30px_rgba(45,0,247,0.6)] disabled:opacity-50"
                >
                    {isUpdatingStatus && <Loader2 size={14} className="animate-spin" />}
                    {t('goLive')}
                </button>
            </DialogTrigger>
            <DialogContent className="rounded-none border-[#1A1A1A] bg-[#121212]">
                <DialogHeader>
                    <DialogTitle className="font-sora text-xl text-white">
                        {t('preLiveChecklist')}
                    </DialogTitle>
                </DialogHeader>

                {loadingStats ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-[#2D00F7]" />
                    </div>
                ) : stats ? (
                    <div className="flex flex-col gap-4">
                        <ChecklistItem
                            label={t('checkExperiences')}
                            passed={stats.experienceCount > 0}
                        />
                        <ChecklistItem
                            label={t('checkPublished')}
                            passed={stats.isPublished}
                        />
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                onClick={() => updateStatus('live')}
                                disabled={!allPassed || isUpdatingStatus}
                                className="flex cursor-pointer items-center gap-2 rounded-none bg-[#2D00F7] px-7 py-3.5 font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all duration-200 hover:bg-[#2400C5] disabled:cursor-not-allowed disabled:opacity-50"
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

function ChecklistItem({ label, passed }: { label: string; passed: boolean }) {
    return (
        <div className="flex items-center gap-3 rounded-none border border-[#1E1E1E] bg-[#141414] px-4 py-3">
            {passed ? (
                <Check size={16} className="text-[#22C55E]" />
            ) : (
                <XIcon size={16} className="text-[#FF3366]" />
            )}
            <span className={`font-space-mono text-sm ${passed ? 'text-white' : 'text-[#737373]'}`}>
                {label}
            </span>
        </div>
    );
}
