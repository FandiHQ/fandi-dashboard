'use client';

/**
 * Idols picked in a create panel before the dynamic exists ("Se invitará
 * al guardar"). The panel's create call sends them once it has the new
 * id — one invitation per idol — and shows a single toast for the save and
 * the invitations. A failed invitation never costs the created dynamic: it
 * is listed in the toast and can be retried from the edit panel.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { collaborationsApi } from '@/lib/api-hooks';
import {
    MAX_QUEUED_IDOLS,
    sendQueuedInvites,
    summarizeInvites,
    type QueuedInviteOutcome,
} from '@/lib/collaborations';
import type { DynamicType, IdolSearchResult } from '@/types/api';

export interface QueuedIdols {
    items: IdolSearchResult[];
    add: (idol: IdolSearchResult) => void;
    remove: (id: string) => void;
}

export function useQueuedInvites(eventId: string, dynamicType: DynamicType) {
    const t = useTranslations('collaborations');
    const tCommon = useTranslations('common');
    const queryClient = useQueryClient();
    const [items, setItems] = useState<IdolSearchResult[]>([]);

    const queue: QueuedIdols = {
        items,
        add: (idol) =>
            setItems((prev) =>
                prev.some((p) => p.id === idol.id) || prev.length >= MAX_QUEUED_IDOLS ? prev : [...prev, idol],
            ),
        remove: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),
    };

    /** Invites every picked idol to the dynamic just created. Never throws. */
    const sendFor = async (dynamicId: string): Promise<QueuedInviteOutcome[]> => {
        if (items.length === 0) return [];
        const outcomes = await sendQueuedInvites(
            (guestOrgId) => collaborationsApi.invite({ dynamicType, dynamicId, guestOrgId }),
            items,
            tCommon('error'),
        );
        // Sent or not, the panel now has an id: the edit view lists them.
        setItems([]);
        queryClient.invalidateQueries({ queryKey: ['events', eventId, 'collaborations'] });
        return outcomes;
    };

    /**
     * One toast for the save and its invitations. `title` is the panel's
     * own message ("Subasta creada"); without one the invitations lead.
     */
    const announce = (outcomes: QueuedInviteOutcome[], title?: string) => {
        if (outcomes.length === 0) {
            if (title) toast.success(title);
            return;
        }
        const { sent, failed } = summarizeInvites(outcomes);
        if (failed.length === 0) {
            const line = t('queuedSent', { count: sent.length });
            if (title) toast.success(title, { description: line });
            else toast.success(line);
            return;
        }
        const line = t('queuedPartial', { sent: sent.length, total: outcomes.length });
        toast.warning(title ?? line, {
            duration: 12_000,
            description: (
                <div className="flex flex-col gap-1" data-testid="queued-invites-failed">
                    {title && <span>{line}</span>}
                    <ul className="flex flex-col gap-0.5">
                        {failed.map((f) => (
                            <li key={f.name}>
                                <b>{f.name}</b>: {f.message}
                            </li>
                        ))}
                    </ul>
                </div>
            ),
        });
    };

    return { queue, sendFor, announce };
}
