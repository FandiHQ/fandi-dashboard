/**
 * Phase 5 — the artist's public image for the share card, as a data URI.
 *
 * The card renderer (Satori) fetches <img src> itself and FAILS the whole
 * render on a bad URL, so the image is fetched here first, best-effort,
 * and inlined: any failure → null → the card renders its current layout.
 * Small in-memory cache (5 min) so a viral link does not hammer the api.
 *
 * Source: GET /artists/:id — the public artist detail (no auth needed);
 * avatarUrl, falling back to coverUrl. Nothing else from that payload is
 * used, and nothing about the fan is sent.
 */
export const ARTIST_IMAGE_TTL_MS = 5 * 60 * 1000;
/** Failures are remembered briefly so a dead CDN is not re-hit per view. */
export const ARTIST_IMAGE_NEGATIVE_TTL_MS = 60 * 1000;
export const ARTIST_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 2500;

type FetchLike = (
    input: string,
    init?: { signal?: AbortSignal },
) => Promise<{
    ok: boolean;
    headers: { get(name: string): string | null };
    json(): Promise<unknown>;
    arrayBuffer(): Promise<ArrayBuffer>;
}>;

export interface ArtistImageDeps {
    fetchImpl?: FetchLike;
    apiBaseUrl?: string | null;
    now?: () => number;
}

const cache = new Map<string, { value: string | null; expiresAt: number }>();

/** Test hook. */
export function resetArtistImageCache(): void {
    cache.clear();
}

async function withTimeout<T>(
    run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        return await run(controller.signal);
    } finally {
        clearTimeout(timer);
    }
}

async function load(
    orgId: string,
    fetchImpl: FetchLike,
    base: string,
): Promise<string | null> {
    const detail = await withTimeout((signal) =>
        fetchImpl(`${base}/artists/${encodeURIComponent(orgId)}`, { signal }),
    );
    if (!detail.ok) return null;
    const body = (await detail.json()) as {
        avatarUrl?: string | null;
        coverUrl?: string | null;
    };
    const url = body.avatarUrl ?? body.coverUrl ?? null;
    if (!url || !/^https?:\/\//i.test(url)) return null;

    const image = await withTimeout((signal) => fetchImpl(url, { signal }));
    if (!image.ok) return null;
    const type = image.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) return null;
    const bytes = await image.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > ARTIST_IMAGE_MAX_BYTES) {
        return null;
    }
    const mime = type.split(';')[0]?.trim() || 'image/jpeg';
    return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
}

export async function fetchArtistImage(
    orgId: string | null | undefined,
    deps: ArtistImageDeps = {},
): Promise<string | null> {
    if (!orgId) return null;
    const now = deps.now ?? Date.now;
    const hit = cache.get(orgId);
    if (hit && hit.expiresAt > now()) return hit.value;

    const base = (
        deps.apiBaseUrl === undefined
            ? process.env.NEXT_PUBLIC_API_URL
            : deps.apiBaseUrl
    )?.replace(/\/+$/, '');
    const fetchImpl = deps.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    if (!base || !fetchImpl) return null;

    let value: string | null = null;
    try {
        value = await load(orgId, fetchImpl, base);
    } catch {
        value = null;
    }
    cache.set(orgId, {
        value,
        expiresAt:
            now() + (value ? ARTIST_IMAGE_TTL_MS : ARTIST_IMAGE_NEGATIVE_TTL_MS),
    });
    return value;
}
