/**
 * Verifier for the ranking share-card links fandi-api signs.
 *
 * MUST stay byte-compatible with fandi-api/src/common/share-card.ts —
 * same field names, same base64url, same HMAC input. The two are
 * deliberately duplicated rather than shared through a package: this repo
 * only ever VERIFIES, and giving the dashboard the ability to sign would
 * hand a public web server the power to mint any rank it likes.
 *
 * Never renders anything from an unverified payload. An unsigned link is
 * a 404, not a card.
 */
import { createHmac, timingSafeEqual } from 'crypto';

export const SHARE_CARD_VERSION = 1;

export interface ShareCardPayload {
    v: number;
    /** Rank within the artist's fanbase. */
    r: number;
    /** Fanbase size. */
    t: number;
    /** Tier slug, or null. */
    ti: string | null;
    /** Artist name. */
    a: string;
    /** First name, or null when the fan's profile is private. */
    n: string | null;
    /** Avatar URL, or null when private or unset. */
    av: string | null;
    /** Issued at (epoch seconds). */
    iat: number;
    /** Expiry (epoch seconds). */
    exp: number;
}

function fromBase64url(input: string): Buffer {
    return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sign(body: string, secret: string): string {
    return createHmac('sha256', secret)
        .update(body)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export function decodeShareCard(
    token: string,
    secret: string,
    nowSeconds: number = Math.floor(Date.now() / 1000),
): ShareCardPayload | null {
    if (!secret) return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, signature] = parts;
    if (!body || !signature) return null;

    const a = Buffer.from(signature);
    const b = Buffer.from(sign(body, secret));
    // Length first — timingSafeEqual throws when the buffers differ.
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    let payload: ShareCardPayload;
    try {
        payload = JSON.parse(fromBase64url(body).toString('utf8'));
    } catch {
        return null;
    }

    if (payload.v !== SHARE_CARD_VERSION) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= nowSeconds) {
        return null;
    }
    return payload;
}

/** Rounded up and floored at 1, so the top fan never reads "Top 0%". */
export function topPercent(rank: number, total: number): number {
    if (!Number.isFinite(rank) || !Number.isFinite(total) || total <= 0) {
        return 100;
    }
    return Math.min(100, Math.max(1, Math.ceil((rank / total) * 100)));
}

/** Display label per tier. Falls back to the plain rank when unset. */
export const TIER_LABEL: Record<string, string> = {
    leyenda: 'LEYENDA',
    elite: 'ÉLITE',
    superfan: 'SUPERFAN',
    fan_real: 'FAN REAL',
};
