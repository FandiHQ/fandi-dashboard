'use client';

/**
 * Fandi Admin › Recargas con problemas: OnePay top-ups pending for more
 * than 10 minutes and not credited (oldest first). Reconciliar asks OnePay
 * about one now (POST /wallet/topups/:id/reconcile, audited) after a
 * confirmation, says what happened and reloads the list.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatCop } from '@/lib/currency';
import { adminApi, adminKeys, type StuckTopup } from '@/lib/admin-api';
import { ADMIN_TOPUPS_PAGE_SIZE, formatWaiting, reconcileOutcome } from '@/lib/admin';
import {
    AdminEmpty, AdminError, AdminPageHeader, AdminPager, AdminPill, AdminTableCard, ColombiaTime,
    TableSkeleton, TD_CLASS, TH_CLASS, useAdminErrorText,
} from './admin-ui';

export function TopupsScreen() {
    const t = useTranslations('fandiAdmin.topups');
    const tCommon = useTranslations('fandiAdmin.common');
    const queryClient = useQueryClient();
    const errorText = useAdminErrorText();
    const { confirm, dialog } = useConfirmDialog();
    const [page, setPage] = useState(1);

    const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
        queryKey: adminKeys.topups(page),
        queryFn: () => adminApi.stuckTopups(page),
        placeholderData: (previous) => previous,
    });

    const reconcile = useMutation({
        mutationFn: (id: string) => adminApi.reconcileTopup(id),
        onSuccess: (result) => {
            const outcome = reconcileOutcome(result.status);
            if (outcome === 'completed') toast.success(t(`outcome.${outcome}`));
            else toast(t(`outcome.${outcome}`));
            void queryClient.invalidateQueries({ queryKey: adminKeys.topupsRoot });
        },
        onError: (err) => toast.error(errorText(err)),
    });

    const ask = async (topup: StuckTopup) => {
        const ok = await confirm({
            title: t('confirmTitle', { amount: formatCop(topup.amount) }),
            description: t('confirmBody', { reference: topup.reference, fan: topup.fanName ?? tCommon('noName') }),
            confirmLabel: t('confirm'),
            cancelLabel: tCommon('cancel'),
            tone: 'default',
        });
        if (ok) reconcile.mutate(topup.id);
    };

    return (
        <div className="flex flex-col gap-6" data-testid="admin-topups">
            <AdminPageHeader
                title={t('title')}
                lead={t('lead')}
                action={
                    <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
                        {isFetching ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
                        {tCommon('refresh')}
                    </Button>
                }
            />

            <AdminTableCard testId="topups-table">
                {isLoading ? (
                    <TableSkeleton />
                ) : isError ? (
                    <AdminError error={error} onRetry={() => void refetch()} />
                ) : !data || data.items.length === 0 ? (
                    <AdminEmpty>{t('empty')}</AdminEmpty>
                ) : (
                    <table className="w-full min-w-[1100px] text-left text-sm text-ink">
                        <thead>
                            <tr className="border-b-2 border-ink">
                                {(['fan', 'amount', 'reference', 'provider', 'waiting', 'attempts', 'next', 'created'] as const).map((c) => (
                                    <th key={c} scope="col" className={TH_CLASS}>{t(`cols.${c}`)}</th>
                                ))}
                                <th scope="col" className={TH_CLASS}><span className="sr-only">{t('reconcile')}</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((topup) => {
                                const busy = reconcile.isPending && reconcile.variables === topup.id;
                                return (
                                    <tr key={topup.id} className="border-b border-line-white last:border-b-0" data-testid="topup-row">
                                        <td className={TD_CLASS}>
                                            <Link
                                                href={`/admin/fans/${topup.userId}`}
                                                className="font-bold underline decoration-2 underline-offset-4 hover:decoration-blue"
                                            >
                                                {topup.fanName ?? tCommon('noName')}
                                            </Link>
                                        </td>
                                        <td className={`${TD_CLASS} font-bold tabular`}>{formatCop(topup.amount)}</td>
                                        <td className={`${TD_CLASS} font-space-mono text-[12px]`}>{topup.reference}</td>
                                        <td className={TD_CLASS}>
                                            {topup.reportedByProvider ? (
                                                <AdminPill>{t('reported')}</AdminPill>
                                            ) : (
                                                <AdminPill tone="quiet">{t('notReported')}</AdminPill>
                                            )}
                                            {topup.failureReason && (
                                                <span className="mt-1 block text-[12px] text-alert-white">{topup.failureReason}</span>
                                            )}
                                        </td>
                                        <td className={`${TD_CLASS} whitespace-nowrap tabular`}>{formatWaiting(topup.minutesWaiting)}</td>
                                        <td className={`${TD_CLASS} tabular`}>{topup.reconcileAttempts}</td>
                                        <td className={TD_CLASS}>
                                            <ColombiaTime value={topup.nextAutoReconcileAt} fallback={t('noNextAttempt')} />
                                        </td>
                                        <td className={TD_CLASS}><ColombiaTime value={topup.createdAt} /></td>
                                        <td className={TD_CLASS}>
                                            <Button size="sm" onClick={() => void ask(topup)} disabled={busy}>
                                                {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
                                                {t('reconcile')}
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </AdminTableCard>

            {data && (
                <AdminPager page={data.page} pageSize={data.pageSize || ADMIN_TOPUPS_PAGE_SIZE} total={data.total} onPage={setPage} />
            )}
            {dialog}
        </div>
    );
}
