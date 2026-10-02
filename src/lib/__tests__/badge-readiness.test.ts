import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    BADGES_NOT_READY_CODE,
    badgeBlockers,
    badgesTabPath,
    knownMissingBadges,
    missingBadgesFromError,
} from '../badge-readiness.ts';

describe('badge gate (mirror of fandi-api EVENT_BADGES_NOT_READY)', () => {
    test('reads missingBadges off the typed 400 body, in API order', () => {
        const err = {
            code: BADGES_NOT_READY_CODE,
            status: 400,
            details: {
                code: BADGES_NOT_READY_CODE,
                missingBadges: ['auction_participation', 'experience_participation'],
            },
        };
        assert.deepEqual(missingBadgesFromError(err), ['experience_participation', 'auction_participation']);
    });

    test('any other error is not a badge problem', () => {
        assert.equal(missingBadgesFromError({ code: 'CONTEST_BANK_INCOMPLETE', details: {} }), null);
        assert.equal(missingBadgesFromError(new Error('boom')), null);
        assert.equal(missingBadgesFromError(null), null);
    });

    test('a badge error without a usable list still counts (generic notice)', () => {
        assert.deepEqual(missingBadgesFromError({ code: BADGES_NOT_READY_CODE }), []);
        assert.deepEqual(
            missingBadgesFromError({ code: BADGES_NOT_READY_CODE, details: { missingBadges: 'nope' } }),
            [],
        );
    });

    test('unknown codes are dropped, duplicates collapse', () => {
        assert.deepEqual(knownMissingBadges(['auction_winner', 'mystery', 'auction_winner']), ['auction_winner']);
        assert.deepEqual(knownMissingBadges(undefined), []);
    });

    test('the header warns only while the event can still be published or go live', () => {
        const missing = { badgesReady: false, missingBadges: ['experience_participation'] };
        assert.deepEqual(badgeBlockers('draft', missing), ['experience_participation']);
        assert.deepEqual(badgeBlockers('published', missing), ['experience_participation']);
        assert.deepEqual(badgeBlockers('live', missing), []);
        assert.deepEqual(badgeBlockers('ended', missing), []);
        assert.deepEqual(badgeBlockers('draft', undefined), []);
        assert.deepEqual(badgeBlockers('draft', { badgesReady: true, missingBadges: [] }), []);
    });

    test('links to the event Insignias tab', () => {
        assert.equal(badgesTabPath('evt-1'), '/dashboard/events/evt-1/badges');
    });
});
