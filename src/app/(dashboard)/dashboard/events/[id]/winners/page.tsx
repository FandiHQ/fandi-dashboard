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
import { formatFandis } from '@/lib/currency';
import { slugifyForFilename } from '@/lib/slugify';
import { triggerBrowserDownload } from '@/lib/download';
import {
    statusColors,
    textColors,
    type RedemptionStatus,
} from '@/lib/chart-colors';
import { Badge } from '@/components/ui/badge';
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
                <div className="hud-card hud-brackets px-8 py-6">
                    <p
                        className="font-space-mono text-sm uppercase tracking-[1px]"
                        style={{ color: textColors.secondary }}
                    >
                        {t('unavailableOnDraft')}
                    </p>
                </div>
            </div>
        );
    }

    // ─── Loading skeleton ────────────────────────────────────
    if (isLoading && !winners) {
        return (
            <div className="flex flex-col gap-6 py-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-none bg-[#1E1E1E]" />
                    ))}
                </div>
                <Skeleton className="h-10 w-full max-w-md rounded-none bg-[#1E1E1E]" />
                {[0, 1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-none bg-[#1E1E1E]" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 py-6">
            {/* ─── Stats bar (4 clickable chips) ─── */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatChip
                    label={t('total')}
                    value={winners?.total ?? 0}
                    color={textColors.primary}
                    active={false}
                    onClick={() => setStatus(undefined)}
                />
                {STATUS_VALUES.map((status) => (
                    <StatChip
                        key={status}
                        label={t(`status.${status}`)}
                        value={countByStatus[status]}
                        color={statusColors[status]}
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
                    <SelectTrigger className="h-10 w-44 rounded-none border-[#1E1E1E] bg-transparent font-space-mono text-sm">
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
                    <SelectTrigger className="h-10 w-44 rounded-none border-[#1E1E1E] bg-transparent font-space-mono text-sm">
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
                    <button
                        onClick={() => exportMutation.mutate()}
                        disabled={exportMutation.isPending}
                        className="ml-auto flex cursor-pointer items-center gap-2 rounded-none border border-[#2A2A2A] bg-transparent px-5 py-2.5 font-space-mono text-sm uppercase tracking-[1px] text-[#A0A0A0] transition-all duration-150 hover:border-[#2D00F7] hover:text-white hover:shadow-[0_0_20px_rgba(45,0,247,0.3)] disabled:opacity-50"
                    >
                        {exportMutation.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Download size={14} />
                        )}
                        {t('exportCsv')}
                    </button>
                )}
            </div>

            {/* ─── Table ─── */}
            {winners && winners.items.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                    <p
                        className="font-space-mono text-sm"
                        style={{ color: textColors.muted }}
                    >
                        {t('empty')}
                    </p>
                </div>
            ) : (
                <Table className="border-collapse">
                    <TableHeader>
                        <TableRow className="border-b border-[#1E1E1E] hover:bg-transparent">
                            <TableHead className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                {t('col.fan')}
                            </TableHead>
                            <TableHead className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                {t('col.prize')}
                            </TableHead>
                            <TableHead className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                {t('col.escuadra')}
                            </TableHead>
                            <TableHead className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                {t('col.amount')}
                            </TableHead>
                            <TableHead className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                {t('col.status')}
                            </TableHead>
                            <TableHead className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                {t('col.redeemedAt')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(winners?.items ?? []).map((w) => (
                            <WinnerRow key={w.winnerId} winner={w} t={t} />
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* ─── Pagination ─── */}
            {winners && winners.total > winners.limit && (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => setPage(filters.page - 1)}
                        disabled={filters.page <= 1}
                        className="cursor-pointer rounded-none border border-[#1E1E1E] bg-transparent px-3 py-1.5 font-space-mono text-xs uppercase tracking-[1px] text-[#A0A0A0] transition-colors hover:border-[#2D00F7] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#1E1E1E] disabled:hover:text-[#A0A0A0]"
                    >
                        ←
                    </button>
                    <span
                        className="font-space-mono text-xs"
                        style={{ color: textColors.muted }}
                    >
                        {filters.page} / {Math.max(1, Math.ceil(winners.total / winners.limit))}
                    </span>
                    <button
                        onClick={() => setPage(filters.page + 1)}
                        disabled={!hasMore}
                        className="cursor-pointer rounded-none border border-[#1E1E1E] bg-transparent px-3 py-1.5 font-space-mono text-xs uppercase tracking-[1px] text-[#A0A0A0] transition-colors hover:border-[#2D00F7] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#1E1E1E] disabled:hover:text-[#A0A0A0]"
                    >
                        →
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Stat chip ───────────────────────────────────────────────

interface StatChipProps {
    label: string;
    value: number;
    color: string;
    active: boolean;
    onClick: () => void;
}

function StatChip({ label, value, color, active, onClick }: StatChipProps) {
    return (
        <button
            onClick={onClick}
            className="hud-card group flex cursor-pointer flex-col gap-1 px-4 py-3 text-left transition-colors"
            style={{
                borderColor: active ? color : 'rgba(255,255,255,0.03)',
                borderWidth: active ? 2 : 1,
            }}
        >
            <span
                className="font-space-mono text-[10px] uppercase tracking-[2px]"
                style={{ color: active ? color : textColors.muted }}
            >
                {label}
            </span>
            <span
                className="font-sora text-2xl font-bold tabular-nums"
                style={{ color: active ? color : textColors.primary }}
            >
                {value}
            </span>
        </button>
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
    const statusColor = statusColors[status];

    return (
        <TableRow className="border-b border-[#1A1A1A] hover:bg-[#0A0A0A]">
            <TableCell className="font-sora text-sm text-white">
                {winner.fanName}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <span className="font-sora text-sm text-white">
                        {winner.prizeName}
                    </span>
                    <Badge
                        variant="outline"
                        className="rounded-none border-[#2A2A2A] font-space-mono text-[10px] uppercase tracking-[1px] text-[#A0A0A0]"
                    >
                        {t(`prizeType.${winner.prizeType}`)}
                    </Badge>
                </div>
            </TableCell>
            <TableCell>
                {winner.escuadraLevel !== null ? (
                    <Badge
                        variant="outline"
                        className="rounded-none font-space-mono text-[10px] uppercase tracking-[1px]"
                        style={{
                            color: textColors.primary,
                            borderColor: textColors.dim,
                        }}
                    >
                        {t('escuadraLevel', { level: winner.escuadraLevel })}
                    </Badge>
                ) : (
                    <span style={{ color: textColors.dim }}>—</span>
                )}
            </TableCell>
            <TableCell className="font-sora text-sm tabular-nums text-white">
                {formatFandis(winner.finalAmount)} F
            </TableCell>
            <TableCell>
                <Badge
                    variant="outline"
                    className="rounded-none font-space-mono text-[10px] uppercase tracking-[1px]"
                    style={{ color: statusColor, borderColor: statusColor }}
                >
                    {t(`status.${status}`)}
                </Badge>
            </TableCell>
            <TableCell className="font-space-mono text-xs text-[#A0A0A0]">
                {winner.redeemedAt
                    ? format(parseISO(winner.redeemedAt), t('dateFormat'), {
                          locale: esLocale,
                      })
                    : '—'}
            </TableCell>
        </TableRow>
    );
}
