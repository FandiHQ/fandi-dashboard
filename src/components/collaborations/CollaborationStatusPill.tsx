'use client';

import { useTranslations } from 'next-intl';
import type { CollaborationStatus } from '@/types/api';

const PILL =
    'inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 font-space-mono text-[10px] font-bold uppercase tracking-[0.12em]';

/**
 * The word always carries the state (never colour alone). No lime here:
 * lime means live or your action, and "accepted" is neither (§1.4).
 */
const STYLE: Record<CollaborationStatus, string> = {
    pending: 'border-ink bg-white text-ink',
    accepted: 'border-ink bg-ink text-white',
    declined: 'border-line-white bg-white text-muted-white',
    ended: 'border-line-white bg-white text-muted-white',
    expired: 'border-alert-white bg-white text-alert-white',
};

export function CollaborationStatusPill({ status }: { status: CollaborationStatus }) {
    const t = useTranslations('collaborations.status');
    return (
        <span className={`${PILL} ${STYLE[status]}`} data-testid={`collab-status-${status}`}>
            {t(status)}
        </span>
    );
}
