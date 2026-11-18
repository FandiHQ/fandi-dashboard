'use client';

/**
 * Fan withdrawals (Terms §6) — platform admins only. Withdrawals that use
 * balance from top-ups of the last 30 days (chargeback / stolen-card risk)
 * or whose account holder could not be matched to the fan's KYC wait here
 * for a person. Approve = send by ACH now (asks first: money out cannot be
 * undone). Reject = the gross amount goes back to the fan's wallet, with
 * the reason the fan will see. The API re-checks the persisted admin role.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Loader2, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { withdrawalsAdminApi } from '@/lib/api-hooks';
import { formatCop } from '@/lib/currency';
import type { AdminWithdrawal, WithdrawalStatus } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

const FILTERS: (WithdrawalStatus | 'all')[] = ['in_review', 'processing', 'failed', 'paid', 'rejected', 'all'];
const KEY = (status: WithdrawalStatus | 'all') => ['admin', 'withdrawals', status] as const;

export default function WithdrawalsAdminPage() {
    const t = useTranslations('withdrawalsAdmin');
    const { user } = useAuth();
    if (user?.role !== 'admin') {
        return <p className="text-sm text-lilac">{t('noAccess')}</p>;
    }
    return <WithdrawalsReview />;
}

function WithdrawalsReview() {
    const t = useTranslations('withdrawalsAdmin');
    const tCommon = useTranslations('common');
    const queryClient = useQueryClient();
    const { confirm, dialog } = useConfirmDialog();
    const [filter, setFilter] = useState<WithdrawalStatus | 'all'>('in_review');
    const [rejecting, setRejecting] = useState<AdminWithdrawal | null>(null);
    const [reason, setReason] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: KEY(filter),
        queryFn: () => withdrawalsAdminApi.list(filter === 'all' ? undefined : filter),
    });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawals'] });
    const onError = (err: unknown) => toast.error(err instanceof Error ? err.message : t('error'));

    const approve = useMutation({
        mutationFn: (id: string) => withdrawalsAdminApi.approve(id),
        onSuccess: () => {
            toast.success(t('approved'));
            void refresh();
        },
        onError,
    });
    const reject = useMutation({
        mutationFn: ({ id, why }: { id: string; why: string }) => withdrawalsAdminApi.reject(id, why),
        onSuccess: () => {
            toast.success(t('rejected'));
            setRejecting(null);
            setReason('');
            void refresh();
        },
        onError,
    });
    const reconcile = useMutation({
        mutationFn: () => withdrawalsAdminApi.reconcile(),
        onSuccess: (r) => {
            toast.success(t('reconciled', r));
            void refresh();
        },
        onError,
    });

    const askApprove = async (w: AdminWithdrawal) => {
        const ok = await confirm({
            title: t('confirmTitle', { net: formatCop(w.netCop), fan: w.fanName ?? 'Fan' }),
            description: t('confirmBody', { bank: w.bankName ?? '', last4: w.accountLast4 }),
            confirmLabel: t('confirm'),
            cancelLabel: t('cancel'),
            tone: 'default',
        });
        if (ok) approve.mutate(w.id);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="font-hero text-4xl text-white">{t('title')}</h1>
                    <p className="mt-2 max-w-3xl text-sm text-lilac">{t('lead')}</p>
                </div>
                <Button variant="secondary" onClick={() => reconcile.mutate()} disabled={reconcile.isPending}>
                    {reconcile.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {t('reconcile')}
                </Button>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label={t('cols.status')}>
                {FILTERS.map((f) => (
                    <button
                        key={f}
                        type="button"
                        onClick={() => setFilter(f)}
                        aria-pressed={filter === f}
                        className={`h-9 cursor-pointer rounded-[10px] border-2 border-ink px-3 text-[12px] font-extrabold uppercase ${filter === f ? 'bg-lime text-ink' : 'bg-white text-ink'}`}
                    >
                        {f === 'all' ? t('filterAll') : t(`status.${f}`)}
                    </button>
                ))}
            </div>

            <div className="block-white overflow-x-auto">
                {isLoading ? (
                    <div className="flex flex-col gap-2 p-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : !data || data.length === 0 ? (
                    <p className="p-6 text-sm text-ink">{t('empty')}</p>
                ) : (
                    <table className="w-full min-w-[920px] text-left text-sm text-ink" data-testid="withdrawals-table">
                        <thead>
                            <tr className="border-b-2 border-ink">
                                {(['fan', 'amount', 'fee', 'net', 'account', 'recent', 'status', 'created'] as const).map((c) => (
                                    <th key={c} className="label-mono px-3 py-2 text-muted-white">
                                        {t(`cols.${c}`)}
                                    </th>
                                ))}
                                <th className="px-3 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((w) => (
                                <tr key={w.id} className="border-b border-line-white align-top">
                                    <td className="px-3 py-2.5 font-bold">{w.fanName ?? tCommon('noName')}</td>
                                    <td className="px-3 py-2.5">{formatCop(w.grossCop)}</td>
                                    <td className="px-3 py-2.5">
                                        {w.feeWaivedReason ? t('feeWaived') : formatCop(w.feeCop)}
                                    </td>
                                    <td className="px-3 py-2.5 font-bold">{formatCop(w.netCop)}</td>
                                    <td className="px-3 py-2.5">
                                        {w.bankName ?? t('accountFallback')} ····{w.accountLast4}
                                    </td>
                                    <td className="px-3 py-2.5">{formatCop(w.recentTopupsCop)}</td>
                                    <td className="px-3 py-2.5">
                                        <span className="font-bold">{t(`status.${w.status}`)}</span>
                                        {w.reviewReason && w.status === 'in_review' && (
                                            <span className="block text-[12px]">
                                                {t.has(`reason.${w.reviewReason}`) ? t(`reason.${w.reviewReason}`) : w.reviewReason}
                                            </span>
                                        )}
                                        {(w.failureReason || w.lastError) && (
                                            <span className="block text-[12px] text-alert-white">
                                                {w.failureReason ?? w.lastError}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                        {new Date(w.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        {w.status === 'in_review' && (
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => void askApprove(w)} disabled={approve.isPending}>
                                                    <Check size={14} /> {t('approve')}
                                                </Button>
                                                <Button size="sm" variant="secondary" onClick={() => setRejecting(w)}>
                                                    <X size={14} /> {t('reject')}
                                                </Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Sheet open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
                <SheetContent className="surface-white">
                    <SheetHeader>
                        <SheetTitle className="font-display text-[22px]">{t('reject')}</SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col gap-3 px-4">
                        <label className="label-mono text-muted-white" htmlFor="reject-reason">
                            {t('rejectReason')}
                        </label>
                        <Textarea
                            id="reject-reason"
                            value={reason}
                            maxLength={500}
                            rows={4}
                            placeholder={t('rejectPlaceholder')}
                            onChange={(e) => setReason(e.target.value)}
                        />
                        <Button
                            variant="destructive"
                            disabled={reason.trim().length < 3 || reject.isPending}
                            onClick={() => rejecting && reject.mutate({ id: rejecting.id, why: reason.trim() })}
                        >
                            {reject.isPending && <Loader2 size={14} className="animate-spin" />}
                            {t('reject')}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
            {dialog}
        </div>
    );
}
