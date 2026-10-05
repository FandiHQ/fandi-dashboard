'use client';

/**
 * PREGUNTAS — the knowledge-contest bank inside the Oportunidad side panel
 * (fandi-api RFC §2, R3). The team writes ≥ 20 questions (BANK_MIN_QUESTIONS), 4 options each,
 * and marks exactly one right option (a radio). Each fan gets one of them
 * at random, with the options shuffled for them.
 *
 * Authors only (the bank carries the right answers). Locked, read-only,
 * once the oportunidad is live; then the right answers stay hidden behind
 * "Ver respuestas" (the card may be on a projected or shared screen). "Vista del fan" shows the two screens the
 * fan sees: the question alone, then the four options.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Eye, EyeOff, Lock, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    BANK_MAX_QUESTIONS,
    BANK_MIN_QUESTIONS,
    OPTION_MAX_CHARS,
    PROMPT_MAX_CHARS,
    emptyQuestion,
    questionProblems,
    questionsMissing,
    readMsFor,
    type BankQuestionDraft,
} from '@/lib/contest-bank';

const LETTERS = ['A', 'B', 'C', 'D'] as const;
const FIELD_LABEL = 'label-mono text-muted-white';

export function QuestionBankEditor({
    questions,
    onChange,
    locked,
    loading = false,
}: {
    questions: BankQuestionDraft[];
    onChange: (next: BankQuestionDraft[]) => void;
    locked: boolean;
    loading?: boolean;
}) {
    const t = useTranslations('experiences.questions');
    const [previewIndex, setPreviewIndex] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [revealAnswers, setRevealAnswers] = useState(false);
    const answersHidden = locked && !revealAnswers;

    const missing = questionsMissing(questions);
    const update = (index: number, next: BankQuestionDraft) => {
        const copy = [...questions];
        copy[index] = next;
        onChange(copy);
    };
    const preview = questions[Math.min(previewIndex, Math.max(0, questions.length - 1))];

    return (
        <section className="flex flex-col gap-3" data-testid="question-bank" aria-labelledby="question-bank-title">
            <div className="flex items-baseline justify-between gap-3">
                <h3 id="question-bank-title" className={FIELD_LABEL}>
                    {t('title')}
                </h3>
                <span
                    className={`font-space-mono text-[11px] font-bold uppercase ${missing > 0 ? 'text-alert-white' : 'text-blue'}`}
                    data-testid="question-bank-count"
                >
                    {missing > 0
                        ? t('missing', { count: questions.length, min: BANK_MIN_QUESTIONS, missing })
                        : t('ready', { count: questions.length })}
                </span>
            </div>

            {/* Info note on white: the quiet line-white box (lime is never decoration). */}
            <div className="rounded-[10px] bg-line-white px-3 py-2.5" data-testid="question-bank-note">
                <p className="label-mono font-bold text-ink">{t('blindNote')}</p>
                <p className="mt-1 text-[12px] leading-snug text-ink">{t('howItWorks')}</p>
            </div>

            {locked && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-2 font-space-mono text-[11px] font-bold uppercase text-muted-white">
                        <Lock size={12} /> {t('locked')}
                    </p>
                    {questions.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setRevealAnswers((v) => !v)}
                            aria-pressed={revealAnswers}
                            className="flex h-9 cursor-pointer items-center gap-2 rounded-[10px] px-2 text-[12px] font-extrabold uppercase text-blue hover:underline"
                            data-testid="question-answers-toggle"
                        >
                            {revealAnswers ? <EyeOff size={14} /> : <Eye size={14} />}
                            {revealAnswers ? t('hideAnswers') : t('showAnswers')}
                        </button>
                    )}
                </div>
            )}

            {loading && <p className="font-space-mono text-[11px] text-muted-white">{t('loading')}</p>}

            <ol className="flex flex-col gap-3">
                {questions.map((q, index) => {
                    const problems = questionProblems(q);
                    // Saved questions key by id; new ones carry a client key.
                    const rowKey = q.id ?? q.clientKey ?? `row-${index}`;
                    return (
                        <li
                            key={rowKey}
                            className="flex flex-col gap-2 rounded-[12px] border-2 border-ink px-3 py-3"
                            data-testid={`question-${index}`}
                            onFocus={() => setPreviewIndex(index)}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="label-mono font-bold text-ink">{t('number', { n: index + 1 })}</span>
                                {!locked && (
                                    <button
                                        type="button"
                                        onClick={() => onChange(questions.filter((_, i) => i !== index))}
                                        aria-label={t('remove', { n: index + 1 })}
                                        className="flex size-9 cursor-pointer items-center justify-center rounded-[8px] text-muted-white hover:bg-line-white hover:text-ink"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>

                            {locked ? (
                                <p className="font-display text-[15px] text-ink">{q.prompt}</p>
                            ) : (
                                <Textarea
                                    value={q.prompt}
                                    maxLength={PROMPT_MAX_CHARS}
                                    rows={2}
                                    onChange={(e) => update(index, { ...q, prompt: e.target.value })}
                                    placeholder={t('promptPlaceholder')}
                                    aria-label={t('promptLabel', { n: index + 1 })}
                                    className="px-3 py-2 text-sm font-bold text-ink"
                                />
                            )}

                            <fieldset className="flex flex-col gap-1.5">
                                <legend className="sr-only">{t('correctLegend', { n: index + 1 })}</legend>
                                {q.options.map((option, optionIndex) => {
                                    const isRight = !answersHidden && q.correctIndex === optionIndex;
                                    return (
                                        <label
                                            key={optionIndex}
                                            className={`flex items-center gap-2 rounded-[10px] border-2 px-2 ${isRight ? 'border-ink bg-lime' : 'border-line-white'}`}
                                        >
                                            <input
                                                type="radio"
                                                name={`correct-${rowKey}`}
                                                checked={isRight}
                                                disabled={locked}
                                                onChange={() => update(index, { ...q, correctIndex: optionIndex })}
                                                aria-label={t('markCorrect', { letter: LETTERS[optionIndex] })}
                                                className="size-4 shrink-0 cursor-pointer accent-ink"
                                                data-testid={`question-${index}-correct-${optionIndex}`}
                                            />
                                            <span className="w-4 shrink-0 font-space-mono text-[11px] font-bold text-blue">
                                                {LETTERS[optionIndex]}
                                            </span>
                                            {locked ? (
                                                <span className="min-h-10 flex-1 py-2 text-sm font-semibold text-ink">{option}</span>
                                            ) : (
                                                <Input
                                                    value={option}
                                                    maxLength={OPTION_MAX_CHARS}
                                                    onChange={(e) => {
                                                        const options = [...q.options];
                                                        options[optionIndex] = e.target.value;
                                                        update(index, { ...q, options });
                                                    }}
                                                    placeholder={t('optionPlaceholder', { letter: LETTERS[optionIndex] })}
                                                    aria-label={t('optionLabel', { letter: LETTERS[optionIndex], n: index + 1 })}
                                                    className="h-10 min-w-0 flex-1 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:bg-white"
                                                />
                                            )}
                                            {isRight && <Check size={14} className="shrink-0 text-ink" aria-hidden="true" />}
                                        </label>
                                    );
                                })}
                            </fieldset>

                            {!locked && problems.length > 0 && (
                                <ul className="flex flex-col gap-0.5" data-testid={`question-${index}-problems`}>
                                    {problems.map((problem) => (
                                        <li key={problem} className="font-space-mono text-[10px] text-alert-white">
                                            {t(`problems.${problem}`)}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    );
                })}
            </ol>

            <div className="flex flex-wrap items-center gap-2">
                {!locked && (
                    <button
                        type="button"
                        onClick={() => {
                            onChange([...questions, emptyQuestion()]);
                            setPreviewIndex(questions.length);
                        }}
                        disabled={questions.length >= BANK_MAX_QUESTIONS}
                        className="press flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border-2 border-ink bg-white px-3 text-[12px] font-extrabold uppercase text-ink shadow-ext-sm disabled:cursor-not-allowed disabled:opacity-50"
                        data-testid="question-add"
                    >
                        <Plus size={14} /> {t('add')}
                    </button>
                )}
                {questions.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowPreview((v) => !v)}
                        aria-expanded={showPreview}
                        className="flex h-10 cursor-pointer items-center gap-2 rounded-[10px] px-3 text-[12px] font-extrabold uppercase text-blue hover:underline"
                        data-testid="question-preview-toggle"
                    >
                        <Eye size={14} /> {t('preview')}
                    </button>
                )}
            </div>

            {showPreview && preview && <FanPreview question={preview} number={Math.min(previewIndex, questions.length - 1) + 1} />}
        </section>
    );
}

/** The two fan screens, in miniature: the question alone, then the options. */
function FanPreview({ question, number }: { question: BankQuestionDraft; number: number }) {
    const t = useTranslations('experiences.questions');
    const seconds = (readMsFor(question.prompt) / 1000).toFixed(1).replace('.', ',');
    return (
        <div className="grid grid-cols-2 gap-3" data-testid="question-preview">
            <div className="flex min-h-[220px] flex-col gap-2 rounded-[16px] border-2 border-ink bg-blue p-3 text-white">
                <span className="font-space-mono text-[9px] uppercase text-lilac">{t('previewReading', { n: number, s: seconds })}</span>
                <p className="font-display text-[14px] uppercase leading-tight">{question.prompt || '…'}</p>
                <div className="mt-auto h-1.5 w-full overflow-hidden rounded-full bg-ink/40">
                    <div className="h-full w-2/3 bg-lime" />
                </div>
            </div>
            <div className="flex min-h-[220px] flex-col gap-1.5 rounded-[16px] border-2 border-ink bg-blue p-3 text-white">
                <span className="font-space-mono text-[9px] uppercase text-lilac">{t('previewOptions')}</span>
                {question.options.map((option, i) => (
                    <span
                        key={i}
                        className="flex items-center gap-1.5 rounded-[8px] border-2 border-ink bg-white px-2 py-1.5 text-[11px] font-bold text-ink"
                    >
                        <span className="font-space-mono text-[9px] text-blue">{LETTERS[i]}</span>
                        {option || '…'}
                    </span>
                ))}
                <span className="mt-auto font-space-mono text-[9px] uppercase">{t('previewSeconds')}</span>
            </div>
        </div>
    );
}
