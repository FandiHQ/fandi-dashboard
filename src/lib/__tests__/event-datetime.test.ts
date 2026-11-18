/**
 * Run under several TZ values (default, Europe/Madrid, Asia/Tokyo): the
 * form values are the event zone's wall clock whatever the computer's.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    datetimeLocalToIso,
    eventDateViolations,
    eventDurationParts,
    eventInstantViolations,
    eventPublishBlockers,
    formatRemaining,
    isoToDatetimeLocal,
} from '../event-datetime.ts';

describe('form value conversion', () => {
    test('uses the event zone, never the computer zone', () => {
        assert.equal(datetimeLocalToIso('2026-12-05T21:00', 'America/Bogota'), '2026-12-06T02:00:00.000Z');
        assert.equal(isoToDatetimeLocal('2026-12-06T02:00:00.000Z', 'America/Bogota'), '2026-12-05T21:00');
    });

    test('without a zone it is Bogotá', () => {
        assert.equal(datetimeLocalToIso('2026-12-05T21:00'), '2026-12-06T02:00:00.000Z');
        assert.equal(isoToDatetimeLocal('2026-12-06T02:00:00.000Z'), '2026-12-05T21:00');
    });

    test('empty stays empty', () => {
        assert.equal(datetimeLocalToIso(''), undefined);
        assert.equal(isoToDatetimeLocal(null), '');
    });
});

describe('eventDateViolations (form values)', () => {
    test('an end before the start, and a Fandi window that closes before it opens', () => {
        assert.deepEqual(
            eventDateViolations({
                eventDate: '2026-12-05T21:00',
                eventEndDate: '2026-12-05T20:00',
                fandiOpensAt: '2026-12-05T22:00',
                fandiClosesAt: '2026-12-05T22:00',
            }, 'America/Bogota'),
            ['EVENT_END_BEFORE_START', 'FANDI_WINDOW_INVALID'],
        );
    });

    test('a multi-day event and a Fandi window outside the event are fine', () => {
        assert.deepEqual(
            eventDateViolations({
                eventDate: '2026-12-05T21:00',
                eventEndDate: '2026-12-07T02:00',
                fandiOpensAt: '2026-12-05T18:00',
                fandiClosesAt: '2026-12-07T03:00',
            }, 'America/Bogota'),
            [],
        );
    });

    test('compares instants, not the text of the wall clock', () => {
        // New York skips 02:00-03:00 on 2026-03-08: a start typed as 02:30
        // is 03:30, so an end at 03:10 is before it (the strings say after).
        assert.deepEqual(
            eventDateViolations({ eventDate: '2026-03-08T02:30', eventEndDate: '2026-03-08T03:10' }, 'America/New_York'),
            ['EVENT_END_BEFORE_START'],
        );
    });

    test('pairs with a missing end are not checked (drafts)', () => {
        assert.deepEqual(eventDateViolations({ eventDate: '2026-12-05T21:00', eventEndDate: '' }), []);
    });
});

describe('eventInstantViolations (saved event)', () => {
    test('compares the instants, with any offset', () => {
        assert.deepEqual(
            eventInstantViolations({
                eventDate: '2026-12-06T02:00:00Z',
                eventEndDate: '2026-12-05T20:59:00-05:00',
            }),
            ['EVENT_END_BEFORE_START'],
        );
        assert.deepEqual(
            eventInstantViolations({ eventDate: '2026-12-06T02:00:00Z', eventEndDate: '2026-12-05T21:01:00-05:00' }),
            [],
        );
    });
});

describe('eventPublishBlockers', () => {
    const ready = {
        eventDate: '2026-12-06T02:00:00Z',
        eventEndDate: '2026-12-06T06:00:00Z',
        fandiOpensAt: '2026-12-06T01:00:00Z',
        fandiClosesAt: '2026-12-06T07:00:00Z',
        cityId: '5811',
        timezone: 'America/Bogota',
    };

    test('a complete event can be published', () => {
        assert.deepEqual(eventPublishBlockers(ready), []);
    });

    test('names what is missing, in the API order', () => {
        assert.deepEqual(
            eventPublishBlockers({ ...ready, eventEndDate: null, cityId: null, fandiClosesAt: null }),
            ['EVENT_END_REQUIRED', 'EVENT_CITY_REQUIRED', 'FANDI_WINDOW_REQUIRED'],
        );
        assert.deepEqual(eventPublishBlockers({ ...ready, timezone: null }), ['EVENT_TIMEZONE_REQUIRED']);
        assert.deepEqual(
            eventPublishBlockers({ ...ready, fandiOpensAt: '2026-12-06T08:00:00Z' }),
            ['FANDI_WINDOW_INVALID'],
        );
    });
});

describe('eventDurationParts', () => {
    test('days and hours between the two wall clocks', () => {
        assert.deepEqual(eventDurationParts('2026-12-05T21:00', '2026-12-07T23:30', 'America/Bogota'), { days: 2, hours: 2 });
        assert.equal(eventDurationParts('2026-12-05T21:00', '2026-12-05T21:00', 'America/Bogota'), null);
        assert.equal(eventDurationParts('2026-12-05T21:00', '', 'America/Bogota'), null);
    });

    test('real elapsed time across a DST night', () => {
        // Madrid loses an hour on 2026-03-29: 00:00 → 12:00 is 11 h.
        assert.deepEqual(eventDurationParts('2026-03-29T00:00', '2026-03-29T12:00', 'Europe/Madrid'), { days: 0, hours: 11 });
    });
});

describe('formatRemaining', () => {
    test('shows days beyond 24 h', () => {
        assert.equal(formatRemaining(6 * 86_400 + 6 * 3600), '6d 06:00:00');
        assert.equal(formatRemaining(86_400 + 61), '1d 00:01:01');
    });

    test('hours, then minutes', () => {
        assert.equal(formatRemaining(2 * 3600 + 5 * 60 + 9), '2:05:09');
        assert.equal(formatRemaining(309), '05:09');
        assert.equal(formatRemaining(0), '00:00');
        assert.equal(formatRemaining(-5), '00:00');
    });
});
