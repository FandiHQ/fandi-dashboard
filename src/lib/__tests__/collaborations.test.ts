import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { canOpenFromHistory, matchTokenInvitation, showSharedResults } from '../collaborations.ts';
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
