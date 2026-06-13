'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, AlertCircle, ChevronRight, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { eventsApi } from '@/lib/api-hooks';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select';

export default function EventsListPage() {
    const router = useRouter();
    const t = useTranslations('events');
    const { memberRole } = useAuth();
    const isWriteRole = memberRole === 'owner' || memberRole === 'admin';
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState<string>('all');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['events', statusFilter],
        queryFn: () =>
            eventsApi.list(
                statusFilter !== 'all' ? { status: statusFilter } : undefined,
            ),
    });

    const events = useMemo(() => {
        const items = data?.items ?? [];
        return [...items].sort(
            (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
        );
    }, [data]);

    const formatDate = (iso: string) =>
        new Intl.DateTimeFormat('es', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(new Date(iso));

    const eventTypeBadge = (type: string | null) => {
        if (!type) return null;
        const labelMap: Record<string, string> = {
            football: t('typeFootball'),
            concert: t('typeConcert'),
            other: t('typeOther'),
        };
        return (
            <span className="inline-flex rounded-none bg-[#1E1E1E] px-2 py-0.5 font-space-mono text-[11px] text-[#737373]">
                {labelMap[type] || type}
            </span>
        );
    };

    // ── Error ──
    if (error) {
        return (
            <div className="flex flex-col gap-8 p-14">
                <PageHeader title={t('title')} isWriteRole={isWriteRole} router={router} />
                <div className="flex flex-col items-center justify-center gap-4 rounded-none border border-[#1E1E1E] bg-[#141414] p-8">
                    <AlertCircle size={32} className="text-[#FF3366]" />
                    <p className="font-sora text-sm text-[#A0A0A0]">
                        {(error as Error).message || t('empty')}
                    </p>
                    <button
                        onClick={() => refetch()}
                        className="cursor-pointer rounded-none border border-[#2A2A2A] bg-transparent px-4 py-2 font-space-mono text-xs uppercase tracking-[1px] text-white transition-colors duration-150 hover:bg-[#1A1A1A]"
                    >
                        {t('validation.required') ? 'REINTENTAR' : 'RETRY'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 p-14">
            <PageHeader title={t('title')} isWriteRole={isWriteRole} router={router} />

            {/* ── Filter Row ── */}
            <div className="flex items-center gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] cursor-pointer rounded-none border-[#1E1E1E] bg-[#141414] font-space-mono text-xs text-white">
                        <SelectValue placeholder={t('allStatuses')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-[#1E1E1E] bg-[#121212]">
                        <SelectItem value="all" className="cursor-pointer font-space-mono text-xs text-white hover:bg-[#1A1A1A]">
                            {t('allStatuses')}
                        </SelectItem>
                        <SelectItem value="draft" className="cursor-pointer font-space-mono text-xs text-white hover:bg-[#1A1A1A]">
                            {t('status.draft')}
                        </SelectItem>
                        <SelectItem value="published" className="cursor-pointer font-space-mono text-xs text-white hover:bg-[#1A1A1A]">
                            {t('status.published')}
                        </SelectItem>
                        <SelectItem value="live" className="cursor-pointer font-space-mono text-xs text-white hover:bg-[#1A1A1A]">
                            {t('status.live')}
                        </SelectItem>
                        <SelectItem value="ended" className="cursor-pointer font-space-mono text-xs text-white hover:bg-[#1A1A1A]">
                            {t('status.ended')}
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* ── Data Table ── */}
            <div className="hud-card hud-brackets hud-brackets-hover overflow-hidden rounded-none p-1">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-[#1E1E1E] bg-[#141414] hover:bg-[#141414]">
                            <TableHead className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                {t('statusLabel')}
                            </TableHead>
                            <TableHead className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                {t('name')}
                            </TableHead>
                            <TableHead className="hidden font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373] md:table-cell">
                                {t('eventType')}
                            </TableHead>
                            <TableHead className="hidden font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373] lg:table-cell">
                                {t('venue')}
                            </TableHead>
                            <TableHead className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                {t('date')}
                            </TableHead>
                            <TableHead className="w-10" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <TableRow key={i} className="border-b border-[#1E1E1E]">
                                    <TableCell><Skeleton className="h-5 w-20 rounded-none bg-[#1E1E1E]" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-40 rounded-none bg-[#1E1E1E]" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20 rounded-none bg-[#1E1E1E]" /></TableCell>
                                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-32 rounded-none bg-[#1E1E1E]" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24 rounded-none bg-[#1E1E1E]" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-4 rounded-none bg-[#1E1E1E]" /></TableCell>
                                </TableRow>
                            ))
                        ) : events.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={6}>
                                    <div className="flex flex-col items-center justify-center gap-4 py-16">
                                        <Calendar size={48} className="text-[#2A2A2A]" />
                                        <p className="font-sora text-[18px] text-[#737373]">
                                            {t('empty')}
                                        </p>
                                        {isWriteRole && (
                                            <button
                                                onClick={() => router.push('/dashboard/events/new')}
                                                className="btn-tactical flex cursor-pointer items-center gap-2 rounded-none px-6 py-3 font-space-mono text-[11px] font-bold uppercase tracking-[2px]"
                                            >
                                                <Plus size={16} />
                                                {t('create')}
                                            </button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            events.map((event) => (
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
                                    <TableCell className="hidden md:table-cell">
                                        {eventTypeBadge(event.eventType)}
                                    </TableCell>
                                    <TableCell className="hidden font-sora text-[15px] text-[#A0A0A0] lg:table-cell">
                                        {event.venue || '—'}
                                    </TableCell>
                                    <TableCell className="font-space-mono text-[13px] text-[#737373]">
                                        {formatDate(event.eventDate)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-1">
                                            {isWriteRole && (
                                                <DuplicateButton
                                                    eventId={event.id}
                                                    onDuplicated={(newId) => {
                                                        queryClient.invalidateQueries({ queryKey: ['events'] });
                                                        router.push(`/dashboard/events/edit/${newId}`);
                                                    }}
                                                />
                                            )}
                                            <ChevronRight size={16} className="text-[#4A4A4A]" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

// ── Duplicate action ──

function DuplicateButton({
    eventId,
    onDuplicated,
}: {
    eventId: string;
    onDuplicated: (newEventId: string) => void;
}) {
    const t = useTranslations('events');
    const { mutate, isPending } = useMutation({
        mutationFn: () => eventsApi.duplicate(eventId),
        onSuccess: (created) => {
            toast.success(t('duplicated'));
            onDuplicated(created.id);
        },
        onError: () => toast.error(t('duplicateError')),
    });

    return (
        <button
            type="button"
            title={t('duplicate')}
            aria-label={t('duplicate')}
            disabled={isPending}
            onClick={(e) => {
                // Don't trigger the row's navigate-to-detail handler.
                e.stopPropagation();
                mutate();
            }}
            className="flex cursor-pointer items-center justify-center rounded-none border border-transparent p-1.5 text-[#737373] transition-all duration-150 hover:border-[#2D00F7] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
            {isPending ? (
                <Loader2 size={15} className="animate-spin" />
            ) : (
                <Copy size={15} />
            )}
        </button>
    );
}

// ── Page Header ──

function PageHeader({
    title,
    isWriteRole,
    router,
}: {
    title: string;
    isWriteRole: boolean;
    router: ReturnType<typeof useRouter>;
}) {
    const t = useTranslations('events');
    return (
        <div className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
                <h1 className="animate-glitch font-sora text-[80px] font-black leading-[0.85] tracking-[-4px] text-white">
                    {title.toUpperCase()}
                </h1>
            </div>
            {isWriteRole && (
                <button
                    onClick={() => router.push('/dashboard/events/new')}
                    className="btn-tactical flex cursor-pointer items-center gap-2 rounded-none px-6 py-3 font-space-mono text-[11px] font-bold uppercase tracking-[2px]"
                >
                    <Plus size={16} />
                    {t('create')}
                </button>
            )}
        </div>
    );
}
