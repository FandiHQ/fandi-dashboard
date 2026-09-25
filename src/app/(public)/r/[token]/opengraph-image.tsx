/**
 * The OpenGraph image for a shared ranking card — WhatsApp/X/Facebook/
 * Telegram fetch it through the page's meta tags.
 *
 * Phase 5: one renderer. card.tsx draws the card (also served at the
 * stable /r/<token>/image alias); this route only adds the metadata Next
 * needs. Verified payload or a plain wordmark — never a forged claim.
 */
import { CARD_SIZE, renderShareCard } from './card';

export const alt = 'Mi ranking en Fandi';
export const size = CARD_SIZE;
export const contentType = 'image/png';

export default async function Image({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    return renderShareCard(token);
}
