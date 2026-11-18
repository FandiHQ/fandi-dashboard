/**
 * Run under several TZ values (default, Europe/Madrid, Asia/Tokyo): every
 * assertion must hold whatever zone the computer is in.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_EVENT_ZONE,
    browserZoneDiffers,
    eventCityName,
    eventZoneLabel,
    formatInEventZone,
    formatUtcOffset,
    isValidTimeZone,
    resolveEventZone,
    sameZonedDay,
    utcToZonedLocal,
    zoneOffsetLabel,
    zoneOffsetMinutes,
    zonedDayKey,
    zonedLocalToUtc,
} from '../event-time-zone.ts';

describe('zone resolution', () => {
    test('a real zone is kept; missing or unknown ones fall back to Bogotá', () => {
        assert.equal(resolveEventZone('America/Bogota'), 'America/Bogota');
        assert.equal(resolveEventZone('Europe/Madrid'), 'Europe/Madrid');
        assert.equal(resolveEventZone(null), DEFAULT_EVENT_ZONE);
        assert.equal(resolveEventZone(''), DEFAULT_EVENT_ZONE);
        assert.equal(resolveEventZone('Mars/Olympus'), DEFAULT_EVENT_ZONE);
        assert.equal(isValidTimeZone('Mars/Olympus'), false);
        assert.equal(isValidTimeZone(undefined), false);
    });
});

describe('zonedLocalToUtc', () => {
    test('a Medellín wall clock is the same instant on any computer', () => {
        assert.equal(zonedLocalToUtc('2026-12-05T21:00', 'America/Bogota'), '2026-12-06T02:00:00.000Z');
        assert.equal(zonedLocalToUtc('2026-08-18T09:30', 'America/Bogota'), '2026-08-18T14:30:00.000Z');
    });

    test('no zone or an unknown zone reads the value in Bogotá (UTC-5)', () => {
        assert.equal(zonedLocalToUtc('2026-12-05T21:00', null), '2026-12-06T02:00:00.000Z');
        assert.equal(zonedLocalToUtc('2026-12-05T21:00', 'Nope/Nowhere'), '2026-12-06T02:00:00.000Z');
    });

    test('other zones follow their own offset and DST', () => {
        assert.equal(zonedLocalToUtc('2026-01-15T10:00', 'Europe/Madrid'), '2026-01-15T09:00:00.000Z');
        assert.equal(zonedLocalToUtc('2026-07-15T10:00', 'Europe/Madrid'), '2026-07-15T08:00:00.000Z');
        assert.equal(zonedLocalToUtc('2026-07-15T10:00', 'Asia/Tokyo'), '2026-07-15T01:00:00.000Z');
        assert.equal(zonedLocalToUtc('2026-07-15T10:00', 'Asia/Kolkata'), '2026-07-15T04:30:00.000Z');
    });

    test('a wall time skipped by DST moves forward by the gap', () => {
        // Madrid jumps 02:00 → 03:00 on 2026-03-29: 02:30 is read as 03:30.
        assert.equal(zonedLocalToUtc('2026-03-29T02:30', 'Europe/Madrid'), '2026-03-29T01:30:00.000Z');
        // New York jumps 02:00 → 03:00 on 2026-03-08: 02:30 is read as 03:30 EDT.
        assert.equal(zonedLocalToUtc('2026-03-08T02:30', 'America/New_York'), '2026-03-08T07:30:00.000Z');
    });

    test('a wall time that repeats (DST ends) is the first of the two', () => {
        // New York repeats 01:00-02:00 on 2026-11-01: 01:30 EDT, not EST.
        assert.equal(zonedLocalToUtc('2026-11-01T01:30', 'America/New_York'), '2026-11-01T05:30:00.000Z');
        // Around (not inside) the change, the offset of that moment.
        assert.equal(zonedLocalToUtc('2026-11-01T12:00', 'America/New_York'), '2026-11-01T17:00:00.000Z');
        assert.equal(zonedLocalToUtc('2026-03-29T10:00', 'Europe/Madrid'), '2026-03-29T08:00:00.000Z');
    });

    test('seconds are accepted; empty or impossible values give null', () => {
        assert.equal(zonedLocalToUtc('2026-12-05T21:00:30', 'America/Bogota'), '2026-12-06T02:00:30.000Z');
        assert.equal(zonedLocalToUtc('', 'America/Bogota'), null);
        assert.equal(zonedLocalToUtc(undefined, 'America/Bogota'), null);
        assert.equal(zonedLocalToUtc('2026-02-30T10:00', 'America/Bogota'), null);
        assert.equal(zonedLocalToUtc('2026-12-05', 'America/Bogota'), null);
        assert.equal(zonedLocalToUtc('2026-12-05T25:00', 'America/Bogota'), null);
        assert.equal(zonedLocalToUtc('mañana', 'America/Bogota'), null);
    });

    test('every value carries Z (the API refuses instants without a zone)', () => {
        assert.match(zonedLocalToUtc('2026-12-05T21:00', 'America/Bogota') ?? '', /Z$/);
    });
});

describe('utcToZonedLocal', () => {
    test('shows the event zone wall clock, not the computer one', () => {
        assert.equal(utcToZonedLocal('2026-12-06T02:00:00.000Z', 'America/Bogota'), '2026-12-05T21:00');
        assert.equal(utcToZonedLocal('2026-12-06T02:00:00Z', 'Europe/Madrid'), '2026-12-06T03:00');
        assert.equal(utcToZonedLocal('2026-12-06T02:00:00Z', 'Asia/Tokyo'), '2026-12-06T11:00');
        assert.equal(utcToZonedLocal('2026-12-05T21:00:00-05:00', null), '2026-12-05T21:00');
    });

    test('round-trips with zonedLocalToUtc', () => {
        for (const zone of ['America/Bogota', 'Europe/Madrid', 'Asia/Tokyo', 'America/New_York']) {
            for (const local of ['2026-01-10T00:00', '2026-07-04T23:59', '2026-11-01T12:15']) {
                assert.equal(utcToZonedLocal(zonedLocalToUtc(local, zone), zone), local, `${zone} ${local}`);
            }
        }
    });

    test('empty or invalid gives an empty input value', () => {
        assert.equal(utcToZonedLocal(null, 'America/Bogota'), '');
        assert.equal(utcToZonedLocal('not a date', 'America/Bogota'), '');
    });
});

describe('offsets', () => {
    test('minutes east of UTC at the instant', () => {
        assert.equal(zoneOffsetMinutes('2026-12-06T02:00:00Z', 'America/Bogota'), -300);
        assert.equal(zoneOffsetMinutes('2026-01-15T12:00:00Z', 'Europe/Madrid'), 60);
        assert.equal(zoneOffsetMinutes('2026-07-15T12:00:00Z', 'Europe/Madrid'), 120);
        assert.equal(zoneOffsetMinutes('2026-07-15T12:00:00Z', 'Asia/Kolkata'), 330);
        assert.equal(zoneOffsetMinutes('2026-07-15T12:00:00Z', null), -300);
    });

    test('labels use an ASCII hyphen-minus, never a dash', () => {
        assert.equal(formatUtcOffset(-300), 'UTC-5');
        assert.equal(formatUtcOffset(60), 'UTC+1');
        assert.equal(formatUtcOffset(330), 'UTC+5:30');
        assert.equal(formatUtcOffset(0), 'UTC');
        assert.equal(zoneOffsetLabel('America/Bogota', '2026-12-06T02:00:00Z'), 'UTC-5');
        assert.equal(zoneOffsetLabel('Europe/Madrid', '2026-07-15T12:00:00Z'), 'UTC+2');
        assert.doesNotMatch(zoneOffsetLabel('America/Bogota'), /[–—−]/);
    });
});

describe('formatInEventZone', () => {
    test('formats on the event wall clock', () => {
        const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
        assert.equal(formatInEventZone('2026-12-06T02:00:00Z', 'America/Bogota', 'es', opts), '21:00');
        assert.equal(formatInEventZone('2026-12-06T02:00:00Z', 'Asia/Tokyo', 'es', opts), '11:00');
        assert.equal(formatInEventZone('2026-12-06T02:00:00Z', null, 'en', opts), '21:00');
    });

    test('the date is the event day, not the computer day', () => {
        const text = formatInEventZone('2026-12-06T02:00:00Z', 'America/Bogota', 'es', { day: 'numeric', month: 'long' });
        assert.equal(text, '5 de diciembre');
        const en = formatInEventZone('2026-12-06T02:00:00Z', 'America/Bogota', 'en', { day: 'numeric', month: 'long' });
        assert.equal(en, 'December 5');
    });

    test('a timeZone in the options never wins over the event zone', () => {
        const text = formatInEventZone('2026-12-06T02:00:00Z', 'America/Bogota', 'es', {
            hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo',
        });
        assert.equal(text, '21:00');
    });

    test('missing or invalid instants give null', () => {
        assert.equal(formatInEventZone(null, 'America/Bogota', 'es'), null);
        assert.equal(formatInEventZone('x', 'America/Bogota', 'es'), null);
    });
});

describe('calendar days in the zone', () => {
    test('day keys and same-day checks use the event zone', () => {
        assert.equal(zonedDayKey('2026-12-06T02:00:00Z', 'America/Bogota'), '2026-12-05');
        assert.equal(sameZonedDay('2026-12-06T02:00:00Z', '2026-12-05T15:00:00Z', 'America/Bogota'), true);
        assert.equal(sameZonedDay('2026-12-06T06:00:00Z', '2026-12-05T15:00:00Z', 'America/Bogota'), false);
        assert.equal(sameZonedDay(null, '2026-12-05T15:00:00Z', 'America/Bogota'), false);
    });
});

describe('browserZoneDiffers', () => {
    const now = Date.parse('2026-01-15T12:00:00Z');

    test('same zone, or a zone with the same hours, is not a warning', () => {
        assert.equal(browserZoneDiffers('America/Bogota', [], 'America/Bogota', now), false);
        assert.equal(browserZoneDiffers('America/Bogota', [], 'America/Lima', now), false);
        assert.equal(browserZoneDiffers(null, [], 'America/Bogota', now), false);
    });

    test('a laptop in another zone is', () => {
        assert.equal(browserZoneDiffers('America/Bogota', [], 'Europe/Madrid', now), true);
        assert.equal(browserZoneDiffers('America/Bogota', [], 'Asia/Tokyo', now), true);
    });

    test('a DST zone that matches today but not on the event date is', () => {
        // New York is UTC-5 in January (like Bogotá) and UTC-4 in July.
        assert.equal(browserZoneDiffers('America/Bogota', [], 'America/New_York', now), false);
        assert.equal(browserZoneDiffers('America/Bogota', ['2026-07-15T23:00:00Z'], 'America/New_York', now), true);
    });

    test('an unknown computer zone never warns', () => {
        assert.equal(browserZoneDiffers('America/Bogota', [], null, now), false);
        assert.equal(browserZoneDiffers('America/Bogota', [], 'Nope/Nowhere', now), false);
    });
});

describe('labels', () => {
    test('city first, then Colombia for Bogotá, then "del evento"', () => {
        assert.deepEqual(eventZoneLabel('America/Bogota', 'Medellín', '2026-12-06T02:00:00Z'), {
            key: 'zoneLabel', city: 'Medellín', offset: 'UTC-5',
        });
        assert.deepEqual(eventZoneLabel(null, '  ', '2026-12-06T02:00:00Z'), {
            key: 'zoneLabelColombia', city: '', offset: 'UTC-5',
        });
        assert.deepEqual(eventZoneLabel('Europe/Madrid', null, '2026-07-15T12:00:00Z'), {
            key: 'zoneLabelEvent', city: '', offset: 'UTC+2',
        });
    });

    test('the city name comes from the cities row, then the legacy text', () => {
        assert.equal(eventCityName({ cityRef: { name: 'Medellín' }, city: 'Medellin' }), 'Medellín');
        assert.equal(eventCityName({ cityRef: null, city: 'Cali' }), 'Cali');
        assert.equal(eventCityName({ city: '' }), null);
        assert.equal(eventCityName(null), null);
    });
});
