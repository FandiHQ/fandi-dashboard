'use client';

/**
 * "LISTA PARA PUBLICAR · n DE 4" — the draft event's setup checklist.
 *
 * Replaces the scattered signals a draft used to show (the publish button
 * failing with a toast, a "dinámicas listas" chip on an event that could
 * not be published, the badge notice on its own). Each step says what is
 * missing in plain words and links to where it is fixed. It mirrors what
 * the API enforces on publish: date/city invariants, at least one
 * dynamic, ≥ 20 questions per oportunidad, and every badge template.
 */
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check, Circle } from 'lucide-react';

export interface SetupStep {
    key: 'details' | 'dynamics' | 'questions' | 'badges';
    done: boolean;
    /** Plain detail of what is missing (only when not done). */
    detail?: string;
    href: string;
}

export function setupProgress(steps: SetupStep[]): { done: number; total: number } {
    return { done: steps.filter((s) => s.done).length, total: steps.length };
}

export function EventSetupChecklist({ steps }: { steps: SetupStep[] }) {
    const t = useTranslations('events.setup');
    const { done, total } = setupProgress(steps);
    const next = steps.find((s) => !s.done);

    return (
        <section
            className="block-white flex flex-col gap-3 p-4"
            aria-labelledby="event-setup-title"
            data-testid="event-setup-checklist"
        >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="event-setup-title" className="font-display text-[20px] text-ink">
                    {done === total ? t('ready') : t('title', { done, total })}
                </h2>
                <div
                    className="h-2 w-40 overflow-hidden rounded-full bg-line-white"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={done}
                    aria-label={t('title', { done, total })}
                >
                    <div className="h-full bg-blue" style={{ width: `${(done / total) * 100}%` }} />
                </div>
            </div>
            <ol className="grid gap-2 md:grid-cols-2">
                {steps.map((step) => (
                    <li key={step.key} data-testid={`setup-step-${step.key}`} data-done={step.done}>
                        <Link
                            href={step.href}
                            className={`flex items-start gap-2.5 rounded-[10px] border-2 px-3 py-2 ${step.done ? 'border-line-white' : step === next ? 'border-ink bg-lime/40' : 'border-ink'}`}
                        >
                            {step.done ? (
                                <Check size={16} className="mt-0.5 shrink-0 text-blue" aria-hidden="true" />
                            ) : (
                                <Circle size={16} className="mt-0.5 shrink-0 text-ink" aria-hidden="true" />
                            )}
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className={`text-[15px] font-bold ${step.done ? 'text-ink/55 line-through' : 'text-ink'}`}>
                                    {t(`steps.${step.key}`)}
                                </span>
                                {!step.done && step.detail && (
                                    <span className="mt-0.5 text-[14px] leading-snug text-ink">{step.detail}</span>
                                )}
                            </span>
                            {!step.done && <ArrowRight size={14} className="mt-1 shrink-0 text-ink" aria-hidden="true" />}
                        </Link>
                    </li>
                ))}
            </ol>
        </section>
    );
}
