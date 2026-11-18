import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    emailMatchesHint, invitationOutcome, isDeadEndView, landingPathFor, passwordTooLong, readInvitationToken,
    viewForPreview, type InvitationView,
} from '../invitations.ts';
import { colombiaDateTime } from '../colombia-time.ts';
import type { InvitationPreview } from '../../types/api';

const TOKEN = 'Abc_def-0123456789abcdefghijklmnopqrstuvwxy'; // 43 chars, base64url

describe('readInvitationToken (the #t= fragment)', () => {
    test('reads the token with or without the leading #', () => {
        assert.equal(readInvitationToken(`#t=${TOKEN}`), TOKEN);
        assert.equal(readInvitationToken(`t=${TOKEN}`), TOKEN);
    });

    test('tolerates other keys, spaces and percent-encoding from mail clients', () => {
        assert.equal(readInvitationToken(`#utm=x&t=${TOKEN}`), TOKEN);
        assert.equal(readInvitationToken(`#t=${encodeURIComponent(TOKEN)}%20`), TOKEN);
    });

    test('no token, an empty one, a foreign shape or an oversized one is null', () => {
        for (const hash of ['', '#', '#t=', '#token=abc', '#t=abc def', '#t=<script>', `#t=${'a'.repeat(201)}`, '#access_token=x']) {
            assert.equal(readInvitationToken(hash), null, hash);
        }
        assert.equal(readInvitationToken(null), null);
        assert.equal(readInvitationToken(undefined), null);
    });
});

describe('emailMatchesHint', () => {
    test('first letter and domain must fit the masked hint, any case', () => {
        assert.equal(emailMatchesHint('juan@gmail.com', 'j***@gmail.com'), true);
        assert.equal(emailMatchesHint(' Juan@Gmail.com ', 'j***@gmail.com'), true);
        assert.equal(emailMatchesHint('ana@gmail.com', 'j***@gmail.com'), false);
        assert.equal(emailMatchesHint('juan@fandi.app', 'j***@gmail.com'), false);
    });

    test('a hint we cannot read rules nobody out (the API decides); no email never matches', () => {
        assert.equal(emailMatchesHint('juan@gmail.com', '***'), true);
        assert.equal(emailMatchesHint('juan@gmail.com', null), true);
        assert.equal(emailMatchesHint(null, 'j***@gmail.com'), false);
    });
});

const preview = (over: Partial<InvitationPreview> = {}): InvitationPreview => ({
    state: 'valid',
    orgName: 'Karol G',
    orgAvatarUrl: null,
    role: 'viewer',
    inviterName: 'Juan',
    emailHint: 'a***@equipo.co',
    accountExists: false,
    expiresAt: '2026-11-24T20:40:00.000Z',
    ...over,
});

describe('viewForPreview (one view per state)', () => {
    test('dead invitations show their own state', () => {
        for (const state of ['expired', 'revoked', 'accepted', 'invalid'] as const) {
            assert.equal(viewForPreview(preview({ state, accountExists: null }), null), state);
            assert.equal(viewForPreview(preview({ state, accountExists: null }), 'ana@equipo.co'), state);
        }
    });

    test('nobody signed in: create a password, or sign in when the email has a login', () => {
        assert.equal(viewForPreview(preview({ accountExists: false }), null), 'createPassword');
        assert.equal(viewForPreview(preview({ accountExists: true }), null), 'signIn');
    });

    test('signed in: accept when it can be the invited email, else "another account"', () => {
        assert.equal(viewForPreview(preview({ accountExists: true }), 'ana@equipo.co'), 'accept');
        assert.equal(viewForPreview(preview({ accountExists: true }), 'pedro@equipo.co'), 'otherAccount');
        // No login exists for the invited email: whoever is signed in is someone else.
        assert.equal(viewForPreview(preview({ accountExists: false }), 'ana@equipo.co'), 'otherAccount');
    });
});

describe('invitationOutcome (claim-account / accept failures)', () => {
    const err = (code: string, status: number) => ({ name: 'ApiError', code, status, message: 'x', details: {} });

    test('invitation and account states become views', () => {
        const views: [string, number, InvitationView][] = [
            ['INVITATION_INVALID', 404, 'invalid'],
            ['INVITATION_EXPIRED', 410, 'expired'],
            ['INVITATION_REVOKED', 410, 'revoked'],
            ['INVITATION_ACCEPTED', 409, 'accepted'],
            ['INVITATION_EMAIL_MISMATCH', 403, 'otherAccount'],
            ['EMAIL_IS_FAN_ACCOUNT', 409, 'fanAccount'],
            ['ACCOUNT_NOT_ELIGIBLE', 409, 'notEligible'],
            ['ACCOUNT_DELETED', 403, 'notEligible'],
            ['ALREADY_MEMBER', 409, 'alreadyMember'],
            ['ALREADY_IN_ANOTHER_TEAM', 409, 'otherTeam'],
        ];
        for (const [code, status, view] of views) {
            assert.deepEqual(invitationOutcome(err(code, status)), { kind: 'view', view }, code);
        }
    });

    test('ACCOUNT_EXISTS on claim asks to sign in, with a note', () => {
        assert.deepEqual(invitationOutcome(err('ACCOUNT_EXISTS', 409)), { kind: 'view', view: 'signIn', note: 'accountExists' });
    });

    test('form problems stay on the form', () => {
        const messages: [string, number, string][] = [
            ['WEAK_PASSWORD', 400, 'weakPassword'],
            ['TERMS_REQUIRED', 400, 'termsRequired'],
            ['AUTH_UNAVAILABLE', 503, 'authUnavailable'],
            ['ACCOUNT_CONFLICT', 409, 'accountConflict'],
            ['RATE_LIMITED', 429, 'tooManyAttempts'],
        ];
        for (const [code, status, key] of messages) {
            assert.deepEqual(invitationOutcome(err(code, status)), { kind: 'message', key }, code);
        }
        assert.deepEqual(invitationOutcome({ code: 'ERROR', status: 429 }), { kind: 'message', key: 'tooManyAttempts' });
        assert.deepEqual(invitationOutcome({ code: 'NETWORK_ERROR', status: 0 }), { kind: 'message', key: 'network' });
        assert.deepEqual(invitationOutcome({ code: 'ERROR', status: 502 }), { kind: 'message', key: 'server' });
        assert.deepEqual(invitationOutcome(new Error('boom')), { kind: 'message', key: 'generic' });
    });

    test('live views keep the flow going; the rest are dead ends', () => {
        assert.equal(isDeadEndView('createPassword'), false);
        assert.equal(isDeadEndView('otherAccount'), false);
        assert.equal(isDeadEndView('expired'), true);
        assert.equal(isDeadEndView('otherTeam'), true);
    });
});

describe('password and landing rules', () => {
    test('bcrypt reads 72 bytes: longer passwords (counted in UTF-8 bytes) are refused', () => {
        assert.equal(passwordTooLong('a'.repeat(72)), false);
        assert.equal(passwordTooLong('a'.repeat(73)), true);
        assert.equal(passwordTooLong('ñ'.repeat(37)), true); // 74 bytes, 37 characters
    });

    test('staff land on the scanner, everyone else on the panel', () => {
        assert.equal(landingPathFor('staff'), '/staff');
        assert.equal(landingPathFor('viewer'), '/dashboard');
        assert.equal(landingPathFor('owner'), '/dashboard');
        assert.equal(landingPathFor(null), '/dashboard');
    });
});

describe('colombiaDateTime', () => {
    const clean = (s: string) => s.replace(/\s/g, ' ');

    test('always in Colombia time, whatever the machine zone', () => {
        // 20:40 UTC = 3:40 p. m. in Bogotá (UTC-5, no daylight saving).
        const when = colombiaDateTime('2026-11-24T20:40:00.000Z', 'es', new Date('2026-11-17T12:00:00Z'))!;
        assert.equal(clean(when.date), '24 de noviembre');
        assert.match(clean(when.time), /^3:40 p\. ?m\.$/);
        const en = colombiaDateTime('2026-11-24T20:40:00.000Z', 'en', new Date('2026-11-17T12:00:00Z'))!;
        assert.equal(clean(en.date), 'November 24');
        assert.equal(clean(en.time), '3:40 PM');
    });

    test('the date crosses midnight in Colombia, not in UTC', () => {
        // 03:00 UTC on the 25th is still the 24th at 10 p. m. in Bogotá.
        const when = colombiaDateTime('2026-11-25T03:00:00.000Z', 'es', new Date('2026-11-17T12:00:00Z'))!;
        assert.equal(clean(when.date), '24 de noviembre');
    });

    test('the year shows only when it is not this year; bad input is null', () => {
        const when = colombiaDateTime('2027-01-02T15:00:00.000Z', 'es', new Date('2026-12-30T12:00:00Z'))!;
        assert.equal(clean(when.date), '2 de enero de 2027');
        assert.equal(colombiaDateTime('nope', 'es'), null);
        assert.equal(colombiaDateTime(null, 'es'), null);
    });
});

describe('invitation copy (es and en)', () => {
    const load = (lang: string) =>
        JSON.parse(readFileSync(new URL(`../../../messages/${lang}.json`, import.meta.url), 'utf8')).invitation;
    const views: InvitationView[] = ['expired', 'revoked', 'accepted', 'alreadyMember', 'otherTeam', 'fanAccount', 'notEligible', 'invalid', 'otherAccount'];
    const messageKeys = ['weakPassword', 'tooLong', 'termsRequired', 'authUnavailable', 'accountConflict', 'tooManyAttempts', 'network', 'server', 'generic'];

    test('every view and every message has copy, every role says what it allows', () => {
        for (const lang of ['es', 'en']) {
            const copy = load(lang);
            for (const view of views) {
                assert.equal(typeof copy[view]?.title, 'string', `${lang} ${view}.title`);
                assert.equal(typeof copy[view]?.body, 'string', `${lang} ${view}.body`);
            }
            for (const key of messageKeys) assert.equal(typeof copy.errors[key], 'string', `${lang} errors.${key}`);
            for (const role of ['owner', 'admin', 'viewer', 'staff']) {
                assert.equal(typeof copy.allows[role], 'string', `${lang} allows.${role}`);
            }
        }
    });

    test('no long dashes anywhere on the page (owner rule)', () => {
        for (const lang of ['es', 'en']) {
            assert.doesNotMatch(JSON.stringify(load(lang)), /[–—]/, lang);
        }
    });
});
