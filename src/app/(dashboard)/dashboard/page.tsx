'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Calendar, Radio, Eye, UserPlus, AlertCircle, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { eventsApi } from '@/lib/api-hooks';
import type { Event } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from '@/components/ui/table';

// ── Stat Card ──

function StatCard({ icon, label, value, accent, pulse }: {
    icon: LucideIcon;
    label: string;
    value: number;
    accent?: boolean;
    pulse?: boolean;
}) {
    const Icon = icon;
    return (
        <div className="hud-card hud-brackets hud-brackets-hover flex flex-col gap-3 rounded-none p-6
            transition-all duration-200 hover:bg-[rgba(204,255,0,0.05)]">
            <div className="flex items-center justify-between">
                <Icon size={20} className={accent ? 'text-[var(--color-tactical-acid)]' : 'text-[#737373]'} />
                {pulse && (
                    <div className="live-pulse-container flex h-3 w-3 items-center justify-center rounded-none bg-[var(--color-tactical-magenta)]">
                        <span className="h-1.5 w-1.5 animate-pulse bg-white" />
                    </div>
                )}
            </div>
            <span className="font-sora text-[64px] font-black leading-none tracking-[-4px] text-white">
                {value}
            </span>
            <span className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#737373]">
                {label}
            </span>
        </div>
    );
}

import { StatusBadge } from '@/components/ui/status-badge';

// ── Page ──

export default function DashboardHomePage() {
    const { user, organization, memberRole } = useAuth();
    const router = useRouter();
    const t = useTranslations('dashboard');
    const tEvents = useTranslations('events');

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<Event[]>([]);
    const [error, setError] = useState<string | null>(null);

    const isWriteRole = memberRole === 'owner' || memberRole === 'admin';

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await eventsApi.list();
            setEvents(data.items);
        } catch {
            setError(t('errorLoading'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // ── Computed stats ──
    const totalEvents = events.length;
    const activeEvents = events.filter(e => e.status === 'live').length;
    const publishedEvents = events.filter(e => e.status === 'published').length;

    // ── Recent events: 5 most recent by createdAt DESC ──
    const recentEvents = [...events]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    // ── Date formatter ──
    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    // ── Current date subtitle ──
    const todayStr = new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <div className="flex flex-col gap-12">
            {/* ── Welcome Header ── */}
            <div className="flex flex-col gap-2">
                <h1 className="animate-glitch font-sora text-[64px] font-black leading-none tracking-[-3px] text-white">
                    {t('welcome', { name: user?.displayName || organization?.name || '' })}
                </h1>
                <p className="font-space-mono text-sm uppercase tracking-[2px] text-[#737373]">
                    {todayStr}
                </p>
            </div>

            {/* ── Stat Cards ── */}
            {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex flex-col gap-3 rounded-none border border-[#1E1E1E] bg-[#141414] p-6">
                            <Skeleton className="h-5 w-5 rounded-none bg-[#1E1E1E]" />
                            <Skeleton className="h-8 w-16 rounded-none bg-[#1E1E1E]" />
                            <Skeleton className="h-3 w-24 rounded-none bg-[#1E1E1E]" />
                        </div>
                    ))}
                </div>
            ) : error ? null : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard icon={Calendar} label={t('totalEvents')} value={totalEvents} />
                    <StatCard
                        icon={Radio}
                        label={t('activeEvents')}
                        value={activeEvents}
                        accent={activeEvents > 0}
                        pulse={activeEvents > 0}
                    />
                    <StatCard icon={Eye} label={t('publishedEvents')} value={publishedEvents} />
                </div>
            )}

            {/* ── Error State ── */}
            {error && (
                <div className="flex flex-col items-center gap-4 rounded-none border border-[#1E1E1E] bg-[#141414] p-8">
                    <AlertCircle size={32} className="text-[#FF3366]" />
                    <p className="font-sora text-sm text-[#A0A0A0]">{error}</p>
                    <button
                        onClick={fetchEvents}
                        className="cursor-pointer rounded-none border border-[#2A2A2A] bg-transparent px-4 py-2 font-space-mono text-xs uppercase tracking-[1px] text-white transition-colors duration-150 hover:bg-[#1A1A1A]"
                    >
                        {t('retry')}
                    </button>
                </div>
            )}

            {/* ── Recent Events ── */}
            {!error && (
                <div className="flex flex-col gap-6 overflow-visible">
                    {/* Section header */}
                    <div className="flex items-center justify-between overflow-visible py-1">
                        <span className="font-space-mono text-[16px] uppercase tracking-[2px] text-[#737373]">
                            {t('recentEvents')}
                        </span>
                        {isWriteRole && (
                            <button
                                onClick={() => router.push('/dashboard/events/new')}
                                className="btn-tactical flex cursor-pointer items-center gap-2 rounded-none px-6 py-2 font-space-mono text-xs font-bold uppercase tracking-[2px]"
                            >
                                {t('createEvent')}
                            </button>
                        )}
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="rounded-none border border-[#1E1E1E] bg-[#141414]">
                            <div className="flex flex-col">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-6 border-b border-[#1E1E1E] p-4 last:border-b-0">
                                        <Skeleton className="h-5 w-16 rounded-none bg-[#1E1E1E]" />
                                        <Skeleton className="h-4 w-40 rounded-none bg-[#1E1E1E]" />
                                        <Skeleton className="ml-auto h-4 w-24 rounded-none bg-[#1E1E1E]" />
                                        <Skeleton className="h-4 w-20 rounded-none bg-[#1E1E1E]" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : events.length === 0 ? (
                        /* Empty state */
                        <div className="flex flex-col items-center gap-4 rounded-none border border-[#1E1E1E] bg-[#141414] px-8 py-16">
                            <Calendar size={48} className="text-[#2A2A2A]" />
                            <p className="font-sora text-[18px] text-[#737373]">{t('noEvents')}</p>
                            <button
                                onClick={() => router.push('/dashboard/events/new')}
                                className="btn-tactical flex cursor-pointer items-center gap-2 rounded-none px-6 py-3 font-space-mono text-xs font-bold uppercase tracking-[2px]"
                            >
                                {t('createEvent')}
                            </button>
                        </div>
                    ) : (
                        <div className="hud-card hud-brackets hud-brackets-hover overflow-hidden rounded-none p-1">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-[#1E1E1E] bg-[#141414] hover:bg-[#141414]">
                                        <TableHead className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                            {tEvents('statusLabel')}
                                        </TableHead>
                                        <TableHead className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                            {tEvents('name').toUpperCase()}
                                        </TableHead>
                                        <TableHead className="hidden font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373] md:table-cell">
                                            {tEvents('venue').toUpperCase()}
                                        </TableHead>
                                        <TableHead className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                            {tEvents('date').toUpperCase()}
                                        </TableHead>
                                        <TableHead className="w-10" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentEvents.map((event) => (
                                        <TableRow
                                            key={event.id}
                                            onClick={() => router.push(`/dashboard/events/${event.id}`)}
                                            className="group cursor-pointer border-b border-[#1A1A1A] border-l-4 border-l-transparent transition-all duration-200 hover:border-l-[var(--color-tactical-acid)] hover:bg-[rgba(204,255,0,0.05)]"
                                        >
                                            <TableCell>
                                                <StatusBadge status={event.status} />
                                            </TableCell>
                                            <TableCell className="font-sora text-[16px] font-extrabold uppercase tracking-[-0.5px] text-white">
                                                {event.name}
                                            </TableCell>
                                            <TableCell className="hidden font-sora text-[15px] text-[#A0A0A0] md:table-cell">
                                                {event.venue || '—'}
                                            </TableCell>
                                            <TableCell className="font-space-mono text-[13px] text-[#737373]">
                                                {formatDate(event.eventDate)}
                                            </TableCell>
                                            <TableCell>
                                                <ChevronRight size={16} className="text-[#4A4A4A]" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Quick Actions ── */}
            {!loading && !error && isWriteRole && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <button
                        onClick={() => router.push('/dashboard/team')}
                        className="group flex cursor-pointer items-center gap-3 rounded-none border border-dashed border-[#1E1E1E] bg-[#0A0A0A] p-5 transition-colors duration-150 hover:border-[#2D00F7] hover:bg-[#141414]"
                    >
                        <UserPlus size={20} className="text-[#2D00F7]" />
                        <span className="font-sora text-[15px] text-[#A0A0A0]">{t('inviteMember')}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
