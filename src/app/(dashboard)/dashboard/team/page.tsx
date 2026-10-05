'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgApi, eventsApi } from '@/lib/api-hooks';
import { useAuth } from '@/contexts/auth-context';
import { AlertCircle, Loader2, MoreHorizontal, RotateCw, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import type { OrganizationMember, OrgRole, InviteMemberDto, UpdateMemberRoleDto } from '@/types/api';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiErrorCode, apiErrorKind } from '@/lib/api-error-kind';
import { looksLikeEmail } from '@/lib/auth-flow';
import { inviteLikelyExpired } from '@/lib/team-invites';

import {
    Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type T = ReturnType<typeof useTranslations>;

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

/** Plain copy for a failed team action (the API's messages are developer English). */
function teamErrorMessage(t: T, err: unknown, sendsEmail = false): string {
    // Typed codes first: an existing Fandi account is never re-created.
    switch (apiErrorCode(err)) {
        case 'EMAIL_IS_FAN_ACCOUNT': return t('errors.fanAccount');
        case 'ALREADY_IN_ANOTHER_TEAM': return t('errors.otherTeam');
        case 'ACCOUNT_ALREADY_ACTIVE': return t('errors.accountActive');
        case 'EMAIL_ALREADY_REGISTERED': return t('errors.emailRegistered');
    }
    switch (apiErrorKind(err)) {
        case 'conflict': return t('errors.alreadyMember');
        case 'forbidden': return t('errors.noPermission');
        case 'notFound': return t('errors.notFound');
        case 'invalid': return t('errors.invalid');
        case 'server': return sendsEmail ? t('errors.emailFailed') : t('errors.generic');
        case 'network': return t('errors.network');
        default: return t('errors.generic');
    }
}

function useResendInvite(member: OrganizationMember, t: T) {
    return useMutation({
        mutationFn: () => orgApi.resendInvite(member.userId),
        onSuccess: () => toast.success(t('inviteResent')),
        onError: (err: unknown) => toast.error(teamErrorMessage(t, err, true)),
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
        queryKey: ['organization', 'members'],
        queryFn: () => orgApi.getMembers(),
    });

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

            {/* Table */}
            {!members || members.length === 0 ? (
                <div className="block-white flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                    <Users size={36} className="text-muted-white" aria-hidden="true" />
                    <p className="text-[15px] font-bold text-ink">{t('empty')}</p>
                    {canInvite && <p className="max-w-[380px] text-sm text-muted-white">{t('emptyBody')}</p>}
                </div>
            ) : (
                <div className="block-white overflow-hidden">
                    <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3.5">
                        <h2 className="font-display text-[17px]">{t('membersTitle')}</h2>
                        <span className="font-space-mono text-[10px] text-muted-white tabular">{members.length}</span>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-5">{t('name')}</TableHead>
                                <TableHead className="hidden md:table-cell">{t('email')}</TableHead>
                                <TableHead>{t('role')}</TableHead>
                                <TableHead className="hidden sm:table-cell">{t('eventAccess')}</TableHead>
                                <TableHead>{t('status')}</TableHead>
                                {canInvite && (
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
                                    canInvite={canInvite}
                                    t={t}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>
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

// ── Member Row ──

function MemberRow({
    member,
    index,
    isOwner,
    canInvite,
    t,
}: {
    member: OrganizationMember;
    index: number;
    isOwner: boolean;
    canInvite: boolean;
    t: T;
}) {
    const locale = useLocale();
    const canModify = isOwner && member.role !== 'owner';
    const isPending = member.status === 'pending';
    const mayHaveExpired = isPending && inviteLikelyExpired(member.invitedAt);
    const resend = useResendInvite(member, t);
    const name = member.displayName || member.email || '—';

    // Event access display logic
    const renderEventAccess = () => {
        if (member.role === 'owner' || member.role === 'admin') {
            return <span className="font-bold text-blue">{t('allEvents')}</span>;
        }
        // staff / viewer
        if (member.eventNames && member.eventNames.length > 0) {
            return (
                <div className="flex flex-col gap-0.5">
                    {member.eventNames.map((eventName, i) => (
                        <span key={i} className="leading-tight">{eventName}</span>
                    ))}
                </div>
            );
        }
        if (member.eventIds && member.eventIds.length > 0) {
            // Fallback if names aren't resolved
            return t('eventsCount', { count: member.eventIds.length });
        }
        return <span className="font-bold text-blue">{t('allEvents')}</span>;
    };

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
                        <span className="text-sm font-extrabold text-ink">{member.displayName || '—'}</span>
                        {/* Small screens: the email column is hidden, show it here. */}
                        <span className="truncate text-[12px] text-muted-white md:hidden">{member.email || '—'}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className="hidden text-[13px] text-muted-white md:table-cell">
                {member.email || '—'}
            </TableCell>
            <TableCell>
                <RolePill role={member.role} t={t} />
            </TableCell>
            <TableCell className="hidden text-[13px] text-body-white sm:table-cell">
                {renderEventAccess()}
            </TableCell>
            <TableCell>
                <div className="flex flex-col items-start gap-1">
                    <span
                        className={
                            isPending
                                ? 'label-mono inline-flex rounded-full border-2 border-dashed border-ink bg-white px-2.5 py-0.5 font-bold text-ink'
                                : 'label-mono inline-flex rounded-full border-2 border-ink bg-ink px-2.5 py-0.5 font-bold text-white'
                        }
                    >
                        {isPending ? t('pending') : t('active')}
                    </span>
                    <span className="font-space-mono text-[10px] text-muted-white">
                        {t('invitedOn')} {relativeTime(member.invitedAt, locale)}
                    </span>
                    {mayHaveExpired && (
                        <span className="flex items-center gap-1.5 text-[12px] font-bold text-alert-white">
                            <span className="inline-block size-1.5 rounded-full bg-alert-white" aria-hidden="true" />
                            {t('inviteMayHaveExpired')}
                        </span>
                    )}
                    {isPending && canModify && (
                        <Button
                            variant="link"
                            size="xs"
                            onClick={() => resend.mutate()}
                            disabled={resend.isPending}
                            aria-label={t('resendFor', { name })}
                            className="h-auto px-0 text-[12px] font-bold text-blue"
                        >
                            {resend.isPending ? (
                                <>
                                    <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                                    {t('sending')}
                                </>
                            ) : t('resendShort')}
                        </Button>
                    )}
                </div>
            </TableCell>
            {canInvite && (
                <TableCell className="pr-5 text-right">
                    {canModify ? (
                        <MemberActions member={member} t={t} />
                    ) : null}
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
    const [roleDialogOpen, setRoleDialogOpen] = useState(false);
    const { confirm, dialog } = useConfirmDialog();
    const resend = useResendInvite(member, t);
    const name = member.displayName || member.email || '';

    const remove = useMutation({
        mutationFn: () => orgApi.removeMember(member.userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
            toast.success(t('removed'));
        },
        onError: (err: unknown) => toast.error(teamErrorMessage(t, err)),
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
                        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[10px] border-2 border-transparent text-ink transition-colors hover:border-ink hover:bg-line-white focus-visible:border-ink focus-visible:outline-none disabled:opacity-50"
                    >
                        {remove.isPending
                            ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                            : <MoreHorizontal size={16} aria-hidden="true" />}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {member.status === 'pending' && (
                        <DropdownMenuItem
                            onSelect={() => resend.mutate()}
                            disabled={resend.isPending}
                            className="label-mono cursor-pointer rounded-[8px] py-2 text-[11px] font-bold text-blue"
                        >
                            {t('resendInvite')}
                        </DropdownMenuItem>
                    )}
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
    const { data: eventsData, isLoading } = useQuery({
        queryKey: ['events'],
        queryFn: () => eventsApi.list({ limit: 100 }),
    });
    const nonDraftEvents = eventsData?.items?.filter(e => e.status !== 'draft') ?? [];

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
                ) : nonDraftEvents.length === 0 ? (
                    <p className="px-2 py-3 font-space-mono text-[11px] text-muted-white">{t('noEvents')}</p>
                ) : (
                    nonDraftEvents.map(event => (
                        <label key={event.id} className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 transition-colors hover:bg-line-white">
                            <input
                                type="checkbox"
                                checked={selected.includes(event.id)}
                                onChange={() => onToggle(event.id)}
                                className="size-4 accent-blue"
                            />
                            <span className="text-sm font-semibold text-ink">{event.name}</span>
                        </label>
                    ))
                )}
            </div>
        </fieldset>
    );
}

// ── Invite Member Dialog ──

function InviteMemberDialog({ t, isOwner }: { t: T; isOwner: boolean }) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState<OrgRole>(isOwner ? 'viewer' : 'staff');
    const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
    const [emailError, setEmailError] = useState<string | null>(null);

    const showEventPicker = role === 'staff' || role === 'viewer';

    const invite = useMutation({
        mutationFn: (dto: InviteMemberDto) => orgApi.inviteMember(dto),
        onSuccess: (member) => {
            queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
            // An existing account gets no invitation email: it joins on its next sign-in.
            toast.success(member?.existingAccount ? t('invitedExisting') : t('invited'));
            resetForm();
            setOpen(false);
        },
        onError: (err: unknown) => toast.error(teamErrorMessage(t, err, true)),
    });

    const resetForm = () => {
        setEmail('');
        setDisplayName('');
        setRole(isOwner ? 'viewer' : 'staff');
        setSelectedEventIds([]);
        setEmailError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = email.trim();
        if (!value) { setEmailError(t('emailRequired')); return; }
        if (!looksLikeEmail(value)) { setEmailError(t('invalidEmail')); return; }
        setEmailError(null);
        const dto: InviteMemberDto = {
            email: value,
            role,
            ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
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

                        {/* Display Name (optional) */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="invite-name" className={FIELD_LABEL_CLASS}>{t('displayName')}</label>
                            <Input
                                id="invite-name"
                                type="text"
                                autoComplete="off"
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
                                onChange={(e) => { setRole(e.target.value as OrgRole); setSelectedEventIds([]); }}
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
                            ) : t('invite')}
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
    const [newRole, setNewRole] = useState<OrgRole>(member.role === 'owner' ? 'admin' : member.role);
    const [selectedEventIds, setSelectedEventIds] = useState<string[]>(member.eventIds ?? []);

    const showEventPicker = newRole === 'staff' || newRole === 'viewer';

    const update = useMutation({
        mutationFn: (dto: UpdateMemberRoleDto) => orgApi.updateMember(member.userId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
            toast.success(t('roleUpdated'));
            onOpenChange(false);
        },
        onError: (err: unknown) => toast.error(teamErrorMessage(t, err)),
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
                    <div className="h-11 w-64 max-w-[60vw] animate-pulse rounded-[12px] bg-white/15" />
                    <div className="mt-2 h-3.5 w-40 animate-pulse rounded-full bg-white/15" />
                </div>
                <div className="h-12 w-48 max-w-[30vw] animate-pulse rounded-[14px] bg-white/15" />
            </div>
            <div className="block-white overflow-hidden">
                <div className="border-b-2 border-ink px-5 py-3.5">
                    <div className="h-4 w-28 animate-pulse rounded-full bg-line-white" />
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-6 border-b border-line-white px-5 py-3 last:border-0">
                        <div className="size-9 animate-pulse rounded-full bg-line-white" />
                        <div className="h-4 w-32 animate-pulse rounded-full bg-line-white" />
                        <div className="hidden h-4 w-48 animate-pulse rounded-full bg-line-white md:block" />
                        <div className="h-4 w-16 animate-pulse rounded-full bg-line-white" />
                        <div className="hidden h-4 w-24 animate-pulse rounded-full bg-line-white sm:block" />
                    </div>
                ))}
            </div>
        </div>
    );
}
