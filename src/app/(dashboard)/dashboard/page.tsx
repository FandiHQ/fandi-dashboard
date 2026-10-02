'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Calendar, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { eventsApi, orgApi } from '@/lib/api-hooks';
import type { Event } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { PendingInvitationBanner } from '@/components/collaborations/PendingInvitationBanner';

// ── Stat block (Azul Bloque §7: white, 5px extrusion, mono label) ──

function StatBlock({ label, value, sub }: {
    label: string;
    value: number;
    sub: string;
}) {
    return (
        <div className="block-white px-5 py-4">
            <div className="label-mono text-muted-white">{label}</div>
            <div className="font-display tabular mt-2 text-[42px] leading-none">{value}</div>
            <div className="mt-1.5 font-space-mono text-[10px] uppercase text-muted-white">{sub}</div>
        </div>
    );
}

// ── Countdown ("02:14:08", or "3D 04:12:08" beyond a day) ──

function formatCountdown(ms: number) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(total / 86400);
    const pad = (n: number) => String(n).padStart(2, '0');
    const hms = `${pad(Math.floor((total % 86400) / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
    return days > 0 ? `${days}D ${hms}` : hms;
}

const toMs = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);

// ── Page ──

export default function DashboardHomePage() {
    const { user, organization, memberRole } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('dashboard');
    const tEvents = useTranslations('events');
    const tTeam = useTranslations('team');

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<Event[]>([]);
    const [error, setError] = useState<string | null>(null);

    const isWriteRole = memberRole === 'owner' || memberRole === 'admin';
    // Same query key as the Equipo page, so both share one cache entry.
    const membersQuery = useQuery({
        queryKey: ['organization', 'members'],
        queryFn: () => orgApi.getMembers(),
        enabled: isWriteRole,
    });
    const members = membersQuery.data ?? [];

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

    // ── Clock for the hero countdown (presentation only) ──
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    // ── Computed stats ──
    const totalEvents = events.length;
    const activeEvents = events.filter(e => e.status === 'live').length;
    const publishedEvents = events.filter(e => e.status === 'published').length;
    const draftEvents = events.filter(e => e.status === 'draft').length;
    const endedEvents = events.filter(e => e.status === 'ended').length;

    // ── Recent events: 5 most recent by createdAt DESC ──
    const recentEvents = [...events]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    // ── Hero event: the live one, else the next published one still ahead ──
    const byStartAsc = (a: Event, b: Event) => toMs(a.eventDate) - toMs(b.eventDate);
    const heroEvent =
        events.filter(e => e.status === 'live').sort(byStartAsc)[0] ??
        events
            .filter(e => e.status === 'published' && toMs(e.eventEndDate ?? e.eventDate) > now)
            .sort(byStartAsc)[0] ??
        null;

    const dateLocale = locale === 'es' ? 'es-CO' : locale;

    // ── Date formatter ──
    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(dateLocale, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    // ── Current date subtitle ──
    const todayStr = new Date().toLocaleDateString(dateLocale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    // ── Hero pill + countdown ──
    let heroPill: string | null = null;
    let heroIsToday = false;
    let countdown: { label: string; value: string } | null = null;
    if (heroEvent) {
        const start = new Date(heroEvent.eventDate);
        const time = start.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit', hour12: false });
        heroIsToday = start.toDateString() === new Date(now).toDateString();
        heroPill = heroIsToday
            ? `${t('home.today')} · ${time}`
            : `${start.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')} · ${time}`;

        const closes = toMs(heroEvent.fandiClosesAt);
        const opens = toMs(heroEvent.fandiOpensAt);
        const starts = toMs(heroEvent.eventDate);
        if (heroEvent.status === 'live') {
            if (closes > now) countdown = { label: t('home.fandiClosesIn'), value: formatCountdown(closes - now) };
        } else if (opens > now) {
            countdown = { label: t('home.fandiOpensIn'), value: formatCountdown(opens - now) };
        } else if (starts > now) {
            countdown = { label: t('home.startsIn'), value: formatCountdown(starts - now) };
        }
    }

    const showTeamPanel = !loading && !error && isWriteRole;

    return (
        <div className="flex flex-col gap-6">
            {/* ── Welcome Header ── */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="font-hero text-[40px] leading-none text-white md:text-[48px]">
                        {t('welcome', { name: user?.displayName || organization?.name || '' })}
                    </h1>
                    <p className="label-mono mt-2 text-[11px] text-lilac">
                        {todayStr}
                    </p>
                </div>
                {isWriteRole && (
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => router.push('/dashboard/events/new')}
                        className="shadow-ext-md"
                    >
                        + {t('createEvent')}
                    </Button>
                )}
            </div>

            {/* ── Collaboration invitations awaiting my answer (owner/admin) ── */}
            <PendingInvitationBanner />

            {/* ── Hero: live / next event (ink card, lime extrusion) ── */}
            {!loading && !error && heroEvent && (
                <section className="block-ink grid grid-cols-1 items-center gap-8 rounded-[18px] px-7 py-6 shadow-ext-live-xl lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                        {heroEvent.status === 'live' ? (
                            <span className="label-mono inline-flex items-center gap-1.5 rounded-full bg-lime px-2.5 py-0.5 font-bold text-ink">
                                <span className="live-dot" aria-hidden="true" />
                                {tEvents('status.live')}
                            </span>
                        ) : (
                            <span
                                className={`label-mono inline-flex items-center rounded-full px-2.5 py-0.5 font-bold text-ink ${
                                    heroIsToday ? 'bg-lime' : 'bg-white'
                                }`}
                            >
                                {heroPill}
                            </span>
                        )}
                        <Link
                            href={`/dashboard/events/${heroEvent.id}`}
                            className="font-hero mt-3 block break-words text-[40px] leading-[0.95] text-white hover:underline hover:decoration-2 hover:underline-offset-4"
                        >
                            {heroEvent.name}
                        </Link>
                        {(heroEvent.venue || heroEvent.city) && (
                            <div className="mt-2 font-space-mono text-[11px] uppercase text-muted-ink">
                                {[heroEvent.venue, heroEvent.city].filter(Boolean).join(', ')}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-start gap-2.5 lg:items-end">
                        {countdown && (
                            <>
                                <div className="label-mono text-muted-ink">{countdown.label}</div>
                                <div className="tabular font-space-mono text-[34px] font-bold leading-none text-lime">
                                    {countdown.value}
                                </div>
                            </>
                        )}
                        <Button asChild size="lg" className="border-0 shadow-ext-cta">
                            <Link href={`/dashboard/events/${heroEvent.id}/live`}>
                                {t('home.openLiveRoom')} →
                            </Link>
                        </Button>
                    </div>
                </section>
            )}

            {/* ── Stat Blocks ── */}
            {loading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="block-white flex flex-col gap-3 px-5 py-4">
                            <Skeleton className="h-3 w-24 bg-line-white" />
                            <Skeleton className="h-10 w-16 bg-line-white" />
                            <Skeleton className="h-3 w-28 bg-line-white" />
                        </div>
                    ))}
                </div>
            ) : error ? null : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <StatBlock
                        label={t('totalEvents')}
                        value={totalEvents}
                        sub={t('home.totalSub', { drafts: draftEvents, ended: endedEvents })}
                    />
                    <StatBlock
                        label={t('activeEvents')}
                        value={activeEvents}
                        sub={activeEvents > 0 ? t('home.liveNow') : t('home.noneLive')}
                    />
                    <StatBlock
                        label={t('publishedEvents')}
                        value={publishedEvents}
                        sub={t('home.publishedSub')}
                    />
                </div>
            )}

            {/* ── Error State ── */}
            {error && (
                <div className="block-white flex flex-col items-center gap-4 p-8">
                    <AlertCircle size={32} className="text-alert-white" />
                    <p className="text-sm font-semibold text-ink">{error}</p>
                    <Button variant="secondary" onClick={fetchEvents}>
                        {t('retry')}
                    </Button>
                </div>
            )}

            {/* ── Events + Team ── */}
            {!error && (
                <div
                    className={`grid grid-cols-1 gap-5 ${
                        showTeamPanel ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : ''
                    }`}
                >
                    <div className="block-white min-w-0 overflow-hidden">
                        {/* Section header */}
                        <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3.5">
                            <span className="font-display text-[17px]">{tEvents('title')}</span>
                            {!loading && events.length > 0 && (
                                <Link
                                    href="/dashboard/events"
                                    className="font-space-mono text-[10px] uppercase text-blue hover:underline"
                                >
                                    {t('home.viewAll', { count: totalEvents })} ›
                                </Link>
                            )}
                        </div>

                        {/* Table */}
                        {loading ? (
                            <div className="flex flex-col">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-6 border-b border-line-white px-5 py-3 last:border-b-0">
                                        <Skeleton className="h-5 w-16 bg-line-white" />
                                        <Skeleton className="h-4 w-40 bg-line-white" />
                                        <Skeleton className="ml-auto h-4 w-24 bg-line-white" />
                                        <Skeleton className="h-4 w-20 bg-line-white" />
                                    </div>
                                ))}
                            </div>
                        ) : events.length === 0 ? (
                            /* Empty state */
                            <div className="flex flex-col items-center gap-4 px-8 py-16">
                                <Calendar size={40} className="text-muted-white" />
                                <p className="text-[17px] font-semibold text-muted-white">{t('noEvents')}</p>
                                <Button onClick={() => router.push('/dashboard/events/new')}>
                                    + {t('createEvent')}
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{tEvents('statusLabel')}</TableHead>
                                        <TableHead>{tEvents('name')}</TableHead>
                                        <TableHead className="hidden md:table-cell">{tEvents('venue')}</TableHead>
                                        <TableHead>{tEvents('date')}</TableHead>
                                        <TableHead className="w-10" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentEvents.map((event) => (
                                        <TableRow
                                            key={event.id}
                                            onClick={() => router.push(`/dashboard/events/${event.id}`)}
                                            className="group cursor-pointer"
                                        >
                                            <TableCell>
                                                <StatusBadge status={event.status} />
                                            </TableCell>
                                            <TableCell className="max-w-[280px] truncate font-display text-[15px]">
                                                {event.name}
                                            </TableCell>
                                            <TableCell className="hidden text-[13px] text-muted-white md:table-cell">
                                                {event.venue || '—'}
                                            </TableCell>
                                            <TableCell className="font-space-mono text-[11px] uppercase text-muted-white">
                                                {formatDate(event.eventDate)}
                                            </TableCell>
                                            <TableCell>
                                                <ChevronRight size={16} className="text-muted-white transition-transform group-hover:translate-x-0.5" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* ── Team (ink panel) ── */}
                    {showTeamPanel && (
                        <div className="block-ink flex flex-col gap-3 self-start px-[18px] py-4">
                            <div className="flex items-center justify-between">
                                <span className="font-display text-[17px]">{tTeam('title')}</span>
                                {members.length > 0 && (
                                    <Link href="/dashboard/team" className="font-space-mono text-[10px] text-lime hover:underline">
                                        {tTeam('membersTitle').toUpperCase()} · {members.length} ›
                                    </Link>
                                )}
                            </div>
                            {membersQuery.isLoading ? (
                                <>
                                    <Skeleton className="h-8 bg-chip-ink" />
                                    <Skeleton className="h-8 bg-chip-ink" />
                                </>
                            ) : (
                                members.slice(0, 5).map((m, i) => {
                                    const name = m.displayName || m.email || '—';
                                    const initials = name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
                                    return (
                                        <div key={m.userId} className="flex items-center gap-2.5">
                                            <span className={`flex size-8 flex-none items-center justify-center rounded-full border-2 border-ink text-[11px] font-black text-ink ${TEAM_AVATAR_BG[i % TEAM_AVATAR_BG.length]}`}>
                                                {initials}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-bold text-white">{name}</div>
                                                <div className="font-space-mono text-[9px] uppercase tracking-[0.14em] text-tier-vip">
                                                    {tTeam(`roles.${m.role}`)}
                                                    {m.status === 'pending' ? ` · ${tTeam('pending')}` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <button
                                type="button"
                                onClick={() => router.push('/dashboard/team')}
                                className="press cursor-pointer rounded-[10px] border-2 border-dashed border-dash-ink py-2.5 text-[13px] font-extrabold text-lime transition-colors hover:border-lime"
                            >
                                + {t('inviteMember')}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Category colours cycled for member avatars (equal weight, never ranked).
const TEAM_AVATAR_BG = ['bg-tier-vip', 'bg-tier-alta', 'bg-tier-media', 'bg-tier-base'];
