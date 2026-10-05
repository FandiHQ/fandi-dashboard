/**
 * Verifier for the ranking share-card links fandi-api signs.
 *
 * MUST stay byte-compatible with fandi-api/src/common/share-card.ts —
 * same field names, same base64url, same HMAC input. The two are
 * deliberately duplicated rather than shared through a package: this repo
 * only ever VERIFIES, and giving the dashboard the ability to sign would
 * hand a public web server the power to mint any rank it likes.
 *
 * Versions (Phase 5): v1 links already in the wild keep verifying and
 * render as before; v2 adds { o, ig, ev } (org id, Instagram handle,
 * event name). Anything else fails closed.
 *
 * Never renders anything from an unverified payload. An unsigned link is
 * a 404, not a card.
 */
import { createHmac, timingSafeEqual } from 'crypto';

/** Version the api stamps on NEW tokens. */
export const SHARE_CARD_VERSION = 2;
/** Versions this verifier accepts. */
export const SUPPORTED_SHARE_CARD_VERSIONS: readonly number[] = [1, 2];

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
    // ── v2 (absent on v1 tokens) ──
    /** Artist (organization) id — lets the renderer fetch the public image. */
    o?: string;
    /** Instagram handle without "@", or null when private/unset. */
    ig?: string | null;
    /** Event the ranking is framed by, or null. */
    ev?: string | null;
    /**
     * Card kind (Phase 6). Absent/'ranking' = the rank card; 'impacto' =
     * "Apoyé {ev}" — `r` is the fan's position on the Impactores wall,
     * `t` the number of Impactores. Position shown only when public.
     */
    k?: 'ranking' | 'impacto';
}

/** Phase 6 — "13 Impactores" / "1 Impactor". */
export function impactoresLine(total: number): string {
    return `${total} ${total === 1 ? 'Impactor' : 'Impactores'}`;
}

export function isImpactoCard(payload: { k?: string }): boolean {
    return payload.k === 'impacto';
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

    if (!SUPPORTED_SHARE_CARD_VERSIONS.includes(payload.v)) return null;
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

// ── Phase 5: small-fanbase copy ──────────────────────────────────
//
// "TOP 77%" of 13 fans is a joke, not a flex. Under this size the card
// says "#3 DE 13 FANS" instead, which is honest and still reads as a
// position. Positions only — never an amount.

/** Fanbases smaller than this hide "TOP N%". */
export const SMALL_FANBASE_BELOW = 20;

export function showsTopPercent(total: number): boolean {
    return Number.isFinite(total) && total >= SMALL_FANBASE_BELOW;
}

/** "fan" / "fans" — 1 is the only singular. */
export function pluralFans(total: number, upper = false): string {
    const word = total === 1 ? 'fan' : 'fans';
    return upper ? word.toUpperCase() : word;
}

/** The accent line on small fanbases: "DE 13 FANS" / "DE 1 FAN". */
export function ofFansLine(total: number): string {
    return `DE ${total} ${pluralFans(total, true)}`;
}

/** "#3 de 13 fans" — the sentence form for metadata and the page. */
export function rankOfFans(rank: number, total: number): string {
    return `#${rank} de ${total} ${pluralFans(total)}`;
}

/** "13 fans compitiendo" / "1 fan compitiendo". */
export function fansCompeting(total: number): string {
    return `${total} ${pluralFans(total)} compitiendo`;
}

/** Display label per tier. Falls back to the plain rank when unset. */
export const TIER_LABEL: Record<string, string> = {
    leyenda: 'LEYENDA',
    elite: 'ÉLITE',
    superfan: 'SUPERFAN',
    fan_real: 'FAN REAL',
};
