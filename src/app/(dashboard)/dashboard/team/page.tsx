'use client';

/**
 * Equipo (fandi-api RFC invitations-and-admin). Our own invitations: an
 * email with a 7-day single-use link, an explicit accept step, one team
 * per person. People join only by accepting, so:
 *  - Invitaciones: pending (Vence el … a las … hora de Colombia), expired,
 *    or moved from the old system without a live link ("Necesita
 *    reenvío"), with Reenviar (3 emails per 24 h) and Cancelar. Admins
 *    manage the viewer/staff ones (the API says so per row).
 *  - Miembros: active members only.
 *  - What each role can do.
 */
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgApi, eventsApi } from '@/lib/api-hooks';
import { useAuth } from '@/contexts/auth-context';
import { AlertCircle, Loader2, MailPlus, MoreHorizontal, RotateCw, Send, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import type {
    CreateInvitationDto, InvitableRole, OrganizationMember, OrgRole, TeamInvitation, UpdateMemberRoleDto,
} from '@/types/api';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { looksLikeEmail } from '@/lib/auth-flow';
import { colombiaDateTime } from '@/lib/colombia-time';
import {
    invitationRowState, resendBlockedUntil, teamErrorCopy, visibleInvitations, type InvitationRowState,
} from '@/lib/team-invites';

import {
    Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type T = ReturnType<typeof useTranslations>;

const MEMBERS_KEY = ['organization', 'members'] as const;
const INVITATIONS_KEY = ['organization', 'invitations'] as const;

// ── Helpers ──

// Avatar circles cycle the four category colours (equal visual weight,
// no colour ranks above another). BASE white carries the ink outline.
const AVATAR_COLORS = ['bg-tier-vip', 'bg-tier-alta', 'bg-tier-media', 'bg-tier-base'] as const;

const ROLE_ORDER: OrgRole[] = ['owner', 'admin', 'viewer', 'staff'];

function initialsOf(name: string | null | undefined, email: string | null | undefined): string {
    const source = (name || email || '?').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
}

// Shared field look for native selects inside the white side panel.
const SELECT_CLASS = 'h-12 w-full cursor-pointer rounded-[10px] border-2 border-ink bg-white px-3 text-sm font-semibold text-ink outline-none focus-visible:shadow-ext-sm';
const FIELD_LABEL_CLASS = 'label-mono text-[11px] text-muted-white';
const HINT_CLASS = 'text-[13px] leading-snug text-muted-white';

function relativeTime(dateStr: string, locale: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffSeconds = Math.max(0, Math.floor((now - then) / 1000));

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffSeconds < 60) return rtf.format(-diffSeconds, 'second');
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute');
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return rtf.format(-diffHours, 'hour');
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return rtf.format(-diffDays, 'day');
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return rtf.format(-diffMonths, 'month');
    return rtf.format(-Math.floor(diffMonths / 12), 'year');
}

/** Plain copy for a failed team action (never the API's own text). */
function useTeamErrorMessage() {
    const t = useTranslations('team');
    const locale = useLocale();
    return (err: unknown, sendsEmail = false): string => {
        const copy = teamErrorCopy(err, sendsEmail);
        if (copy.key === 'resendLimit') {
            const when = colombiaDateTime(copy.retryAt, locale);
            return when ? t('errors.resendLimit', { date: when.date, time: when.time }) : t('errors.resendLimitSoon');
        }
        if (copy.key === 'orgRateLimited') return t('errors.orgRateLimited', { limit: copy.limit ?? 30 });
        return t(`errors.${copy.key}`);
    };
}

/**
 * The organization's events, read once for the access column and the
 * restriction picker (one cache entry). Names come from here, not from the
 * API's eventNames, which falls back to the raw id when it cannot resolve one.
 */
function useOrgEvents(enabled = true) {
    return useQuery({
        queryKey: ['events'],
        queryFn: () => eventsApi.list({ limit: 100 }),
        enabled,
    });
}

const EVENT_CHIP = 'inline-flex max-w-[220px] items-center rounded-[8px] border-2 px-2 py-0.5 text-[12px] font-bold leading-tight';

/** Resend one invitation (row button, or the toast after "already pending"). */
function useResendInvitation() {
    const t = useTranslations('team');
    const queryClient = useQueryClient();
    const errorMessage = useTeamErrorMessage();
    return useMutation({
        mutationFn: (id: string) => orgApi.resendInvitation(id),
        onSuccess: (inv) => {
            queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY });
            toast.success(t('inviteResent', { email: inv.email }));
        },
        onError: (err: unknown) => {
            queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY });
            toast.error(errorMessage(err, true));
        },
    });
}

// ── Main Page ──

export default function TeamPage() {
    const t = useTranslations('team');
    const tCommon = useTranslations('common');
    const { memberRole, organization } = useAuth();
    const isOwner = memberRole === 'owner';
    const canInvite = memberRole === 'owner' || memberRole === 'admin';

    const { data: members, isLoading, error, refetch, isRefetching } = useQuery({
        queryKey: MEMBERS_KEY,
        queryFn: () => orgApi.getMembers(),
    });
    const invitations = useQuery({
        queryKey: INVITATIONS_KEY,
        queryFn: () => orgApi.listInvitations(),
        enabled: canInvite,
    });
    const shownInvitations = visibleInvitations(invitations.data ?? []);
    const someoneRestricted =
        !!members?.some((m) => (m.role === 'staff' || m.role === 'viewer') && (m.eventIds?.length ?? 0) > 0) ||
        shownInvitations.some((i) => (i.eventIds?.length ?? 0) > 0);
    const eventsQuery = useOrgEvents(someoneRestricted);
    const eventNames = new Map((eventsQuery.data?.items ?? []).map((e) => [e.id, e.name]));

    if (isLoading) return <TeamSkeleton />;
    if (error) return (
        <div className="block-white flex flex-col items-center justify-center gap-4 px-6 py-16 text-center" role="alert">
            <AlertCircle size={32} className="text-alert-white" aria-hidden="true" />
            <p className="max-w-[420px] text-sm font-semibold text-ink">{t('errorBody')}</p>
            <Button variant="secondary" onClick={() => refetch()} disabled={isRefetching}>
                {isRefetching ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RotateCw size={14} aria-hidden="true" />}
                {tCommon('retry')}
            </Button>
        </div>
    );

    return (
        <div className="flex flex-col gap-7">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="font-hero text-[44px] text-white lg:text-[48px]">{t('title')}</h1>
                    {organization && (
                        <p className="label-mono mt-2 text-[11px] text-lilac">{organization.name}</p>
                    )}
                </div>
                {canInvite && <InviteMemberDialog t={t} isOwner={isOwner} />}
            </div>

            {/* Invitations (owners and admins) */}
            {canInvite && (
                <InvitationsSection
                    items={shownInvitations}
                    isLoading={invitations.isLoading}
                    isError={invitations.isError}
                    onRetry={() => invitations.refetch()}
                    retrying={invitations.isRefetching}
                    eventNames={eventNames}
                    eventsLoading={eventsQuery.isLoading}
                    t={t}
                />
            )}

            {/* Members */}
            {!members || members.length === 0 ? (
                <div className="block-white flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                    <Users size={36} className="text-muted-white" aria-hidden="true" />
                    <p className="text-[15px] font-bold text-ink">{t('empty')}</p>
                    {canInvite && <p className="max-w-[380px] text-sm text-muted-white">{t('emptyBody')}</p>}
                </div>
            ) : (
                <section className="block-white overflow-hidden" aria-labelledby="team-members-title">
                    <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3.5">
                        <h2 id="team-members-title" className="font-display text-[17px]">{t('membersTitle')}</h2>
                        <span className="font-space-mono text-[10px] text-muted-white tabular">{members.length}</span>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-5">{t('name')}</TableHead>
                                <TableHead className="hidden md:table-cell">{t('email')}</TableHead>
                                <TableHead>{t('role')}</TableHead>
                                <TableHead className="hidden sm:table-cell">{t('eventAccess')}</TableHead>
                                {isOwner && (
                                    <TableHead className="pr-5 text-right">
                                        <span className="sr-only">{t('actions')}</span>
                                    </TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map((member, index) => (
                                <MemberRow
                                    key={member.userId}
                                    member={member}
                                    index={index}
                                    isOwner={isOwner}
                                    eventNames={eventNames}
                                    eventsLoading={eventsQuery.isLoading}
                                    t={t}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </section>
            )}

            {/* What each role can do (one line each) */}
            <section className="block-white px-5 py-4" aria-labelledby="team-roles-guide">
                <h2 id="team-roles-guide" className="label-mono mb-3 text-[11px] text-muted-white">
                    {t('rolesGuideTitle')}
                </h2>
                <dl className="grid gap-2.5 sm:grid-cols-2">
                    {ROLE_ORDER.map((role) => (
                        <div key={role} className="flex items-start gap-3">
                            <dt className="shrink-0">
                                <RolePill role={role} t={t} />
                            </dt>
                            <dd className="text-[13px] leading-snug text-body-white">{t(`roleHints.${role}`)}</dd>
                        </div>
                    ))}
                </dl>
            </section>
        </div>
    );
}

function RolePill({ role, t }: { role: OrgRole; t: T }) {
    return (
        <span className="label-mono inline-flex whitespace-nowrap rounded-full border-2 border-ink bg-lilac px-2.5 py-0.5 font-bold text-ink">
            {t(`roles.${role}`)}
        </span>
    );
}

/** Event access: owner/admin see everything; staff/viewer every event (no list) or one chip per event. */
function EventAccess({
    role,
    eventIds,
    apiNames,
    eventNames,
    eventsLoading,
    t,
}: {
    role: OrgRole;
    eventIds: string[] | null;
    apiNames: string[] | null;
    eventNames: Map<string, string>;
    eventsLoading: boolean;
    t: T;
}) {
    const ids = eventIds ?? [];
    if (role === 'owner' || role === 'admin' || ids.length === 0) {
        return <span className="font-bold text-blue">{t('allEvents')}</span>;
    }
    const resolved: { id: string; name: string }[] = [];
    let unresolved = 0;
    ids.forEach((id, i) => {
        // The API sends the id itself when it could not find the event.
        const apiName = apiNames?.[i];
        const eventName = eventNames.get(id) ?? (apiName && apiName !== id ? apiName : null);
        if (eventName) resolved.push({ id, name: eventName });
        else unresolved += 1;
    });
    return (
        <ul className="flex max-w-[320px] flex-wrap gap-1.5" aria-label={t('eventAccess')}>
            {resolved.map(({ id, name: eventName }) => (
                <li key={id} className="min-w-0">
                    <span title={eventName} className={`${EVENT_CHIP} border-ink bg-white text-ink`}>
                        <span className="truncate">{eventName}</span>
                    </span>
                </li>
            ))}
            {unresolved > 0 && (
                <li>
                    {eventsLoading ? (
                        <Skeleton className="h-6 w-24 rounded-[8px] bg-line-white" />
                    ) : (
                        // Events that are gone: one plain chip, never the ids.
                        <span className={`${EVENT_CHIP} border-dashed border-muted-white bg-white text-muted-white`}>
                            {t('eventUnavailable', { count: unresolved })}
                        </span>
                    )}
                </li>
            )}
        </ul>
    );
}

// ── Invitations ──

const STATE_PILL: Record<InvitationRowState, string> = {
    pending: 'border-ink bg-white text-ink',
    expired: 'border-alert-white bg-white text-alert-white',
    needsResend: 'border-dashed border-alert-white bg-white text-alert-white',
};

function InvitationsSection({
    items,
    isLoading,
    isError,
    onRetry,
    retrying,
    eventNames,
    eventsLoading,
    t,
}: {
    items: TeamInvitation[];
    isLoading: boolean;
    isError: boolean;
    onRetry: () => void;
    retrying: boolean;
    eventNames: Map<string, string>;
    eventsLoading: boolean;
    t: T;
}) {
    const tCommon = useTranslations('common');
    return (
        <section className="block-white overflow-hidden" aria-labelledby="team-invitations-title" data-testid="team-invitations">
            <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3.5">
                <h2 id="team-invitations-title" className="font-display text-[17px]">{t('invitationsTitle')}</h2>
                {!isLoading && !isError && (
                    <span className="font-space-mono text-[10px] text-muted-white tabular">{items.length}</span>
                )}
            </div>
            {isLoading ? (
                <div className="flex flex-col gap-2 px-5 py-4" aria-busy="true">
                    <div className="h-4 w-56 animate-pulse rounded-full bg-line-white motion-reduce:animate-none" />
                    <div className="h-4 w-40 animate-pulse rounded-full bg-line-white motion-reduce:animate-none" />
                </div>
            ) : isError ? (
                <div className="flex flex-wrap items-center gap-3 px-5 py-4" role="alert">
                    <p className="text-sm font-semibold text-ink">{t('invitationsError')}</p>
                    <Button variant="secondary" size="sm" onClick={onRetry} disabled={retrying}>
                        {retrying ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RotateCw size={14} aria-hidden="true" />}
                        {tCommon('retry')}
                    </Button>
                </div>
            ) : items.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-white">{t('invitationsEmpty')}</p>
            ) : (
                <ul className="flex flex-col divide-y-2 divide-line-white">
                    {items.map((inv) => (
                        <InvitationRow
                            key={inv.id}
                            inv={inv}
                            eventNames={eventNames}
                            eventsLoading={eventsLoading}
                            t={t}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}

function InvitationRow({
    inv,
    eventNames,
    eventsLoading,
    t,
}: {
    inv: TeamInvitation;
    eventNames: Map<string, string>;
    eventsLoading: boolean;
    t: T;
}) {
    const locale = useLocale();
    const queryClient = useQueryClient();
    const errorMessage = useTeamErrorMessage();
    const { confirm, dialog } = useConfirmDialog();
    const resend = useResendInvitation();
    const revoke = useMutation({
        mutationFn: () => orgApi.revokeInvitation(inv.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY });
            toast.success(t('invitationCancelled'));
        },
        onError: (err: unknown) => {
            queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY });
            toast.error(errorMessage(err));
        },
    });

    const state = invitationRowState(inv);
    const label = inv.name || inv.email;
    const expires = colombiaDateTime(inv.expiresAt, locale);
    const blockedUntil = resendBlockedUntil(inv);
    const blocked = blockedUntil ? colombiaDateTime(blockedUntil, locale) : null;
    const sentAt = inv.lastSentAt ?? inv.createdAt;
    // No inviter = Fandi (Crear ídolo); an inviter without a name stays unnamed.
    const senderLine = inv.invitedBy
        ? (inv.invitedBy.displayName ? t('sentBy', { name: inv.invitedBy.displayName }) : null)
        : t('sentByFandi');
    const busy = resend.isPending || revoke.isPending;

    const askRevoke = async () => {
        const ok = await confirm({
            title: t('cancelInvitationTitle'),
            description: t('cancelInvitationBody', { email: inv.email }),
            confirmLabel: t('cancelInvitationConfirm'),
            cancelLabel: t('keepInvitation'),
        });
        if (ok) revoke.mutate();
    };

    return (
        <li className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3.5" data-testid={`invitation-${inv.id}`}>
            <div className="flex min-w-[220px] flex-1 items-center gap-3">
                <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-ink bg-white text-[12px] font-black text-ink"
                >
                    {initialsOf(inv.name, inv.email)}
                </span>
                <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-extrabold text-ink">{label}</span>
                    {inv.name && <span className="truncate text-[12px] text-muted-white">{inv.email}</span>}
                    <span className="font-space-mono text-[10px] text-muted-white">
                        {[senderLine, relativeTime(sentAt, locale)].filter(Boolean).join(' · ')}
                    </span>
                </div>
            </div>

            <div className="flex min-w-[160px] flex-col items-start gap-1.5">
                <RolePill role={inv.role} t={t} />
                <span className="text-[12px] text-body-white">
                    <EventAccess
                        role={inv.role}
                        eventIds={inv.eventIds}
                        apiNames={inv.eventNames}
                        eventNames={eventNames}
                        eventsLoading={eventsLoading}
                        t={t}
                    />
                </span>
            </div>

            <div className="flex min-w-[220px] flex-1 flex-col items-start gap-1">
                <span className={`label-mono inline-flex rounded-full border-2 px-2.5 py-0.5 font-bold ${STATE_PILL[state]}`}>
                    {t(`invitationState.${state}`)}
                </span>
                {state === 'needsResend' ? (
                    <span className="text-[12px] leading-snug text-body-white">{t('needsResendHint')}</span>
                ) : expires ? (
                    <span className="text-[12px] leading-snug text-body-white">
                        {t(state === 'expired' ? 'expiredOn' : 'expiresOn', { date: expires.date, time: expires.time })}
                    </span>
                ) : null}
                {blocked && (
                    <span className="text-[12px] font-semibold leading-snug text-muted-white">
                        {t('resendAvailable', { date: blocked.date, time: blocked.time })}
                    </span>
                )}
            </div>

            {(inv.canResend || inv.canRevoke) && (
                <div className="flex items-center gap-2">
                    {inv.canResend && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-10"
                            onClick={() => resend.mutate(inv.id)}
                            disabled={busy || !!blocked}
                            aria-label={t('resendFor', { name: label })}
                        >
                            {resend.isPending
                                ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                                : <Send size={14} aria-hidden="true" />}
                            {t('resendShort')}
                        </Button>
                    )}
                    {inv.canRevoke && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 text-alert-white hover:bg-line-white"
                            onClick={() => { void askRevoke(); }}
                            disabled={busy}
                            aria-label={t('cancelFor', { name: label })}
                        >
                            {revoke.isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                            {t('cancelShort')}
                        </Button>
                    )}
                </div>
            )}
            {dialog}
        </li>
    );
}

// ── Member Row ──

function MemberRow({
    member,
    index,
    isOwner,
    eventNames,
    eventsLoading,
    t,
}: {
    member: OrganizationMember;
    index: number;
    isOwner: boolean;
    eventNames: Map<string, string>;
    eventsLoading: boolean;
    t: T;
}) {
    const tCommon = useTranslations('common');
    const canModify = isOwner && member.role !== 'owner';
    const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

    return (
        <TableRow>
            <TableCell className="pl-5">
                <div className="flex items-center gap-3">
                    <span
                        aria-hidden="true"
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink text-[12px] font-black text-ink ${avatarColor}`}
                    >
                        {initialsOf(member.displayName, member.email)}
                    </span>
                    <div className="flex min-w-0 flex-col">
                        <span className="text-sm font-extrabold text-ink">{member.displayName || tCommon('noName')}</span>
                        {/* Small screens: the email column is hidden, show it here. */}
                        <span className="truncate text-[12px] text-muted-white md:hidden">{member.email || tCommon('noEmail')}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className="hidden text-[13px] text-muted-white md:table-cell">
                {member.email || tCommon('noEmail')}
            </TableCell>
            <TableCell>
                <RolePill role={member.role} t={t} />
            </TableCell>
            <TableCell className="hidden text-[13px] text-body-white sm:table-cell">
                <EventAccess
                    role={member.role}
                    eventIds={member.eventIds}
                    apiNames={member.eventNames}
                    eventNames={eventNames}
                    eventsLoading={eventsLoading}
                    t={t}
                />
            </TableCell>
            {isOwner && (
                <TableCell className="pr-5 text-right">
                    {canModify ? <MemberActions member={member} t={t} /> : null}
                </TableCell>
            )}
        </TableRow>
    );
}

// ── Member Actions Dropdown ──

function MemberActions({
    member,
    t,
}: {
    member: OrganizationMember;
    t: T;
}) {
    const queryClient = useQueryClient();
    const errorMessage = useTeamErrorMessage();
    const [roleDialogOpen, setRoleDialogOpen] = useState(false);
    const { confirm, dialog } = useConfirmDialog();
    const name = member.displayName || member.email || '';

    const remove = useMutation({
        mutationFn: () => orgApi.removeMember(member.userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
            toast.success(t('removed'));
        },
        onError: (err: unknown) => toast.error(errorMessage(err)),
    });

    const askRemove = async () => {
        const ok = await confirm({
            title: t('removeMember'),
            description: t('confirmRemove', { name }),
            confirmLabel: t('remove'),
            cancelLabel: t('cancel'),
        });
        if (ok) remove.mutate();
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label={`${t('actions')}: ${name}`}
                        disabled={remove.isPending}
                        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-[10px] border-2 border-transparent text-ink transition-colors hover:border-ink hover:bg-line-white focus-visible:border-ink focus-visible:outline-none disabled:opacity-50"
                    >
                        {remove.isPending
                            ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                            : <MoreHorizontal size={16} aria-hidden="true" />}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onSelect={() => setRoleDialogOpen(true)}
                        className="label-mono cursor-pointer rounded-[8px] py-2 text-[11px] font-bold text-ink"
                    >
                        {t('changeRole')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => { void askRemove(); }}
                        className="label-mono cursor-pointer rounded-[8px] py-2 text-[11px] font-bold"
                    >
                        {t('remove')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {roleDialogOpen && (
                <ChangeRoleDialog
                    member={member}
                    open={roleDialogOpen}
                    onOpenChange={setRoleDialogOpen}
                    t={t}
                />
            )}
            {dialog}
        </>
    );
}

// ── Event restriction picker (staff & viewer) ──

function EventRestrictionPicker({
    idPrefix,
    selected,
    onToggle,
    t,
}: {
    idPrefix: string;
    selected: string[];
    onToggle: (eventId: string) => void;
    t: T;
}) {
    const tCommon = useTranslations('common');
    const { data: eventsData, isLoading } = useOrgEvents();
    const allEvents = eventsData?.items ?? [];
    const nonDraftEvents = allEvents.filter(e => e.status !== 'draft');
    // Access kept from before (a draft, or an event that is gone): listed so
    // it can still be unticked, by name or with a plain word, never the id.
    const keptOutside = selected
        .filter(id => !nonDraftEvents.some(e => e.id === id))
        .map(id => ({ id, name: allEvents.find(e => e.id === id)?.name ?? null }));

    return (
        <fieldset className="flex flex-col gap-2">
            <legend className={FIELD_LABEL_CLASS}>{t('eventRestriction')}</legend>
            <p id={`${idPrefix}-events-hint`} className={HINT_CLASS}>{t('eventRestrictionHint')}</p>
            <div
                className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-[12px] border-2 border-ink bg-white p-2"
                aria-describedby={`${idPrefix}-events-hint`}
            >
                {isLoading ? (
                    <p className="flex items-center gap-2 px-2 py-3 font-space-mono text-[11px] text-muted-white">
                        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                        {tCommon('loading')}
                    </p>
                ) : nonDraftEvents.length === 0 && keptOutside.length === 0 ? (
                    <p className="px-2 py-3 font-space-mono text-[11px] text-muted-white">{t('noEvents')}</p>
                ) : (
                    <>
                        {nonDraftEvents.map(event => (
                            <label key={event.id} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 transition-colors hover:bg-line-white">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(event.id)}
                                    onChange={() => onToggle(event.id)}
                                    className="size-4 accent-blue"
                                />
                                <span className="text-sm font-semibold text-ink">{event.name}</span>
                            </label>
                        ))}
                        {keptOutside.map(({ id, name }) => (
                            <label key={id} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 transition-colors hover:bg-line-white">
                                <input
                                    type="checkbox"
                                    checked
                                    onChange={() => onToggle(id)}
                                    className="size-4 accent-blue"
                                />
                                <span className={`text-sm font-semibold ${name ? 'text-ink' : 'text-muted-white'}`}>
                                    {name ?? t('eventUnavailable', { count: 1 })}
                                </span>
                            </label>
                        ))}
                    </>
                )}
            </div>
        </fieldset>
    );
}

// ── Invite Member Dialog ──

function InviteMemberDialog({ t, isOwner }: { t: T; isOwner: boolean }) {
    const queryClient = useQueryClient();
    const errorMessage = useTeamErrorMessage();
    const resendExisting = useResendInvitation();
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState<InvitableRole>(isOwner ? 'viewer' : 'staff');
    const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
    const [emailError, setEmailError] = useState<string | null>(null);

    const showEventPicker = role === 'staff' || role === 'viewer';

    const resetForm = () => {
        setEmail('');
        setDisplayName('');
        setRole(isOwner ? 'viewer' : 'staff');
        setSelectedEventIds([]);
        setEmailError(null);
    };

    const invite = useMutation({
        mutationFn: (dto: CreateInvitationDto) => orgApi.createInvitation(dto),
        onSuccess: (_created, dto) => {
            queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY });
            // Same answer whatever the email is: it never says whether it has an account.
            toast.success(t('invitationSent', { email: dto.email }));
            resetForm();
            setOpen(false);
        },
        onError: (err: unknown) => {
            const copy = teamErrorCopy(err, true);
            const pendingId = copy.key === 'invitationPending' ? copy.invitationId : undefined;
            toast.error(errorMessage(err, true), pendingId ? {
                action: { label: t('resendShort'), onClick: () => resendExisting.mutate(pendingId) },
            } : undefined);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = email.trim();
        if (!value) { setEmailError(t('emailRequired')); return; }
        if (!looksLikeEmail(value)) { setEmailError(t('invalidEmail')); return; }
        setEmailError(null);
        const dto: CreateInvitationDto = {
            email: value,
            role,
            ...(displayName.trim() ? { name: displayName.trim() } : {}),
            ...(showEventPicker && selectedEventIds.length > 0 ? { eventIds: selectedEventIds } : {}),
        };
        invite.mutate(dto);
    };

    const toggleEvent = (eventId: string) => {
        setSelectedEventIds(prev =>
            prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
        );
    };

    return (
        <Sheet open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
            <SheetTrigger asChild>
                <Button variant="secondary" size="lg">
                    <UserPlus size={16} aria-hidden="true" />
                    {t('inviteMember')}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="gap-0">
                <SheetHeader className="border-b-2 border-ink px-6 pb-4 pt-6 pr-16">
                    <SheetTitle>{t('inviteMember')}</SheetTitle>
                    <SheetDescription>{t('invitePanelHint')}</SheetDescription>
                </SheetHeader>
                <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
                    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
                        {/* Email */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="invite-email" className={FIELD_LABEL_CLASS}>{t('email')}</label>
                            <Input
                                id="invite-email"
                                type="email"
                                inputMode="email"
                                autoComplete="off"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                                placeholder="nombre@correo.com"
                                aria-invalid={emailError ? true : undefined}
                                aria-describedby={emailError ? 'invite-email-error' : undefined}
                                className="h-12"
                                autoFocus
                            />
                            {emailError && (
                                <p id="invite-email-error" role="alert" className="text-[13px] font-bold text-alert-white">
                                    {emailError}
                                </p>
                            )}
                        </div>

                        {/* Name (optional): how the email greets them */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="invite-name" className={FIELD_LABEL_CLASS}>{t('displayName')}</label>
                            <Input
                                id="invite-name"
                                type="text"
                                autoComplete="off"
                                maxLength={100}
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="María García"
                                className="h-12"
                            />
                        </div>

                        {/* Role Select */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="invite-role" className={FIELD_LABEL_CLASS}>{t('role')}</label>
                            <select
                                id="invite-role"
                                value={role}
                                onChange={(e) => { setRole(e.target.value as InvitableRole); setSelectedEventIds([]); }}
                                aria-describedby="invite-role-hint"
                                className={SELECT_CLASS}
                            >
                                {isOwner && <option value="admin">{t('roles.admin')}</option>}
                                <option value="viewer">{t('roles.viewer')}</option>
                                <option value="staff">{t('roles.staff')}</option>
                            </select>
                            <p id="invite-role-hint" className={HINT_CLASS}>{t(`roleHints.${role}`)}</p>
                        </div>

                        {showEventPicker && (
                            <EventRestrictionPicker
                                idPrefix="invite"
                                selected={selectedEventIds}
                                onToggle={toggleEvent}
                                t={t}
                            />
                        )}
                    </div>

                    <SheetFooter className="border-t-2 border-ink px-6 py-4">
                        <Button
                            type="submit"
                            size="lg"
                            disabled={invite.isPending}
                            className="w-full"
                        >
                            {invite.isPending ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                                    {t('sending')}
                                </>
                            ) : (
                                <>
                                    <MailPlus size={16} aria-hidden="true" />
                                    {t('invite')}
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

// ── Change Role Dialog ──

function ChangeRoleDialog({
    member,
    open,
    onOpenChange,
    t,
}: {
    member: OrganizationMember;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    t: T;
}) {
    const queryClient = useQueryClient();
    const errorMessage = useTeamErrorMessage();
    const [newRole, setNewRole] = useState<OrgRole>(member.role === 'owner' ? 'admin' : member.role);
    const [selectedEventIds, setSelectedEventIds] = useState<string[]>(member.eventIds ?? []);

    const showEventPicker = newRole === 'staff' || newRole === 'viewer';

    const update = useMutation({
        mutationFn: (dto: UpdateMemberRoleDto) => orgApi.updateMember(member.userId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
            toast.success(t('roleUpdated'));
            onOpenChange(false);
        },
        onError: (err: unknown) => toast.error(errorMessage(err)),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Always send the list: [] means "all events". Leaving it out made the
        // API keep the old restriction when someone unticked every event.
        const dto: UpdateMemberRoleDto = {
            role: newRole,
            eventIds: showEventPicker ? selectedEventIds : [],
        };
        update.mutate(dto);
    };

    const toggleEvent = (eventId: string) => {
        setSelectedEventIds(prev =>
            prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
        );
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="gap-0">
                <SheetHeader className="border-b-2 border-ink px-6 pb-4 pt-6 pr-16">
                    <SheetTitle>{t('changeRole')}</SheetTitle>
                    <SheetDescription>
                        {t('changeRoleFor', { name: member.displayName || member.email || '' })}
                    </SheetDescription>
                </SheetHeader>
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
                        <div className="flex flex-col gap-2">
                            <label htmlFor="change-role" className={FIELD_LABEL_CLASS}>{t('newRole')}</label>
                            <select
                                id="change-role"
                                value={newRole}
                                onChange={(e) => { setNewRole(e.target.value as OrgRole); setSelectedEventIds([]); }}
                                aria-describedby="change-role-hint"
                                className={SELECT_CLASS}
                            >
                                <option value="admin">{t('roles.admin')}</option>
                                <option value="viewer">{t('roles.viewer')}</option>
                                <option value="staff">{t('roles.staff')}</option>
                            </select>
                            <p id="change-role-hint" className={HINT_CLASS}>{t(`roleHints.${newRole}`)}</p>
                        </div>

                        {showEventPicker && (
                            <EventRestrictionPicker
                                idPrefix="change-role"
                                selected={selectedEventIds}
                                onToggle={toggleEvent}
                                t={t}
                            />
                        )}
                    </div>

                    <SheetFooter className="border-t-2 border-ink px-6 py-4">
                        <Button
                            type="submit"
                            size="lg"
                            disabled={update.isPending}
                            className="w-full"
                        >
                            {update.isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                            {t('saveChanges')}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

// ── Skeleton ──

function TeamSkeleton() {
    return (
        <div className="flex flex-col gap-7" aria-busy="true">
            <div className="flex items-end justify-between">
                <div>
                    <div className="h-11 w-64 max-w-[60vw] animate-pulse motion-reduce:animate-none rounded-[12px] bg-white/15" />
                    <div className="mt-2 h-3.5 w-40 animate-pulse motion-reduce:animate-none rounded-full bg-white/15" />
                </div>
                <div className="h-12 w-48 max-w-[30vw] animate-pulse motion-reduce:animate-none rounded-[14px] bg-white/15" />
            </div>
            <div className="block-white overflow-hidden">
                <div className="border-b-2 border-ink px-5 py-3.5">
                    <div className="h-4 w-28 animate-pulse motion-reduce:animate-none rounded-full bg-line-white" />
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-6 border-b border-line-white px-5 py-3 last:border-0">
                        <div className="size-9 animate-pulse motion-reduce:animate-none rounded-full bg-line-white" />
                        <div className="h-4 w-32 animate-pulse motion-reduce:animate-none rounded-full bg-line-white" />
                        <div className="hidden h-4 w-48 animate-pulse motion-reduce:animate-none rounded-full bg-line-white md:block" />
                        <div className="h-4 w-16 animate-pulse motion-reduce:animate-none rounded-full bg-line-white" />
                        <div className="hidden h-4 w-24 animate-pulse motion-reduce:animate-none rounded-full bg-line-white sm:block" />
                    </div>
                ))}
            </div>
        </div>
    );
}
