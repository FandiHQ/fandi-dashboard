'use client';

/**
 * Fandi Admin › Auditoría: the append-only trail of what the Fandi team
 * did (newest first, 50 per page), filtered by action, target type and
 * target id. The filters and the page live in the URL, so a link such as
 * "Ver su historial" from a fan's page opens it already filtered.
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi, adminKeys, type AuditRow } from '@/lib/admin-api';
import {
    ADMIN_AUDIT_PAGE_SIZE, AUDIT_ACTIONS, AUDIT_TARGET_TYPES, auditActionKey, auditDetailsSummary, auditQueryParams,
    auditTargetHref, auditTargetKey, type AuditFilters,
} from '@/lib/admin';
import {
    AdminEmpty, AdminError, AdminPageHeader, AdminPager, AdminTableCard, ColombiaTime, FIELD_LABEL_CLASS,
    TableSkeleton, TD_CLASS, TH_CLASS,
} from './admin-ui';

const FILTER_SELECT_CLASS =
    'h-11 w-full cursor-pointer rounded-[10px] border-2 border-ink bg-white px-3 text-sm font-semibold text-ink outline-none focus-visible:shadow-ext-sm';

export function AuditScreen() {
    const t = useTranslations('fandiAdmin.audit');
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
    const filters: AuditFilters = {
        action: params.get('action') ?? '',
        targetType: params.get('targetType') ?? '',
        targetId: params.get('targetId') ?? '',
    };
    const hasFilters = Boolean(filters.action || filters.targetType || filters.targetId);

    const go = (nextPage: number, next: AuditFilters) => {
        const query = new URLSearchParams(auditQueryParams(nextPage, next)).toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
    };

    const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
        queryKey: adminKeys.audit(page, filters),
        queryFn: () => adminApi.audit(page, filters),
        placeholderData: (previous) => previous,
    });

    return (
        <div className="flex flex-col gap-6" data-testid="admin-audit">
            <AdminPageHeader title={t('title')} lead={t('lead')} />

            <AuditFiltersForm
                key={`${filters.action}|${filters.targetType}|${filters.targetId}`}
                initial={filters}
                hasFilters={hasFilters}
                onApply={(next) => go(1, next)}
            />

            <AdminTableCard testId="audit-table">
                {isLoading ? (
                    <TableSkeleton rows={6} />
                ) : isError ? (
                    <AdminError error={error} onRetry={() => void refetch()} />
                ) : !data || data.items.length === 0 ? (
                    <AdminEmpty>{t('empty')}</AdminEmpty>
                ) : (
                    <table className={`w-full min-w-[1040px] text-left text-sm text-ink ${isFetching ? 'opacity-70' : ''}`}>
                        <thead>
                            <tr className="border-b-2 border-ink">
                                {(['time', 'actor', 'action', 'target', 'details', 'ip'] as const).map((c) => (
                                    <th key={c} scope="col" className={TH_CLASS}>{t(`cols.${c}`)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((row) => (
                                <AuditRowView
                                    key={row.id}
                                    row={row}
                                    onOnlyThis={() => go(1, { action: '', targetType: row.targetType ?? '', targetId: row.targetId ?? '' })}
                                />
                            ))}
                        </tbody>
                    </table>
                )}
            </AdminTableCard>

            {data && (
                <AdminPager
                    page={data.page}
                    pageSize={data.pageSize || ADMIN_AUDIT_PAGE_SIZE}
                    total={data.total}
                    onPage={(next) => go(next, filters)}
                />
            )}
        </div>
    );
}

function AuditFiltersForm({
    initial, hasFilters, onApply,
}: { initial: AuditFilters; hasFilters: boolean; onApply: (filters: AuditFilters) => void }) {
    const t = useTranslations('fandiAdmin.audit');
    const [draft, setDraft] = useState<AuditFilters>(initial);
    const set = (key: keyof AuditFilters, value: string) => setDraft((d) => ({ ...d, [key]: value }));
    const actionLabel = (action: string) => {
        const key = auditActionKey(action);
        return key ? t(`actions.${key}`) : action;
    };

    return (
        <form
            className="block-white grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]"
            onSubmit={(e) => { e.preventDefault(); onApply({ ...draft, targetId: draft.targetId.trim() }); }}
            aria-label={t('apply')}
        >
            <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor="audit-action" className={FIELD_LABEL_CLASS}>{t('action')}</label>
                <select id="audit-action" value={draft.action} onChange={(e) => set('action', e.target.value)} className={FILTER_SELECT_CLASS}>
                    <option value="">{t('allActions')}</option>
                    {AUDIT_ACTIONS.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
                    {draft.action && !(AUDIT_ACTIONS as readonly string[]).includes(draft.action) && (
                        <option value={draft.action}>{draft.action}</option>
                    )}
                </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor="audit-target-type" className={FIELD_LABEL_CLASS}>{t('targetType')}</label>
                <select id="audit-target-type" value={draft.targetType} onChange={(e) => set('targetType', e.target.value)} className={FILTER_SELECT_CLASS}>
                    <option value="">{t('allTargets')}</option>
                    {AUDIT_TARGET_TYPES.map((type) => <option key={type} value={type}>{t(`targets.${type}`)}</option>)}
                    {draft.targetType && !auditTargetKey(draft.targetType) && (
                        <option value={draft.targetType}>{draft.targetType}</option>
                    )}
                </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor="audit-target-id" className={FIELD_LABEL_CLASS}>{t('targetId')}</label>
                <Input
                    id="audit-target-id"
                    value={draft.targetId}
                    maxLength={64}
                    onChange={(e) => set('targetId', e.target.value)}
                    placeholder={t('targetIdPlaceholder')}
                    className="h-11 font-space-mono text-[12px]"
                    autoComplete="off"
                    spellCheck={false}
                />
            </div>
            <div className="flex items-end gap-2">
                <Button type="submit" className="h-11">
                    <Filter size={14} aria-hidden="true" />
                    {t('apply')}
                </Button>
                {hasFilters && (
                    <Button
                        type="button"
                        variant="secondary"
                        className="h-11"
                        onClick={() => onApply({ action: '', targetType: '', targetId: '' })}
                    >
                        <X size={14} aria-hidden="true" />
                        {t('clear')}
                    </Button>
                )}
            </div>
        </form>
    );
}

function AuditRowView({ row, onOnlyThis }: { row: AuditRow; onOnlyThis: () => void }) {
    const t = useTranslations('fandiAdmin.audit');
    const actionKey = auditActionKey(row.action);
    const targetKey = auditTargetKey(row.targetType);
    const href = auditTargetHref(row.targetType, row.targetId);
    const summary = auditDetailsSummary(row.details);
    const full = Object.keys(row.details ?? {}).length > 0 ? JSON.stringify(row.details, null, 1) : '';

    return (
        <tr className="border-b border-line-white last:border-b-0" data-testid="audit-row">
            <td className={TD_CLASS}><ColombiaTime value={row.createdAt} /></td>
            <td className={TD_CLASS}>
                {row.actor ? (
                    <>
                        <span className="font-semibold">{row.actor.displayName ?? row.actor.email ?? row.actor.userId}</span>
                        {row.actor.displayName && row.actor.email && (
                            <span className="block text-[12px] text-muted-white">{row.actor.email}</span>
                        )}
                    </>
                ) : (
                    <span className="text-muted-white">{t('script')}</span>
                )}
            </td>
            <td className={TD_CLASS}>
                <span className="font-semibold">{actionKey ? t(`actions.${actionKey}`) : row.action}</span>
                <span className="block font-space-mono text-[11px] text-muted-white">{row.action}</span>
            </td>
            <td className={TD_CLASS}>
                {row.targetType || row.targetId ? (
                    <div className="flex flex-col gap-0.5">
                        {row.targetType && <span className="font-semibold">{targetKey ? t(`targets.${targetKey}`) : row.targetType}</span>}
                        {row.targetId && (
                            href ? (
                                <Link href={href} className="break-all font-space-mono text-[11px] underline decoration-2 underline-offset-4 hover:decoration-blue">
                                    {row.targetId}
                                </Link>
                            ) : (
                                <span className="break-all font-space-mono text-[11px] text-muted-white">{row.targetId}</span>
                            )
                        )}
                        {row.targetId && (
                            <button
                                type="button"
                                onClick={onOnlyThis}
                                className="w-fit cursor-pointer text-left text-[12px] font-bold text-blue underline decoration-2 underline-offset-4 hover:decoration-ink"
                            >
                                {t('onlyThis')}
                            </button>
                        )}
                    </div>
                ) : null}
            </td>
            <td className={`${TD_CLASS} max-w-[320px]`}>
                {summary && (
                    <span className="block break-words font-space-mono text-[11px]" title={full}>{summary}</span>
                )}
            </td>
            <td className={`${TD_CLASS} whitespace-nowrap font-space-mono text-[11px] text-muted-white`}>{row.ip ?? ''}</td>
        </tr>
    );
}
