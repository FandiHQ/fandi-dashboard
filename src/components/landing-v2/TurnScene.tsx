'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ScrollCue } from './ScrollAffordance';
import { useRange, useReducedMotionSafe, useSceneProgress } from './scroll';

/**
 * §2 EL GIRO: "AHORA SÍ PASAS." The strongest beat on the page, so it gets
 * the biggest type and a clean stage of its own.
 *
 * Out of the drained frustration into colour: Fandi blue floods over the
 * crowd as the slam lands. Then the commercial point, live and from
 * anywhere: you do not need to be in the stadium.
 *
 * "Hasta hoy." is on screen while the scene scrolls in and is fully gone
 * before the slam starts: any overlap leaves ghost text behind "PASAS.".
 */

const PLACES = ['p1', 'p2', 'p3'] as const;

export default function TurnScene() {
    const t = useTranslations('landingV2.giro');
    const ref = useRef<HTMLElement>(null);
    const progress = useSceneProgress(ref);
    // Reduced motion: one static screen, nothing to scrub through.
    const reduceMotion = useReducedMotionSafe();

    const imgScale = useRange(progress, [0, 1], [1.14, 1.02]);
    const introOpacity = useRange(progress, [0, 0.08, 0.14], [1, 1, 0]);
    const slamOpacity = useRange(progress, [0.16, 0.3], [0, 1]);
    const slamScale = useRange(progress, [0.16, 0.34], [0.86, 1]);
    const placesOpacity = useRange(progress, [0.42, 0.54], [0, 1]);
    const placesY = useRange(progress, [0.42, 0.54], [24, 0]);
    // Flat blue floods the plate so the type stays legible over confetti.
    const scrim = useRange(progress, [0.1, 0.3], [0.45, 0.84]);

    return (
        <section
            ref={ref}
            aria-label="Fandi abre, en vivo y desde donde estés"
            className="relative bg-blue"
            style={{ height: reduceMotion ? '100vh' : '200vh' }}
        >
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                <motion.div
                    className="absolute inset-0"
                    style={{ scale: imgScale }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/crowd/euforia.webp"
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                    />
                </motion.div>
                <motion.div
                    style={{ opacity: scrim }}
                    className="pointer-events-none absolute inset-0 bg-blue"
                    aria-hidden="true"
                />

                <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
                    {/* Reduced motion pins it at its end state: gone. */}
                    <motion.p
                        style={{ opacity: introOpacity }}
                        className="absolute rounded-full border-2 border-ink bg-ink px-6 py-3 font-space-mono text-[18px] font-bold uppercase tracking-[0.24em] text-white md:text-[24px]"
                    >
                        {t('intro')}
                    </motion.p>

                    <motion.h2
                        style={{ opacity: slamOpacity, scale: slamScale }}
                        className="font-hero flex flex-col items-center text-[clamp(40px,13.4vw,72px)] leading-[0.9] text-white md:text-[length:min(14vw,120px)] lg:text-[length:min(10.5vw,150px)]"
                    >
                        {t('slamA')}
                        {/* The protagonist: the view's one tilt. */}
                        <span className="surface-white tilt-hero mt-3 rounded-[20px] border-2 border-ink bg-white px-4 pb-1 pt-2 text-blue shadow-ext-xl sm:px-5 md:mt-5 md:px-9">
                            {t('slamB')}
                        </span>
                    </motion.h2>

                    {/* Live, and from anywhere. Solid pills, not bare text:
                        these sit on confetti. */}
                    <motion.div
                        style={{ opacity: placesOpacity, y: placesY }}
                        className="mt-10 flex flex-col items-center gap-3 md:mt-14 md:flex-row md:gap-4"
                    >
                        {PLACES.map((key) => (
                            <span
                                key={key}
                                className="rounded-full border-2 border-ink bg-white px-5 py-3 font-space-mono text-[15px] font-bold uppercase tracking-[0.12em] text-ink shadow-ext-sm md:text-[17px]"
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
