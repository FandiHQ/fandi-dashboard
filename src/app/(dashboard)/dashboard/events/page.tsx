'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, AlertCircle, ChevronRight, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { eventsApi } from '@/lib/api-hooks';
import { apiErrorKind } from '@/lib/api-error-kind';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
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
    const tCommon = useTranslations('common');
    const locale = useLocale();
    const { memberRole } = useAuth();
    const isWriteRole = memberRole === 'owner' || memberRole === 'admin';
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState<string>('all');

    const { data, isLoading, error, refetch, isRefetching } = useQuery({
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
        new Intl.DateTimeFormat(locale, {
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
            <span className="label-mono inline-flex rounded-full bg-line-white px-2 py-0.5 text-[9px] font-bold text-ink">
                {labelMap[type] || type}
            </span>
        );
    };

    // ── Error ──
    if (error) {
        return (
            <div className="flex flex-col gap-6">
                <PageHeader title={t('title')} isWriteRole={isWriteRole} router={router} />
                <div className="block-white flex flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
                    <AlertCircle size={32} className="text-alert-white" aria-hidden="true" />
                    <p className="max-w-[420px] text-sm font-semibold text-ink">
                        {apiErrorKind(error) === 'forbidden' ? t('form.noPermission') : t('form.listError')}
                    </p>
                    <Button variant="secondary" onClick={() => refetch()} disabled={isRefetching}>
                        {isRefetching && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                        {tCommon('retry')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title={t('title')} isWriteRole={isWriteRole} router={router} />

            {/* ── Data Table ── */}
            <div className="block-white overflow-hidden">
                {/* ── Header row: title + status filter ── */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-5 py-3.5">
                    <span className="font-display text-[17px]">
                        {t('title')}
                        {!isLoading && (
                            <span className="ml-2 font-space-mono text-[11px] font-normal text-muted-white">
                                {events.length}
                            </span>
                        )}
                    </span>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger size="sm" aria-label={t('statusLabel')} className="w-[180px] cursor-pointer font-space-mono text-xs uppercase">
                            <SelectValue placeholder={t('allStatuses')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="cursor-pointer font-space-mono text-xs uppercase">
                                {t('allStatuses')}
                            </SelectItem>
                            <SelectItem value="draft" className="cursor-pointer font-space-mono text-xs uppercase">
                                {t('status.draft')}
                            </SelectItem>
                            <SelectItem value="published" className="cursor-pointer font-space-mono text-xs uppercase">
                                {t('status.published')}
                            </SelectItem>
                            <SelectItem value="live" className="cursor-pointer font-space-mono text-xs uppercase">
                                {t('status.live')}
                            </SelectItem>
                            <SelectItem value="ended" className="cursor-pointer font-space-mono text-xs uppercase">
                                {t('status.ended')}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('statusLabel')}</TableHead>
                            <TableHead>{t('name')}</TableHead>
                            <TableHead className="hidden md:table-cell">{t('eventType')}</TableHead>
                            <TableHead className="hidden lg:table-cell">{t('venue')}</TableHead>
                            <TableHead>{t('date')}</TableHead>
                            <TableHead className="w-10" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-20 bg-line-white" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-40 bg-line-white" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20 bg-line-white" /></TableCell>
                                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-32 bg-line-white" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24 bg-line-white" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-4 bg-line-white" /></TableCell>
                                </TableRow>
                            ))
                        ) : events.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={6}>
                                    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                                        <Calendar size={40} className="text-muted-white" aria-hidden="true" />
                                        <p className="text-[17px] font-semibold text-muted-white">
                                            {statusFilter !== 'all' ? t('form.emptyFiltered') : t('empty')}
                                        </p>
                                        {statusFilter !== 'all' ? (
                                            <Button variant="secondary" onClick={() => setStatusFilter('all')}>
                                                {t('form.showAll')}
                                            </Button>
                                        ) : isWriteRole && (
                                            <Button onClick={() => router.push('/dashboard/events/new')}>
                                                <Plus />
                                                {t('create')}
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            events.map((event) => (
                                <TableRow
                                    key={event.id}
                                    onClick={() => router.push(`/dashboard/events/${event.id}`)}
                                    className="group cursor-pointer"
                                >
                                    <TableCell>
                                        <StatusBadge status={event.status} />
                                    </TableCell>
                                    <TableCell className="max-w-[320px] truncate font-display text-[15px]">
                                        {/* A real link so the row works with the keyboard too. */}
                                        <Link
                                            href={`/dashboard/events/${event.id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="rounded-[4px] outline-none hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                                        >
                                            {event.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {eventTypeBadge(event.eventType)}
                                    </TableCell>
                                    <TableCell className="hidden text-[13px] text-muted-white lg:table-cell">
                                        {event.venue || '—'}
                                    </TableCell>
                                    <TableCell className="font-space-mono text-[11px] uppercase text-muted-white">
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
                                            <ChevronRight size={16} className="text-muted-white transition-transform group-hover:translate-x-0.5" />
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
            className="flex size-8 cursor-pointer items-center justify-center rounded-[10px] border-2 border-transparent text-muted-white transition-colors duration-150 hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="font-hero text-[40px] leading-none text-white md:text-[48px]">
                    {title}
                </h1>
                <p className="label-mono mt-2 text-[11px] text-lilac">{t('listSubtitle')}</p>
            </div>
            {isWriteRole && (
                <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => router.push('/dashboard/events/new')}
                    className="shadow-ext-md"
                >
                    <Plus />
                    {t('create')}
                </Button>
            )}
        </div>
    );
}
