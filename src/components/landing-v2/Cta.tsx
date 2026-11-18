'use client';

import { type MouseEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
    APP_STORE_URL,
    DOWNLOAD_FALLBACK,
    PLAY_STORE_URL,
    downloadTarget,
} from '@/lib/app-links';

/**
 * Shared CTA system for the landing (Azul Bloque).
 *
 * `Cta` is the button: a solid block with a 2px ink border and a hard
 * extrusion that the `press` utility pushes in on :active. `StoreBadges`
 * are the real download targets: the official App Store and Google Play
 * badges, never a re-drawn imitation of them.
 */

/**
 * Organizer dashboard (ídolos). Kept environment-specific so staging and
 * production can promote the same source without crossing their
 * authentication flows. Fans never come here: they get the app from the
 * stores (StoreBadges / `/descargar`).
 */
export const DASHBOARD_URL = new URL(
    '/login',
    process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3000',
).toString();

/** "Escríbenos": the ídolo's door when they don't have an account yet. */
export const IDOL_MAILTO =
    'mailto:hola@fandi.app?subject=Quiero%20llevar%20Fandi%20a%20mi%20evento';

/**
 * acid    — lime, THE action (getting the app). One per view.
 * primary — white extruded block (secondary actions: "Escríbenos").
 * ghost   — white outline, no fill (quiet doors: "Ingresar (ídolos)").
 */
type Variant = 'primary' | 'ghost' | 'acid';

const VARIANTS: Record<Variant, string> = {
    acid: 'bg-lime text-ink border-2 border-ink shadow-ext-md hover:brightness-105',
    primary:
        'bg-white text-ink border-2 border-ink shadow-ext-sm hover:bg-line-white',
    ghost: 'bg-transparent text-white border-2 border-white hover:bg-white hover:text-ink',
};

/** Inside an ink surface the ink extrusion disappears; use the blue one (§2). */
const ON_INK_SHADOW: Record<Variant, string> = {
    acid: 'bg-lime text-ink border-2 border-ink shadow-ext-cta hover:brightness-105',
    primary: VARIANTS.primary,
    ghost: VARIANTS.ghost,
};

export function Cta({
    children,
    href,
    onClick,
    variant = 'primary',
    className = '',
    newTab,
    onInk = false,
}: {
    children: ReactNode;
    href?: string;
    /** On a link it runs first and may `preventDefault()` the navigation. */
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    variant?: Variant;
    className?: string;
    /**
     * Override the default target (http(s) opens a new tab). Pass `false`
     * for a handoff that should replace this page, e.g. the dashboard login.
     */
    newTab?: boolean;
    /** Rendered inside an ink bar/block: swaps the extrusion colour. */
    onInk?: boolean;
}) {
    const cls =
        `press inline-flex items-center justify-center rounded-[14px] px-8 py-4 ` +
        `font-display text-[15px] tracking-[0.01em] transition-colors duration-150 ` +
        `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ` +
        `${(onInk ? ON_INK_SHADOW : VARIANTS)[variant]} ${className}`;

    if (href) {
        // Only http(s) links open in a new tab. `mailto:` must NOT —
        // target="_blank" makes the browser open a real blank tab and
        // *then* hand off to the OS mail handler, so anyone without a
        // registered handler just gets a stranded empty window. A same-tab
        // mailto is handed straight to the OS and leaves the page alone.
        // (If nothing happens at all, no default mail app is configured —
        // that is an OS setting, not something the page can fix.)
        // Relative links (`/descargar`) stay in the tab too.
        const isNewTab = newTab ?? /^https?:/i.test(href);
        return (
            <a
                href={href}
                onClick={onClick}
                className={cls}
                {...(isNewTab
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
            >
                {children}
            </a>
        );
    }
    return (
        <button type="button" onClick={onClick} className={cls}>
            {children}
        </button>
    );
}

/**
 * Click handler for links to `/descargar` shown ON the landing.
 *
 * On a phone the link runs as written and the route sends it to its
 * store. Anywhere the route would answer `/#descargar` (a desktop),
 * following it would reload this long page and re-decode its image
 * sequences just to land lower on it, so the click scrolls to the section
 * instead. The href stays `/descargar`, so a copied, middle-clicked or
 * no-JS link is still the smart one.
 */
export function scrollToDownloadIfNoStore(event: MouseEvent<HTMLElement>) {
    if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
    ) {
        return;
    }
    if (downloadTarget(navigator.userAgent) !== DOWNLOAD_FALLBACK) return;
    const section = document.getElementById('descargar');
    if (!section) return;

    event.preventDefault();
    // 'instant', not 'auto': 'auto' defers to the CSS scroll-behavior,
    // and globals.css sets `smooth` on <html> unconditionally.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block: 'start' });
    // Move keyboard focus with the view, as a native anchor jump would.
    section.focus({ preventScroll: true });
}

/**
 * Visible badge height. Apple's floor is 40px; both sizes stay above it,
 * and at 48px the two badges still fit side by side in a 375px viewport
 * (144 + 162 + 16 gap = 322px of 343). Narrower screens wrap them.
 */
const BADGE_HEIGHT = {
    md: '[--badge-h:44px] sm:[--badge-h:48px]',
    lg: '[--badge-h:48px] md:[--badge-h:56px]',
} as const;

const BADGE_LINK =
    'inline-flex rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white';

/**
 * The official store badges, artwork untouched (public/badges): Apple's
 * es-MX black SVG and Google's es-419 PNG.
 *
 * Plain <img>, not next/image, on purpose: the optimizer would re-encode
 * Google's PNG and does not take SVG without opting out anyway, and both
 * stores forbid altering the artwork.
 *
 * Google ships its PNG with transparent padding above and below the badge
 * (rows 29–220 of 250 are the badge, 29 clear rows on each side). It is
 * drawn 250/192 taller than the Apple badge and the padding is pulled back
 * with equal negative margins, so both read the same height and the row's
 * box is the badges' box.
 *
 * Clear space: the 16px gap beats ¼ of the tallest badge (56 → 14px), and
 * callers keep at least that much around the row.
 */
export function StoreBadges({
    size = 'md',
    priority = false,
    className = '',
}: {
    size?: keyof typeof BADGE_HEIGHT;
    /** Above the fold: load eagerly instead of lazily. */
    priority?: boolean;
    className?: string;
}) {
    const t = useTranslations('landingV2.store');
    const loading = priority ? 'eager' : 'lazy';

    return (
        <div
            className={`flex flex-wrap items-center justify-center gap-4 ${BADGE_HEIGHT[size]} ${className}`}
        >
            <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={BADGE_LINK}
            >
                {/* eslint-disable-next-line @next/next/no-img-element -- official artwork, served byte-for-byte */}
                <img
                    src="/badges/app-store-es.svg"
                    alt={t('appStoreAlt')}
                    width={120}
                    height={40}
                    loading={loading}
                    decoding="async"
                    className="block h-(--badge-h) w-auto"
                />
            </a>
            <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={BADGE_LINK}
            >
                {/* eslint-disable-next-line @next/next/no-img-element -- official artwork, served byte-for-byte */}
                <img
                    src="/badges/google-play-es.png"
                    alt={t('googlePlayAlt')}
                    width={646}
                    height={250}
                    loading={loading}
                    decoding="async"
                    className="my-[calc(var(--badge-h)*-29/192)] block h-[calc(var(--badge-h)*250/192)] w-auto"
                />
            </a>
        </div>
    );
}
