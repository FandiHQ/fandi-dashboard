import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { INVITE_LINK_TTL_HOURS, inviteLikelyExpired } from '../team-invites.ts';
import { looksLikeEmail } from '../auth-flow.ts';
import { apiErrorCode, apiErrorKind } from '../api-error-kind.ts';

const HOUR = 60 * 60 * 1000;

describe('inviteLikelyExpired', () => {
    const now = Date.parse('2026-10-01T12:00:00Z');

    test('fresh invitations are fine; older than the link lifetime may have expired', () => {
        const justSent = new Date(now - 10 * 60 * 1000).toISOString();
        const old = new Date(now - (INVITE_LINK_TTL_HOURS * HOUR + 1)).toISOString();
        assert.equal(inviteLikelyExpired(justSent, now), false);
        assert.equal(inviteLikelyExpired(old, now), true);
    });

    test('respects a longer lifetime when Supabase is configured for it', () => {
        const fiveHours = new Date(now - 5 * HOUR).toISOString();
        assert.equal(inviteLikelyExpired(fiveHours, now, 24), false);
        assert.equal(inviteLikelyExpired(fiveHours, now, 1), true);
    });

    test('missing or broken dates never nag', () => {
        assert.equal(inviteLikelyExpired(null, now), false);
        assert.equal(inviteLikelyExpired(undefined, now), false);
        assert.equal(inviteLikelyExpired('not a date', now), false);
    });
});

describe('looksLikeEmail', () => {
    test('accepts normal addresses and trims spaces', () => {
        assert.equal(looksLikeEmail('maria@fandi.app'), true);
        assert.equal(looksLikeEmail('  maria.garcia+team@correo.com.co '), true);
    });

    test('rejects obvious typos', () => {
        for (const bad of ['', 'maria', 'maria@', 'maria@correo', '@correo.com', 'ma ria@correo.com', 'maria@correo.c']) {
            assert.equal(looksLikeEmail(bad), false, bad);
        }
    });
});

describe('apiErrorKind', () => {
    test('maps statuses to kinds the pages can explain', () => {
        assert.equal(apiErrorKind({ name: 'ApiError', code: 'NETWORK_ERROR', status: 0 }), 'network');
        assert.equal(apiErrorKind({ code: 'ERROR', status: 403 }), 'forbidden');
        assert.equal(apiErrorKind({ code: 'ERROR', status: 404 }), 'notFound');
        assert.equal(apiErrorKind({ code: 'ERROR', status: 409 }), 'conflict');
        assert.equal(apiErrorKind({ code: 'ERROR', status: 400 }), 'invalid');
        assert.equal(apiErrorKind({ code: 'ERROR', status: 422 }), 'invalid');
        assert.equal(apiErrorKind({ code: 'ERROR', status: 500 }), 'server');
        assert.equal(apiErrorKind({ code: 'ERROR', status: 503 }), 'server');
        assert.equal(apiErrorKind(new Error('x')), 'unknown');
        assert.equal(apiErrorKind(null), 'unknown');
    });

    test('apiErrorCode returns only real typed codes', () => {
        assert.equal(apiErrorCode({ code: 'LINEUP_ENTRY_IN_USE', status: 400 }), 'LINEUP_ENTRY_IN_USE');
        assert.equal(apiErrorCode({ code: 'ERROR', status: 400 }), null);
        assert.equal(apiErrorCode({ code: 'NETWORK_ERROR', status: 0 }), null);
        assert.equal(apiErrorCode(undefined), null);
    });
});
