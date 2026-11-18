'use client';

/**
 * Colaboraciones (fandi-api RFC §3): every collaboration of my org, both
 * sides, in four tabs with counts.
 *
 *  - Recibidas: invitations to my org awaiting an answer, like a friend
 *    request: who invites (name + picture), to which dynamic of which
 *    event, what accepting grants (appear to fans, see its fans and
 *    results view-only, never amounts), Aceptar / Rechazar.
 *  - Enviadas: what my org sent, across events, with the answer; a new
 *    answer is marked and counted in the nav badge until this tab is seen.
 *  - Activas: collaborations my org takes part in (view-only shared page).
 *  - Historial: answered, expired or ended.
 *
 * Email links: `?invite=<id>` (guest) opens that invitation highlighted,
 * `?sent=<id>` (host notification) opens Enviadas; the legacy `?token=`
 * (links sent before ids) still answers through respond-by-token. Every
 * link parameter is read once and dropped from the address bar.
 */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ExternalLink, Info, RotateCw, Send, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { collaborationsApi } from '@/lib/api-hooks';
import { apiErrorCode } from '@/lib/api-error-kind';
import {
    COLLABORATIONS_HREF, COLLABORATIONS_TABS, canAnswerInvitations, canOpenFromHistory, dynamicHref, dynamicLabelKey,
    initialTabFor, matchTokenInvitation, readCollaborationLink, splitInbox, type CollaborationsTab,
} from '@/lib/collaborations';
import { colombiaDateTime } from '@/lib/colombia-time';
import type { Collaboration, SentCollaboration } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { CollaborationStatusPill } from '@/components/collaborations/CollaborationStatusPill';
import { IdolAvatar } from '@/components/collaborations/IdolAvatar';
import { PENDING_INVITATIONS_KEY } from '@/components/collaborations/usePendingInvitations';
import { useCollabErrorMessage } from '@/components/collaborations/useCollabErrorMessage';
import { useEventTime } from '@/components/events/EventZone';

const INBOX_KEY = ['collaborations', 'inbox'] as const;
const SENT_KEY = ['collaborations', 'sent'] as const;

/** Icon actions on rows: 44px targets, the icon is decoration (the label says it). */
const ICON_BUTTON =
    'flex size-11 flex-none cursor-pointer items-center justify-center rounded-[10px] border-2 border-transparent text-ink transition-colors hover:border-ink hover:bg-line-white focus-visible:border-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45';
const TEXT_LINK =
    'inline-flex min-h-11 items-center gap-1 text-[12px] font-extrabold uppercase text-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue';

export default function CollaborationsPage() {
    return (
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-2xl" />}>
            <CollaborationsView />
        </Suspense>
    );
}

function CollaborationsView() {
    const t = useTranslations('collaborations');
    const tCommon = useTranslations('common');
    const { memberRole } = useAuth();
    // Owners and admins answer, invite, resend and end; viewers read.
    const canAct = canAnswerInvitations(memberRole);
    const queryClient = useQueryClient();
    const router = useRouter();
    const params = useSearchParams();
    const { confirm, dialog } = useConfirmDialog();
    const describeError = useCollabErrorMessage();

    // Email link parameters: read once, then dropped from the address bar.
    const [link] = useState(() => readCollaborationLink(params));
    const [token, setToken] = useState<string | null>(link.token);
    const urlHasLink = params.has('token') || params.has('invite') || params.has('sent');
    useEffect(() => {
        if (urlHasLink) router.replace(COLLABORATIONS_HREF);
    }, [urlHasLink, router]);

    const inbox = useQuery({ queryKey: INBOX_KEY, queryFn: () => collaborationsApi.inbox(), retry: 1 });
    const sent = useQuery({ queryKey: SENT_KEY, queryFn: () => collaborationsApi.sent(), retry: 1 });
    const { received, active, history } = splitInbox(inbox.data ?? []);
    const sentItems = sent.data ?? [];
    const hasUnseen = sentItems.some((c) => c.unseenResponse);

    // The tab: what the link points at (once the inbox is known), then the person's choice.
    const [chosenTab, setChosenTab] = useState<CollaborationsTab | null>(null);
    const linkTab = initialTabFor(link, inbox.data);
    const tab = chosenTab ?? linkTab;

    // Enviadas seen: its answers leave the nav badge (the "Nueva respuesta"
    // marks stay for this visit; the list is not refetched for it).
    const { mutate: markSentSeen } = useMutation({
        mutationFn: () => collaborationsApi.markSentSeen(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: PENDING_INVITATIONS_KEY }),
    });
    const markedRef = useRef(false);
    useEffect(() => {
        if (tab !== 'sent' || !hasUnseen || markedRef.current) return;
        markedRef.current = true;
        markSentSeen();
    }, [tab, hasUnseen, markSentSeen]);

    // Every ['collaborations', …] query: lists, the nav badge and the Home banner.
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['collaborations'] });
    const onError = (err: unknown) => {
        refresh();
        toast.error(describeError(err));
    };
    const answeredToast = (c: Collaboration) =>
        toast.success(c.status === 'accepted' ? t('acceptedToast', { name: c.eventName }) : t('declinedToast'));

    const byToken = useMutation({
        mutationFn: (action: 'accept' | 'decline') => collaborationsApi.respondByToken(token!, action),
        onSuccess: (c) => {
            setToken(null);
            refresh();
            answeredToast(c);
        },
        onError: (err: unknown) => {
            // A used or unknown link: drop the card, the inbox has the rest.
            if (apiErrorCode(err) === 'INVITE_NOT_FOUND') setToken(null);
            onError(err);
        },
    });
    const answer = useMutation({
        mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) =>
            action === 'accept' ? collaborationsApi.accept(id) : collaborationsApi.decline(id),
        onSuccess: (c) => {
            refresh();
            answeredToast(c);
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
    const resend = useMutation({
        mutationFn: (id: string) => collaborationsApi.resend(id),
        onSuccess: () => {
            refresh();
            toast.success(t('resent'));
        },
        onError,
    });

    const askDecline = async (c: Collaboration) => {
        const ok = await confirm({
            title: t('declineConfirm', { host: c.hostOrgName }),
            description: t('declineConfirmBody', { host: c.hostOrgName }),
            confirmLabel: t('decline'),
            cancelLabel: tCommon('back'),
        });
        if (ok) answer.mutate({ id: c.id, action: 'decline' });
    };
    const askEnd = async (c: Collaboration, name: string, pending: boolean) => {
        const ok = await confirm({
            title: t(pending ? 'cancelConfirm' : 'endConfirm', { name }),
            confirmLabel: t(pending ? 'cancel' : 'end'),
            cancelLabel: tCommon('back'),
        });
        if (ok) end.mutate(c.id);
    };

    // What the email link points at, and a line about it when it is not a live invitation.
    const linkedInvite = link.inviteId ? inbox.data?.find((c) => c.id === link.inviteId) ?? null : null;
    const linkedSent = link.sentId ? sent.data?.find((c) => c.id === link.sentId) ?? null : null;
    let linkNote: string | null = null;
    if (link.inviteId && inbox.data && !linkedInvite) linkNote = t('highlight.notFound');
    else if (linkedInvite && linkedInvite.status === 'expired') linkNote = t('highlight.expired', { host: linkedInvite.hostOrgName });
    else if (linkedInvite && linkedInvite.status !== 'pending') linkNote = t('highlight.answered');
    else if (link.sentId && sent.data && !linkedSent) linkNote = t('highlight.sentNotFound');
    const highlightId = linkedInvite?.id ?? linkedSent?.id ?? null;

    // The one lime action of Recibidas: the linked invitation, else the first one.
    const primaryId = linkedInvite?.status === 'pending' ? linkedInvite.id : received[0]?.id ?? null;

    const counts: Record<CollaborationsTab, number | null> = {
        received: inbox.data ? received.length : null,
        sent: sent.data ? sentItems.length : null,
        active: inbox.data ? active.length : null,
        history: inbox.data ? history.length : null,
    };
    const tokenInvitation = token ? matchTokenInvitation(inbox.data ?? []) : null;
    const inboxScoped = inbox.isError && apiErrorCode(inbox.error) === 'ROLE_FORBIDDEN';

    const inboxProblem = inbox.isError ? (
        inboxScoped ? (
            <Notice>{t('scopedInbox')}</Notice>
        ) : (
            <LoadError label={t('loadError')} onRetry={() => inbox.refetch()} retrying={inbox.isRefetching} />
        )
    ) : null;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="font-hero text-4xl text-white">{t('pageTitle')}</h1>
                <p className="mt-2 max-w-2xl text-sm text-lilac">{t('pageLead')}</p>
            </div>

            <HowItWorks />

            <Tabs value={tab} onValueChange={(v) => setChosenTab(v as CollaborationsTab)} className="gap-5">
                <div className="-mx-1 max-w-full overflow-x-auto px-1 pb-1">
                    <TabsList aria-label={t('tabs.label')}>
                        {COLLABORATIONS_TABS.map((key) => (
                            <TabsTrigger key={key} value={key} className="px-3.5" data-testid={`collab-tab-${key}`}>
                                {t(`tabs.${key}`)}
                                {counts[key] !== null && (
                                    <span className="font-space-mono text-[11px] font-bold tabular-nums opacity-80">
                                        {counts[key]}
                                    </span>
                                )}
                                {key === 'sent' && hasUnseen && (
                                    <>
                                        <span aria-hidden="true" className="size-2 rounded-full border border-ink bg-lime" />
                                        <span className="sr-only">
                                            {t('responsesBadge', { count: sentItems.filter((c) => c.unseenResponse).length })}
                                        </span>
                                    </>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                {linkNote && <Notice>{linkNote}</Notice>}

                {/* ── Recibidas ── */}
                <TabsContent value="received" className="flex flex-col gap-3.5">
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
                            {canAct ? (
                                <div className="flex flex-wrap gap-3">
                                    <Button size="lg" onClick={() => byToken.mutate('accept')} disabled={byToken.isPending} data-testid="collab-token-accept">
                                        <Check size={16} aria-hidden="true" /> {t('accept')}
                                    </Button>
                                    <Button size="lg" variant="outline" onClick={() => byToken.mutate('decline')} disabled={byToken.isPending}>
                                        <X size={16} aria-hidden="true" /> {t('decline')}
                                    </Button>
                                </div>
                            ) : (
                                <p className="font-space-mono text-[11px] uppercase text-alert-white">{t('onlyAuthors')}</p>
                            )}
                        </section>
                    )}
                    {inbox.isLoading ? (
                        <Skeleton className="h-40 w-full rounded-2xl" />
                    ) : inboxProblem ?? (received.length === 0 ? (
                        <EmptyState
                            title={t('empty.received')}
                            body={t('empty.receivedBody')}
                            canInvite={canAct}
                            secondary={!!token}
                        />
                    ) : (
                        <ul className="flex flex-col gap-3.5">
                            {received.map((c) => (
                                <InvitationCard
                                    key={c.id}
                                    c={c}
                                    canAnswer={canAct}
                                    primary={c.id === primaryId && !token}
                                    highlighted={c.id === highlightId}
                                    busy={answer.isPending && answer.variables?.id === c.id}
                                    onAccept={() => answer.mutate({ id: c.id, action: 'accept' })}
                                    onDecline={() => { void askDecline(c); }}
                                />
                            ))}
                        </ul>
                    ))}
                </TabsContent>

                {/* ── Enviadas ── */}
                <TabsContent value="sent" className="flex flex-col gap-3.5">
                    {sent.isLoading ? (
                        <Skeleton className="h-40 w-full rounded-2xl" />
                    ) : sent.isError ? (
                        <LoadError label={t('loadError')} onRetry={() => sent.refetch()} retrying={sent.isRefetching} />
                    ) : sentItems.length === 0 ? (
                        <EmptyState title={t('empty.sent')} body={t('empty.sentBody')} canInvite={canAct} />
                    ) : (
                        <RowList>
                            {sentItems.map((c) => (
                                <SentRow
                                    key={c.id}
                                    c={c}
                                    canAct={canAct}
                                    highlighted={c.id === highlightId}
                                    resending={resend.isPending && resend.variables === c.id}
                                    ending={end.isPending && end.variables === c.id}
                                    onResend={() => resend.mutate(c.id)}
                                    onCancel={() => { void askEnd(c, c.guestOrgName, true); }}
                                />
                            ))}
                        </RowList>
                    )}
                </TabsContent>

                {/* ── Activas ── */}
                <TabsContent value="active" className="flex flex-col gap-3.5">
                    {inbox.isLoading ? (
                        <Skeleton className="h-40 w-full rounded-2xl" />
                    ) : inboxProblem ?? (active.length === 0 ? (
                        <EmptyState title={t('empty.active')} body={t('empty.activeBody')} canInvite={canAct} />
                    ) : (
                        <RowList>
                            {active.map((c) => (
                                <ReceivedRow key={c.id} c={c} highlighted={c.id === highlightId}>
                                    <Link href={`/dashboard/collaborations/${c.eventId}`} className={TEXT_LINK}>
                                        {t('open')} ›
                                    </Link>
                                    {canAct && (
                                        <Button
                                            variant="destructive"
                                            className="h-11"
                                            onClick={() => { void askEnd(c, c.hostOrgName, false); }}
                                            disabled={end.isPending}
                                            aria-label={t('endFor', { name: c.hostOrgName })}
                                        >
                                            {t('end')}
                                        </Button>
                                    )}
                                </ReceivedRow>
                            ))}
                        </RowList>
                    ))}
                </TabsContent>

                {/* ── Historial ── */}
                <TabsContent value="history" className="flex flex-col gap-3.5">
                    {inbox.isLoading ? (
                        <Skeleton className="h-40 w-full rounded-2xl" />
                    ) : inboxProblem ?? (history.length === 0 ? (
                        <EmptyState title={t('empty.history')} body={t('empty.historyBody')} canInvite={canAct} />
                    ) : (
                        <RowList>
                            {history.map((c) => (
                                <ReceivedRow key={c.id} c={c} highlighted={c.id === highlightId}>
                                    {canOpenFromHistory(c) ? (
                                        <Link href={`/dashboard/collaborations/${c.eventId}`} className={TEXT_LINK}>
                                            {t('open')} ›
                                        </Link>
                                    ) : null}
                                </ReceivedRow>
                            ))}
                        </RowList>
                    ))}
                </TabsContent>
            </Tabs>
            {dialog}
        </div>
    );
}

// ── Pieces ──

/** "Cómo funcionan" in three steps (white block: it informs). */
function HowItWorks() {
    const t = useTranslations('collaborations');
    const steps = ['invite', 'answer', 'share'] as const;
    return (
        <section className="block-white px-5 py-4 text-ink" aria-labelledby="collab-how-title">
            <h2 id="collab-how-title" className="label-mono mb-3 text-[11px] text-muted-white">{t('howTitle')}</h2>
            <ol className="grid gap-4 md:grid-cols-3">
                {steps.map((step, i) => (
                    <li key={step} className="flex items-start gap-3">
                        <span
                            aria-hidden="true"
                            className="flex size-8 flex-none items-center justify-center rounded-full bg-ink font-display text-[14px] text-white"
                        >
                            {i + 1}
                        </span>
                        <div className="min-w-0">
                            <p className="font-display text-[15px] leading-tight">{t(`howSteps.${step}.title`)}</p>
                            <p className="mt-1 text-[13px] leading-snug text-body-white">{t(`howSteps.${step}.body`)}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function Notice({ children }: { children: React.ReactNode }) {
    return (
        <p className="flex items-start gap-2.5 rounded-[12px] border-2 border-ink bg-lilac px-4 py-3 text-sm font-semibold text-ink" role="status">
            <Info size={16} className="mt-0.5 flex-none" aria-hidden="true" />
            <span>{children}</span>
        </p>
    );
}

function LoadError({ label, onRetry, retrying }: { label: string; onRetry: () => void; retrying: boolean }) {
    const tCommon = useTranslations('common');
    return (
        <div className="block-white flex flex-wrap items-center gap-3 px-5 py-4 text-ink" role="alert">
            <p className="text-sm font-semibold">{label}</p>
            <Button variant="secondary" className="h-11" onClick={onRetry} disabled={retrying}>
                <RotateCw size={14} aria-hidden="true" />
                {tCommon('retry')}
            </Button>
        </div>
    );
}

/** An empty tab: what will show up here, and the one way to start (authors). */
function EmptyState({ title, body, canInvite, secondary = false }: {
    title: string;
    body: string;
    canInvite: boolean;
    secondary?: boolean;
}) {
    const t = useTranslations('collaborations');
    return (
        <div className="block-white flex flex-col items-start gap-3 px-5 py-6 text-ink">
            <p className="font-display text-[17px]">{title}</p>
            <p className="max-w-xl text-sm text-body-white">{body}</p>
            {canInvite && (
                <Button asChild size="lg" variant={secondary ? 'secondary' : 'default'} className="mt-1">
                    <Link href="/dashboard/events">{t('emptyCta')}</Link>
                </Button>
            )}
        </div>
    );
}

function RowList({ children }: { children: React.ReactNode }) {
    return <ul className="block-white flex flex-col divide-y-2 divide-line-white overflow-hidden text-ink">{children}</ul>;
}

const HIGHLIGHT = 'outline outline-4 outline-lime outline-offset-2';

/** Scrolls the highlighted item into view once, when it first appears. */
function useScrollOnce(active: boolean) {
    const done = useRef(false);
    return (el: HTMLElement | null) => {
        if (!el || !active || done.current) return;
        done.current = true;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
}

function useColombiaExpiry(iso: string) {
    const locale = useLocale();
    return colombiaDateTime(iso, locale);
}

/**
 * One invitation to answer, like a friend request: the host's picture and
 * name, the dynamic (kind + name) and its event, until when, what
 * accepting grants, and the answer. Aceptar is lime on one card only (the
 * linked or first one); members who cannot answer see who can.
 */
function InvitationCard({
    c,
    canAnswer,
    primary,
    highlighted,
    busy,
    onAccept,
    onDecline,
}: {
    c: Collaboration;
    canAnswer: boolean;
    primary: boolean;
    highlighted: boolean;
    busy: boolean;
    onAccept: () => void;
    onDecline: () => void;
}) {
    const t = useTranslations('collaborations');
    // The event's day and time on its clock. A collaboration does not carry
    // the event's zone and venues are Colombia-only: "Hora de Colombia".
    const eventTime = useEventTime(null, null);
    const eventDate = c.eventDate
        ? [
              eventTime.format(c.eventDate, { day: 'numeric', month: 'short', year: 'numeric' }),
              eventTime.format(c.eventDate, { hour: '2-digit', minute: '2-digit', hour12: false }),
              eventTime.label(c.eventDate),
          ].filter(Boolean).join(' · ')
        : null;
    const expires = useColombiaExpiry(c.expiresAt);
    const scrollRef = useScrollOnce(highlighted);
    return (
        <li
            ref={scrollRef}
            className={`block-white flex flex-col gap-4 px-5 py-4 text-ink md:flex-row md:items-center ${highlighted ? HIGHLIGHT : ''}`}
            data-testid={`inbox-${c.id}`}
            aria-current={highlighted ? 'true' : undefined}
        >
            <div className="flex min-w-0 flex-1 items-start gap-3.5">
                <IdolAvatar name={c.hostOrgName} src={c.hostAvatarUrl} size={48} />
                <div className="min-w-0 flex-1">
                    {highlighted && (
                        <p className="label-mono mb-1 text-[10px] font-bold text-blue">{t('highlight.fromEmail')}</p>
                    )}
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
                    </p>
                    {expires && (
                        <p className="mt-1 text-[12px] text-body-white">{t('expiresAt', { date: expires.date, time: expires.time })}</p>
                    )}
                    <p className="mt-2.5 text-[13px] leading-snug text-body-white" data-testid="invitation-grants">
                        {t('grants')}
                    </p>
                </div>
            </div>
            {canAnswer ? (
                <div className="flex flex-none gap-2.5 md:flex-col">
                    <Button
                        size="lg"
                        variant={primary ? 'default' : 'secondary'}
                        onClick={onAccept}
                        disabled={busy}
                        className="flex-1"
                        data-testid={`accept-${c.id}`}
                    >
                        <Check size={16} aria-hidden="true" /> {t('accept')}
                    </Button>
                    <Button size="lg" variant="outline" onClick={onDecline} disabled={busy} className="flex-1" data-testid={`decline-${c.id}`}>
                        <X size={16} aria-hidden="true" /> {t('decline')}
                    </Button>
                </div>
            ) : (
                <p className="font-space-mono text-[11px] uppercase text-alert-white">{t('onlyAuthors')}</p>
            )}
        </li>
    );
}

/** A collaboration addressed to my org (Activas, Historial). */
function ReceivedRow({ c, highlighted, children }: { c: Collaboration; highlighted: boolean; children?: React.ReactNode }) {
    const t = useTranslations('collaborations');
    const scrollRef = useScrollOnce(highlighted);
    return (
        <li
            ref={scrollRef}
            className={`flex flex-wrap items-center gap-3 px-5 py-3.5 ${highlighted ? HIGHLIGHT : ''}`}
            data-testid={`inbox-${c.id}`}
            aria-current={highlighted ? 'true' : undefined}
        >
            <IdolAvatar name={c.hostOrgName} src={c.hostAvatarUrl} size={36} />
            <div className="min-w-0 flex-1">
                <p className="font-display text-[16px]">
                    {c.dynamicName} <span className="text-muted-white">· {c.eventName}</span>
                </p>
                <p className="font-space-mono text-[10px] uppercase text-muted-white">
                    {t(`kind.${dynamicLabelKey(c)}`)} · {t('from', { host: c.hostOrgName })}
                </p>
            </div>
            <CollaborationStatusPill status={c.status} />
            {children}
        </li>
    );
}

/** An invitation my org sent: to whom, for which dynamic, the answer, and what I can still do. */
function SentRow({
    c,
    canAct,
    highlighted,
    resending,
    ending,
    onResend,
    onCancel,
}: {
    c: SentCollaboration;
    canAct: boolean;
    highlighted: boolean;
    resending: boolean;
    ending: boolean;
    onResend: () => void;
    onCancel: () => void;
}) {
    const t = useTranslations('collaborations');
    const expires = useColombiaExpiry(c.expiresAt);
    const scrollRef = useScrollOnce(highlighted);
    const live = c.status === 'pending' || c.status === 'expired';
    return (
        <li
            ref={scrollRef}
            className={`flex flex-wrap items-center gap-3 px-5 py-3.5 ${highlighted ? HIGHLIGHT : ''}`}
            data-testid={`sent-${c.id}`}
            aria-current={highlighted ? 'true' : undefined}
        >
            <IdolAvatar name={c.guestOrgName} src={c.guestAvatarUrl} size={36} />
            <div className="min-w-0 flex-1">
                <p className="font-display text-[16px]">{t('sentTo', { guest: c.guestOrgName })}</p>
                <p className="font-space-mono text-[10px] uppercase text-muted-white">
                    {t(`kind.${dynamicLabelKey(c)}`)} · {c.dynamicName} · {c.eventName}
                </p>
                {c.status === 'pending' && expires && (
                    <p className="mt-0.5 text-[12px] text-body-white">{t('expiresAt', { date: expires.date, time: expires.time })}</p>
                )}
            </div>
            {c.unseenResponse && (
                <span className="label-mono inline-flex rounded-full border-2 border-ink bg-lime px-2.5 py-0.5 font-bold text-ink">
                    {t('newResponse')}
                </span>
            )}
            <CollaborationStatusPill status={c.status} />
            <Link href={dynamicHref(c)} className={TEXT_LINK} aria-label={`${t('goToDynamic')}: ${c.dynamicName}`}>
                <ExternalLink size={12} aria-hidden="true" />
                {t('goToDynamic')}
            </Link>
            {canAct && live && (
                <button
                    type="button"
                    onClick={onResend}
                    disabled={resending}
                    aria-label={t('resendFor', { name: c.guestOrgName })}
                    title={t('resend')}
                    className={ICON_BUTTON}
                >
                    <Send size={16} aria-hidden="true" />
                </button>
            )}
            {canAct && c.status === 'pending' && (
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={ending}
                    aria-label={t('cancelFor', { name: c.guestOrgName })}
                    title={t('cancel')}
                    className={ICON_BUTTON}
                >
                    <X size={16} aria-hidden="true" />
                </button>
            )}
        </li>
    );
}
