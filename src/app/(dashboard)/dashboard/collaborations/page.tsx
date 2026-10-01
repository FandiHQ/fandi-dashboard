'use client';

/**
 * Colaboraciones — my org as a GUEST idol (fandi-api RFC §3).
 *
 *  - An invitation link from the email lands here with ?token=…: owners
 *    and admins accept or decline it in one click. The token is read once
 *    and dropped from the URL right away (history, Referer, screenshots);
 *    next.config also sends Referrer-Policy: no-referrer on this route.
 *  - Pending invitations (accept / decline), active collaborations (view
 *    only; end), and history.
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
import { canOpenFromHistory, matchTokenInvitation } from '@/lib/collaborations';
import type { Collaboration } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { CollaborationStatusPill } from '@/components/collaborations/CollaborationStatusPill';

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

            <Section title={t('pendingTitle', { count: pending.length })} empty={t('pendingEmpty')} items={pending}>
                {(c) =>
                    canAnswer ? (
                        <div className="flex gap-2">
                            {/* Per-row action: secondary (one lime primary per screen). */}
                            <Button size="sm" variant="secondary" onClick={() => answer.mutate({ id: c.id, action: 'accept' })} disabled={answer.isPending}>
                                {t('accept')}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => answer.mutate({ id: c.id, action: 'decline' })} disabled={answer.isPending}>
                                {t('decline')}
                            </Button>
                        </div>
                    ) : null
                }
            </Section>

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
    const dateLocale = useLocale() === 'en' ? enLocale : esLocale;
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
                                    {t('from', { host: c.hostOrgName })}
                                    {c.status === 'pending' &&
                                        ` · ${t('expires', { date: format(parseISO(c.expiresAt), 'd MMM', { locale: dateLocale }) })}`}
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
