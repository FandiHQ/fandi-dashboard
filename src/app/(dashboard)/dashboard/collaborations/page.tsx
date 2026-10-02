'use client';

/**
 * Colaboraciones — my org as a GUEST idol (fandi-api RFC §3).
 *
 *  - An invitation link from the email lands here with ?token=…: owners
 *    and admins accept or decline it in one click. The token is read once
 *    and dropped from the URL right away (history, Referer, screenshots);
 *    next.config also sends Referrer-Policy: no-referrer on this route.
 *  - Pending invitations as cards, like a friend request: who invites
 *    (name + picture), to which dynamic of which event, what accepting
 *    grants (fans and results, never amounts), Aceptar / Rechazar. The nav
 *    badge and the Home banner point here (refreshed after an answer).
 *  - Active collaborations (view only; end), and history.
 *  - Shared events open a view-only page with the dynamics this org was
 *    tagged on: event totals, its participating fans, and contest results.
 */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { enUS as enLocale, es as esLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { collaborationsApi } from '@/lib/api-hooks';
import { canOpenFromHistory, dynamicLabelKey, matchTokenInvitation } from '@/lib/collaborations';
import type { Collaboration } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { CollaborationStatusPill } from '@/components/collaborations/CollaborationStatusPill';
import { IdolAvatar } from '@/components/collaborations/IdolAvatar';

export default function CollaborationsPage() {
    return (
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-2xl" />}>
            <CollaborationsInbox />
        </Suspense>
    );
}

function CollaborationsInbox() {
    const t = useTranslations('collaborations');
    const tCommon = useTranslations('common');
    const { memberRole } = useAuth();
    const canAnswer = memberRole === 'owner' || memberRole === 'admin';
    const queryClient = useQueryClient();
    const router = useRouter();
    const params = useSearchParams();
    const { confirm, dialog } = useConfirmDialog();
    // Read once, then drop it from the address bar (it is a bearer secret).
    const [token, setToken] = useState<string | null>(() => params.get('token'));
    const urlHasToken = params.has('token');
    useEffect(() => {
        if (urlHasToken) router.replace('/dashboard/collaborations');
    }, [urlHasToken, router]);

    const { data: inbox = [], isLoading } = useQuery({
        queryKey: ['collaborations', 'inbox'],
        queryFn: () => collaborationsApi.inbox(),
    });
    // Every ['collaborations', …] query: the inbox, and the pending summary
    // behind the nav badge and the Home banner.
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['collaborations'] });
    };
    const onError = (err: unknown) => toast.error(err instanceof Error ? err.message : tCommon('error'));

    const byToken = useMutation({
        mutationFn: (action: 'accept' | 'decline') => collaborationsApi.respondByToken(token!, action),
        onSuccess: (c) => {
            setToken(null);
            refresh();
            toast.success(t(c.status === 'accepted' ? 'acceptedToast' : 'declinedToast', { name: c.eventName }));
        },
        onError,
    });
    const answer = useMutation({
        mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) =>
            action === 'accept' ? collaborationsApi.accept(id) : collaborationsApi.decline(id),
        onSuccess: (c) => {
            refresh();
            toast.success(t(c.status === 'accepted' ? 'acceptedToast' : 'declinedToast', { name: c.eventName }));
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

    const pending = inbox.filter((c) => c.status === 'pending');
    const active = inbox.filter((c) => c.status === 'accepted');
    const history = inbox.filter((c) => c.status !== 'pending' && c.status !== 'accepted');
    const tokenInvitation = token ? matchTokenInvitation(inbox) : null;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="font-hero text-4xl text-white">{t('pageTitle')}</h1>
                <p className="mt-2 max-w-2xl text-sm text-lilac">{t('pageLead')}</p>
            </div>

            {token && (
                <section className="block-white flex flex-col gap-3 px-5 py-4 text-ink" data-testid="collab-token-card">
                    <h2 className="font-display text-[18px]">{t('tokenTitle')}</h2>
                    {tokenInvitation && (
                        <p className="font-display text-[15px]" data-testid="collab-token-detail">
                            {t('tokenInvite', {
                                host: tokenInvitation.hostOrgName,
                                dynamic: tokenInvitation.dynamicName,
                                event: tokenInvitation.eventName,
                            })}
                        </p>
                    )}
                    <p className="text-sm text-body-white">{t('tokenBody')}</p>
                    {canAnswer ? (
                        <div className="flex gap-3">
                            <Button onClick={() => byToken.mutate('accept')} disabled={byToken.isPending} data-testid="collab-token-accept">
                                <Check size={14} /> {t('accept')}
                            </Button>
                            <Button variant="outline" onClick={() => byToken.mutate('decline')} disabled={byToken.isPending}>
                                <X size={14} /> {t('decline')}
                            </Button>
                        </div>
                    ) : (
                        <p className="font-space-mono text-[11px] uppercase text-alert-white">{t('onlyAuthors')}</p>
                    )}
                </section>
            )}

            {isLoading && <Skeleton className="h-40 w-full rounded-2xl" />}

            <section className="flex flex-col gap-2.5">
                <h2 className="label-mono text-[11px] font-bold text-lilac">{t('pendingTitle', { count: pending.length })}</h2>
                {pending.length === 0 ? (
                    !isLoading && <p className="text-sm text-lilac">{t('pendingEmpty')}</p>
                ) : (
                    <ul className="flex flex-col gap-3.5">
                        {pending.map((c) => (
                            <InvitationCard
                                key={c.id}
                                c={c}
                                canAnswer={canAnswer}
                                busy={answer.isPending && answer.variables?.id === c.id}
                                onAnswer={(action) => answer.mutate({ id: c.id, action })}
                            />
                        ))}
                    </ul>
                )}
            </section>

            <Section title={t('activeTitle', { count: active.length })} empty={t('activeEmpty')} items={active}>
                {(c) => (
                    <div className="flex items-center gap-2">
                        <Link href={`/dashboard/collaborations/${c.eventId}`} className="text-[12px] font-extrabold uppercase text-blue hover:underline">
                            {t('open')} ›
                        </Link>
                        {canAnswer && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                    const ok = await confirm({
                                        title: t('endConfirm', { name: c.hostOrgName }),
                                        confirmLabel: t('end'),
                                        cancelLabel: tCommon('back'),
                                    });
                                    if (ok) end.mutate(c.id);
                                }}
                                disabled={end.isPending}
                            >
                                {t('end')}
                            </Button>
                        )}
                    </div>
                )}
            </Section>

            {history.length > 0 && (
                <Section title={t('historyTitle')} empty="" items={history}>
                    {(c) =>
                        canOpenFromHistory(c) ? (
                            <Link href={`/dashboard/collaborations/${c.eventId}`} className="text-[12px] font-extrabold uppercase text-blue hover:underline">
                                {t('open')} ›
                            </Link>
                        ) : null
                    }
                </Section>
            )}
            {dialog}
        </div>
    );
}

/**
 * One pending invitation, like a friend request: the host's picture and
 * name, the dynamic (kind + name) and its event, what accepting grants,
 * and the answer — Aceptar is this card's lime action, Rechazar its
 * outline. Members who cannot answer see who can.
 */
function InvitationCard({
    c,
    canAnswer,
    busy,
    onAnswer,
}: {
    c: Collaboration;
    canAnswer: boolean;
    busy: boolean;
    onAnswer: (action: 'accept' | 'decline') => void;
}) {
    const t = useTranslations('collaborations');
    const dateLocale = useLocale() === 'en' ? enLocale : esLocale;
    const eventDate = c.eventDate ? format(parseISO(c.eventDate), 'd MMM yyyy', { locale: dateLocale }) : null;
    return (
        <li
            className="block-white flex flex-col gap-4 px-5 py-4 text-ink md:flex-row md:items-center"
            data-testid={`inbox-${c.id}`}
        >
            <div className="flex min-w-0 flex-1 items-start gap-3.5">
                <IdolAvatar name={c.hostOrgName} src={c.hostAvatarUrl} size={48} />
                <div className="min-w-0 flex-1">
                    <p className="font-display text-[18px] leading-tight">{t('invitedYou', { host: c.hostOrgName })}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[15px] font-bold">
                        <span className="rounded-full border-2 border-ink px-2 py-0.5 font-space-mono text-[10px] uppercase tracking-[0.12em]">
                            {t(`kind.${dynamicLabelKey(c)}`)}
                        </span>
                        <span className="min-w-0 break-words">{c.dynamicName}</span>
                    </p>
                    <p className="mt-1 font-space-mono text-[10px] uppercase text-muted-white">
                        {c.eventName}
                        {eventDate && ` · ${eventDate}`}
                        {` · ${t('expires', { date: format(parseISO(c.expiresAt), 'd MMM', { locale: dateLocale }) })}`}
                    </p>
                    <p className="mt-2.5 text-[13px] leading-snug text-body-white" data-testid="invitation-grants">
                        {t('grants')}
                    </p>
                </div>
            </div>
            {canAnswer ? (
                <div className="flex flex-none gap-2.5 md:flex-col">
                    <Button onClick={() => onAnswer('accept')} disabled={busy} className="flex-1" data-testid={`accept-${c.id}`}>
                        <Check size={14} /> {t('accept')}
                    </Button>
                    <Button variant="outline" onClick={() => onAnswer('decline')} disabled={busy} className="flex-1" data-testid={`decline-${c.id}`}>
                        <X size={14} /> {t('decline')}
                    </Button>
                </div>
            ) : (
                <p className="font-space-mono text-[11px] uppercase text-alert-white">{t('onlyAuthors')}</p>
            )}
        </li>
    );
}

function Section({
    title,
    empty,
    items,
    children,
}: {
    title: string;
    empty: string;
    items: Collaboration[];
    children: (c: Collaboration) => React.ReactNode;
}) {
    const t = useTranslations('collaborations');
    return (
        <section className="flex flex-col gap-2.5">
            <h2 className="label-mono text-[11px] font-bold text-lilac">{title}</h2>
            {items.length === 0 ? (
                empty ? <p className="text-sm text-lilac">{empty}</p> : null
            ) : (
                <ul className="block-white flex flex-col divide-y-2 divide-line-white overflow-hidden text-ink">
                    {items.map((c) => (
                        <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5" data-testid={`inbox-${c.id}`}>
                            <div className="min-w-0 flex-1">
                                <p className="font-display text-[16px]">
                                    {c.dynamicName} <span className="text-muted-white">· {c.eventName}</span>
                                </p>
                                <p className="font-space-mono text-[10px] uppercase text-muted-white">
                                    {t(`kind.${dynamicLabelKey(c)}`)} · {t('from', { host: c.hostOrgName })}
                                </p>
                            </div>
                            <CollaborationStatusPill status={c.status} />
                            {children(c)}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
