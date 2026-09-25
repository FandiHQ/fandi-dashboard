import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    filterByKind,
    goalReached,
    impactoPercent,
    isImpacto,
    kindOf,
} from '../impacto.ts';

describe('impacto helpers (Phase 6)', () => {
    test('kindOf defaults a missing kind to oportunidad', () => {
        assert.equal(kindOf({}), 'oportunidad');
        assert.equal(kindOf({ kind: null }), 'oportunidad');
        assert.equal(kindOf({ kind: 'impacto' }), 'impacto');
        assert.equal(isImpacto({ kind: 'impacto' }), true);
        assert.equal(isImpacto({ kind: 'oportunidad' }), false);
    });

    test('impactoPercent: rounded, clamped to 100, null without a goal', () => {
        assert.equal(impactoPercent(0, 5_000_000), 0);
        assert.equal(impactoPercent(1_250_000, 5_000_000), 25);
        assert.equal(impactoPercent(3_333_333, 5_000_000), 67);
        assert.equal(impactoPercent(9_000_000, 5_000_000), 100);
        assert.equal(impactoPercent(-10, 5_000_000), 0);
        assert.equal(impactoPercent(1000, null), null);
        assert.equal(impactoPercent(1000, 0), null);
    });

    test('goalReached only with a positive goal', () => {
        assert.equal(goalReached(5_000_000, 5_000_000), true);
        assert.equal(goalReached(4_999_999, 5_000_000), false);
        assert.equal(goalReached(10, null), false);
    });

    test('filterByKind keeps everything on "all" and splits by kind', () => {
        const items = [
            { id: 'a', kind: 'impacto' as const },
            { id: 'b' },
            { id: 'c', kind: 'oportunidad' as const },
        ];
        assert.deepEqual(filterByKind(items, 'all').map((i) => i.id), ['a', 'b', 'c']);
        assert.deepEqual(filterByKind(items, 'impacto').map((i) => i.id), ['a']);
        assert.deepEqual(filterByKind(items, 'oportunidad').map((i) => i.id), ['b', 'c']);
    });
});
