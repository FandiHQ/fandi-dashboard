import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    invitationRowState, resendBlockedUntil, teamErrorCopy, visibleInvitations,
} from '../team-invites.ts';
import { looksLikeEmail } from '../auth-flow.ts';
import { apiErrorCode, apiErrorKind } from '../api-error-kind.ts';
import type { TeamInvitation } from '../../types/api';

const HOUR = 60 * 60 * 1000;
const now = Date.parse('2026-11-17T12:00:00Z');

const inv = (over: Partial<TeamInvitation> = {}): TeamInvitation => ({
    id: 'i1',
    email: 'ana@equipo.co',
    name: null,
    role: 'viewer',
    eventIds: null,
    eventNames: null,
    status: 'pending',
    needsResend: false,
    expiresAt: new Date(now + 48 * HOUR).toISOString(),
    lastSentAt: new Date(now - HOUR).toISOString(),
    sendCount: 1,
    createdAt: new Date(now - HOUR).toISOString(),
    acceptedAt: null,
    revokedAt: null,
    invitedBy: { userId: 'u1', displayName: 'Juan' },
    canResend: true,
    canRevoke: true,
    resendAvailableAt: null,
    ...over,
});

/** An ApiError as lib/api.ts builds it (shape B keeps the body in details). */
const apiError = (code: string, status: number, details: Record<string, unknown> = {}) => ({
    name: 'ApiError',
    code,
    status,
    message: 'texto del API que nunca se muestra',
    details: { code, ...details },
});

describe('visibleInvitations', () => {
    test('pending and expired only (accepted are members, revoked are gone), pending first, newest first', () => {
        const items = [
            inv({ id: 'old-pending', createdAt: '2026-11-10T00:00:00Z' }),
            inv({ id: 'expired', status: 'expired', createdAt: '2026-11-16T00:00:00Z' }),
            inv({ id: 'accepted', status: 'accepted' }),
            inv({ id: 'revoked', status: 'revoked' }),
            inv({ id: 'new-pending', createdAt: '2026-11-15T00:00:00Z' }),
        ];
        assert.deepEqual(visibleInvitations(items).map((i) => i.id), ['new-pending', 'old-pending', 'expired']);
    });
});

describe('invitationRowState', () => {
    test('pending, expired, and pending without a live link (migrated)', () => {
        assert.equal(invitationRowState(inv(), now), 'pending');
        assert.equal(invitationRowState(inv({ status: 'expired' }), now), 'expired');
        assert.equal(invitationRowState(inv({ needsResend: true }), now), 'needsResend');
    });

    test('a pending one past its date reads expired before the sweep runs', () => {
        assert.equal(invitationRowState(inv({ expiresAt: new Date(now - 1).toISOString() }), now), 'expired');
        assert.equal(invitationRowState(inv({ needsResend: true, expiresAt: new Date(now - 1).toISOString() }), now), 'expired');
    });
});

describe('resendBlockedUntil', () => {
    test('only a future resendAvailableAt blocks the button', () => {
        const later = new Date(now + 3 * HOUR).toISOString();
        assert.equal(resendBlockedUntil(inv({ resendAvailableAt: later }), now), later);
        assert.equal(resendBlockedUntil(inv({ resendAvailableAt: new Date(now - 1).toISOString() }), now), null);
        assert.equal(resendBlockedUntil(inv({ resendAvailableAt: null }), now), null);
        assert.equal(resendBlockedUntil(inv({ resendAvailableAt: 'nope' }), now), null);
    });
});

describe('teamErrorCopy', () => {
    test('every code the team endpoints send has its own copy', () => {
        const cases: [string, number, string][] = [
            ['NO_ORGANIZATION', 403, 'noOrg'],
            ['ROLE_FORBIDDEN', 403, 'noPermission'],
            ['ROLE_NOT_ALLOWED', 403, 'roleNotAllowed'],
            ['EVENT_SCOPE_NOT_ALLOWED', 400, 'eventScope'],
            ['EVENT_NOT_IN_ORG', 400, 'eventNotInOrg'],
            ['ALREADY_MEMBER', 409, 'alreadyMember'],
            ['INVITATION_PENDING', 409, 'invitationPending'],
            ['INVITATION_RATE_LIMITED', 429, 'orgRateLimited'],
            ['RATE_LIMITED', 429, 'tooFast'],
            ['INVITATION_NOT_FOUND', 404, 'invitationNotFound'],
            ['INVITATION_NOT_PENDING', 409, 'invitationNotPending'],
            ['RESEND_LIMIT', 429, 'resendLimit'],
        ];
        for (const [code, status, key] of cases) {
            assert.equal(teamErrorCopy(apiError(code, status)).key, key, code);
        }
    });

    test('carries retryAt, limit and the existing invitation id', () => {
        assert.deepEqual(teamErrorCopy(apiError('RESEND_LIMIT', 429, { retryAt: '2026-11-18T10:00:00.000Z' })), {
            key: 'resendLimit',
            retryAt: '2026-11-18T10:00:00.000Z',
        });
        assert.deepEqual(teamErrorCopy(apiError('INVITATION_RATE_LIMITED', 429, { limit: 30 })), { key: 'orgRateLimited', limit: 30 });
        assert.deepEqual(teamErrorCopy(apiError('INVITATION_PENDING', 409, { invitationId: 'abc' })), {
            key: 'invitationPending',
            invitationId: 'abc',
        });
        // An empty id (a race the API could not resolve) offers no resend.
        assert.deepEqual(teamErrorCopy(apiError('INVITATION_PENDING', 409, { invitationId: '' })), { key: 'invitationPending' });
    });

    test('untyped failures fall back by HTTP kind; a 5xx on a send means the email failed', () => {
        assert.equal(teamErrorCopy({ code: 'ERROR', status: 409 }).key, 'alreadyMember');
        assert.equal(teamErrorCopy({ code: 'ERROR', status: 404 }).key, 'notFound');
        assert.equal(teamErrorCopy({ code: 'ERROR', status: 500 }, true).key, 'emailFailed');
        assert.equal(teamErrorCopy({ code: 'ERROR', status: 500 }).key, 'generic');
        assert.equal(teamErrorCopy({ code: 'NETWORK_ERROR', status: 0 }).key, 'network');
        assert.equal(teamErrorCopy(new Error('x')).key, 'generic');
    });

    test('every key has copy in es and en, with no long dashes', () => {
        const keys = [
            'noOrg', 'noPermission', 'roleNotAllowed', 'eventScope', 'eventNotInOrg', 'alreadyMember',
            'invitationPending', 'orgRateLimited', 'tooFast', 'invitationNotFound', 'invitationNotPending',
            'resendLimit', 'resendLimitSoon', 'notFound', 'invalid', 'emailFailed', 'network', 'generic',
        ];
        for (const lang of ['es', 'en']) {
            const messages = JSON.parse(readFileSync(new URL(`../../../messages/${lang}.json`, import.meta.url), 'utf8'));
            for (const key of keys) {
                const copy = messages.team.errors[key];
                assert.equal(typeof copy, 'string', `${lang} team.errors.${key}`);
                assert.doesNotMatch(copy, /[–—]/, `${lang} team.errors.${key}`);
            }
        }
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
