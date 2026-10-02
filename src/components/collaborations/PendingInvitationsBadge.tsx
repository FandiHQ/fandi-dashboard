'use client';

/**
 * The count of invitations awaiting an answer, on the Colaboraciones nav
 * item. Lime because it is your action (§1.4); on the active lime tile it
 * flips to ink so it never melts into it. Decorative to assistive tech:
 * the nav link's own label carries the count in words.
 */
import { pendingBadgeLabel } from '@/lib/collaborations';

export function PendingInvitationsBadge({
    count,
    active = false,
    placement,
}: {
    count: number;
    active?: boolean;
    /** `rail`: pinned to the 50px tile's corner. `inline`: after a text label. */
    placement: 'rail' | 'inline';
}) {
    const label = pendingBadgeLabel(count);
    if (!label) return null;
    const colors = active ? 'border-ink bg-ink text-lime' : 'border-ink bg-lime text-ink';
    const position = placement === 'rail' ? 'absolute -right-1.5 -top-1.5' : 'ml-auto';
    return (
        <span
            aria-hidden="true"
            data-testid="nav-pending-badge"
            className={`${position} flex h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 font-space-mono text-[10px] font-bold leading-none tabular-nums ${colors}`}
        >
            {label}
        </span>
    );
}
