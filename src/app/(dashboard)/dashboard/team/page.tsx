'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgApi, eventsApi } from '@/lib/api-hooks';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, MoreHorizontal, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { OrganizationMember, OrgRole, InviteMemberDto, UpdateMemberRoleDto } from '@/types/api';

import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ── Helpers ──

const ROLE_COLORS: Record<OrgRole, { bg: string; text: string; border: string }> = {
    owner: { bg: 'bg-[#8B5CF620]', text: 'text-[#8B5CF6]', border: 'border-[#8B5CF640]' },
    admin: { bg: 'bg-[#2D00F720]', text: 'text-[#2D00F7]', border: 'border-[#2D00F740]' },
    viewer: { bg: 'bg-[#73737320]', text: 'text-[#737373]', border: 'border-[#73737340]' },
    staff: { bg: 'bg-[#22C55E20]', text: 'text-[#22C55E]', border: 'border-[#22C55E40]' },
};

const ROLE_LABELS: Record<OrgRole, string> = {
    owner: 'OWNER',
    admin: 'ADMIN',
    viewer: 'VIEWER',
    staff: 'STAFF',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: 'bg-[#F59E0B20]', text: 'text-[#F59E0B]', border: 'border-[#F59E0B40]' },
    active: { bg: 'bg-[#22C55E20]', text: 'text-[#22C55E]', border: 'border-[#22C55E40]' },
};

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
        <div className="flex flex-col items-center justify-center gap-4 py-20">
            <p className="font-space-mono text-sm text-[#737373]">{t('error')}</p>
        </div>
    );

    return (
        <div className="flex flex-col gap-8 px-8 py-10">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="font-sora text-[50px] font-bold leading-none text-white">{t('title')}</h1>
                    {organization && (
                        <p className="mt-2 font-space-mono text-sm text-[#737373]">{organization.name}</p>
                    )}
                </div>
                {canInvite && <InviteMemberDialog t={t} isOwner={isOwner} />}
            </div>

            {/* Table */}
            {!members || members.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-none border border-[#1E1E1E] bg-[#0A0A0A] py-20">
                    <p className="font-space-mono text-sm text-[#737373]">{t('empty')}</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-none border border-[#1E1E1E] bg-[#0A0A0A]">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#1E1E1E]">
                                <th className="px-5 py-4 text-left font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">{t('name')}</th>
                                <th className="px-5 py-4 text-left font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">{t('email')}</th>
                                <th className="px-5 py-4 text-left font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">{t('role')}</th>
                                <th className="px-5 py-4 text-left font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">{t('eventAccess')}</th>
                                <th className="px-5 py-4 text-left font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">{t('status')}</th>
                                {canInvite && (
                                    <th className="px-5 py-4 text-right font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">{t('actions')}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((member) => (
                                <MemberRow
                                    key={member.userId}
                                    member={member}
                                    isOwner={isOwner}
                                    canInvite={canInvite}
                                    t={t}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Member Row ──

function MemberRow({
    member,
    isOwner,
    canInvite,
    t,
}: {
    member: OrganizationMember;
    isOwner: boolean;
    canInvite: boolean;
    t: ReturnType<typeof useTranslations>;
}) {
    const rc = ROLE_COLORS[member.role];
    const canModify = isOwner && member.role !== 'owner';

    // Event access display logic
    const renderEventAccess = () => {
        if (member.role === 'owner' || member.role === 'admin') {
            return <span className="text-[var(--color-tactical-acid)]">{t('allEvents')}</span>;
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
        return <span className="text-[var(--color-tactical-acid)]">{t('allEvents')}</span>;
    };

    return (
        <tr className="border-b border-[#1E1E1E] bg-[#0D0D0D] transition-colors hover:bg-[#141414]">
            <td className="px-5 py-4 font-space-mono text-[13px] text-white">
                {member.displayName || '—'}
            </td>
            <td className="px-5 py-4 font-space-mono text-[13px] text-[#A3A3A3]">
                {member.email || '—'}
            </td>
            <td className="px-5 py-4">
                <span className={`inline-block rounded-none border px-3 py-1 font-space-mono text-[10px] uppercase tracking-[1px] ${rc.bg} ${rc.text} ${rc.border}`}>
                    {ROLE_LABELS[member.role]}
                </span>
            </td>
            <td className="px-5 py-4 font-space-mono text-[13px] text-[#A3A3A3]">
                {renderEventAccess()}
            </td>
            <td className="px-5 py-4">
                <div className="flex flex-col gap-1">
                    <span className={`inline-block rounded-none border px-3 py-1 font-space-mono text-[10px] uppercase tracking-[1px] ${(STATUS_COLORS[member.status] ?? STATUS_COLORS.active).bg} ${(STATUS_COLORS[member.status] ?? STATUS_COLORS.active).text} ${(STATUS_COLORS[member.status] ?? STATUS_COLORS.active).border}`}>
                        {member.status === 'pending' ? t('pending') : t('active')}
                    </span>
                    <span className="font-space-mono text-[10px] text-[#4A4A4A]">
                        {t('invitedOn')} {relativeTime(member.invitedAt)}
                    </span>
                </div>
            </td>
            {canInvite && (
                <td className="px-5 py-4 text-right">
                    {canModify ? (
                        <MemberActions member={member} t={t} />
                    ) : null}
                </td>
            )}
        </tr>
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
    const queryClient = useQueryClient();
    const [roleDialogOpen, setRoleDialogOpen] = useState(false);
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

    const resend = useMutation({
        mutationFn: () => orgApi.resendInvite(member.userId),
        onSuccess: () => {
            toast.success(t('inviteResent'));
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Error';
            toast.error(message);
        },
    });

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="cursor-pointer rounded-none p-2 text-[#737373] transition-colors hover:bg-[#1A1A1A] hover:text-white">
                        <MoreHorizontal size={16} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-none border-[#1E1E1E] bg-[#121212]">
                    {member.status === 'pending' && (
                        <DropdownMenuItem
                            onClick={() => resend.mutate()}
                            disabled={resend.isPending}
                            className="cursor-pointer rounded-none font-space-mono text-xs uppercase tracking-[1px] text-[var(--color-tactical-acid)] hover:bg-[#1A1A1A]"
                        >
                            {t('resendInvite')}
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                        onClick={() => setRoleDialogOpen(true)}
                        className="cursor-pointer rounded-none font-space-mono text-xs uppercase tracking-[1px] text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-white"
                    >
                        {t('changeRole')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setRemoveDialogOpen(true)}
                        className="cursor-pointer rounded-none font-space-mono text-xs uppercase tracking-[1px] text-[#FF3366] hover:bg-[#1A1A1A]"
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
            const message = err instanceof Error ? err.message : 'Error';
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
        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
            <DialogTrigger asChild>
                <button className="btn-tactical flex cursor-pointer items-center gap-2 rounded-none bg-[#2D00F7] px-7 py-3.5 font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all duration-200 hover:shadow-[0_0_30px_rgba(45,0,247,0.6)]">
                    <UserPlus size={15} />
                    {t('inviteMember')}
                </button>
            </DialogTrigger>
            <DialogContent className="rounded-none border border-[var(--color-tactical-acid)] bg-[#121212] shadow-[0_0_20px_rgba(204,255,0,0.15)]">
                <DialogHeader>
                    <DialogTitle className="font-sora text-xl uppercase text-white">{t('inviteMember')}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-5">
                    {/* Display Name (optional) */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">{t('displayName')}</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="María García"
                            className="h-12 w-full rounded-none border border-[#1A1A1A] bg-[#0A0A0A] px-4 font-space-mono text-sm text-white placeholder:text-[#4A4A4A] focus:border-[var(--color-tactical-acid)] focus:outline-none focus:ring-0"
                        />
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">{t('email')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@ejemplo.com"
                            className="h-12 w-full rounded-none border border-[#1A1A1A] bg-[#0A0A0A] px-4 font-space-mono text-sm text-white placeholder:text-[#4A4A4A] focus:border-[var(--color-tactical-acid)] focus:outline-none focus:ring-0"
                        />
                    </div>

                    {/* Role Select */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">{t('role')}</label>
                        <select
                            value={role}
                            onChange={(e) => { setRole(e.target.value as OrgRole); setSelectedEventIds([]); }}
                            className="h-12 w-full cursor-pointer rounded-none border border-[#1A1A1A] bg-[#0A0A0A] px-4 font-space-mono text-sm text-white focus:border-[var(--color-tactical-acid)] focus:outline-none focus:ring-0"
                        >
                            {isOwner && <option value="admin">Admin</option>}
                            <option value="viewer">Viewer</option>
                            <option value="staff">Staff</option>
                        </select>
                    </div>

                    {/* Event restriction (staff & viewer) */}
                    {showEventPicker && (
                        <div className="flex flex-col gap-2">
                            <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">{t('eventRestriction')}</label>
                            <p className="font-space-mono text-[11px] text-[#4A4A4A]">{t('eventRestrictionHint')}</p>
                            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-none border border-[#1A1A1A] bg-[#0A0A0A] p-2">
                                {nonDraftEvents.length === 0 ? (
                                    <p className="px-2 py-3 font-space-mono text-[11px] text-[#4A4A4A]">{t('noEvents')}</p>
                                ) : (
                                    nonDraftEvents.map(event => (
                                        <label key={event.id} className="flex cursor-pointer items-center gap-2 rounded-none px-2 py-1.5 transition-colors hover:bg-[#141414]">
                                            <input
                                                type="checkbox"
                                                checked={selectedEventIds.includes(event.id)}
                                                onChange={() => toggleEvent(event.id)}
                                                className="accent-[var(--color-tactical-acid)]"
                                            />
                                            <span className="font-space-mono text-xs text-[#A3A3A3]">{event.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={!email.trim() || invite.isPending}
                        className="btn-tactical flex h-12 cursor-pointer items-center justify-center gap-2 rounded-none bg-[#2D00F7] font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all duration-200 hover:shadow-[0_0_30px_rgba(45,0,247,0.6)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {invite.isPending && <Loader2 size={14} className="animate-spin" />}
                        {t('invite')}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
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
            const message = err instanceof Error ? err.message : 'Error';
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-none border border-[var(--color-tactical-acid)] bg-[#121212] shadow-[0_0_20px_rgba(204,255,0,0.15)]">
                <DialogHeader>
                    <DialogTitle className="font-sora text-xl uppercase text-white">{t('changeRole')}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-5">
                    <p className="font-space-mono text-sm text-[#A3A3A3]">
                        {t('changeRoleFor', { name: member.displayName || member.email || '' })}
                    </p>

                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">{t('newRole')}</label>
                        <select
                            value={newRole}
                            onChange={(e) => { setNewRole(e.target.value as OrgRole); setSelectedEventIds([]); }}
                            className="h-12 w-full cursor-pointer rounded-none border border-[#1A1A1A] bg-[#0A0A0A] px-4 font-space-mono text-sm text-white focus:border-[var(--color-tactical-acid)] focus:outline-none focus:ring-0"
                        >
                            <option value="admin">Admin</option>
                            <option value="viewer">Viewer</option>
                            <option value="staff">Staff</option>
                        </select>
                    </div>

                    {showEventPicker && (
                        <div className="flex flex-col gap-2">
                            <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">{t('eventRestriction')}</label>
                            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-none border border-[#1A1A1A] bg-[#0A0A0A] p-2">
                                {nonDraftEvents.length === 0 ? (
                                    <p className="px-2 py-3 font-space-mono text-[11px] text-[#4A4A4A]">{t('noEvents')}</p>
                                ) : (
                                    nonDraftEvents.map(event => (
                                        <label key={event.id} className="flex cursor-pointer items-center gap-2 rounded-none px-2 py-1.5 transition-colors hover:bg-[#141414]">
                                            <input
                                                type="checkbox"
                                                checked={selectedEventIds.includes(event.id)}
                                                onChange={() => toggleEvent(event.id)}
                                                className="accent-[var(--color-tactical-acid)]"
                                            />
                                            <span className="font-space-mono text-xs text-[#A3A3A3]">{event.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={update.isPending}
                        className="btn-tactical flex h-12 cursor-pointer items-center justify-center gap-2 rounded-none bg-[#2D00F7] font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all duration-200 hover:shadow-[0_0_30px_rgba(45,0,247,0.6)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {update.isPending && <Loader2 size={14} className="animate-spin" />}
                        {t('saveChanges')}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
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
    const queryClient = useQueryClient();

    const remove = useMutation({
        mutationFn: () => orgApi.removeMember(member.userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
            toast.success(t('removed'));
            onOpenChange(false);
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Error';
            toast.error(message);
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="rounded-none border border-[var(--color-tactical-magenta)] bg-[#121212] shadow-[0_0_20px_rgba(255,0,85,0.2)]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-sora text-xl text-white">{t('removeMember')}</AlertDialogTitle>
                    <AlertDialogDescription className="font-space-mono text-sm text-[#A0A0A0]">
                        {t('confirmRemove', { name: member.displayName || member.email || '' })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-none border-[#2A2A2A] bg-transparent font-space-mono text-sm uppercase tracking-[1px] text-white hover:bg-[#1A1A1A] hover:text-white">
                        {t('cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => remove.mutate()}
                        disabled={remove.isPending}
                        className="rounded-none bg-[#FF3366] font-space-mono text-sm uppercase tracking-[1px] text-white hover:bg-[#CC2952] disabled:opacity-50"
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
        <div className="flex flex-col gap-8 px-8 py-10">
            <div className="flex items-end justify-between">
                <div>
                    <div className="h-12 w-64 animate-pulse rounded-none bg-[#1A1A1A]" />
                    <div className="mt-2 h-4 w-40 animate-pulse rounded-none bg-[#1A1A1A]" />
                </div>
                <div className="h-12 w-48 animate-pulse rounded-none bg-[#1A1A1A]" />
            </div>
            <div className="overflow-hidden rounded-none border border-[#1E1E1E] bg-[#0A0A0A]">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-6 border-b border-[#1E1E1E] px-5 py-4">
                        <div className="h-4 w-32 animate-pulse rounded-none bg-[#1A1A1A]" />
                        <div className="h-4 w-48 animate-pulse rounded-none bg-[#1A1A1A]" />
                        <div className="h-4 w-16 animate-pulse rounded-none bg-[#1A1A1A]" />
                        <div className="h-4 w-28 animate-pulse rounded-none bg-[#1A1A1A]" />
                        <div className="h-4 w-24 animate-pulse rounded-none bg-[#1A1A1A]" />
                    </div>
                ))}
            </div>
        </div>
    );
}
