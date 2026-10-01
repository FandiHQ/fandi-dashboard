import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hasWithheld, percentLabel, segmentBars } from '../segments.ts';

describe('segment bars (fandi-api RFC §4)', () => {
    test('shares of the participants, host side first', () => {
        const bars = segmentBars({ onlyHost: 60, onlyGuest: 10, both: 25, neither: 5, withoutConsent: 0 }, 100);
        assert.deepEqual(
            bars.map((b) => [b.group, b.share]),
            [
                ['onlyHost', 0.6],
                ['both', 0.25],
                ['onlyGuest', 0.1],
                ['neither', 0.05],
                ['withoutConsent', 0],
            ],
        );
    });

    test('withheld groups have no bar and are flagged', () => {
        const counts = { onlyHost: 'hidden', onlyGuest: 0, both: 5, neither: 0, withoutConsent: '<5' } as const;
        const bars = segmentBars(counts, 12);
        assert.equal(bars.find((b) => b.group === 'onlyHost')?.share, null);
        assert.equal(bars.find((b) => b.group === 'withoutConsent')?.value, '<5');
        assert.equal(hasWithheld(counts), true);
        assert.equal(hasWithheld({ onlyHost: 1, onlyGuest: 0, both: 0, neither: 0, withoutConsent: 0 }), false);
    });

    test('percent labels never show 0 % for a real group', () => {
        assert.equal(percentLabel(0.004), '<1 %');
        assert.equal(percentLabel(0), '0 %');
        assert.equal(percentLabel(0.456), '46 %');
        assert.equal(percentLabel(null), null);
        assert.deepEqual(segmentBars({ onlyHost: 0, onlyGuest: 0, both: 0, neither: 0, withoutConsent: 0 }, 0).map((b) => b.share), [null, null, null, null, null]);
    });
});
