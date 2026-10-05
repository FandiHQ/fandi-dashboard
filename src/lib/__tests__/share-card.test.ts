/**
 * Phase 5 — verifier + copy helpers. Runs on Node's built-in runner
 * (`pnpm test` → node --test) so the dashboard needs no extra deps.
 *
 * The signer below is a test-only replica of fandi-api's encodeShareCard
 * (same base64url, same HMAC input) — that byte-compatibility is exactly
 * what these tests pin.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
    decodeShareCard,
    fansCompeting,
    impactoresLine,
    isImpactoCard,
    ofFansLine,
    pluralFans,
    rankOfFans,
    SHARE_CARD_VERSION,
    showsTopPercent,
    SUPPORTED_SHARE_CARD_VERSIONS,
    topPercent,
    type ShareCardPayload,
} from '../share-card.ts';

const SECRET = 'test-secret';
const NOW = 1_786_000_000;

function base64url(input: string | Buffer): string {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/** fandi-api/src/common/share-card.ts::encodeShareCard, verbatim. */
function encode(payload: ShareCardPayload, secret: string): string {
    const body = base64url(JSON.stringify(payload));
    const sig = base64url(createHmac('sha256', secret).update(body).digest());
    return `${body}.${sig}`;
}

const V1: ShareCardPayload = {
    v: 1,
    r: 3,
    t: 250,
    ti: 'elite',
    a: 'J Balvin',
    n: 'Juan',
    av: null,
    iat: NOW,
    exp: NOW + 3600,
};

const V2: ShareCardPayload = {
    ...V1,
    v: 2,
    o: 'org-1',
    ig: 'camila.t',
    ev: 'Concierto Medellín',
};

describe('decodeShareCard — versions', () => {
    test('accepts v1 and v2 only', () => {
        assert.equal(SHARE_CARD_VERSION, 2);
        assert.deepEqual([...SUPPORTED_SHARE_CARD_VERSIONS], [1, 2]);
    });

    test('a v1 token (no v2 fields) still verifies and decodes unchanged', () => {
        const decoded = decodeShareCard(encode(V1, SECRET), SECRET, NOW);
        assert.deepEqual(decoded, V1);
        assert.equal(decoded?.o, undefined);
        assert.equal(decoded?.ig, undefined);
        assert.equal(decoded?.ev, undefined);
    });

    test('a v2 token round-trips with org, handle and event', () => {
        assert.deepEqual(decodeShareCard(encode(V2, SECRET), SECRET, NOW), V2);
    });

    test('v2 for a private fan carries ig null', () => {
        const priv = { ...V2, n: null, av: null, ig: null };
        assert.deepEqual(decodeShareCard(encode(priv, SECRET), SECRET, NOW), priv);
    });

    test('rejects v0 and v3', () => {
        assert.equal(decodeShareCard(encode({ ...V1, v: 0 }, SECRET), SECRET, NOW), null);
        assert.equal(decodeShareCard(encode({ ...V2, v: 3 }, SECRET), SECRET, NOW), null);
    });

    test('rejects a forged body, another secret, an expired token, an empty secret', () => {
        const token = encode(V2, SECRET);
        const [, sig] = token.split('.');
        const forged = base64url(JSON.stringify({ ...V2, r: 1 }));
        assert.equal(decodeShareCard(`${forged}.${sig}`, SECRET, NOW), null);
        assert.equal(decodeShareCard(encode(V2, 'other'), SECRET, NOW), null);
        assert.equal(
            decodeShareCard(encode({ ...V2, exp: NOW - 1 }, SECRET), SECRET, NOW),
            null,
        );
        assert.equal(decodeShareCard(token, '', NOW), null);
    });
});

describe('impacto card helpers (Phase 6)', () => {
    test('k marks the impacto card; ranking cards have no k', () => {
        assert.equal(isImpactoCard({ k: 'impacto' }), true);
        assert.equal(isImpactoCard({}), false);
        assert.equal(isImpactoCard({ k: 'ranking' }), false);
    });

    test('a v2 impacto payload round-trips with k and the cause in ev', () => {
        const impacto = { ...V2, k: 'impacto' as const, ev: 'Instrumentos', ti: null };
        assert.deepEqual(decodeShareCard(encode(impacto, SECRET), SECRET, NOW), impacto);
    });

    test('Impactores line pluralises', () => {
        assert.equal(impactoresLine(1), '1 Impactor');
        assert.equal(impactoresLine(13), '13 Impactores');
    });
});

describe('small-fanbase copy', () => {
    test('TOP N% is gated at 20 fans: 19 hides it, 20 shows it', () => {
        assert.equal(showsTopPercent(19), false);
        assert.equal(showsTopPercent(20), true);
        assert.equal(showsTopPercent(1), false);
        assert.equal(showsTopPercent(0), false);
    });

    test('plural helper: 1 is the only singular', () => {
        assert.equal(pluralFans(1), 'fan');
        assert.equal(pluralFans(2), 'fans');
        assert.equal(pluralFans(0), 'fans');
        assert.equal(pluralFans(1, true), 'FAN');
        assert.equal(pluralFans(13, true), 'FANS');
    });

    test('card and page lines', () => {
        assert.equal(ofFansLine(13), 'DE 13 FANS');
        assert.equal(ofFansLine(1), 'DE 1 FAN');
        assert.equal(rankOfFans(3, 13), '#3 de 13 fans');
        assert.equal(rankOfFans(1, 1), '#1 de 1 fan');
        assert.equal(fansCompeting(13), '13 fans compitiendo');
        assert.equal(fansCompeting(1), '1 fan compitiendo');
    });

    test('topPercent is unchanged (ceil, floored at 1)', () => {
        assert.equal(topPercent(3, 200), 2);
        assert.equal(topPercent(1, 10_000), 1);
        assert.equal(topPercent(5, 0), 100);
    });
});
