'use client';

/**
 * Fandi Admin › Ídolos: every organization (search by name, 25 per page),
 * Crear ídolo with its owner invitation, resend or change the owner
 * invitation, and the basics (name, visibility).
 */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { MailPlus, Pencil, Plus, Search, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi, adminKeys, type AdminOrganization } from '@/lib/admin-api';
import { ADMIN_ORGS_PAGE_SIZE, ownerInvitationState } from '@/lib/admin';
import {
    AdminEmpty, AdminError, AdminPageHeader, AdminPager, AdminPill, AdminTableCard, ColombiaTime,
    TableSkeleton, TD_CLASS, TH_CLASS, useColombiaTime,
} from './admin-ui';
import { CreateIdolSheet } from './create-idol-sheet';
import { EditIdolSheet } from './edit-idol-sheet';
import { OwnerInvitationSheet } from './owner-invitation-sheet';

const SEARCH_DEBOUNCE_MS = 300;

export function OrganizationsScreen() {
    const t = useTranslations('fandiAdmin.organizations');
    const tCommon = useTranslations('fandiAdmin.common');
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    // The page belongs to one search: a new search starts on page 1.
    const [paging, setPaging] = useState({ query: '', page: 1 });
    const page = paging.query === query ? paging.page : 1;
    const setPage = (next: number) => setPaging({ query, page: next });
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<AdminOrganization | null>(null);
    const [inviting, setInviting] = useState<AdminOrganization | null>(null);

    // Search as the admin types (debounced).
    useEffect(() => {
        const next = search.trim();
        const timer = setTimeout(() => setQuery(next), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
        queryKey: adminKeys.organizations(query, page),
        queryFn: () => adminApi.organizations({ q: query, page }),
        placeholderData: (previous) => previous,
    });

    return (
        <div className="flex flex-col gap-6" data-testid="admin-organizations">
            <AdminPageHeader
                title={t('title')}
                lead={t('lead')}
                action={
                    <Button size="lg" onClick={() => setCreating(true)} data-testid="create-idol">
                        <Plus size={16} aria-hidden="true" />
                        {t('create')}
                    </Button>
                }
            />

            <form
                role="search"
                className="flex w-full max-w-xl items-center gap-2"
                onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); }}
            >
                <label htmlFor="org-search" className="sr-only">{t('searchLabel')}</label>
                <div className="relative min-w-0 flex-1">
                    <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-white" />
                    <Input
                        id="org-search"
                        type="search"
                        value={search}
                        maxLength={80}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        className="h-12 pl-9"
                        autoComplete="off"
                    />
                </div>
                {search && (
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon-lg"
                        aria-label={tCommon('clear')}
                        onClick={() => { setSearch(''); setQuery(''); }}
                    >
                        <X size={16} aria-hidden="true" />
                    </Button>
                )}
            </form>

            <AdminTableCard testId="organizations-table">
                {isLoading ? (
                    <TableSkeleton />
                ) : isError ? (
                    <AdminError error={error} onRetry={() => void refetch()} />
                ) : !data || data.items.length === 0 ? (
                    <AdminEmpty>{query ? t('emptySearch', { q: query }) : t('empty')}</AdminEmpty>
                ) : (
                    <table className={`w-full min-w-[1080px] text-left text-sm text-ink ${isFetching ? 'opacity-70' : ''}`}>
                        <thead>
                            <tr className="border-b-2 border-ink">
                                {(['idol', 'visibility', 'members', 'events', 'owner', 'invitation', 'created'] as const).map((c) => (
                                    <th key={c} scope="col" className={TH_CLASS}>{t(`cols.${c}`)}</th>
                                ))}
                                <th scope="col" className={TH_CLASS}><span className="sr-only">{t('edit')}</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((org) => (
                                <OrganizationRow
                                    key={org.id}
                                    org={org}
                                    onEdit={() => setEditing(org)}
                                    onInvite={() => setInviting(org)}
                                />
                            ))}
                        </tbody>
                    </table>
                )}
            </AdminTableCard>

            {data && (
                <AdminPager page={data.page} pageSize={data.pageSize || ADMIN_ORGS_PAGE_SIZE} total={data.total} onPage={setPage} />
            )}

            <CreateIdolSheet open={creating} onOpenChange={setCreating} />
            <EditIdolSheet org={editing} onClose={() => setEditing(null)} />
            <OwnerInvitationSheet org={inviting} onClose={() => setInviting(null)} />
        </div>
    );
}

function OrganizationRow({
    org, onEdit, onInvite,
}: { org: AdminOrganization; onEdit: () => void; onInvite: () => void }) {
    const t = useTranslations('fandiAdmin.organizations');
    const formatTime = useColombiaTime();
    const invitation = org.ownerInvitation;
    const state = ownerInvitationState(invitation);
    const expires = invitation ? formatTime(invitation.expiresAt) : null;

    return (
        <tr className="border-b border-line-white last:border-b-0" data-testid="organization-row">
            <td className={TD_CLASS}>
                <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border-2 border-ink bg-lilac">
                        {org.avatarUrl ? (
                            <Image src={org.avatarUrl} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" />
                        ) : (
                            <span className="font-display text-sm text-ink" aria-hidden="true">{org.name.charAt(0)}</span>
                        )}
                    </div>
                    <span className="font-bold">{org.name}</span>
                </div>
            </td>
            <td className={TD_CLASS}>
                {org.isPublic ? <AdminPill>{t('public')}</AdminPill> : <AdminPill tone="quiet">{t('private')}</AdminPill>}
            </td>
            <td className={`${TD_CLASS} tabular`}>{org.memberCount}</td>
            <td className={`${TD_CLASS} tabular`}>{org.eventCount}</td>
            <td className={TD_CLASS}>
                {org.owners.length === 0 ? (
                    <span className="text-muted-white">{t('noOwner')}</span>
                ) : (
                    <ul className="flex flex-col gap-1">
                        {org.owners.map((o) => (
                            <li key={o.userId}>
                                <span className="font-semibold">{o.displayName ?? o.email ?? o.userId}</span>
                                {o.displayName && o.email && (
                                    <span className="block text-[12px] text-muted-white">{o.email}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </td>
            <td className={TD_CLASS}>
                {state === 'none' || !invitation ? (
                    <span className="text-muted-white">{t('invitation.none')}</span>
                ) : (
                    <div className="flex flex-col gap-1">
                        <span className={`font-semibold ${state === 'pending' ? '' : 'text-alert-white'}`}>
                            {state === 'needsResend' ? t('invitation.needsResend') : t(`invitation.${state}`, { date: expires ?? '' })}
                        </span>
                        <span className="text-[12px] text-muted-white">{invitation.email}</span>
                        {invitation.lastSentAt && (
                            <span className="text-[12px] text-muted-white">
                                {t('lastSent', { date: formatTime(invitation.lastSentAt) ?? '' })}
                            </span>
                        )}
                    </div>
                )}
            </td>
            <td className={TD_CLASS}><ColombiaTime value={org.createdAt} /></td>
            <td className={TD_CLASS}>
                <div className="flex justify-end gap-2" role="group" aria-label={t('actionsFor', { name: org.name })}>
                    {invitation ? (
                        <Button size="sm" variant={state === 'pending' ? 'secondary' : 'default'} onClick={onInvite}>
                            <Send size={14} aria-hidden="true" />
                            {t('resend')}
                        </Button>
                    ) : (
                        <Button size="sm" variant={org.owners.length === 0 ? 'default' : 'secondary'} onClick={onInvite}>
                            <MailPlus size={14} aria-hidden="true" />
                            {t('inviteOwner')}
                        </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={onEdit}>
                        <Pencil size={14} aria-hidden="true" />
                        {t('edit')}
                    </Button>
                </div>
            </td>
        </tr>
    );
}
