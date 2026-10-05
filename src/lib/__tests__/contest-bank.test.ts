import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    BANK_MIN_QUESTIONS,
    bankPanelState,
    bankReady,
    bankSaveAction,
    canSaveBank,
    emptyQuestion,
    formatSeconds,
    questionProblems,
    questionsMissing,
    readMsFor,
    toBankPayload,
    type BankQuestionDraft,
} from '../contest-bank.ts';

const valid = (i = 0): BankQuestionDraft => ({
    prompt: `¿Pregunta número ${i} sobre el ídolo?`,
    options: ['Uno', 'Dos', 'Tres', 'Cuatro'],
    correctIndex: i % 4,
});

describe('contest bank rules (mirror of fandi-api R3)', () => {
    test('a complete question has no problems', () => {
        assert.deepEqual(questionProblems(valid()), []);
    });

    test('a new question needs a prompt, 4 options and the right one marked', () => {
        assert.deepEqual(questionProblems(emptyQuestion()), ['prompt', 'optionLength', 'correct']);
    });

    test('new questions get their own list key, which is never sent', () => {
        const a = emptyQuestion();
        const b = emptyQuestion();
        assert.notEqual(a.clientKey, b.clientKey);
        const payload = toBankPayload([{ ...valid(), clientKey: 'k1' }]);
        assert.equal('clientKey' in payload.questions[0], false);
    });

    test('prompt length is 5..200 after trimming', () => {
        assert.ok(questionProblems({ ...valid(), prompt: '  ¿Si? ' }).includes('prompt'));
        assert.ok(questionProblems({ ...valid(), prompt: 'x'.repeat(201) }).includes('prompt'));
        assert.ok(!questionProblems({ ...valid(), prompt: 'x'.repeat(200) }).includes('prompt'));
    });

    test('options must be 1..80 chars and distinct ignoring case and accents', () => {
        assert.ok(questionProblems({ ...valid(), options: ['A', 'B', 'C', 'x'.repeat(81)] }).includes('optionLength'));
        assert.ok(questionProblems({ ...valid(), options: ['Bogotá', 'bogota', 'Cali', 'Pasto'] }).includes('optionsDistinct'));
    });

    test('exactly one right option, 0..3', () => {
        assert.ok(questionProblems({ ...valid(), correctIndex: -1 }).includes('correct'));
        assert.ok(questionProblems({ ...valid(), correctIndex: 4 }).includes('correct'));
    });

    test('the minimum mirrors the API: 20 questions', () => {
        assert.equal(BANK_MIN_QUESTIONS, 20);
    });

    test('ready = at least 20 valid questions; drafts can be saved with fewer', () => {
        const nineteen = Array.from({ length: 19 }, (_, i) => valid(i));
        assert.equal(bankReady(nineteen), false);
        assert.equal(questionsMissing(nineteen), 1);
        assert.equal(questionsMissing(nineteen.slice(0, 6)), 14);
        assert.equal(canSaveBank(nineteen), true);
        const twenty = [...nineteen, valid(20)];
        assert.equal(bankReady(twenty), true);
        assert.equal(questionsMissing(twenty), 0);
        assert.equal(canSaveBank([...twenty, emptyQuestion()]), false);
        assert.equal(canSaveBank(Array.from({ length: 51 }, (_, i) => valid(i))), false);
    });

    test('the payload trims text and keeps ids only when present', () => {
        const payload = toBankPayload([
            { id: 'q1', prompt: '  ¿Hola mundo? ', options: [' a ', 'b', 'c', 'd'], correctIndex: 1 },
            { prompt: '¿Nueva pregunta?', options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
        ]);
        assert.deepEqual(payload.questions[0], {
            id: 'q1',
            prompt: '¿Hola mundo?',
            options: ['a', 'b', 'c', 'd'],
            correctIndex: 1,
        });
        assert.equal('id' in payload.questions[1], false);
    });

    test('edit panel: the editor waits for a fresh read of an existing bank', () => {
        const base = { enabled: true, hasDraft: false, isSuccess: false, isFetching: true, isError: false };
        assert.deepEqual(bankPanelState(base), { loaded: false, loading: true, failed: false });
        // Cached copy while the mount refetch runs: still not shown.
        assert.deepEqual(bankPanelState({ ...base, isSuccess: true }), { loaded: false, loading: true, failed: false });
        assert.deepEqual(bankPanelState({ ...base, isSuccess: true, isFetching: false }), { loaded: true, loading: false, failed: false });
        assert.deepEqual(bankPanelState({ ...base, isFetching: false, isError: true }), { loaded: false, loading: false, failed: true });
        // A new oportunidad (or an Impacto) has no bank to read.
        assert.deepEqual(bankPanelState({ ...base, enabled: false }), { loaded: true, loading: false, failed: false });
        // Once the author edits here, the editor never disappears under them.
        assert.equal(bankPanelState({ ...base, hasDraft: true, isError: true }).loaded, true);
    });

    test('saving never overwrites a bank that was not read', () => {
        const base = { enabled: true, hasDraft: true, isSuccess: true, locked: false };
        assert.equal(bankSaveAction(base), 'send');
        assert.equal(bankSaveAction({ ...base, isSuccess: false }), 'refuse');
        assert.equal(bankSaveAction({ ...base, hasDraft: false, isSuccess: false }), 'skip');
        assert.equal(bankSaveAction({ ...base, locked: true }), 'skip');
        // Created in this panel (M2 retry): nothing to read first.
        assert.equal(bankSaveAction({ ...base, enabled: false, isSuccess: false }), 'send');
    });

    test('reading time and seconds match the fan app', () => {
        assert.equal(readMsFor('x'.repeat(20)), 3300);
        assert.equal(readMsFor('x'.repeat(200)), 7000);
        assert.equal(formatSeconds(2400), '2,4 s');
    });
});
