import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    anyWithheld,
    growthBars,
    growthIsEmpty,
    maxOf,
    monthLabel,
    partitionBars,
    retentionOf,
    shareOf,
    tabFromParam,
    visibleTabs,
    VALUE_BUCKET_RANGES,
    type FanbaseEventPoint,
} from '../fanbase.ts';

describe('fanbase tabs (fandi-api RFC §8)', () => {
    test('the named ranking is for owners and admins only', () => {
        assert.ok(visibleTabs('owner').includes('top'));
        assert.ok(visibleTabs('admin').includes('top'));
        assert.ok(!visibleTabs('viewer').includes('top'));
        assert.ok(!visibleTabs(null).includes('top'));
        assert.equal(visibleTabs('viewer').length, 6);
        assert.equal(visibleTabs('owner')[0], 'overview');
    });

    test('?tab= opens an allowed tab, anything else the overview', () => {
        assert.equal(tabFromParam('where', 'viewer'), 'where');
        assert.equal(tabFromParam('top', 'admin'), 'top');
        assert.equal(tabFromParam('top', 'viewer'), 'overview');
        assert.equal(tabFromParam('nope', 'owner'), 'overview');
        assert.equal(tabFromParam(null, 'owner'), 'overview');
    });
});

describe('fanbase numbers', () => {
    test('shares only between shown numbers', () => {
        assert.equal(shareOf(5, 20), 0.25);
        assert.equal(shareOf('<5', 20), null);
        assert.equal(shareOf(5, 'hidden'), null);
        assert.equal(shareOf(0, 0), null);
        assert.equal(anyWithheld([3, 0, 'hidden']), true);
        assert.equal(anyWithheld([3, 0]), false);
    });

    test('a partition with a withheld group: relative bars, no percentages', () => {
        const shown = partitionBars([
            { key: 'confirmed', value: 30 },
            { key: 'inferred', value: 10 },
        ]);
        assert.deepEqual(
            shown.map((b) => [b.share, b.width]),
            [
                [0.75, 1],
                [0.25, 10 / 30],
            ],
        );
        const some = partitionBars([
            { key: 'upTo20', value: 700 },
            { key: 'upTo60', value: 280 },
            { key: 'upTo1000', value: 'hidden' },
            { key: 'over1000', value: '<5' },
        ]);
        assert.deepEqual(
            some.map((b) => [b.share, b.width]),
            [
                [null, 1],
                [null, 0.4],
                [null, null],
                [null, null],
            ],
        );
        const none = partitionBars([
            { key: 'confirmed', value: 'hidden' },
            { key: 'inferred', value: '<5' },
        ]);
        assert.deepEqual(
            none.map((b) => b.width),
            [null, null],
        );
    });

    test('retention = came back / fans of the event', () => {
        const event = (fans: FanbaseEventPoint['fans'], cameBack: FanbaseEventPoint['cameBack']) =>
            ({
                eventId: 'e',
                name: 'E',
                date: '2026-09-01T00:00:00.000Z',
                hosted: true,
                fans,
                newFans: 0,
                returningFans: 0,
                cameBack,
            }) satisfies FanbaseEventPoint;
        assert.equal(retentionOf(event(8, 6)), 0.75);
        assert.equal(retentionOf(event(8, '<5')), null);
        assert.equal(retentionOf(event('<5', 0)), null);
    });

    test('value buckets in Fandis are contiguous', () => {
        const ranges = Object.values(VALUE_BUCKET_RANGES);
        for (let i = 1; i < ranges.length; i++) {
            assert.equal(ranges[i].min, (ranges[i - 1].max ?? 0) + 1);
        }
        assert.equal(ranges.at(-1)?.max, null);
    });

    test('maxOf never returns 0 (bars divide by it)', () => {
        assert.equal(maxOf([]), 1);
        assert.equal(maxOf([0, 0]), 1);
        assert.equal(maxOf([3, 9]), 9);
    });
});

describe('fanbase growth chart', () => {
    test('month labels from "YYYY-MM", no timezone drift', () => {
        assert.match(monthLabel('2026-01', 'es-CO'), /^ene 26$/i);
        assert.match(monthLabel('2025-12', 'en-US'), /^Dec 25$/);
    });

    test('"<5" months get no bar but stay on the axis', () => {
        const bars = growthBars(
            [
                { month: '2026-08', newFans: 12 },
                { month: '2026-09', newFans: '<5' },
                { month: '2026-10', newFans: 0 },
            ],
            'en-US',
        );
        assert.deepEqual(
            bars.map((b) => [b.month, b.value, b.small]),
            [
                ['2026-08', 12, false],
                ['2026-09', null, true],
                ['2026-10', 0, false],
            ],
        );
        assert.equal(growthIsEmpty([{ month: '2026-10', newFans: 0 }]), true);
        assert.equal(growthIsEmpty([{ month: '2026-10', newFans: '<5' }]), false);
    });
});
