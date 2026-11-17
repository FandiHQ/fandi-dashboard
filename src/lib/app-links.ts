/**
 * Where fans get the Fandi app.
 *
 * Constants, not env vars: the store listings are public, permanent and
 * the same in every environment, so a missing variable must never be able
 * to turn a download button into a dead link.
 *
 * The App Store URL is storefront-neutral on purpose. A country path
 * (`/co/app/…`, `/ca/app/…`) pins every visitor to that storefront; without
 * one, Apple sends each visitor to their own, and the app is live in 147
 * countries.
 */

export const APP_STORE_ID = '6823753589';

export const APP_STORE_URL = `https://apps.apple.com/app/fandi/id${APP_STORE_ID}`;

export const PLAY_STORE_URL =
    'https://play.google.com/store/apps/details?id=co.fandi.app';

/**
 * iOS Safari's Smart App Banner ("Open" / "Get" bar on top of the page),
 * for Next's `metadata.other`. Only on pages a fan lands on: `/` and the
 * shared ranking card.
 */
export const SMART_APP_BANNER = {
    'apple-itunes-app': `app-id=${APP_STORE_ID}`,
} as const;

/** Smart redirect: phone → its store, anything else → the landing's badges. */
export const DOWNLOAD_PATH = '/descargar';

/** The same, absolute — for QR codes and anything printed or shared. */
export const DOWNLOAD_URL = `https://fandi.app${DOWNLOAD_PATH}`;

/** Where a visitor with no phone store lands: the download section. */
export const DOWNLOAD_FALLBACK = '/#descargar';

/**
 * Picks the destination for `/descargar` from a User-Agent.
 *
 * iPhone/iPad/iPod → App Store, Android → Google Play, anything else (or
 * no UA) → the landing's download section, where both badges and the QR
 * code are.
 *
 * Known blind spot: iPadOS 13+ Safari sends a desktop macOS UA by default,
 * so an iPad usually lands on the badges rather than straight in the
 * store. One extra tap; the server cannot tell it apart from a Mac.
 *
 * Windows Phone UAs claim both "Android" and "iPhone" for compatibility,
 * so they are excluded before either test.
 */
export function downloadTarget(userAgent: string | null | undefined): string {
    const ua = userAgent ?? '';
    if (/Windows Phone/i.test(ua)) return DOWNLOAD_FALLBACK;
    if (/\b(iPhone|iPad|iPod)\b/i.test(ua)) return APP_STORE_URL;
    if (/\bAndroid\b/i.test(ua)) return PLAY_STORE_URL;
    return DOWNLOAD_FALLBACK;
}
