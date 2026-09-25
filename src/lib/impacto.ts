/**
 * Phase 6 — Impacto helpers shared by the Oportunidades page.
 *
 * An Impacto is an Oportunidad without a draw. The api discriminates on
 * `kind`; older api builds omit the field, which reads as 'oportunidad'.
 * The progress bar is the one money surface allowed on a recognition
 * screen: it is the cause's total, never a fan's spend.
 */
export type ExperienceKind = 'oportunidad' | 'impacto';
export type KindFilter = 'all' | ExperienceKind;

export function kindOf(exp: { kind?: ExperienceKind | null }): ExperienceKind {
    return exp.kind === 'impacto' ? 'impacto' : 'oportunidad';
}

export function isImpacto(exp: { kind?: ExperienceKind | null }): boolean {
    return kindOf(exp) === 'impacto';
}

/**
 * 0–100 (rounded) share of the goal, or null when there is no goal.
 * Never above 100 — a cause can overshoot, the bar cannot.
 */
export function impactoPercent(
    raisedCop: number,
    goalCop: number | null | undefined,
): number | null {
    if (!goalCop || goalCop <= 0) return null;
    const raw = (Math.max(0, raisedCop) / goalCop) * 100;
    return Math.min(100, Math.round(raw));
}

export function goalReached(
    raisedCop: number,
    goalCop: number | null | undefined,
): boolean {
    return !!goalCop && goalCop > 0 && raisedCop >= goalCop;
}

export function filterByKind<T extends { kind?: ExperienceKind | null }>(
    items: T[],
    filter: KindFilter,
): T[] {
    if (filter === 'all') return items;
    return items.filter((item) => kindOf(item) === filter);
}
