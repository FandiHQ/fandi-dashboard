'use client';

/**
 * Fandi Admin › Fans › one account: profile, team, balance, the last 50
 * ledger rows, KYC (with the manual flag for the reinforced verification),
 * withdrawals and top-ups. Opening it writes `user.view` to the audit log,
 * so the data is read once and not refetched on focus; flag/unflag update
 * the cached view instead of reading (and auditing) it again.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Flag, FlagOff, History, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatCop, formatFandis } from '@/lib/currency';
import { adminApi, adminKeys, type AdminKycVerification, type AdminUserDetail } from '@/lib/admin-api';
import { KYC_REASON_MAX, formatDateOnly, kycStatusKey, validKycReason } from '@/lib/admin';
import {
    AdminEmpty, AdminError, AdminPill, AdminTableCard, ColombiaTime, ERROR_TEXT_CLASS, FIELD_LABEL_CLASS,
    HINT_CLASS, TD_CLASS, TH_CLASS, useAdminErrorText, useColombiaTime,
} from './admin-ui';
import { RecordedNote } from './fans-screen';

export function FanDetailScreen({ userId }: { userId: string }) {
    const t = useTranslations('fandiAdmin.fanDetail');
    const params = useSearchParams();
    const backQuery = (params.get('q') ?? '').trim();
    const backHref = backQuery ? `/admin/fans?q=${encodeURIComponent(backQuery)}` : '/admin/fans';

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: adminKeys.user(userId),
        queryFn: () => adminApi.user(userId),
        staleTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: false,
    });

    return (
        <div className="flex flex-col gap-6" data-testid="admin-fan-detail">
            <Link
                href={backHref}
                className="inline-flex w-fit items-center gap-2 text-sm font-bold text-white underline decoration-2 underline-offset-4 hover:decoration-lime"
            >
                <ArrowLeft size={16} aria-hidden="true" />
                {t('back')}
            </Link>
            <RecordedNote>{t('recordedNote')}</RecordedNote>

            {isLoading ? (
                <div className="grid gap-4 lg:grid-cols-3" aria-busy="true">
                    <Skeleton className="h-64 rounded-[16px] lg:col-span-2" />
                    <Skeleton className="h-64 rounded-[16px]" />
                </div>
            ) : isError || !data ? (
                <div className="block-white">
                    <AdminError error={error} onRetry={() => void refetch()} />
                </div>
            ) : (
                <FanDetail detail={data} />
            )}
        </div>
    );
}

function FanDetail({ detail }: { detail: AdminUserDetail }) {
    const t = useTranslations('fandiAdmin.fanDetail');
    const tFans = useTranslations('fandiAdmin.fans');
    const tCommon = useTranslations('fandiAdmin.common');
    const locale = useLocale();
    const formatTime = useColombiaTime();
    const { profile } = detail;
    const notSet = <span className="text-muted-white">{t('notSet')}</span>;
    const roleLabel = tFans.has(`roles.${profile.role}`) ? tFans(`roles.${profile.role}`) : profile.role;

    const rows: [string, React.ReactNode][] = [
        [t('fields.email'), profile.email ?? notSet],
        [t('fields.phone'), profile.phone ?? notSet],
        [t('fields.role'), roleLabel],
        [t('fields.instagram'), profile.instagramHandle ? `@${profile.instagramHandle}` : notSet],
        [t('fields.birthDate'), formatDateOnly(profile.birthDate, locale) ?? notSet],
        [t('fields.city'), profile.city ?? notSet],
        [t('fields.publicProfile'), profile.isPublicProfile ? tCommon('yes') : tCommon('no')],
        [
            t('fields.terms'),
            profile.termsAcceptedAt
                ? t('termsValue', { date: formatTime(profile.termsAcceptedAt) ?? '', version: profile.termsVersion ?? '?' })
                : notSet,
        ],
        [t('fields.created'), <ColombiaTime key="created" value={profile.createdAt} />],
        [t('fields.id'), <span key="id" className="break-all font-space-mono text-[12px]">{profile.id}</span>],
    ];

    return (
        <>
            <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-hero min-w-0 break-words text-[34px] text-white sm:text-[44px]">
                    {profile.displayName ?? tCommon('noName')}
                </h1>
                {profile.deletedAt ? <AdminPill tone="alert">{tFans('deleted')}</AdminPill> : <AdminPill tone="live">{tFans('active')}</AdminPill>}
            </div>

            {profile.deletedAt && (
                <p className="rounded-[12px] border-2 border-ink bg-white px-4 py-3 text-sm font-semibold text-ink" role="note">
                    {t('deletedBanner', { date: formatTime(profile.deletedAt) ?? '' })}
                </p>
            )}

            <div className="grid min-w-0 gap-4 lg:grid-cols-3">
                <section className="block-white min-w-0 p-5 lg:col-span-2" aria-labelledby="fan-profile-title">
                    <h2 id="fan-profile-title" className="font-display text-[20px]">{t('profile')}</h2>
                    <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                        {rows.map(([label, value]) => (
                            <div key={label} className="min-w-0">
                                <dt className={FIELD_LABEL_CLASS}>{label}</dt>
                                <dd className="mt-0.5 break-words text-sm font-semibold text-ink">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <div className="flex min-w-0 flex-col gap-4">
                    <section className="block-white p-5" aria-labelledby="fan-balance-title">
                        <h2 id="fan-balance-title" className="label-mono text-[11px] text-muted-white">{t('balance')}</h2>
                        <p className="mt-1 font-display text-[38px] tabular text-ink">{formatCop(detail.balance)}</p>
                        <p className="text-sm text-muted-white">{t('balanceFandis', { fandis: formatFandis(detail.balance) })}</p>
                    </section>
                    <section className="block-white p-5" aria-labelledby="fan-org-title">
                        <h2 id="fan-org-title" className="label-mono text-[11px] text-muted-white">{t('organization')}</h2>
                        {detail.organization ? (
                            <p className="mt-1 text-sm font-bold text-ink">
                                {detail.organization.name}
                                <span className="block font-semibold text-muted-white">
                                    {t.has(`orgRoles.${detail.organization.role}`) ? t(`orgRoles.${detail.organization.role}`) : detail.organization.role}
                                </span>
                            </p>
                        ) : (
                            <p className="mt-1 text-sm text-muted-white">{t('noOrganization')}</p>
                        )}
                    </section>
                    <Button asChild variant="secondary">
                        <Link href={`/admin/audit?targetType=user&targetId=${encodeURIComponent(profile.id)}`}>
                            <History size={14} aria-hidden="true" />
                            {t('viewAudit')}
                        </Link>
                    </Button>
                </div>
            </div>

            <KycSection detail={detail} />
            <LedgerSection detail={detail} />
            <WithdrawalsSection detail={detail} />
            <TopupsSection detail={detail} />
        </>
    );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
    return <h2 id={id} className="font-display text-[22px] text-white">{children}</h2>;
}

function KycSection({ detail }: { detail: AdminUserDetail }) {
    const t = useTranslations('fandiAdmin.fanDetail');
    const tCommon = useTranslations('fandiAdmin.common');
    const queryClient = useQueryClient();
    const errorText = useAdminErrorText();
    const formatTime = useColombiaTime();
    const { confirm, dialog } = useConfirmDialog();
    const [flagging, setFlagging] = useState(false);
    const [reason, setReason] = useState('');
    const [deciding, setDeciding] = useState<{ verification: AdminKycVerification; approved: boolean } | null>(null);
    const [notes, setNotes] = useState('');
    const userId = detail.profile.id;
    const { kyc } = detail;
    const verifications = kyc.verifications ?? [];

    const patchKyc = (next: Partial<AdminUserDetail['kyc']>) =>
        queryClient.setQueryData<AdminUserDetail>(adminKeys.user(userId), (current) =>
            current ? { ...current, kyc: { ...current.kyc, ...next } } : current,
        );

    const flag = useMutation({
        mutationFn: (why: string) => adminApi.flagKyc(userId, why),
        onSuccess: (_, why) => {
            patchKyc({ flagged: true, flagReason: why.trim(), flaggedAt: new Date().toISOString() });
            toast.success(t('flagDone'));
            setFlagging(false);
            setReason('');
        },
    });
    const unflag = useMutation({
        mutationFn: () => adminApi.unflagKyc(userId),
        onSuccess: () => {
            patchKyc({ flagged: false, flagReason: null, flaggedAt: null });
            toast.success(t('unflagDone'));
        },
        onError: (err) => toast.error(errorText(err)),
    });

    // A manual decision (Didit sent it to review): approve or decline with
    // a note, recorded in the audit log by the API.
    const decide = useMutation({
        mutationFn: ({ id, approved, why }: { id: string; approved: boolean; why: string }) =>
            adminApi.decideKyc(id, approved, why),
        onSuccess: (_, { id, approved }) => {
            patchKyc({
                verifications: verifications.map((v) =>
                    v.id === id ? { ...v, status: approved ? 'approved' : 'declined', decidedAt: new Date().toISOString() } : v,
                ),
            });
            toast.success(t(approved ? 'decideApproved' : 'decideDeclined'));
            setDeciding(null);
            setNotes('');
        },
    });

    const askUnflag = async () => {
        const ok = await confirm({
            title: t('unflagTitle'),
            description: t('unflagBody'),
            confirmLabel: t('unflag'),
            cancelLabel: tCommon('cancel'),
            tone: 'default',
        });
        if (ok) unflag.mutate();
    };

    return (
        <section className="flex flex-col gap-3" aria-labelledby="fan-kyc-title">
            <SectionTitle id="fan-kyc-title">{t('kyc')}</SectionTitle>
            <div className="block-white flex flex-col gap-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    {(['prize', 'stepup'] as const).map((level) => (
                        <div key={level}>
                            <p className={FIELD_LABEL_CLASS}>{t(`kycLevels.${level}`)}</p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                                {t(`kycStatus.${kycStatusKey(kyc[level].status)}`)}
                                {kyc[level].approved && kycStatusKey(kyc[level].status) !== 'approved' && (
                                    <AdminPill>{t('kycApproved')}</AdminPill>
                                )}
                            </p>
                        </div>
                    ))}
                </div>
                <p className={HINT_CLASS}>{t('kycThreshold', { amount: formatCop(kyc.stepupThresholdCop) })}</p>
                <div className="h-0.5 bg-line-white" aria-hidden="true" />
                <div className="flex flex-wrap items-start justify-between gap-3">
                    {kyc.flagged ? (
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-alert-white">{t('flagged')}</p>
                            {(kyc.flagReason || kyc.flaggedAt) && (
                                <p className="mt-0.5 break-words text-sm text-ink">
                                    {t('flaggedSince', { date: formatTime(kyc.flaggedAt) ?? '', reason: kyc.flagReason ?? '' })}
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm font-semibold text-ink">{t('notFlagged')}</p>
                    )}
                    {kyc.flagged ? (
                        <Button variant="secondary" size="sm" onClick={() => void askUnflag()} disabled={unflag.isPending}>
                            {unflag.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <FlagOff size={14} aria-hidden="true" />}
                            {t('unflag')}
                        </Button>
                    ) : (
                        <Button variant="secondary" size="sm" onClick={() => setFlagging(true)} disabled={Boolean(detail.profile.deletedAt)}>
                            <Flag size={14} aria-hidden="true" />
                            {t('flag')}
                        </Button>
                    )}
                </div>
                <div className="h-0.5 bg-line-white" aria-hidden="true" />
                <div className="flex flex-col gap-2">
                    <p className={FIELD_LABEL_CLASS}>{t('verifications')}</p>
                    {verifications.length === 0 ? (
                        <p className="text-sm text-muted-white">{t('noVerifications')}</p>
                    ) : (
                        <ul className="flex flex-col divide-y-2 divide-line-white">
                            {verifications.map((v) => (
                                <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                                    <div className="min-w-0 text-sm">
                                        <p className="font-bold text-ink">
                                            {t('verificationTitle', {
                                                level: t.has(`kycLevels.${v.level}`) ? t(`kycLevels.${v.level}`) : v.level,
                                                status: t(`kycStatus.${kycStatusKey(v.status)}`),
                                            })}
                                        </p>
                                        <p className="text-muted-white">
                                            {t('verificationMeta', { date: formatTime(v.createdAt) ?? '', reason: t.has(`kycReasons.${v.reason}`) ? t(`kycReasons.${v.reason}`) : v.reason })}
                                        </p>
                                    </div>
                                    {v.status === 'in_review' && !detail.profile.deletedAt && (
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => setDeciding({ verification: v, approved: true })}>
                                                <Check size={14} aria-hidden="true" />
                                                {t('approve')}
                                            </Button>
                                            <Button size="sm" variant="secondary" onClick={() => setDeciding({ verification: v, approved: false })}>
                                                <X size={14} aria-hidden="true" />
                                                {t('decline')}
                                            </Button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <Sheet open={deciding !== null} onOpenChange={(open) => { if (!open) { setDeciding(null); setNotes(''); decide.reset(); } }}>
                <SheetContent side="right" className="gap-0">
                    <SheetHeader className="border-b-2 border-ink px-6 pb-4 pt-6 pr-16">
                        <SheetTitle>{t(deciding?.approved ? 'approveTitle' : 'declineTitle')}</SheetTitle>
                        <SheetDescription>{t('decideHint')}</SheetDescription>
                    </SheetHeader>
                    <form
                        className="flex min-h-0 flex-1 flex-col"
                        noValidate
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (deciding && validKycReason(notes)) {
                                decide.mutate({ id: deciding.verification.id, approved: deciding.approved, why: notes });
                            }
                        }}
                    >
                        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-6 py-6">
                            <label htmlFor="kyc-decision-notes" className={FIELD_LABEL_CLASS}>{t('decideNotes')}</label>
                            <Textarea
                                id="kyc-decision-notes"
                                value={notes}
                                maxLength={KYC_REASON_MAX}
                                rows={4}
                                onChange={(e) => { setNotes(e.target.value); if (decide.isError) decide.reset(); }}
                                autoFocus
                            />
                            {decide.isError && <p role="alert" className={ERROR_TEXT_CLASS}>{errorText(decide.error)}</p>}
                        </div>
                        <SheetFooter className="border-t-2 border-ink px-6 py-4">
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full"
                                variant={deciding?.approved ? undefined : 'secondary'}
                                disabled={!validKycReason(notes) || decide.isPending}
                            >
                                {decide.isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                                {t(deciding?.approved ? 'approveSubmit' : 'declineSubmit')}
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>

            <Sheet open={flagging} onOpenChange={(open) => { setFlagging(open); if (!open) flag.reset(); }}>
                <SheetContent side="right" className="gap-0">
                    <SheetHeader className="border-b-2 border-ink px-6 pb-4 pt-6 pr-16">
                        <SheetTitle>{t('flagTitle')}</SheetTitle>
                        <SheetDescription>{t('flagHint')}</SheetDescription>
                    </SheetHeader>
                    <form
                        className="flex min-h-0 flex-1 flex-col"
                        noValidate
                        onSubmit={(e) => { e.preventDefault(); if (validKycReason(reason)) flag.mutate(reason); }}
                    >
                        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-6 py-6">
                            <label htmlFor="kyc-flag-reason" className={FIELD_LABEL_CLASS}>{t('flagReason')}</label>
                            <Textarea
                                id="kyc-flag-reason"
                                value={reason}
                                maxLength={KYC_REASON_MAX}
                                rows={4}
                                placeholder={t('flagPlaceholder')}
                                onChange={(e) => { setReason(e.target.value); if (flag.isError) flag.reset(); }}
                                aria-describedby="kyc-flag-reason-hint"
                                autoFocus
                            />
                            <p id="kyc-flag-reason-hint" className={HINT_CLASS}>{t('flagReasonHint')}</p>
                            {flag.isError && <p role="alert" className={ERROR_TEXT_CLASS}>{errorText(flag.error)}</p>}
                        </div>
                        <SheetFooter className="border-t-2 border-ink px-6 py-4">
                            <Button type="submit" size="lg" className="w-full" disabled={!validKycReason(reason) || flag.isPending}>
                                {flag.isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                                {t('flagSubmit')}
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>
            {dialog}
        </section>
    );
}

function LedgerSection({ detail }: { detail: AdminUserDetail }) {
    const t = useTranslations('fandiAdmin.fanDetail');
    return (
        <section className="flex flex-col gap-3" aria-labelledby="fan-ledger-title">
            <SectionTitle id="fan-ledger-title">{t('ledger')}</SectionTitle>
            <AdminTableCard testId="fan-ledger">
                {detail.ledger.length === 0 ? (
                    <AdminEmpty>{t('ledgerEmpty')}</AdminEmpty>
                ) : (
                    <table className="w-full min-w-[820px] text-left text-sm text-ink">
                        <thead>
                            <tr className="border-b-2 border-ink">
                                {(['date', 'type', 'amount', 'balanceAfter', 'status', 'reference'] as const).map((c) => (
                                    <th key={c} scope="col" className={TH_CLASS}>{t(`ledgerCols.${c}`)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {detail.ledger.map((row) => (
                                <tr key={row.id} className="border-b border-line-white last:border-b-0">
                                    <td className={TD_CLASS}><ColombiaTime value={row.createdAt} /></td>
                                    <td className={TD_CLASS}>{t.has(`ledgerTypes.${row.type}`) ? t(`ledgerTypes.${row.type}`) : row.type}</td>
                                    <td className={`${TD_CLASS} font-bold tabular`}>{formatCop(row.amount)}</td>
                                    <td className={`${TD_CLASS} tabular`}>{formatCop(row.balanceAfter)}</td>
                                    <td className={TD_CLASS}>{t.has(`ledgerStatus.${row.status}`) ? t(`ledgerStatus.${row.status}`) : row.status}</td>
                                    <td className={`${TD_CLASS} break-all font-space-mono text-[11px] text-muted-white`}>
                                        {[row.referenceType, row.providerRef ?? row.referenceId].filter(Boolean).join(' · ')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </AdminTableCard>
        </section>
    );
}

function WithdrawalsSection({ detail }: { detail: AdminUserDetail }) {
    const t = useTranslations('fandiAdmin.fanDetail');
    return (
        <section className="flex flex-col gap-3" aria-labelledby="fan-withdrawals-title">
            <SectionTitle id="fan-withdrawals-title">{t('withdrawals')}</SectionTitle>
            <AdminTableCard testId="fan-withdrawals">
                {detail.withdrawals.length === 0 ? (
                    <AdminEmpty>{t('withdrawalsEmpty')}</AdminEmpty>
                ) : (
                    <table className="w-full min-w-[760px] text-left text-sm text-ink">
                        <thead>
                            <tr className="border-b-2 border-ink">
                                {(['date', 'gross', 'fee', 'net', 'status', 'detail'] as const).map((c) => (
                                    <th key={c} scope="col" className={TH_CLASS}>{t(`withdrawalCols.${c}`)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {detail.withdrawals.map((w) => (
                                <tr key={w.id} className="border-b border-line-white last:border-b-0">
                                    <td className={TD_CLASS}><ColombiaTime value={w.createdAt} /></td>
                                    <td className={`${TD_CLASS} tabular`}>{formatCop(w.grossCop)}</td>
                                    <td className={`${TD_CLASS} tabular`}>{formatCop(w.feeCop)}</td>
                                    <td className={`${TD_CLASS} font-bold tabular`}>{formatCop(w.netCop)}</td>
                                    <td className={`${TD_CLASS} font-semibold`}>
                                        {t.has(`withdrawalStatus.${w.status}`) ? t(`withdrawalStatus.${w.status}`) : w.status}
                                    </td>
                                    <td className={`${TD_CLASS} text-[12px]`}>
                                        {w.reviewReason && (
                                            <span className="block">
                                                {t.has(`withdrawalReason.${w.reviewReason}`) ? t(`withdrawalReason.${w.reviewReason}`) : w.reviewReason}
                                            </span>
                                        )}
                                        {w.failureReason && <span className="block text-alert-white">{w.failureReason}</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </AdminTableCard>
        </section>
    );
}

function TopupsSection({ detail }: { detail: AdminUserDetail }) {
    const t = useTranslations('fandiAdmin.fanDetail');
    return (
        <section className="flex flex-col gap-3" aria-labelledby="fan-topups-title">
            <SectionTitle id="fan-topups-title">{t('topups')}</SectionTitle>
            <AdminTableCard testId="fan-topups">
                {detail.topups.length === 0 ? (
                    <AdminEmpty>{t('topupsEmpty')}</AdminEmpty>
                ) : (
                    <table className="w-full min-w-[720px] text-left text-sm text-ink">
                        <thead>
                            <tr className="border-b-2 border-ink">
                                {(['date', 'amount', 'reference', 'status', 'detail'] as const).map((c) => (
                                    <th key={c} scope="col" className={TH_CLASS}>{t(`topupCols.${c}`)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {detail.topups.map((p) => (
                                <tr key={p.id} className="border-b border-line-white last:border-b-0">
                                    <td className={TD_CLASS}><ColombiaTime value={p.createdAt} /></td>
                                    <td className={`${TD_CLASS} font-bold tabular`}>{formatCop(p.amount)}</td>
                                    <td className={`${TD_CLASS} font-space-mono text-[12px]`}>{p.reference}</td>
                                    <td className={`${TD_CLASS} font-semibold`}>
                                        {t.has(`topupStatus.${p.status}`) ? t(`topupStatus.${p.status}`) : p.status}
                                    </td>
                                    <td className={`${TD_CLASS} text-[12px] text-alert-white`}>{p.failureReason ?? ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </AdminTableCard>
        </section>
    );
}
