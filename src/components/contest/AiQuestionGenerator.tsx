'use client';

/**
 * GENERAR CON IA — inside the question bank (QuestionBankEditor).
 *
 * The idol asks for N very easy questions (optionally with a focus). The
 * API runs a background job (research once per oportunidad → batches of
 * drafts → an independent check per draft) and this panel polls it,
 * showing drafts as they arrive. Nothing reaches the bank by itself:
 *   - "Agregar las N OK" adds every draft the check passed;
 *   - "Dudosa" drafts show the reason and are added or discarded one by one;
 *   - everything added still needs the panel's normal "Guardar".
 *
 * Drafts already in the bank (same prompt) are hidden, so reopening the
 * panel after adding never offers them twice.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Check, ExternalLink, Loader2, Sparkles, Square, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { contestApi } from '@/lib/api-hooks';
import { ApiError } from '@/lib/api';
import { BANK_MAX_QUESTIONS, type BankQuestionDraft } from '@/lib/contest-bank';
import type { AiJob, AiQuestionDraft } from '@/types/api';

const PRESETS = [20, 50, 100, 300] as const;
const RUNNING: AiJob['status'][] = ['queued', 'researching', 'generating'];
const LETTERS = ['A', 'B', 'C', 'D'] as const;

function normalize(text: string): string {
    return text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

export function draftToQuestion(d: AiQuestionDraft): BankQuestionDraft {
    return {
        clientKey: globalThis.crypto.randomUUID(),
        prompt: d.prompt,
        options: [...d.options],
        correctIndex: d.correctIndex,
    };
}

export function AiQuestionGenerator({
    experienceId,
    questions,
    onAdd,
}: {
    experienceId: string;
    questions: BankQuestionDraft[];
    onAdd: (added: BankQuestionDraft[]) => void;
}) {
    const t = useTranslations('experiences.questions.ai');
    const queryClient = useQueryClient();
    const room = Math.max(0, BANK_MAX_QUESTIONS - questions.length);
    const [count, setCount] = useState(() => Math.min(50, room || 50));
    const [focus, setFocus] = useState('');
    const [discarded, setDiscarded] = useState<Set<string>>(new Set());
    const jobKey = ['experiences', experienceId, 'ai-job'] as const;

    // Latest job (resumes after a reload); polls while it runs.
    const { data: job } = useQuery({
        queryKey: jobKey,
        queryFn: () => contestApi.latestAiJob(experienceId),
        refetchInterval: (query) => {
            const status = (query.state.data as AiJob | null | undefined)?.status;
            return status && RUNNING.includes(status) ? 3_000 : false;
        },
        refetchOnWindowFocus: false,
    });

    const start = useMutation({
        mutationFn: () => contestApi.startAiJob(experienceId, count, focus),
        onSuccess: (next) => {
            setDiscarded(new Set());
            queryClient.setQueryData(jobKey, next);
        },
    });
    const cancel = useMutation({
        mutationFn: (jobId: string) => contestApi.cancelAiJob(experienceId, jobId),
        onSuccess: (next) => queryClient.setQueryData(jobKey, next),
    });

    const inBank = useMemo(() => new Set(questions.map((q) => normalize(q.prompt))), [questions]);
    const drafts = useMemo(
        () =>
            (job?.questions ?? []).filter(
                (d) => !inBank.has(normalize(d.prompt)) && !discarded.has(normalize(d.prompt)),
            ),
        [job, inBank, discarded],
    );
    const okDrafts = drafts.filter((d) => d.check === 'ok');
    const running = job ? RUNNING.includes(job.status) : false;

    const add = (list: AiQuestionDraft[]) => onAdd(list.slice(0, room).map(draftToQuestion));
    const discard = (d: AiQuestionDraft) =>
        setDiscarded((prev) => new Set(prev).add(normalize(d.prompt)));

    // api.ts turns failures into ApiError { status, message }: 503 = AI not
    // configured; a 4xx carries the API's own explanation (bank locked or
    // full); anything else is a plain "could not start".
    const startError = start.error
        ? start.error instanceof ApiError && start.error.status === 503
            ? t('unavailable')
            : start.error instanceof ApiError && start.error.status >= 400 && start.error.status < 500
              ? start.error.message
              : t('startFailed')
        : null;

    return (
        <section
            className="flex flex-col gap-3 rounded-[12px] border-2 border-ink bg-lilac/30 px-3 py-3"
            data-testid="ai-generator"
            aria-labelledby="ai-generator-title"
        >
            <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue" aria-hidden="true" />
                <h4 id="ai-generator-title" className="label-mono font-bold text-ink">
                    {t('title')}
                </h4>
            </div>
            <p className="text-[12px] leading-snug text-ink">{t('intro')}</p>

            {!running && (
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('count')}>
                        {PRESETS.filter((p) => p <= room).map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setCount(p)}
                                aria-pressed={count === p}
                                className={`h-9 cursor-pointer rounded-[10px] border-2 border-ink px-3 text-[12px] font-extrabold ${count === p ? 'bg-ink text-white' : 'bg-white text-ink'}`}
                                data-testid={`ai-count-${p}`}
                            >
                                {p}
                            </button>
                        ))}
                        <Input
                            type="number"
                            min={1}
                            max={room}
                            value={count}
                            onChange={(e) => setCount(Math.max(1, Math.min(room, Number(e.target.value) || 1)))}
                            aria-label={t('countCustom', { max: room })}
                            className="h-9 w-24 border-2 border-ink bg-white text-sm font-bold"
                            data-testid="ai-count-input"
                        />
                        <span className="font-space-mono text-[10px] text-muted-white">{t('countMax', { max: room })}</span>
                    </div>
                    <Input
                        value={focus}
                        maxLength={200}
                        onChange={(e) => setFocus(e.target.value)}
                        placeholder={t('focusPlaceholder')}
                        aria-label={t('focus')}
                        className="h-10 border-2 border-ink bg-white text-sm"
                        data-testid="ai-focus"
                    />
                    <button
                        type="button"
                        onClick={() => start.mutate()}
                        disabled={room === 0 || start.isPending}
                        className="press flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border-2 border-ink bg-lime px-4 text-[13px] font-extrabold uppercase text-ink shadow-ext-sm disabled:cursor-not-allowed disabled:opacity-50"
                        data-testid="ai-start"
                    >
                        {start.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {room === 0 ? t('full', { max: BANK_MAX_QUESTIONS }) : t('start', { count })}
                    </button>
                    {startError && (
                        <p className="font-space-mono text-[11px] text-alert-white" role="alert">
                            {startError}
                        </p>
                    )}
                </div>
            )}

            {job && (
                <div className="flex flex-wrap items-center justify-between gap-2" data-testid="ai-status" aria-live="polite">
                    <p className="flex items-center gap-2 font-space-mono text-[11px] font-bold uppercase text-ink">
                        {running && <Loader2 size={12} className="animate-spin" />}
                        {job.status === 'generating'
                            ? t('status.generating', { done: job.questions.length, total: job.requestedCount })
                            : t(`status.${job.status}`, { count: job.questions.length })}
                    </p>
                    {running && (
                        <button
                            type="button"
                            onClick={() => cancel.mutate(job.id)}
                            disabled={cancel.isPending}
                            className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] px-2 text-[12px] font-extrabold uppercase text-blue hover:underline"
                            data-testid="ai-cancel"
                        >
                            <Square size={12} /> {t('cancel')}
                        </button>
                    )}
                </div>
            )}
            {job?.error && (
                <p className="text-[12px] leading-snug text-ink" data-testid="ai-error">
                    {job.error}
                </p>
            )}

            {drafts.length > 0 && (
                <div className="flex flex-col gap-2" data-testid="ai-drafts">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="label-mono font-bold text-ink">{t('drafts', { count: drafts.length })}</span>
                        {okDrafts.length > 0 && (
                            <button
                                type="button"
                                onClick={() => add(okDrafts)}
                                disabled={room === 0}
                                className="press flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border-2 border-ink bg-white px-3 text-[12px] font-extrabold uppercase text-ink shadow-ext-sm disabled:opacity-50"
                                data-testid="ai-add-all-ok"
                            >
                                <Check size={14} /> {t('addAllOk', { count: Math.min(okDrafts.length, room) })}
                            </button>
                        )}
                    </div>
                    <p className="text-[11px] text-ink">{t('rememberSave')}</p>
                    <ol className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                        {drafts.map((d) => (
                            <li
                                key={normalize(d.prompt)}
                                className="flex flex-col gap-1.5 rounded-[10px] border-2 border-ink bg-white px-3 py-2"
                                data-testid="ai-draft"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-bold text-ink">{d.prompt}</p>
                                    <span
                                        className={`shrink-0 rounded-full border-2 border-ink px-2 py-0.5 font-space-mono text-[9px] font-bold uppercase ${d.check === 'ok' ? 'bg-lime text-ink' : 'bg-alert-white text-white'}`}
                                    >
                                        {d.check === 'ok' ? t('ok') : t('doubtful')}
                                    </span>
                                </div>
                                <ul className="grid grid-cols-2 gap-1">
                                    {d.options.map((o, i) => (
                                        <li
                                            key={i}
                                            className={`rounded-[8px] px-2 py-1 text-[12px] ${i === d.correctIndex ? 'bg-lime font-bold text-ink' : 'bg-line-white text-ink'}`}
                                        >
                                            <span className="mr-1 font-space-mono text-[10px] text-blue">{LETTERS[i]}</span>
                                            {o}
                                        </li>
                                    ))}
                                </ul>
                                {d.checkNote && (
                                    <p className="text-[11px] text-ink">
                                        <strong>{t('why')}</strong> {d.checkNote}
                                    </p>
                                )}
                                {d.fact && (
                                    <p className="text-[11px] text-muted-white">
                                        {t('fact')}: {d.fact}
                                        {d.sourceUrl && (
                                            <a
                                                href={d.sourceUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-1 inline-flex items-center gap-0.5 font-bold text-blue underline"
                                            >
                                                {d.sourceTitle || t('source')} <ExternalLink size={10} aria-hidden="true" />
                                            </a>
                                        )}
                                    </p>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => add([d])}
                                        disabled={room === 0}
                                        className="flex h-8 cursor-pointer items-center gap-1 rounded-[8px] px-2 text-[11px] font-extrabold uppercase text-blue hover:underline disabled:opacity-50"
                                        data-testid="ai-draft-add"
                                    >
                                        <Check size={12} /> {t('add')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => discard(d)}
                                        className="flex h-8 cursor-pointer items-center gap-1 rounded-[8px] px-2 text-[11px] font-extrabold uppercase text-muted-white hover:underline"
                                        data-testid="ai-draft-discard"
                                    >
                                        <X size={12} /> {t('discard')}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </section>
    );
}
