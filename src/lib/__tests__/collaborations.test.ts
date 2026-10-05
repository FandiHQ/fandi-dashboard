import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    canAnswerInvitations,
    canOpenFromHistory,
    dynamicLabelKey,
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
