'use client';

/**
 * Winners list — Step 4.14, replaces the Step 4.8 placeholder stub.
 *
 * Read for all dashboard roles; CSV export is owner/admin only.
 * Filters live in component state (URL state is a flagged
 * follow-up — refresh / share-link won't preserve them).
 */

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';

import { eventsApi, analyticsApi } from '@/lib/api-hooks';
import { useAuth } from '@/contexts/auth-context';
import { formatFandis, formatCop } from '@/lib/currency';
import { slugifyForFilename } from '@/lib/slugify';
import { triggerBrowserDownload } from '@/lib/download';
import {
    escuadraColors,
    escuadraDefaultNames,
    statusColors,
    type RedemptionStatus,
} from '@/lib/chart-colors';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { WinnersListItem, WinnersListQuery } from '@/types/api';

// ─── Local types ─────────────────────────────────────────────

const STATUS_VALUES = ['pending', 'redeemed', 'expired', 'cancelled'] as const;
type PrizeType = 'experience' | 'auction';
const PRIZE_TYPES: PrizeType[] = ['experience', 'auction'];

/**
 * Local refinement of `WinnersListQuery` (the type file declares
 * status/prizeType as plain `string`). We narrow at the call site
 * so the rest of the component reads as if the union were
 * enforced — without modifying types/api.ts in this PR.
 */
interface LocalFilters extends Omit<WinnersListQuery, 'status' | 'prizeType'> {
    page: number;
    limit: number;
    status?: RedemptionStatus;
    prizeType?: PrizeType;
}

const SELECT_ALL = '__all__'; // shadcn Select disallows empty-string values

// ─── Page ────────────────────────────────────────────────────

export default function WinnersPage() {
    const { id: eventId } = useParams() as { id: string };
    const t = useTranslations('winners');
    const { memberRole } = useAuth();
    const isWriteRole = memberRole === 'owner' || memberRole === 'admin';

    const [filters, setFilters] = useState<LocalFilters>({
        page: 1,
        limit: 20,
        status: undefined,
        prizeType: undefined,
    });

    // Parent event — read from cache (layout already prefetches).
    const { data: event } = useQuery({
        queryKey: ['events', eventId],
        queryFn: () => eventsApi.get(eventId),
    });

    const { data: winners, isLoading } = useQuery({
        queryKey: ['events', eventId, 'winners', filters],
        queryFn: () =>
            analyticsApi.getWinnersList(eventId, {
                page: filters.page,
                limit: filters.limit,
                status: filters.status,
                prizeType: filters.prizeType,
            }),
        enabled: event?.status !== 'draft',
    });

    // Backend doesn't return hasMore — compute locally.
    const hasMore = useMemo(() => {
        if (!winners) return false;
        return winners.page * winners.limit < winners.total;
    }, [winners]);

    // Per-status counts. CURRENT PAGE ONLY — flagged follow-up:
    // without per-status totals from the backend, this is
    // page-scoped, so it under-counts when total > limit.
    const countByStatus = useMemo(() => {
        const acc: Record<RedemptionStatus, number> = {
            pending: 0,
            redeemed: 0,
            expired: 0,
            cancelled: 0,
        };
        for (const w of winners?.items ?? []) {
            if (w.redemptionStatus in acc) {
                acc[w.redemptionStatus as RedemptionStatus]++;
            }
        }
        return acc;
    }, [winners]);

    const setStatus = (next: RedemptionStatus | undefined) =>
        setFilters((prev) => ({
            ...prev,
            // Toggle: clicking the active status again clears it.
            status: prev.status === next ? undefined : next,
            page: 1,
        }));

    const setPrizeType = (next: PrizeType | undefined) =>
        setFilters((prev) => ({ ...prev, prizeType: next, page: 1 }));

    const setPage = (page: number) =>
        setFilters((prev) => ({ ...prev, page }));

    const exportMutation = useMutation({
        mutationFn: () => analyticsApi.exportCSV(eventId),
        onSuccess: (blob) => {
            const slug = slugifyForFilename(event?.name ?? 'evento');
            const today = format(new Date(), 'yyyy-MM-dd');
            triggerBrowserDownload(blob, `ganadores_${slug}_${today}.csv`);
        },
        onError: () => toast.error(t('exportFailed')),
    });

    // ─── Draft guard ─────────────────────────────────────────
    if (event?.status === 'draft') {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="block-white px-8 py-6">
                    <p className="label-mono text-muted-white">
                        {t('unavailableOnDraft')}
                    </p>
                </div>
            </div>
        );
    }

    // ─── Loading skeleton ────────────────────────────────────
    if (isLoading && !winners) {
        return (
            <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-3 xl:grid-cols-5">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-10 w-full max-w-md" />
                <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            {/* ─── Stat blocks (5 clickable filters) ─── */}
            <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-3 xl:grid-cols-5">
                <StatChip
                    label={t('total')}
                    value={winners?.total ?? 0}
                    active={false}
                    onClick={() => setStatus(undefined)}
                />
                {STATUS_VALUES.map((status) => (
                    <StatChip
                        key={status}
                        label={t(`status.${status}`)}
                        value={countByStatus[status]}
                        status={status}
                        active={filters.status === status}
                        onClick={() => setStatus(status)}
                    />
                ))}
            </div>

            {/* ─── Filter row + Export ─── */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Status filter — duplicates the stats-bar toggles, kept
                    for keyboard users / explicit "all" reset. */}
                <Select
                    value={filters.status ?? SELECT_ALL}
                    onValueChange={(v) =>
                        setStatus(v === SELECT_ALL ? undefined : (v as RedemptionStatus))
                    }
                >
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder={t('filterByStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={SELECT_ALL}>{t('filterByStatus')}</SelectItem>
                        {STATUS_VALUES.map((status) => (
                            <SelectItem key={status} value={status}>
                                {t(`status.${status}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={filters.prizeType ?? SELECT_ALL}
                    onValueChange={(v) =>
                        setPrizeType(v === SELECT_ALL ? undefined : (v as PrizeType))
                    }
                >
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder={t('filterByType')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={SELECT_ALL}>{t('filterByType')}</SelectItem>
                        {PRIZE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                                {t(`prizeType.${type}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* CSV export — owner/admin only. Viewer/staff see no
                    button at all (per Step 4.14 spec: hide, don't disable). */}
                {isWriteRole && (
                    <Button
                        variant="secondary"
                        onClick={() => exportMutation.mutate()}
                        disabled={exportMutation.isPending}
                        className="ml-auto"
                    >
                        {exportMutation.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Download size={14} />
                        )}
                        {t('exportCsv')}
                    </Button>
                )}
            </div>

            {/* ─── Table (inside a white block) ─── */}
            <div className="block-white overflow-hidden">
                <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3.5">
                    <span className="font-display text-[17px]">{t('title')}</span>
                    <span className="tabular font-space-mono text-[10px] uppercase text-muted-white">
                        {winners?.total ?? 0}
                    </span>
                </div>
                {winners && winners.items.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <p className="text-sm font-semibold text-muted-white">
                            {t('empty')}
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-5">{t('col.fan')}</TableHead>
                                <TableHead>{t('col.prize')}</TableHead>
                                <TableHead>{t('col.escuadra')}</TableHead>
                                <TableHead className="text-right">{t('col.amount')}</TableHead>
                                <TableHead>{t('col.status')}</TableHead>
                                <TableHead className="pr-5">{t('col.redeemedAt')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(winners?.items ?? []).map((w) => (
                                <WinnerRow key={w.winnerId} winner={w} t={t} />
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* ─── Pagination ─── */}
            {winners && winners.total > winners.limit && (
                <div className="flex items-center justify-end gap-3">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPage(filters.page - 1)}
                        disabled={filters.page <= 1}
                    >
                        ←
                    </Button>
                    <span className="tabular font-space-mono text-xs text-lilac">
                        {filters.page} / {Math.max(1, Math.ceil(winners.total / winners.limit))}
                    </span>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPage(filters.page + 1)}
                        disabled={!hasMore}
                    >
                        →
                    </Button>
                </div>
            )}
        </div>
    );
}

// ─── Stat chip (a clickable stat block) ──────────────────────

interface StatChipProps {
    label: string;
    value: number;
    /** Redemption status this block filters by; omitted for "Total". */
    status?: RedemptionStatus;
    active: boolean;
    onClick: () => void;
}

function StatChip({ label, value, status, active, onClick }: StatChipProps) {
    // Active = pushed into the extrusion (the selected filter).
    return (
        <button
            onClick={onClick}
            aria-pressed={active}
            className="block-white press flex cursor-pointer flex-col items-start px-5 py-4 text-left"
            style={active ? { transform: 'translate(3px, 3px)', boxShadow: 'none' } : undefined}
        >
            {status ? (
                <RedemptionPill status={status} label={label} />
            ) : (
                <span className="label-mono text-muted-white">{label}</span>
            )}
            <span className="font-display tabular mt-2 text-[36px] text-ink">
                {new Intl.NumberFormat('es-CO').format(value)}
            </span>
        </button>
    );
}

// ─── Redemption status pill (word always shown, §8) ──────────

function RedemptionPill({ status, label }: { status: RedemptionStatus; label: string }) {
    return (
        <span
            className="inline-flex items-center rounded-full border-2 border-ink px-2.5 py-0.5 font-space-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink"
            style={{ backgroundColor: statusColors[status] }}
        >
            {label}
        </span>
    );
}

// ─── Row ─────────────────────────────────────────────────────

function WinnerRow({
    winner,
    t,
}: {
    winner: WinnersListItem;
    t: ReturnType<typeof useTranslations>;
}) {
    const status = winner.redemptionStatus as RedemptionStatus;
    const level = winner.escuadraLevel;
    const category =
        level === 1 || level === 2 || level === 3 || level === 4 ? level : null;

    return (
        <TableRow>
            <TableCell className="pl-5 font-bold">
                {winner.fanName}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <span className="font-semibold">
                        {winner.prizeName}
                    </span>
                    <span className="rounded-full border-2 border-line-white px-2 py-0.5 font-space-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-white">
                        {t(`prizeType.${winner.prizeType}`)}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                {category !== null ? (
                    <span className="inline-flex items-center gap-1.5 font-space-mono text-[10px] font-bold uppercase tracking-[0.12em]">
                        <span
                            aria-hidden
                            className="inline-block size-3 rounded-[3px] border-2 border-ink"
                            style={{ backgroundColor: escuadraColors[category] }}
                        />
                        {escuadraDefaultNames[category]}
                    </span>
                ) : (
                    <span className="text-muted-white">—</span>
                )}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex flex-col items-end">
                    <span className="tabular font-black">
                        {formatFandis(winner.finalAmount)} F
                    </span>
                    <span className="tabular font-space-mono text-[10px] text-muted-white">
                        {formatCop(winner.finalAmount)}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <RedemptionPill status={status} label={t(`status.${status}`)} />
            </TableCell>
            <TableCell className="pr-5 font-space-mono text-xs text-muted-white">
                {winner.redeemedAt
                    ? format(parseISO(winner.redeemedAt), t('dateFormat'), {
                          locale: esLocale,
                      })
                    : '—'}
            </TableCell>
        </TableRow>
    );
}
