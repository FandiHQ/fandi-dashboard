/**
 * Knowledge-contest question bank — the rules the editor checks before
 * saving. They mirror fandi-api `contest-rules.ts` (R3): the server is the
 * authority and re-validates everything; this only lets the author see
 * problems while typing instead of after a failed save.
 */

export const BANK_MIN_QUESTIONS = 20;
export const BANK_MAX_QUESTIONS = 50;
export const OPTIONS_PER_QUESTION = 4;
export const PROMPT_MIN_CHARS = 5;
export const PROMPT_MAX_CHARS = 200;
export const OPTION_MAX_CHARS = 80;

export interface BankQuestionDraft {
    /** Present for questions already saved. */
    id?: string;
    /** Stable list key for a question not saved yet (never sent). */
    clientKey?: string;
    prompt: string;
    options: string[];
    /** -1 until the author marks the right option. */
    correctIndex: number;
}

/** i18n keys under `experiences.questions.problems.*`. */
export type QuestionProblem = 'prompt' | 'optionLength' | 'optionsDistinct' | 'correct';

export function emptyQuestion(): BankQuestionDraft {
    return { clientKey: globalThis.crypto.randomUUID(), prompt: '', options: ['', '', '', ''], correctIndex: -1 };
}

function normalize(option: string): string {
    return option
        .trim()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
}

export function questionProblems(q: BankQuestionDraft): QuestionProblem[] {
    const problems: QuestionProblem[] = [];
    const prompt = q.prompt.trim();
    if (prompt.length < PROMPT_MIN_CHARS || prompt.length > PROMPT_MAX_CHARS) problems.push('prompt');
    const options = q.options.map((o) => o.trim());
    if (options.length !== OPTIONS_PER_QUESTION || options.some((o) => o.length === 0 || o.length > OPTION_MAX_CHARS)) {
        problems.push('optionLength');
    } else if (new Set(options.map(normalize)).size !== options.length) {
        problems.push('optionsDistinct');
    }
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= OPTIONS_PER_QUESTION) {
        problems.push('correct');
    }
    return problems;
}

/** Ready to go live: ≥ BANK_MIN_QUESTIONS (20) questions and every one valid. */
export function bankReady(questions: BankQuestionDraft[]): boolean {
    return questions.length >= BANK_MIN_QUESTIONS && questions.every((q) => questionProblems(q).length === 0);
}

/** How many more valid questions the bank needs to go live (0 = ready). */
export function questionsMissing(questions: BankQuestionDraft[]): number {
    const valid = questions.filter((q) => questionProblems(q).length === 0).length;
    return Math.max(0, BANK_MIN_QUESTIONS - valid);
}

/** A draft may be saved (fewer than the minimum is fine) when every question is valid. */
export function canSaveBank(questions: BankQuestionDraft[]): boolean {
    return questions.length <= BANK_MAX_QUESTIONS && questions.every((q) => questionProblems(q).length === 0);
}

/** The PUT body: trimmed, ids kept, nothing else. */
export function toBankPayload(questions: BankQuestionDraft[]) {
    return {
        questions: questions.map((q) => ({
            ...(q.id ? { id: q.id } : {}),
            prompt: q.prompt.trim(),
            options: q.options.map((o) => o.trim()),
            correctIndex: q.correctIndex,
        })),
    };
}

/** Same reading time the fan app shows (preview). */
export function readMsFor(prompt: string): number {
    const chars = [...prompt.trim()].length;
    return Math.min(7_000, Math.max(3_000, 2_500 + 40 * chars));
}

/** "2,4 s" — es-CO decimal comma. */
export function formatSeconds(ms: number): string {
    const tenths = Math.round(Math.max(0, ms) / 100);
    return `${Math.floor(tenths / 10)},${tenths % 10} s`;
}

/**
 * The bank inside the edit panel. An existing oportunidad's bank must be
 * read (fresh) before the editor shows: an editor over an unloaded bank
 * starts empty, and saving it would wipe the saved questions.
 * `enabled` = the panel edits an existing oportunidad (there is a bank to
 * read); `hasDraft` = the author already changed it here.
 */
export function bankPanelState(s: {
    enabled: boolean;
    hasDraft: boolean;
    isSuccess: boolean;
    isFetching: boolean;
    isError: boolean;
}): { loaded: boolean; loading: boolean; failed: boolean } {
    const loaded = !s.enabled || s.hasDraft || (s.isSuccess && !s.isFetching);
    return {
        loaded,
        loading: s.enabled && !loaded && !s.isError,
        failed: s.enabled && !loaded && s.isError,
    };
}

/**
 * What saving does with the bank: nothing to send (untouched, or locked
 * once live), refuse (an existing bank that was never read — never
 * overwrite it blind), or send the draft.
 */
export function bankSaveAction(s: {
    enabled: boolean;
    hasDraft: boolean;
    isSuccess: boolean;
    locked: boolean;
}): 'skip' | 'refuse' | 'send' {
    if (!s.hasDraft) return 'skip';
    if (s.enabled && !s.isSuccess) return 'refuse';
    if (s.locked) return 'skip';
    return 'send';
}
