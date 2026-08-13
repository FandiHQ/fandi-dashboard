'use client';

import Image from 'next/image';
import { useScroll, useMotionValueEvent } from 'framer-motion';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Cta, WEB_APP_URL } from './Cta';

/**
 * Persistent nav + mobile sticky CTA bar.
 *
 * Hidden over the hero (nothing competes with the mic), then solid — not
 * translucent — once the visitor is past it, so section content never
 * bleeds through the bar and makes the links unreadable.
 *
 * Locale switch writes the same `locale` cookie the app already reads in
 * src/i18n/request.ts (which defaults to 'es') and reloads.
 */

const LINKS = [
    { key: 'categorias', href: '#categorias' },
    { key: 'subastas', href: '#subastas' },
    { key: 'idolos', href: '#idolos' },
] as const;

export default function NavV2({ onSignIn }: { onSignIn: () => void }) {
    const t = useTranslations('landingV2.nav');
    const tCta = useTranslations('landingV2.cta');
    const locale = useLocale();
    const { scrollYProgress } = useScroll();
    const [past, setPast] = useState(false);

    // Discrete threshold, NOT a scroll-linked opacity. Tying opacity to
    // scrollYProgress made the bar dissolve in and out proportionally to how
    // far you'd scrolled, which reads as a bug. It now snaps in with a fixed
    // 300ms transition once you're past the hero, at any scroll speed.
    useMotionValueEvent(scrollYProgress, 'change', (v) => {
        setPast(v > 0.035);
    });

    const switchLocale = (loc: string) => {
        document.cookie = `locale=${loc};path=/;max-age=31536000`;
        window.location.reload();
    };

    return (
        <>
            <header
                className={`fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050506]/95 backdrop-blur-xl transition-opacity duration-300 ${
                    past
                        ? 'pointer-events-auto opacity-100'
                        : 'pointer-events-none opacity-0'
                }`}
            >
                <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-6 px-5 md:px-8">
                    {/* Intrinsic size is 967x747 — declaring a wrong aspect
                        ratio makes next/image generate mis-sized renditions
                        and the mark goes soft. */}
                    <a href="#main-content" aria-label="Fandi" className="shrink-0">
                        <Image
                            src="/fandi-logo.png"
                            alt="Fandi"
                            width={967}
                            height={747}
                            priority
                            className="h-10 w-auto md:h-11"
                        />
                    </a>

                    <nav
                        className="hidden flex-1 items-center justify-center gap-9 md:flex"
                        aria-label={t('label')}
                    >
                        {LINKS.map((l) => (
                            <a
                                key={l.key}
                                href={l.href}
                                className="font-space-mono text-[11px] uppercase tracking-[3px] text-[#A0A0A0] transition-colors hover:text-white"
                            >
                                {t(l.key)}
                            </a>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-3 md:ml-0">
                        {/* ES / EN — ES is the app default */}
                        <div
                            className="hidden items-center gap-1.5 sm:flex"
                            role="group"
                            aria-label={t('lang')}
                        >
                            {(['es', 'en'] as const).map((loc, i) => (
                                <span key={loc} className="flex items-center gap-1.5">
                                    {i === 1 && (
                                        <span className="text-[#3A3A42]" aria-hidden="true">
                                            |
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => switchLocale(loc)}
                                        aria-pressed={locale === loc}
                                        className={`cursor-pointer font-space-mono text-[11px] uppercase tracking-[2px] transition-colors ${
                                            locale === loc
                                                ? 'text-white'
                                                : 'text-[#6B6B6B] hover:text-white'
                                        }`}
                                    >
                                        {loc.toUpperCase()}
                                    </button>
                                </span>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={onSignIn}
                            className="hidden px-3 py-2 font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] transition-colors hover:text-white sm:block"
                        >
                            {t('signIn')}
                        </button>
                        <Cta
                            href={WEB_APP_URL}
                            newTab={false}
                            variant="acid"
                            className="!px-5 !py-2.5"
                        >
                            {tCta('enter')}
                        </Cta>
                    </div>
                </div>
            </header>

            {/* Mobile sticky action bar */}
            <div
                className={`fixed inset-x-0 bottom-0 z-50 flex gap-3 border-t border-white/10 bg-[#050506]/95 p-3 backdrop-blur-xl transition-transform duration-300 md:hidden ${
                    past ? 'translate-y-0' : 'translate-y-full'
                }`}
            >
                <Cta onClick={onSignIn} variant="ghost" className="flex-1 !px-4">
                    {t('idol')}
                </Cta>
                <Cta
                    href={WEB_APP_URL}
                    newTab={false}
                    variant="acid"
                    className="flex-1 !px-4"
                >
                    {tCta('enter')}
                </Cta>
            </div>
        </>
    );
}
