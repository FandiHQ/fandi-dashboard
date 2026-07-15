'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

/**
 * Closing app strip — a slow marquee of real captures so the page
 * ends on PRODUCT, not just words. Pure CSS animation (keyframes in
 * globals.css) that pauses under prefers-reduced-motion.
 */
const STRIP = [
    '/images/mockups/Frames_Android/home.png',
    '/images/mockups/Frames_Android/opportunity_categories.png',
    '/images/mockups/Frames_Android/auctions.png',
    '/images/mockups/Frames_Android/artist_profile_ranking.png',
    '/images/mockups/Frames_Android/wallet.png',
    '/images/mockups/Frames_Android/opportunities_preview.png',
] as const;

/** Keep in sync with SECTIONS.marquee.vh in page.tsx. */
export const MARQUEE_VH = 70;

export default function AppStripMarquee() {
    const t = useTranslations('landing.marquee');

    return (
        <div
            style={{ height: `${MARQUEE_VH}vh` }}
            className="relative flex flex-col items-center justify-center gap-8 overflow-hidden bg-black"
        >
            <span className="font-space-mono text-[11px] md:text-xs uppercase tracking-[4px] text-white/40">
                {t('kicker')}
            </span>

            <div className="relative w-full overflow-hidden" aria-hidden="true">
                {/* Edge fades */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-24 md:w-48 z-10 bg-gradient-to-r from-black to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-24 md:w-48 z-10 bg-gradient-to-l from-black to-transparent" />

                {/* Track: duplicated content for a seamless loop */}
                <div className="animate-marquee flex w-max gap-6 md:gap-10">
                    {[...STRIP, ...STRIP].map((src, i) => (
                        <div
                            key={`${src}-${i}`}
                            className="relative w-[120px] md:w-[170px] aspect-[9/19] opacity-70 hover:opacity-100 transition-opacity"
                        >
                            <Image
                                src={src}
                                alt=""
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 120px, 170px"
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
