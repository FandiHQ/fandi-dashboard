'use client';

/**
 * Fandi Admin › Fans: support lookup by phone, email, name or id (at
 * least 3 characters, up to 20 accounts). Every search and every opened
 * profile is written to the audit log (Ley 1581), and the page says so.
 * The query lives in the URL (?q=) so "Volver a Fans" comes back to it.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi, adminKeys } from '@/lib/admin-api';
import { canSearchUsers } from '@/lib/admin';
import {
    AdminEmpty, AdminError, AdminPageHeader, AdminPill, AdminTableCard, ColombiaTime, TableSkeleton, TD_CLASS, TH_CLASS,
} from './admin-ui';

const MAX_RESULTS = 20;

export function RecordedNote({ children }: { children: React.ReactNode }) {
    return (
        <p className="flex items-start gap-2 rounded-[12px] border-2 border-ink bg-lilac px-4 py-3 text-[13px] font-semibold leading-snug text-ink" data-testid="audit-note">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{children}</span>
        </p>
    );
}

export function FansScreen() {
    const t = useTranslations('fandiAdmin.fans');
    const tCommon = useTranslations('fandiAdmin.common');
    const router = useRouter();
    const params = useSearchParams();
    const query = (params.get('q') ?? '').trim();
    const [draft, setDraft] = useState(query);
    const [tooShort, setTooShort] = useState(false);
    const ready = canSearchUsers(query);

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: adminKeys.users(query),
        queryFn: () => adminApi.searchUsers(query),
        enabled: ready,
        // Each search is audited: do not repeat it on focus or remount.
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const next = draft.trim();
        if (!canSearchUsers(next)) { setTooShort(true); return; }
        setTooShort(false);
        router.replace(`/admin/fans?q=${encodeURIComponent(next)}`);
    };

    return (
        <div className="flex flex-col gap-6" data-testid="admin-fans">
            <AdminPageHeader title={t('title')} lead={t('lead')} />
            <RecordedNote>{t('recordedNote')}</RecordedNote>

            <form role="search" onSubmit={submit} noValidate className="flex w-full max-w-xl flex-col gap-2">
                <label htmlFor="fan-search" className="sr-only">{t('searchLabel')}</label>
                <div className="flex items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-white" />
                        <Input
                            id="fan-search"
                            type="search"
                            value={draft}
                            maxLength={120}
                            onChange={(e) => { setDraft(e.target.value); setTooShort(false); }}
                            placeholder={t('searchPlaceholder')}
                            aria-invalid={tooShort ? true : undefined}
                            aria-describedby="fan-search-hint"
                            className="h-12 pl-9"
                            autoComplete="off"
                            autoFocus
                        />
                    </div>
                    <Button type="submit" size="lg">{tCommon('search')}</Button>
                </div>
                <p id="fan-search-hint" className={`text-[13px] ${tooShort ? 'font-bold text-alert' : 'text-lilac'}`} role={tooShort ? 'alert' : undefined}>
                    {t('idle')}
                </p>
            </form>

            {ready && (
                <AdminTableCard testId="fans-table">
                    {isLoading ? (
                        <TableSkeleton rows={3} />
                    ) : isError ? (
                        <AdminError error={error} onRetry={() => void refetch()} />
                    ) : !data || data.length === 0 ? (
                        <AdminEmpty>{t('empty', { q: query })}</AdminEmpty>
                    ) : (
                        <>
                            <table className="w-full min-w-[860px] text-left text-sm text-ink">
                                <thead>
                                    <tr className="border-b-2 border-ink">
                                        {(['name', 'email', 'phone', 'role', 'created', 'state'] as const).map((c) => (
                                            <th key={c} scope="col" className={TH_CLASS}>{t(`cols.${c}`)}</th>
                                        ))}
                                        <th scope="col" className={TH_CLASS}><span className="sr-only">{t('open')}</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((u) => (
                                        <tr key={u.id} className="border-b border-line-white last:border-b-0" data-testid="fan-row">
                                            <td className={`${TD_CLASS} font-bold`}>{u.displayName ?? tCommon('noName')}</td>
                                            <td className={TD_CLASS}>{u.email ?? ''}</td>
                                            <td className={`${TD_CLASS} whitespace-nowrap tabular`}>{u.phone ?? ''}</td>
                                            <td className={TD_CLASS}>{t.has(`roles.${u.role}`) ? t(`roles.${u.role}`) : u.role}</td>
                                            <td className={TD_CLASS}><ColombiaTime value={u.createdAt} /></td>
                                            <td className={TD_CLASS}>
                                                {u.deletedAt ? <AdminPill tone="alert">{t('deleted')}</AdminPill> : <AdminPill>{t('active')}</AdminPill>}
                                            </td>
                                            <td className={TD_CLASS}>
                                                <Button asChild size="sm" variant="secondary">
                                                    <Link href={`/admin/fans/${u.id}?q=${encodeURIComponent(query)}`}>
                                                        {t('open')}
                                                        <ChevronRight size={14} aria-hidden="true" />
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {data.length >= MAX_RESULTS && (
                                <p className="border-t-2 border-ink px-4 py-3 text-[13px] text-muted-white">{t('max')}</p>
                            )}
                        </>
                    )}
                </AdminTableCard>
            )}
        </div>
    );
}
