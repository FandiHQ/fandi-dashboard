'use client';

import { useRef, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Shared CTA system for landing v2.
 *
 * `Cta` is the button: a magnetic hover (the label leans toward the
 * cursor) plus a sheen sweep, in the tactical language. `StoreButtons`
 * are the real download targets, driven by env so they go live the
 * moment the store URLs exist and never render as dead links before.
 */

const IOS_URL = process.env.NEXT_PUBLIC_IOS_APP_URL ?? '';
const ANDROID_URL = process.env.NEXT_PUBLIC_ANDROID_APP_URL ?? '';

type Variant = 'primary' | 'ghost' | 'acid';

const VARIANTS: Record<Variant, string> = {
    primary:
        'bg-[#2D00F7] text-white hover:bg-[#2400C5] hover:shadow-[0_0_40px_rgba(45,0,247,0.75)]',
    acid: 'bg-[#CCFF00] text-black hover:shadow-[0_0_40px_rgba(204,255,0,0.55)]',
    ghost:
        'border border-white/15 bg-white/[0.03] text-white backdrop-blur-md hover:border-[#CCFF00] hover:bg-[#CCFF00]/[0.06] hover:shadow-[0_0_28px_rgba(204,255,0,0.2)]',
};

export function Cta({
    children,
    href,
    onClick,
    variant = 'primary',
    className = '',
}: {
    children: ReactNode;
    href?: string;
    onClick?: () => void;
    variant?: Variant;
    className?: string;
}) {
    const ref = useRef<HTMLSpanElement>(null);

    // Magnetic label — cheap, transform-only, no re-render.
    const onMove = (e: React.MouseEvent<HTMLElement>) => {
        const el = ref.current;
        if (!el) return;
        const r = e.currentTarget.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = `translate(${dx * 10}px, ${dy * 6}px)`;
    };
    const onLeave = () => {
        const el = ref.current;
        if (el) el.style.transform = 'translate(0,0)';
    };

    const cls =
        `group relative inline-flex items-center justify-center overflow-hidden px-9 py-4 ` +
        `font-space-mono text-[12px] font-bold uppercase tracking-[2px] transition-all duration-300 ` +
        `active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E5FF] ` +
        `${VARIANTS[variant]} ${className}`;

    const inner = (
        <>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 -left-full w-1/2 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-all duration-500 group-hover:left-[150%]"
            />
            <span
                ref={ref}
                className="relative transition-transform duration-200 ease-out"
            >
                {children}
            </span>
        </>
    );

    if (href) {
        // Only http(s) links open in a new tab. `mailto:` must NOT —
        // target="_blank" makes the browser open a real blank tab and
        // *then* hand off to the OS mail handler, so anyone without a
        // registered handler just gets a stranded empty window. A same-tab
        // mailto is handed straight to the OS and leaves the page alone.
        // (If nothing happens at all, no default mail app is configured —
        // that is an OS setting, not something the page can fix.)
        const isNewTab = /^https?:/i.test(href);
        return (
            <a
                href={href}
                className={cls}
                onMouseMove={onMove}
                onMouseLeave={onLeave}
                {...(isNewTab
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
            >
                {inner}
            </a>
        );
    }
    return (
        <button
            type="button"
            onClick={onClick}
            className={cls}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
        >
            {inner}
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

function PlayGlyph() {
    return (
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
            <path d="M3.6 2.1c-.24.25-.38.63-.38 1.13v17.54c0 .5.14.88.38 1.13l.06.06 9.83-9.83v-.23L3.66 2.05l-.06.05z" fill="#00E5FF" />
            <path d="M16.77 16.4l-3.28-3.28v-.23l3.28-3.28.08.04 3.88 2.2c1.11.63 1.11 1.66 0 2.29l-3.88 2.2-.08.06z" fill="#CCFF00" />
            <path d="M16.85 16.34l-3.36-3.36-9.89 9.89c.37.39.97.44 1.65.06l11.6-6.59z" fill="#FF0055" />
            <path d="M16.85 7.62L5.25 1.03C4.57.65 3.97.7 3.6 1.09l9.89 9.89 3.36-3.36z" fill="#22C55E" />
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
        'flex min-w-[196px] items-center gap-3 border px-5 py-3 text-left transition-all';

    if (!href) {
        return (
            <div
                className={`${base} cursor-default border-white/10 bg-white/[0.02] text-[#6B6B6B]`}
                aria-disabled="true"
            >
                {glyph}
                <span className="flex flex-col leading-tight">
                    <span className="font-space-mono text-[9px] uppercase tracking-[2px]">{line1}</span>
                    <span className="font-sora text-base font-bold text-[#9A9AA6]">{line2}</span>
                    <span className="font-space-mono text-[9px] uppercase tracking-[2px] text-[#CCFF00]">
                        {soon}
                    </span>
                </span>
            </div>
        );
    }

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${base} border-white/15 bg-white/[0.03] text-white backdrop-blur-md hover:border-[#CCFF00] hover:bg-[#CCFF00]/[0.06] hover:shadow-[0_0_24px_rgba(204,255,0,0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E5FF] active:scale-95`}
        >
            {glyph}
            <span className="flex flex-col leading-tight">
                <span className="font-space-mono text-[9px] uppercase tracking-[2px] text-[#A0A0A0]">
                    {line1}
                </span>
                <span className="font-sora text-base font-bold">{line2}</span>
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
