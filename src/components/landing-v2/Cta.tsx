'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Shared CTA system for the landing (Azul Bloque).
 *
 * `Cta` is the button: a solid block with a 2px ink border and a hard
 * extrusion that the `press` utility pushes in on :active. `StoreButtons`
 * are the real download targets, driven by env so they go live the
 * moment the store URLs exist and never render as dead links before.
 */

const IOS_URL = process.env.NEXT_PUBLIC_IOS_APP_URL ?? '';
const ANDROID_URL = process.env.NEXT_PUBLIC_ANDROID_APP_URL ?? '';

/**
 * The mobile-web app. With the stores unapproved this is how a fan
 * actually gets in, so it is the landing's primary CTA.
 *
 * It opens in the SAME TAB on purpose: this is a handoff into the app,
 * not a reference link. A new tab would leave the marketing page behind
 * the app the fan is now using, break the back button as a way out, and
 * on iOS Safari cost them the tab they had.
 */
export const WEB_APP_URL =
    process.env.NEXT_PUBLIC_WEB_APP_URL ?? 'http://localhost:8081';

/**
 * acid    — lime, THE action (entering the app). One per view.
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
    onClick?: () => void;
    variant?: Variant;
    className?: string;
    /**
     * Override the default target. Omit to keep the existing rule
     * (http(s) opens a new tab); pass `false` for a handoff that should
     * replace the current page, such as entering the web app.
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
        const isNewTab = newTab ?? /^https?:/i.test(href);
        return (
            <a
                href={href}
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

function AppleGlyph() {
    return (
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="currentColor" aria-hidden="true">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
    );
}

/** Monochrome (currentColor): the brand palette has no room for the
 *  four-colour Play mark. */
function PlayGlyph() {
    return (
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="currentColor" aria-hidden="true">
            <path d="M3.6 2.1c-.24.25-.38.63-.38 1.13v17.54c0 .5.14.88.38 1.13l.06.06 9.83-9.83v-.23L3.66 2.05l-.06.05z" />
            <path d="M16.77 16.4l-3.28-3.28v-.23l3.28-3.28.08.04 3.88 2.2c1.11.63 1.11 1.66 0 2.29l-3.88 2.2-.08.06z" />
            <path d="M16.85 16.34l-3.36-3.36-9.89 9.89c.37.39.97.44 1.65.06l11.6-6.59z" />
            <path d="M16.85 7.62L5.25 1.03C4.57.65 3.97.7 3.6 1.09l9.89 9.89 3.36-3.36z" />
        </svg>
    );
}

function StoreButton({
    href,
    glyph,
    line1,
    line2,
    soon,
}: {
    href: string;
    glyph: ReactNode;
    line1: string;
    line2: string;
    soon: string;
}) {
    const base =
        'flex min-w-[196px] items-center gap-3 rounded-[14px] border-2 px-5 py-3 text-left';

    if (!href) {
        return (
            <div
                className={`${base} block-quiet cursor-default border-transparent text-lilac`}
                aria-disabled="true"
            >
                {glyph}
                <span className="flex flex-col leading-tight">
                    <span className="label-mono text-[9px]">{line1}</span>
                    <span className="font-display text-base">{line2}</span>
                    <span className="label-mono text-[9px] text-white">{soon}</span>
                </span>
            </div>
        );
    }

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${base} press border-ink bg-white text-ink shadow-ext-sm hover:bg-line-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
        >
            {glyph}
            <span className="flex flex-col leading-tight">
                <span className="label-mono text-[9px] text-muted-white">{line1}</span>
                <span className="font-display text-base">{line2}</span>
            </span>
        </a>
    );
}

export function StoreButtons({ className = '' }: { className?: string }) {
    const t = useTranslations('landingV2.store');
    return (
        <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
            <StoreButton
                href={IOS_URL}
                glyph={<AppleGlyph />}
                line1={t('iosLine1')}
                line2={t('iosLine2')}
                soon={t('soon')}
            />
            <StoreButton
                href={ANDROID_URL}
                glyph={<PlayGlyph />}
                line1={t('androidLine1')}
                line2={t('androidLine2')}
                soon={t('soon')}
            />
        </div>
    );
}
