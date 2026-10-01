'use client';

/**
 * ÍDOLOS INVITADOS — inside the Oportunidad/Impacto/Subasta side panel
 * (fandi-api RFC §3). The host tags another org's idol account by its real
 * profile: that sends an invitation to the guest's owners/admins. Until
 * the guest accepts, fans do not see the idol and the guest sees nothing
 * of the dynamic. Either side can end it.
 *
 * Replaces the free-text lineup tags for new tagging; old text tags stay as
 * legacy labels in the panel.
 */
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Search, Send, X } from 'lucide-react';
import { collaborationsApi } from '@/lib/api-hooks';
import type { Collaboration, DynamicType } from '@/types/api';
import { Input } from '@/components/ui/input';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { CollaborationStatusPill } from './CollaborationStatusPill';

const FIELD_LABEL = 'label-mono text-muted-white';

export function IdolCollaborationsSection({
    eventId,
    dynamicType,
    dynamicId,
}: {
    eventId: string;
    dynamicType: DynamicType;
    /** null while creating: the dynamic needs to exist before inviting. */
    dynamicId: string | null;
}) {
    const t = useTranslations('collaborations');
    const tCommon = useTranslations('common');
    const { confirm, dialog } = useConfirmDialog();
    const queryClient = useQueryClient();
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    useEffect(() => {
        const id = setTimeout(() => setDebounced(query.trim()), 250);
        return () => clearTimeout(id);
    }, [query]);

    const listKey = ['events', eventId, 'collaborations'];
    const { data: all = [] } = useQuery({
        queryKey: listKey,
        queryFn: () => collaborationsApi.listForEvent(eventId),
        enabled: !!dynamicId,
    });
    const mine = all.filter((c: Collaboration) => c.dynamicType === dynamicType && c.dynamicId === dynamicId);
    const liveGuests = new Set(mine.filter((c) => c.status === 'pending' || c.status === 'accepted').map((c) => c.guestOrgId));

    const { data: results = [], isFetching } = useQuery({
        queryKey: ['idols', 'search', debounced],
        queryFn: () => collaborationsApi.searchIdols(debounced),
        enabled: !!dynamicId && debounced.length >= 2,
    });

    const onError = (err: unknown) => toast.error(err instanceof Error ? err.message : tCommon('error'));
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: listKey });
        queryClient.invalidateQueries({ queryKey: ['experiences', eventId] });
        queryClient.invalidateQueries({ queryKey: ['events', eventId, 'auctions'] });
    };
    const invite = useMutation({
        mutationFn: (guestOrgId: string) =>
            collaborationsApi.invite({ dynamicType, dynamicId: dynamicId!, guestOrgId }),
        onSuccess: ({ emailed }) => {
            refresh();
            setQuery('');
            toast.success(emailed > 0 ? t('invited', { count: emailed }) : t('invitedNoEmail'));
        },
        onError,
    });
    const resend = useMutation({
        mutationFn: (id: string) => collaborationsApi.resend(id),
        onSuccess: () => {
            refresh();
            toast.success(t('resent'));
        },
        onError,
    });
    const end = useMutation({
        mutationFn: (id: string) => collaborationsApi.end(id),
        onSuccess: () => {
            refresh();
            toast.success(t('ended'));
        },
        onError,
    });

    return (
        <section className="flex flex-col gap-2" data-testid="idol-collaborations">
            <label className={FIELD_LABEL}>{t('title')}</label>
            {!dynamicId ? (
                <p className="font-space-mono text-[10px] leading-relaxed text-muted-white">{t('saveFirst')}</p>
            ) : (
                <>
                    <p className="font-space-mono text-[10px] leading-relaxed text-muted-white">{t('howItWorks')}</p>

                    {mine.length > 0 && (
                        <ul className="flex flex-col divide-y-2 divide-line-white rounded-[12px] border-2 border-ink">
                            {mine.map((c) => (
                                <li key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-2" data-testid={`collab-${c.id}`}>
                                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{c.guestOrgName}</span>
                                    <CollaborationStatusPill status={c.status} />
                                    {(c.status === 'pending' || c.status === 'expired') && (
                                        <button
                                            type="button"
                                            onClick={() => resend.mutate(c.id)}
                                            disabled={resend.isPending}
                                            className="flex h-8 cursor-pointer items-center gap-1 rounded-[8px] px-2 text-[11px] font-extrabold uppercase text-blue hover:underline"
                                        >
                                            <Send size={12} /> {t('resend')}
                                        </button>
                                    )}
                                    {(c.status === 'pending' || c.status === 'accepted') && (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const ok = await confirm({
                                                    title: t(c.status === 'pending' ? 'cancelConfirm' : 'endConfirm', { name: c.guestOrgName }),
                                                    confirmLabel: t(c.status === 'pending' ? 'cancel' : 'end'),
                                                    cancelLabel: tCommon('back'),
                                                });
                                                if (ok) end.mutate(c.id);
                                            }}
                                            disabled={end.isPending}
                                            aria-label={t(c.status === 'pending' ? 'cancel' : 'end')}
                                            className="flex size-8 cursor-pointer items-center justify-center rounded-[8px] text-muted-white hover:bg-line-white hover:text-ink"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="relative">
                        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-white" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                            aria-label={t('searchPlaceholder')}
                            className="h-11 pl-9"
                            data-testid="idol-search"
                        />
                    </div>
                    {debounced.length >= 2 && (
                        <ul className="flex flex-col gap-1" aria-live="polite">
                            {isFetching && <Loader2 size={14} className="animate-spin text-muted-white" />}
                            {!isFetching && results.length === 0 && (
                                <li className="font-space-mono text-[11px] text-muted-white">{t('noResults')}</li>
                            )}
                            {results.map((idol) => {
                                const already = liveGuests.has(idol.id);
                                return (
                                    <li key={idol.id} className="flex items-center justify-between gap-2 rounded-[10px] border-2 border-line-white px-3 py-2">
                                        <span className="text-sm font-bold text-ink">{idol.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => invite.mutate(idol.id)}
                                            disabled={already || invite.isPending}
                                            className="press flex h-8 cursor-pointer items-center rounded-[8px] border-2 border-ink bg-white px-3 text-[11px] font-extrabold uppercase text-ink shadow-ext-sm disabled:cursor-not-allowed disabled:opacity-50"
                                            data-testid={`invite-${idol.id}`}
                                        >
                                            {already ? t('alreadyInvited') : t('invite')}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            )}
            {dialog}
        </section>
    );
}
