'use client';

import Image from 'next/image';
import { useScroll, useMotionValueEvent } from 'framer-motion';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DOWNLOAD_PATH } from '@/lib/app-links';
import { Cta, DASHBOARD_URL, scrollToDownloadIfNoStore } from './Cta';

/**
 * Persistent nav + mobile sticky CTA bar.
 *
 * Hidden over the hero (nothing competes with the mic), then a solid ink
 * bar — never translucent or blurred — once the visitor is past it, so
 * section content never bleeds through and makes the links unreadable.
 *
 * Locale switch writes the same `locale` cookie the app already reads in
 * src/i18n/request.ts (which defaults to 'es') and reloads.
 */

const LINKS = [
    { key: 'categorias', href: '#categorias' },
    { key: 'subastas', href: '#subastas' },
    { key: 'idolos', href: '#idolos' },
] as const;

function switchLocale(locale: string) {
    document.cookie = `locale=${locale};path=/;max-age=31536000`;
    window.location.reload();
}

export default function NavV2() {
    const t = useTranslations('landingV2.nav');
    const locale = useLocale();
    const { scrollY } = useScroll();
    const [past, setPast] = useState(false);

    // Discrete threshold, NOT a scroll-linked opacity (a bar dissolving in
    // proportion to scroll reads as a bug). It snaps in with a fixed 300ms
    // transition once the hero has mostly scrolled away. Measured in
    // viewports, not a share of the page: the page length changes, the
    // hero is always one screen.
    useMotionValueEvent(scrollY, 'change', (y) => {
        setPast(y > window.innerHeight * 0.8);
    });

    return (
        <>
            <header
                // focus-within: while hidden over the hero the bar is still
                // in the tab order, so a keyboard user tabbing into it must
                // be able to see where focus went.
                className={`fixed inset-x-0 top-0 z-50 border-b-2 border-ink bg-ink transition-opacity duration-300 focus-within:pointer-events-auto focus-within:opacity-100 ${
                    past
                        ? 'pointer-events-auto opacity-100'
                        : 'pointer-events-none opacity-0'
                }`}
            >
                <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-6 px-5 md:px-8">
                    {/* Intrinsic size is 967x747 — declaring a wrong aspect
                        ratio makes next/image generate mis-sized renditions
                        and the mark goes soft. */}
                    <a
                        href="#main-content"
                        aria-label="Fandi"
                        className="flex min-h-11 shrink-0 items-center rounded-[8px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    >
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
                        className="hidden flex-1 items-center justify-center gap-9 lg:flex"
                        aria-label={t('label')}
                    >
                        {LINKS.map((l) => (
                            <a
                                key={l.key}
                                href={l.href}
                                className="label-mono inline-flex min-h-11 items-center text-[12px] text-muted-ink transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                {t(l.key)}
                            </a>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-3 lg:ml-0">
                        {/* ES / EN — ES is the app default */}
                        <div
                            className="hidden items-center gap-1.5 sm:flex"
                            role="group"
                            aria-label={t('lang')}
                        >
                            {(['es', 'en'] as const).map((loc, i) => (
                                <span key={loc} className="flex items-center gap-1.5">
                                    {i === 1 && (
                                        <span className="text-nav-inactive" aria-hidden="true">
                                            |
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => switchLocale(loc)}
                                        aria-pressed={locale === loc}
                                        className={`label-mono inline-flex min-h-11 cursor-pointer items-center px-1 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                                            locale === loc
                                                ? 'text-white'
                                                : 'text-muted-ink hover:text-white'
                                        }`}
                                    >
                                        {loc.toUpperCase()}
                                    </button>
                                </span>
                            ))}
                        </div>

                        <a
                            href={DASHBOARD_URL}
                            className="label-mono hidden min-h-11 items-center px-3 text-[12px] text-muted-ink transition-colors hover:text-white sm:inline-flex focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                            {t('signIn')}
                        </a>
                        {/* md+ only: on phones the sticky bar below
                            carries this same action, and two lime buttons
                            on one screen break "one acid CTA per view". */}
                        <Cta
                            href={DOWNLOAD_PATH}
                            onClick={scrollToDownloadIfNoStore}
                            variant="acid"
                            onInk
                            className="min-h-11 !hidden !px-5 !py-2.5 !text-[13px] md:!inline-flex"
                        >
                            {t('download')}
                        </Cta>
                    </div>
                </div>
            </header>

            {/* Mobile sticky action bar */}
            <div
                className={`fixed inset-x-0 bottom-0 z-50 flex gap-3 border-t-2 border-ink bg-ink p-3 transition-transform duration-300 focus-within:translate-y-0 md:hidden ${
                    past ? 'translate-y-0' : 'translate-y-full'
                }`}
            >
                <Cta
                    href={DASHBOARD_URL}
                    newTab={false}
                    variant="ghost"
                    className="min-h-11 flex-1 !px-4 !py-3 !text-[13px]"
                >
                    {/* Ídolos → organizer dashboard (its own host in production). */}
                    {t('idol')}
                </Cta>
                <Cta
                    href={DOWNLOAD_PATH}
                    onClick={scrollToDownloadIfNoStore}
                    variant="acid"
                    onInk
                    className="min-h-11 flex-1 !px-4 !py-3 !text-[13px]"
                >
                    {t('download')}
                </Cta>
            </div>
        </>
    );
}
