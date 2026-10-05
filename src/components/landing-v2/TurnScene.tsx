'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ScrollCue } from './ScrollAffordance';

/**
 * §2 — EL GIRO.
 *
 * Hard cut out of the desaturated frustration into full colour: the
 * barrier breaks. This is the brand-maximalist beat — Fandi blue floods
 * back over the crowd, the type is enormous, the energy is the point.
 *
 * Carries the constraint that matters most commercially: Fandi is LIVE
 * and works from ANYWHERE. Not a venue perk. You do not need to be in
 * the stadium — the three "desde…" lines exist to kill that assumption
 * before it forms.
 */

const PLACES = ['p1', 'p2', 'p3'] as const;

export default function TurnScene() {
    const t = useTranslations('landingV2.giro');
    const ref = useRef<HTMLDivElement>(null);
    const reduceMotion = useReducedMotion();

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end end'],
    });

    // Colour floods back in — the inverse of the frustration drain.
    const saturate = useTransform(scrollYProgress, [0, 0.35], [0.2, 1.15]);
    const filter = useTransform(saturate, (s) => `saturate(${s})`);
    const imgScale = useTransform(scrollYProgress, [0, 1], [1.18, 1.02]);

    // "HASTA HOY" must be FULLY gone before the slam starts — any overlap
    // leaves ghost text sitting behind "PASAS." and both become unreadable.
    const introOpacity = useTransform(scrollYProgress, [0, 0.08, 0.2, 0.27], [0, 1, 1, 0]);
    const introY = useTransform(scrollYProgress, [0, 0.1], [30, 0]);

    const slamOpacity = useTransform(scrollYProgress, [0.3, 0.42], [0, 1]);
    const slamScale = useTransform(scrollYProgress, [0.3, 0.46], [0.86, 1]);

    const placesOpacity = useTransform(scrollYProgress, [0.6, 0.72], [0, 1]);
    // Floods the plate with flat Fandi blue so type stays legible over
    // confetti.
    const scrim = useTransform(scrollYProgress, [0.22, 0.42], [0.2, 0.82]);

    return (
        <section
            ref={ref}
            aria-label="Fandi abre, en vivo y desde donde estés"
            className="relative h-[300vh] bg-blue"
        >
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                {/* Euphoria plate over flat blue */}
                <motion.div
                    className="absolute inset-0"
                    style={reduceMotion ? undefined : { scale: imgScale, filter }}
                >
                    {/* Below the fold — see FrustrationScene for why this
                        must not load eagerly. WebP q72; the scrim and
                        vignette hide the compression entirely. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/crowd/euforia.webp"
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover opacity-80"
                    />
                </motion.div>
                {/* Blue cover that deepens as the copy arrives — confetti is busy. */}
                <motion.div
                    style={{ opacity: reduceMotion ? 0.8 : scrim }}
                    className="pointer-events-none absolute inset-0 bg-blue"
                    aria-hidden="true"
                />

                <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
                    {/* Beat 1 — the pivot */}
                    <motion.p
                        style={reduceMotion ? undefined : { opacity: introOpacity, y: introY }}
                        className="absolute font-space-mono text-lg uppercase tracking-[0.3em] text-white md:text-2xl"
                    >
                        {t('intro')}
                    </motion.p>

                    {/* Beat 2 — the slam */}
                    <motion.h2
                        style={
                            reduceMotion
                                ? undefined
                                : { opacity: slamOpacity, scale: slamScale }
                        }
                        className="font-hero flex flex-col items-center text-[52px] leading-[0.9] text-white md:text-[130px]"
                    >
                        {t('slamA')}
                        {/* The protagonist: the screen's one tilt. */}
                        <span className="surface-white tilt-hero mt-3 rounded-[18px] border-2 border-ink bg-white px-5 pb-1 pt-2 text-blue shadow-ext-xl md:mt-5 md:px-8">
                            {t('slamB')}
                        </span>
                    </motion.h2>

                    {/* Beat 3 — live, and from anywhere. The commercial point. */}
                    {/* Solid white pills, not bare text — these sit on confetti. */}
                    <motion.div
                        style={reduceMotion ? undefined : { opacity: placesOpacity }}
                        className="mt-10 flex flex-col items-center gap-3 md:mt-14 md:flex-row md:gap-4"
                    >
                        {PLACES.map((key) => (
                            <span
                                key={key}
                                className="rounded-full border-2 border-ink bg-white px-5 py-3 font-space-mono text-sm font-bold uppercase tracking-[0.14em] text-ink shadow-ext-sm md:text-base"
                            >
                                {t(key)}
                            </span>
                        ))}
                    </motion.div>
                </div>

                <ScrollCue targetRef={ref} />
            </div>
        </section>
    );
}
