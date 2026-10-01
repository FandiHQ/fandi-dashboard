/**
 * Idol collaborations (fandi-api RFC §3) — small pure rules for the guest
 * inbox and the shared-event page.
 */
import type { Collaboration, ContestCategoryResult, DynamicType, ExperienceKind } from '../types/api';

/**
 * The invitation behind an email `?token=`: the API has no token lookup,
 * so the card names host, event and dynamic only when the inbox holds
 * exactly one pending invitation (then it has to be that one). Otherwise
 * null, and the card stays generic.
 */
export function matchTokenInvitation(inbox: readonly Collaboration[]): Collaboration | null {
    const pending = inbox.filter((c) => c.status === 'pending');
    return pending.length === 1 ? pending[0] : null;
}

/**
 * History rows open the shared page only for a collaboration that was
 * accepted and then ended (it keeps the data up to its end). Declined or
 * expired ones never had access.
 */
export function canOpenFromHistory(c: Pick<Collaboration, 'status' | 'respondedAt'>): boolean {
    return c.status === 'ended' && !!c.respondedAt;
}

/**
 * The "Resultados" block on the shared page: only for an oportunidad
 * (never an Impacto or an auction), and only when there is something to
 * say — results with participants, or "results coming" right after close.
 */
export function showSharedResults({
    dynamicType,
    dynamicKind,
    categories,
    notFinalized,
}: {
    dynamicType: DynamicType;
    dynamicKind?: ExperienceKind | null;
    categories: readonly Pick<ContestCategoryResult, 'participants'>[] | undefined;
    notFinalized: boolean;
}): boolean {
    if (dynamicType !== 'experience' || dynamicKind === 'impacto') return false;
    if (notFinalized) return true;
    return (categories ?? []).some((c) => c.participants > 0);
}
