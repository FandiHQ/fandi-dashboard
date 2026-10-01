'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgApi, eventsApi } from '@/lib/api-hooks';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, MoreHorizontal, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import type { OrganizationMember, OrgRole, InviteMemberDto, UpdateMemberRoleDto } from '@/types/api';

import {
    Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ── Helpers ──

// Avatar circles cycle the four category colours (equal visual weight,
// no colour ranks above another). BASE white carries the ink outline.
const AVATAR_COLORS = ['bg-tier-vip', 'bg-tier-alta', 'bg-tier-media', 'bg-tier-base'] as const;

function initialsOf(name: string | null | undefined, email: string | null | undefined): string {
    const source = (name || email || '?').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
}

// Shared field look for native selects inside the white side panel.
const SELECT_CLASS = 'h-12 w-full cursor-pointer rounded-[10px] border-2 border-ink bg-white px-3 text-sm font-semibold text-ink outline-none focus-visible:shadow-ext-sm';
const FIELD_LABEL_CLASS = 'label-mono text-[11px] text-muted-white';

function relativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffSeconds = Math.floor((now - then) / 1000);

    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

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

// ── Main Page ──

export default function TeamPage() {
    const t = useTranslations('team');
    const { memberRole, organization } = useAuth();
    const isOwner = memberRole === 'owner';
    const canInvite = memberRole === 'owner' || memberRole === 'admin';

    const { data: members, isLoading, error } = useQuery({
        queryKey: ['organization', 'members'],
        queryFn: () => orgApi.getMembers(),
    });

    if (isLoading) return <TeamSkeleton />;
    if (error) return (
        <div className="block-white flex flex-col items-center justify-center gap-4 px-6 py-16">
            <p className="label-mono text-[11px] text-alert-white">{t('error')}</p>
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
                <div className="block-white flex flex-col items-center justify-center gap-4 px-6 py-16">
                    <p className="text-sm text-muted-white">{t('empty')}</p>
                </div>
            ) : (
                <div className="block-white overflow-hidden">
                    <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3.5">
                        <span className="font-display text-[17px]">{t('membersTitle')}</span>
                        <span className="font-space-mono text-[10px] text-muted-white tabular">{members.length}</span>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-5">{t('name')}</TableHead>
                                <TableHead>{t('email')}</TableHead>
                                <TableHead>{t('role')}</TableHead>
                                <TableHead>{t('eventAccess')}</TableHead>
                                <TableHead>{t('status')}</TableHead>
                                {canInvite && (
                                    <TableHead className="pr-5 text-right">{t('actions')}</TableHead>
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
        </div>
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
    t: ReturnType<typeof useTranslations>;
}) {
    const canModify = isOwner && member.role !== 'owner';
    const isPending = member.status === 'pending';

    // Event access display logic
    const renderEventAccess = () => {
        if (member.role === 'owner' || member.role === 'admin') {
            return <span className="font-bold text-blue">{t('allEvents')}</span>;
        }
        // staff / viewer
        if (member.eventNames && member.eventNames.length > 0) {
            return (
                <div className="flex flex-col gap-0.5">
                    {member.eventNames.map((name, i) => (
                        <span key={i} className="leading-tight">{name}</span>
                    ))}
                </div>
            );
        }
        if (member.eventIds && member.eventIds.length > 0) {
            // Fallback if names aren't resolved
            return `${member.eventIds.length} evento${member.eventIds.length > 1 ? 's' : ''}`;
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
                    <span className="text-sm font-extrabold text-ink">{member.displayName || '—'}</span>
                </div>
            </TableCell>
            <TableCell className="text-[13px] text-muted-white">
                {member.email || '—'}
            </TableCell>
            <TableCell>
                <span className="label-mono inline-flex rounded-full border-2 border-ink bg-lilac px-2.5 py-0.5 font-bold text-ink">
                    {t(`roles.${member.role}`)}
                </span>
            </TableCell>
            <TableCell className="text-[13px] text-body-white">
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
                        {member.status === 'pending' ? t('pending') : t('active')}
                    </span>
                    <span className="font-space-mono text-[10px] text-muted-white">
                        {t('invitedOn')} {relativeTime(member.invitedAt)}
                    </span>
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
    t: ReturnType<typeof useTranslations>;
}) {
    const tCommon = useTranslations('common');
    const queryClient = useQueryClient();
    const [roleDialogOpen, setRoleDialogOpen] = useState(false);
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

    const resend = useMutation({
        mutationFn: () => orgApi.resendInvite(member.userId),
        onSuccess: () => {
            toast.success(t('inviteResent'));
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : tCommon('error');
            toast.error(message);
        },
    });

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        aria-label={t('actions')}
                        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[10px] border-2 border-transparent text-ink transition-colors hover:border-ink hover:bg-line-white"
                    >
                        <MoreHorizontal size={16} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {member.status === 'pending' && (
                        <DropdownMenuItem
                            onClick={() => resend.mutate()}
                            disabled={resend.isPending}
                            className="label-mono cursor-pointer rounded-[8px] py-2 text-[11px] font-bold text-blue"
                        >
                            {t('resendInvite')}
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                        onClick={() => setRoleDialogOpen(true)}
                        className="label-mono cursor-pointer rounded-[8px] py-2 text-[11px] font-bold text-ink"
                    >
                        {t('changeRole')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setRemoveDialogOpen(true)}
                        className="label-mono cursor-pointer rounded-[8px] py-2 text-[11px] font-bold"
                    >
                        {t('remove')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ChangeRoleDialog
                member={member}
                open={roleDialogOpen}
                onOpenChange={setRoleDialogOpen}
                t={t}
            />
            <RemoveConfirmDialog
                member={member}
                open={removeDialogOpen}
                onOpenChange={setRemoveDialogOpen}
                t={t}
            />
        </>
    );
}

// ── Invite Member Dialog ──

function InviteMemberDialog({ t, isOwner }: { t: ReturnType<typeof useTranslations>; isOwner: boolean }) {
    const tCommon = useTranslations('common');
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState<OrgRole>(isOwner ? 'viewer' : 'staff');
    const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

    const showEventPicker = role === 'staff' || role === 'viewer';

    const { data: eventsData } = useQuery({
        queryKey: ['events'],
        queryFn: () => eventsApi.list({ limit: 100 }),
        enabled: showEventPicker,
    });

    const nonDraftEvents = eventsData?.items?.filter(e => e.status !== 'draft') ?? [];

    const invite = useMutation({
        mutationFn: (dto: InviteMemberDto) => orgApi.inviteMember(dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
            toast.success(t('invited'));
            resetForm();
            setOpen(false);
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : tCommon('error');
            toast.error(message);
        },
    });

    const resetForm = () => {
        setEmail('');
        setDisplayName('');
        setRole(isOwner ? 'viewer' : 'staff');
        setSelectedEventIds([]);
    };

    const handleSubmit = () => {
        if (!email.trim()) return;
        const dto: InviteMemberDto = {
            email: email.trim(),
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
                    <UserPlus size={16} />
                    {t('inviteMember')}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="gap-0">
                <SheetHeader className="border-b-2 border-ink px-6 pb-4 pt-6 pr-16">
                    <SheetTitle>{t('inviteMember')}</SheetTitle>
                    <SheetDescription>{t('invitePanelHint')}</SheetDescription>
                </SheetHeader>
                <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
                    {/* Display Name (optional) */}
                    <div className="flex flex-col gap-2">
                        <label className={FIELD_LABEL_CLASS}>{t('displayName')}</label>
                        <Input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="María García"
                            className="h-12"
                        />
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-2">
                        <label className={FIELD_LABEL_CLASS}>{t('email')}</label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@ejemplo.com"
                            className="h-12"
                        />
                    </div>

                    {/* Role Select */}
                    <div className="flex flex-col gap-2">
                        <label className={FIELD_LABEL_CLASS}>{t('role')}</label>
                        <select
                            value={role}
                            onChange={(e) => { setRole(e.target.value as OrgRole); setSelectedEventIds([]); }}
                            className={SELECT_CLASS}
                        >
                            {isOwner && <option value="admin">{t('roles.admin')}</option>}
                            <option value="viewer">{t('roles.viewer')}</option>
                            <option value="staff">{t('roles.staff')}</option>
                        </select>
                    </div>

                    {/* Event restriction (staff & viewer) */}
                    {showEventPicker && (
                        <div className="flex flex-col gap-2">
                            <label className={FIELD_LABEL_CLASS}>{t('eventRestriction')}</label>
                            <p className="text-[13px] text-muted-white">{t('eventRestrictionHint')}</p>
                            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-[12px] border-2 border-ink bg-white p-2">
                                {nonDraftEvents.length === 0 ? (
                                    <p className="px-2 py-3 font-space-mono text-[11px] text-muted-white">{t('noEvents')}</p>
                                ) : (
                                    nonDraftEvents.map(event => (
                                        <label key={event.id} className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 transition-colors hover:bg-line-white">
                                            <input
                                                type="checkbox"
                                                checked={selectedEventIds.includes(event.id)}
                                                onChange={() => toggleEvent(event.id)}
                                                className="size-4 accent-blue"
                                            />
                                            <span className="text-sm font-semibold text-ink">{event.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <SheetFooter className="border-t-2 border-ink px-6 py-4">
                    {/* Submit */}
                    <Button
                        size="lg"
                        onClick={handleSubmit}
                        disabled={!email.trim() || invite.isPending}
                        className="w-full"
                    >
                        {invite.isPending && <Loader2 size={14} className="animate-spin" />}
                        {t('invite')}
                    </Button>
                </SheetFooter>
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
    t: ReturnType<typeof useTranslations>;
}) {
    const tCommon = useTranslations('common');
    const queryClient = useQueryClient();
    const [newRole, setNewRole] = useState<OrgRole>(member.role === 'owner' ? 'admin' : member.role);
    const [selectedEventIds, setSelectedEventIds] = useState<string[]>(member.eventIds ?? []);

    const showEventPicker = newRole === 'staff' || newRole === 'viewer';

    const { data: eventsData } = useQuery({
        queryKey: ['events'],
        queryFn: () => eventsApi.list({ limit: 100 }),
        enabled: showEventPicker,
    });

    const nonDraftEvents = eventsData?.items?.filter(e => e.status !== 'draft') ?? [];

    const update = useMutation({
        mutationFn: (dto: UpdateMemberRoleDto) => orgApi.updateMember(member.userId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
            toast.success(t('roleUpdated'));
            onOpenChange(false);
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : tCommon('error');
            toast.error(message);
        },
    });

    const handleSubmit = () => {
        const dto: UpdateMemberRoleDto = {
            role: newRole,
            ...(showEventPicker && selectedEventIds.length > 0 ? { eventIds: selectedEventIds } : {}),
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
                <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
                    <div className="flex flex-col gap-2">
                        <label className={FIELD_LABEL_CLASS}>{t('newRole')}</label>
                        <select
                            value={newRole}
                            onChange={(e) => { setNewRole(e.target.value as OrgRole); setSelectedEventIds([]); }}
                            className={SELECT_CLASS}
                        >
                            <option value="admin">{t('roles.admin')}</option>
                            <option value="viewer">{t('roles.viewer')}</option>
                            <option value="staff">{t('roles.staff')}</option>
                        </select>
                    </div>

                    {showEventPicker && (
                        <div className="flex flex-col gap-2">
                            <label className={FIELD_LABEL_CLASS}>{t('eventRestriction')}</label>
                            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-[12px] border-2 border-ink bg-white p-2">
                                {nonDraftEvents.length === 0 ? (
                                    <p className="px-2 py-3 font-space-mono text-[11px] text-muted-white">{t('noEvents')}</p>
                                ) : (
                                    nonDraftEvents.map(event => (
                                        <label key={event.id} className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 transition-colors hover:bg-line-white">
                                            <input
                                                type="checkbox"
                                                checked={selectedEventIds.includes(event.id)}
                                                onChange={() => toggleEvent(event.id)}
                                                className="size-4 accent-blue"
                                            />
                                            <span className="text-sm font-semibold text-ink">{event.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <SheetFooter className="border-t-2 border-ink px-6 py-4">
                    <Button
                        size="lg"
                        onClick={handleSubmit}
                        disabled={update.isPending}
                        className="w-full"
                    >
                        {update.isPending && <Loader2 size={14} className="animate-spin" />}
                        {t('saveChanges')}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// ── Remove Member Confirmation ──

function RemoveConfirmDialog({
    member,
    open,
    onOpenChange,
    t,
}: {
    member: OrganizationMember;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    t: ReturnType<typeof useTranslations>;
}) {
    const tCommon = useTranslations('common');
    const queryClient = useQueryClient();

    const remove = useMutation({
        mutationFn: () => orgApi.removeMember(member.userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
            toast.success(t('removed'));
            onOpenChange(false);
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : tCommon('error');
            toast.error(message);
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-2xl">{t('removeMember')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('confirmRemove', { name: member.displayName || member.email || '' })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>
                        {t('cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        onClick={() => remove.mutate()}
                        disabled={remove.isPending}
                    >
                        {remove.isPending ? <Loader2 size={14} className="animate-spin" /> : t('remove')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// ── Skeleton ──

function TeamSkeleton() {
    return (
        <div className="flex flex-col gap-7">
            <div className="flex items-end justify-between">
                <div>
                    <div className="h-11 w-64 animate-pulse rounded-[12px] bg-white/15" />
                    <div className="mt-2 h-3.5 w-40 animate-pulse rounded-full bg-white/15" />
                </div>
                <div className="h-12 w-48 animate-pulse rounded-[14px] bg-white/15" />
            </div>
            <div className="block-white overflow-hidden">
                <div className="border-b-2 border-ink px-5 py-3.5">
                    <div className="h-4 w-28 animate-pulse rounded-full bg-line-white" />
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-6 border-b border-line-white px-5 py-3 last:border-0">
                        <div className="size-9 animate-pulse rounded-full bg-line-white" />
                        <div className="h-4 w-32 animate-pulse rounded-full bg-line-white" />
                        <div className="h-4 w-48 animate-pulse rounded-full bg-line-white" />
                        <div className="h-4 w-16 animate-pulse rounded-full bg-line-white" />
                        <div className="h-4 w-24 animate-pulse rounded-full bg-line-white" />
                    </div>
                ))}
            </div>
        </div>
    );
}
