/**
 * Phase 5 — artist image fetch is best-effort: any failure yields null
 * (the card keeps its current layout), successes are cached for 5 min.
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    ARTIST_IMAGE_NEGATIVE_TTL_MS,
    ARTIST_IMAGE_TTL_MS,
    fetchArtistImage,
    resetArtistImageCache,
} from '../artist-image.ts';

type Resp = {
    ok: boolean;
    headers: { get(name: string): string | null };
    json(): Promise<unknown>;
    arrayBuffer(): Promise<ArrayBuffer>;
};

function response(partial: Partial<Resp> & { ok: boolean }): Resp {
    return {
        headers: { get: () => null },
        json: async () => ({}),
        arrayBuffer: async () => new ArrayBuffer(0),
        ...partial,
    };
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;

describe('fetchArtistImage', () => {
    beforeEach(() => resetArtistImageCache());

    test('happy path: detail → avatarUrl → bytes → data URI (and cached)', async () => {
        const calls: string[] = [];
        const fetchImpl = async (url: string) => {
            calls.push(url);
            if (url.endsWith('/artists/org-1')) {
                return response({
                    ok: true,
                    json: async () => ({ avatarUrl: 'https://cdn/a.png' }),
                });
            }
            return response({
                ok: true,
                headers: { get: (n) => (n === 'content-type' ? 'image/png' : null) },
                arrayBuffer: async () => PNG,
            });
        };
        const first = await fetchArtistImage('org-1', {
            fetchImpl,
            apiBaseUrl: 'https://api.test/',
        });
        assert.equal(first, `data:image/png;base64,${Buffer.from(PNG).toString('base64')}`);
        assert.deepEqual(calls, ['https://api.test/artists/org-1', 'https://cdn/a.png']);

        const second = await fetchArtistImage('org-1', { fetchImpl, apiBaseUrl: 'https://api.test' });
        assert.equal(second, first);
        assert.equal(calls.length, 2, 'served from cache');
    });

    test('falls back to coverUrl when there is no avatar', async () => {
        const fetchImpl = async (url: string) =>
            url.includes('/artists/')
                ? response({ ok: true, json: async () => ({ avatarUrl: null, coverUrl: 'https://cdn/c.jpg' }) })
                : response({
                      ok: true,
                      headers: { get: () => 'image/jpeg' },
                      arrayBuffer: async () => PNG,
                  });
        const out = await fetchArtistImage('org-2', { fetchImpl, apiBaseUrl: 'https://api.test' });
        assert.ok(out?.startsWith('data:image/jpeg;base64,'));
    });

    test('failure paths → null: api 404, network throw, non-image body, oversize', async () => {
        assert.equal(
            await fetchArtistImage('org-404', {
                fetchImpl: async () => response({ ok: false }),
                apiBaseUrl: 'https://api.test',
            }),
            null,
        );
        resetArtistImageCache();
        assert.equal(
            await fetchArtistImage('org-boom', {
                fetchImpl: async () => {
                    throw new Error('ECONNRESET');
                },
                apiBaseUrl: 'https://api.test',
            }),
            null,
        );
        resetArtistImageCache();
        assert.equal(
            await fetchArtistImage('org-html', {
                fetchImpl: async (url: string) =>
                    url.includes('/artists/')
                        ? response({ ok: true, json: async () => ({ avatarUrl: 'https://cdn/x' }) })
                        : response({ ok: true, headers: { get: () => 'text/html' } }),
                apiBaseUrl: 'https://api.test',
            }),
            null,
        );
        resetArtistImageCache();
        assert.equal(
            await fetchArtistImage('org-big', {
                fetchImpl: async (url: string) =>
                    url.includes('/artists/')
                        ? response({ ok: true, json: async () => ({ avatarUrl: 'https://cdn/x' }) })
                        : response({
                              ok: true,
                              headers: { get: () => 'image/png' },
                              arrayBuffer: async () => new ArrayBuffer(4 * 1024 * 1024),
                          }),
                apiBaseUrl: 'https://api.test',
            }),
            null,
        );
    });

    test('no api base or no org id → null without fetching', async () => {
        let called = 0;
        const fetchImpl = async () => {
            called += 1;
            return response({ ok: true });
        };
        assert.equal(await fetchArtistImage('org-1', { fetchImpl, apiBaseUrl: null }), null);
        assert.equal(await fetchArtistImage(null, { fetchImpl, apiBaseUrl: 'https://api.test' }), null);
        assert.equal(called, 0);
    });

    test('negative cache is short, positive cache is 5 minutes', async () => {
        let t = 1_000_000;
        const now = () => t;
        let calls = 0;
        const failing = async () => {
            calls += 1;
            return response({ ok: false });
        };
        await fetchArtistImage('org-neg', { fetchImpl: failing, apiBaseUrl: 'https://api.test', now });
        await fetchArtistImage('org-neg', { fetchImpl: failing, apiBaseUrl: 'https://api.test', now });
        assert.equal(calls, 1);
        t += ARTIST_IMAGE_NEGATIVE_TTL_MS + 1;
        await fetchArtistImage('org-neg', { fetchImpl: failing, apiBaseUrl: 'https://api.test', now });
        assert.equal(calls, 2);
        assert.ok(ARTIST_IMAGE_TTL_MS > ARTIST_IMAGE_NEGATIVE_TTL_MS);
    });
});
