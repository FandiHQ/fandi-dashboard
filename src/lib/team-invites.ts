/**
 * Team page rules that are worth testing on their own.
 */

/**
 * How long a Supabase invitation link lives. Mirrors Supabase →
 * Authentication → Email → "Email OTP Expiration" (default 3600 s = 1 h).
 * If that setting changes, change this too.
 */
export const INVITE_LINK_TTL_HOURS = 1;

/**
 * A pending invitation older than the link lifetime has probably expired,
 * so the team page nudges the owner to resend it. "Probably": the API does
 * not tell us when the person last opened the email.
 */
export function inviteLikelyExpired(
    invitedAt: string | null | undefined,
    now: number = Date.now(),
    ttlHours: number = INVITE_LINK_TTL_HOURS,
): boolean {
    if (!invitedAt) return false;
    const sent = new Date(invitedAt).getTime();
    if (Number.isNaN(sent)) return false;
    return now - sent > ttlHours * 60 * 60 * 1000;
}
