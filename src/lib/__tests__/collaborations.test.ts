import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    canAnswerInvitations,
    canOpenFromHistory,
    collabErrorCopy,
    dynamicHref,
    dynamicLabelKey,
    initialTabFor,
    navBadgeCount,
    readCollaborationLink,
    receivedTabOf,
    seesCollaborationsBadge,
    splitInbox,
    inviteCandidates,
    liveGuestIds,
    matchTokenInvitation,
    pendingBadgeLabel,
    sendQueuedInvites,
    showSharedResults,
    summarizeInvites,
} from '../collaborations.ts';
import type { Collaboration, CollaborationStatus } from '../../types/api';

const collab = (id: string, status: CollaborationStatus, respondedAt: string | null = null): Collaboration => ({
    id,
    eventId: 'e1',
    eventName: 'Estéreo Picnic',
    eventDate: null,
    hostOrgId: 'h1',
    hostOrgName: 'Karol G',
    guestOrgId: 'g1',
    guestOrgName: 'Feid',
    guestAvatarUrl: null,
    dynamicType: 'experience',
    dynamicId: `d-${id}`,
    dynamicName: 'Meet & greet',
    status,
    source: 'manual',
    invitedAt: '2026-09-01T00:00:00Z',
    expiresAt: '2026-09-08T00:00:00Z',
    respondedAt,
    endedAt: null,
});

describe('invitation token card', () => {
    test('names the invitation only when exactly one is pending', () => {
        assert.equal(matchTokenInvitation([collab('a', 'pending'), collab('b', 'accepted', 'x')])?.id, 'a');
        assert.equal(matchTokenInvitation([collab('a', 'pending'), collab('b', 'pending')]), null);
        assert.equal(matchTokenInvitation([collab('b', 'accepted', 'x')]), null);
        assert.equal(matchTokenInvitation([]), null);
    });
});

describe('inbox history', () => {
    test('opens only collaborations that were accepted and then ended', () => {
        assert.equal(canOpenFromHistory(collab('a', 'ended', '2026-09-02T00:00:00Z')), true);
        assert.equal(canOpenFromHistory(collab('a', 'ended', null)), false);
        assert.equal(canOpenFromHistory(collab('a', 'declined', '2026-09-02T00:00:00Z')), false);
        assert.equal(canOpenFromHistory(collab('a', 'expired')), false);
    });
});

describe('shared page results block', () => {
    const withData = [{ participants: 0 }, { participants: 3 }];
    const empty = [{ participants: 0 }, { participants: 0 }];

    test('never for an Impacto or an auction', () => {
        assert.equal(showSharedResults({ dynamicType: 'experience', dynamicKind: 'impacto', categories: withData, notFinalized: false }), false);
        assert.equal(showSharedResults({ dynamicType: 'auction', categories: withData, notFinalized: true }), false);
    });

    test('an oportunidad shows results with data, or "coming" right after close', () => {
        assert.equal(showSharedResults({ dynamicType: 'experience', dynamicKind: 'oportunidad', categories: withData, notFinalized: false }), true);
        assert.equal(showSharedResults({ dynamicType: 'experience', categories: undefined, notFinalized: true }), true);
    });

    test('hidden when there is nothing to say (kind unknown)', () => {
        assert.equal(showSharedResults({ dynamicType: 'experience', categories: empty, notFinalized: false }), false);
        assert.equal(showSharedResults({ dynamicType: 'experience', categories: undefined, notFinalized: false }), false);
    });
});

describe('pending invitations badge and banner', () => {
    test('only owners and admins answer, so only they are told', () => {
        assert.equal(canAnswerInvitations('owner'), true);
        assert.equal(canAnswerInvitations('admin'), true);
        assert.equal(canAnswerInvitations('viewer'), false);
        assert.equal(canAnswerInvitations('staff'), false);
        assert.equal(canAnswerInvitations(null), false);
    });

    test('the badge shows the count, capped at 9+, and nothing at 0', () => {
        assert.equal(pendingBadgeLabel(0), null);
        assert.equal(pendingBadgeLabel(-1), null);
        assert.equal(pendingBadgeLabel(Number.NaN), null);
        assert.equal(pendingBadgeLabel(1), '1');
        assert.equal(pendingBadgeLabel(9), '9');
        assert.equal(pendingBadgeLabel(10), '9+');
    });

    test('names the dynamic by its kind (an experience without one is an oportunidad)', () => {
        assert.equal(dynamicLabelKey({ dynamicType: 'auction', dynamicKind: null }), 'auction');
        assert.equal(dynamicLabelKey({ dynamicType: 'experience', dynamicKind: 'impacto' }), 'impacto');
        assert.equal(dynamicLabelKey({ dynamicType: 'experience', dynamicKind: 'oportunidad' }), 'oportunidad');
        assert.equal(dynamicLabelKey({ dynamicType: 'experience' }), 'oportunidad');
    });
});

describe('inviting idols from the panels', () => {
    const withGuest = (id: string, status: CollaborationStatus, guestOrgId: string, dynamicId = 'd-1'): Collaboration => ({
        ...collab(id, status),
        guestOrgId,
        dynamicId,
    });

    test('live guests of one dynamic: pending or accepted, never another dynamic', () => {
        const all = [
            withGuest('a', 'pending', 'feid'),
            withGuest('b', 'accepted', 'kali'),
            withGuest('c', 'declined', 'shak'),
            withGuest('d', 'expired', 'maluma'),
            withGuest('e', 'ended', 'juanes'),
            withGuest('f', 'pending', 'other', 'd-2'),
        ];
        assert.deepEqual([...liveGuestIds(all, 'experience', 'd-1')].sort(), ['feid', 'kali']);
        assert.equal(liveGuestIds(all, 'auction', 'd-1').size, 0);
        // Creating: nothing exists yet.
        assert.equal(liveGuestIds(all, 'experience', null).size, 0);
    });

    test('search results never offer my org, a live guest or one already picked', () => {
        const results = [{ id: 'me' }, { id: 'feid' }, { id: 'kali' }, { id: 'shak' }];
        assert.deepEqual(
            inviteCandidates(results, { myOrgId: 'me', excluded: ['feid', 'kali'] }).map((r) => r.id),
            ['shak'],
        );
        assert.deepEqual(
            inviteCandidates(results, { myOrgId: null, excluded: new Set<string>() }).map((r) => r.id),
            ['me', 'feid', 'kali', 'shak'],
        );
    });

    test('one call per idol; failures come back named, never thrown', async () => {
        const calls: string[] = [];
        const outcomes = await sendQueuedInvites(
            async (guestOrgId) => {
                calls.push(guestOrgId);
                if (guestOrgId === 'kali') throw new Error('Ese ídolo ya está invitado');
                if (guestOrgId === 'shak') throw 'boom';
                return { emailed: 1 };
            },
            [
                { id: 'feid', name: 'Feid' },
                { id: 'kali', name: 'Kali Uchis' },
                { id: 'shak', name: 'Shakira' },
            ],
            'Algo salió mal',
        );
        assert.deepEqual(calls, ['feid', 'kali', 'shak']);
        assert.deepEqual(summarizeInvites(outcomes), {
            sent: ['Feid'],
            failed: [
                { name: 'Kali Uchis', message: 'Ese ídolo ya está invitado' },
                { name: 'Shakira', message: 'Algo salió mal' },
            ],
        });
    });

    test('nothing picked: no calls', async () => {
        let called = false;
        const outcomes = await sendQueuedInvites(async () => { called = true; }, [], 'x');
        assert.deepEqual(outcomes, []);
        assert.equal(called, false);
    });
});

describe('Colaboraciones tabs', () => {
    test('a received collaboration lives in Recibidas (pending), Activas (accepted) or Historial', () => {
        assert.equal(receivedTabOf(collab('a', 'pending')), 'received');
        assert.equal(receivedTabOf(collab('a', 'accepted')), 'active');
        for (const s of ['declined', 'ended', 'expired'] as const) assert.equal(receivedTabOf(collab('a', s)), 'history');
        const split = splitInbox([collab('p', 'pending'), collab('a', 'accepted'), collab('d', 'declined'), collab('e', 'ended')]);
        assert.deepEqual(
            { received: split.received.map((c) => c.id), active: split.active.map((c) => c.id), history: split.history.map((c) => c.id) },
            { received: ['p'], active: ['a'], history: ['d', 'e'] },
        );
    });

    test('email links: ?sent opens Enviadas, ?invite the tab of that invitation (Recibidas until known)', () => {
        const inbox = [collab('11111111-1111-4111-8111-111111111111', 'accepted')];
        assert.equal(initialTabFor({ inviteId: null, sentId: 'x' }, inbox), 'sent');
        assert.equal(initialTabFor({ inviteId: '11111111-1111-4111-8111-111111111111', sentId: null }, inbox), 'active');
        assert.equal(initialTabFor({ inviteId: '11111111-1111-4111-8111-111111111111', sentId: null }, undefined), 'received');
        assert.equal(initialTabFor({ inviteId: 'unknown', sentId: null }, inbox), 'received');
        assert.equal(initialTabFor({ inviteId: null, sentId: null }, inbox), 'received');
    });

    test('readCollaborationLink keeps uuids only (lower-cased) and the legacy token', () => {
        const id = 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE';
        assert.deepEqual(readCollaborationLink(new URLSearchParams(`invite=${id}`)), { inviteId: id.toLowerCase(), sentId: null, token: null });
        assert.deepEqual(readCollaborationLink(new URLSearchParams(`sent=${id}`)), { inviteId: null, sentId: id.toLowerCase(), token: null });
        assert.deepEqual(readCollaborationLink(new URLSearchParams('invite=../../x&token=tok')), { inviteId: null, sentId: null, token: 'tok' });
        assert.deepEqual(readCollaborationLink(new URLSearchParams('')), { inviteId: null, sentId: null, token: null });
    });

    test('a sent invitation links to its dynamic tab', () => {
        assert.equal(dynamicHref({ eventId: 'e1', dynamicType: 'auction', dynamicKind: null }), '/dashboard/events/e1/auctions');
        assert.equal(dynamicHref({ eventId: 'e1', dynamicType: 'experience', dynamicKind: 'impacto' }), '/dashboard/events/e1/impactos');
        assert.equal(dynamicHref({ eventId: 'e1', dynamicType: 'experience', dynamicKind: undefined }), '/dashboard/events/e1/experiences');
    });
});

describe('nav badge (both sides)', () => {
    test('answerers and readers see it; staff never', () => {
        assert.equal(seesCollaborationsBadge('owner'), true);
        assert.equal(seesCollaborationsBadge('admin'), true);
        assert.equal(seesCollaborationsBadge('viewer'), true);
        assert.equal(seesCollaborationsBadge('staff'), false);
        assert.equal(seesCollaborationsBadge(null), false);
    });

    test('counts invitations to answer plus new answers to mine (older api: no responses field)', () => {
        assert.equal(navBadgeCount({ count: 2, responses: 1 }), 3);
        assert.equal(navBadgeCount({ count: 0, responses: 4 }), 4);
        assert.equal(navBadgeCount({ count: 1 }), 1);
        assert.equal(navBadgeCount({ count: -1, responses: Number.NaN }), 0);
        assert.equal(navBadgeCount(null), 0);
    });
});

describe('collabErrorCopy', () => {
    const err = (code: string, status: number, details: Record<string, unknown> = {}) => ({
        name: 'ApiError', code, status, message: 'texto del API', details: { code, ...details },
    });

    test('every code the collaboration endpoints send has its own copy', () => {
        const cases: [string, number, string][] = [
            ['COLLAB_SELF', 400, 'self'],
            ['IDOL_NOT_FOUND', 404, 'idolNotFound'],
            ['IDOL_NO_ACCOUNT', 400, 'idolNoAccount'],
            ['COLLABORATION_EXISTS', 409, 'exists'],
            ['COLLABORATION_NOT_PENDING', 409, 'notPending'],
            ['COLLABORATION_EXPIRED', 410, 'expired'],
            ['INVITE_NOT_FOUND', 404, 'linkUsed'],
            ['COLLABORATION_NOT_ACTIVE', 409, 'notActive'],
            ['ROLE_FORBIDDEN', 403, 'noPermission'],
            ['COLLABORATION_NOT_FOUND', 404, 'notFound'],
            ['EXPERIENCE_NOT_FOUND', 404, 'dynamicNotFound'],
            ['INVALID_DYNAMIC_TYPE', 400, 'dynamicNotFound'],
            ['COLLAB_COOLDOWN', 409, 'cooldown'],
            ['COLLAB_INVITE_LIMIT', 429, 'inviteLimit'],
            ['RATE_LIMITED', 429, 'tooFast'],
            ['NOT_SYNCED', 403, 'notSynced'],
            ['NO_ORGANIZATION', 403, 'noOrg'],
        ];
        for (const [code, status, key] of cases) assert.equal(collabErrorCopy(err(code, status)).key, key, code);
    });

    test('carries the cooldown date and the daily cap', () => {
        assert.deepEqual(collabErrorCopy(err('COLLAB_COOLDOWN', 409, { retryAt: '2026-11-24T15:00:00.000Z' })), {
            key: 'cooldown',
            retryAt: '2026-11-24T15:00:00.000Z',
        });
        assert.deepEqual(collabErrorCopy(err('COLLAB_INVITE_LIMIT', 429, { limit: 5 })), { key: 'inviteLimit', limit: 5 });
    });

    test('untyped failures never show the raw message', () => {
        assert.equal(collabErrorCopy({ code: 'ERROR', status: 429, message: 'x' }).key, 'tooFast');
        assert.equal(collabErrorCopy({ code: 'ERROR', status: 403, message: 'x' }).key, 'noPermission');
        assert.equal(collabErrorCopy({ code: 'NETWORK_ERROR', status: 0 }).key, 'network');
        assert.equal(collabErrorCopy(new Error('Forbidden resource')).key, 'generic');
    });

    test('every key has copy in es and en; nothing in Colaboraciones uses long dashes', () => {
        const keys = [
            'self', 'idolNotFound', 'idolNoAccount', 'exists', 'notPending', 'expired', 'linkUsed', 'notActive',
            'noPermission', 'notFound', 'dynamicNotFound', 'cooldown', 'cooldownSoon', 'inviteLimit', 'tooFast',
            'notSynced', 'noOrg', 'network', 'generic',
        ];
        for (const lang of ['es', 'en']) {
            const messages = JSON.parse(readFileSync(new URL(`../../../messages/${lang}.json`, import.meta.url), 'utf8'));
            for (const key of keys) assert.equal(typeof messages.collaborations.errors[key], 'string', `${lang} ${key}`);
            assert.doesNotMatch(JSON.stringify(messages.collaborations), /[\u2013\u2014]/, lang);
            // The guest view never shows money.
            assert.equal(messages.collaborations.contributed, undefined, lang);
        }
    });

    test('queued invites can describe failures with our own copy', async () => {
        const outcomes = await sendQueuedInvites(
            async () => { throw { code: 'COLLAB_COOLDOWN', status: 409, message: 'texto del API' }; },
            [{ id: 'feid', name: 'Feid' }],
            (e) => `copia:${collabErrorCopy(e).key}`,
        );
        assert.deepEqual(outcomes, [{ name: 'Feid', ok: false, message: 'copia:cooldown' }]);
    });
});
