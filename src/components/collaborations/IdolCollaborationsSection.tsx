'use client';

/**
 * ÍDOLOS INVITADOS — inside the Oportunidad/Impacto/Subasta side panel
 * (fandi-api RFC §3). The host tags another org's idol account by its real
 * profile (never free text): that sends an invitation to the guest's
 * owners/admins. Until the guest accepts, fans do not see the idol and the
 * guest sees nothing of the dynamic. Either side can end it.
 *
 * Creating (no id yet): the search works the same, and picked idols wait
 * as chips ("Se invitará al guardar") that the panel sends right after the
 * create call (useQueuedInvites). Editing: an invitation goes out at once,
 * and the existing ones can be resent, cancelled or ended.
 *
 * Replaces the free-text lineup tags for new tagging; old text tags stay as
 * legacy labels in the panel.
 */
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Handshake, Loader2, Search, Send, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { collaborationsApi } from '@/lib/api-hooks';
import { MAX_QUEUED_IDOLS, inviteCandidates, liveGuestIds } from '@/lib/collaborations';
import type { Collaboration, DynamicType } from '@/types/api';
import { Input } from '@/components/ui/input';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { CollaborationStatusPill } from './CollaborationStatusPill';
import { IdolAvatar } from './IdolAvatar';
import type { QueuedIdols } from './useQueuedInvites';

const ROW_BUTTON =
    'press flex h-9 cursor-pointer items-center rounded-[8px] border-2 border-ink bg-white px-3 text-[12px] font-extrabold uppercase text-ink shadow-ext-sm disabled:cursor-not-allowed disabled:opacity-50';

export function IdolCollaborationsSection({
    eventId,
    dynamicType,
    dynamicId,
    queue,
}: {
    eventId: string;
    dynamicType: DynamicType;
    /** null while creating: picked idols are invited right after the save. */
    dynamicId: string | null;
    /** The create panel's picks (see useQueuedInvites). */
    queue: QueuedIdols;
}) {
    const t = useTranslations('collaborations');
    const tCommon = useTranslations('common');
    const { organization } = useAuth();
    const { confirm, dialog } = useConfirmDialog();
    const queryClient = useQueryClient();
    const creating = !dynamicId;
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
        enabled: !creating,
    });
    const mine = all.filter((c: Collaboration) => c.dynamicType === dynamicType && c.dynamicId === dynamicId);

    const { data: results = [], isFetching } = useQuery({
        queryKey: ['idols', 'search', debounced],
        queryFn: () => collaborationsApi.searchIdols(debounced),
        enabled: debounced.length >= 2,
    });
    const candidates = inviteCandidates(results, {
        myOrgId: organization?.id,
        excluded: creating ? queue.items.map((i) => i.id) : liveGuestIds(all, dynamicType, dynamicId),
    });
    const queueFull = creating && queue.items.length >= MAX_QUEUED_IDOLS;

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
        <section className="flex flex-col gap-3 rounded-[12px] border-2 border-ink px-4 py-4" data-testid="idol-collaborations">
            <div className="flex items-start gap-3">
                <span className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-ink text-white" aria-hidden="true">
                    <Handshake size={18} />
                </span>
                <div className="min-w-0">
                    <h3 className="font-display text-[17px] leading-tight text-ink">{t('title')}</h3>
                    <p className="mt-1 text-[13px] leading-snug text-body-white">{t('howItWorks')}</p>
                </div>
            </div>

            {/* Editing: the invitations this dynamic already has. */}
            {mine.length > 0 && (
                <ul className="flex flex-col divide-y-2 divide-line-white rounded-[12px] border-2 border-ink">
                    {mine.map((c) => (
                        <li key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-2" data-testid={`collab-${c.id}`}>
                            <IdolAvatar name={c.guestOrgName} src={c.guestAvatarUrl} size={28} />
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

            {/* Creating: picked idols, invited right after the save. */}
            {creating && queue.items.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label={t('queuedListLabel')} data-testid="queued-idols">
                    {queue.items.map((idol) => (
                        <li
                            key={idol.id}
                            className="flex items-center gap-2 rounded-full border-2 border-ink bg-white py-1 pl-1 pr-1"
                            data-testid={`queued-${idol.id}`}
                        >
                            <IdolAvatar name={idol.name} src={idol.avatarUrl} size={26} round />
                            <span className="flex flex-col leading-tight">
                                <span className="text-[13px] font-bold text-ink">{idol.name}</span>
                                <span className="text-[11px] font-semibold text-muted-white">{t('queued')}</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => queue.remove(idol.id)}
                                aria-label={t('removeQueued', { name: idol.name })}
                                className="flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-white hover:bg-line-white hover:text-ink"
                            >
                                <X size={14} />
                            </button>
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
            {queueFull && <p className="text-[12px] text-muted-white">{t('queueFull', { max: MAX_QUEUED_IDOLS })}</p>}
            {debounced.length >= 2 && (
                <ul className="flex flex-col gap-1" aria-live="polite">
                    {isFetching && <Loader2 size={14} className="animate-spin text-muted-white" />}
                    {!isFetching && candidates.length === 0 && (
                        <li className="text-[13px] text-muted-white">{t('noResults')}</li>
                    )}
                    {candidates.map((idol) => (
                        <li key={idol.id} className="flex items-center justify-between gap-2 rounded-[10px] border-2 border-line-white px-3 py-2">
                            <span className="flex min-w-0 items-center gap-2">
                                <IdolAvatar name={idol.name} src={idol.avatarUrl} size={28} />
                                <span className="truncate text-sm font-bold text-ink">{idol.name}</span>
                            </span>
                            {creating ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        queue.add(idol);
                                        setQuery('');
                                    }}
                                    disabled={queueFull}
                                    className={ROW_BUTTON}
                                    data-testid={`queue-${idol.id}`}
                                >
                                    {t('add')}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => invite.mutate(idol.id)}
                                    disabled={invite.isPending}
                                    className={ROW_BUTTON}
                                    data-testid={`invite-${idol.id}`}
                                >
                                    {t('invite')}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {dialog}
        </section>
    );
}
