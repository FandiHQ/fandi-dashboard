'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';

/**
 * §2 — EL GIRO.
 *
 * Hard cut out of the desaturated frustration into full colour: the
 * barrier breaks. This is the brand-maximalist beat — the palette floods
 * back, the type is enormous, the energy is the point.
 *
 * Carries the constraint that matters most commercially: Fandi is LIVE
 * and works from ANYWHERE. Not a venue perk. You do not need to be in
 * the stadium — the three "desde…" lines exist to kill that assumption
 * before it forms.
 */

const PLACES = ['p1', 'p2', 'p3'] as const;
const ACCENTS = ['#CCFF00', '#00E5FF', '#FF0055'];

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
    // Darkens the plate under the text so type stays legible over confetti.
    const scrim = useTransform(scrollYProgress, [0.22, 0.42], [0.15, 0.62]);

    return (
        <section
            ref={ref}
            aria-label="Fandi abre, en vivo y desde donde estés"
            className="relative h-[300vh] bg-black"
        >
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                {/* Euphoria plate (gradient fallback beneath) */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(65% 55% at 50% 55%, #17307a 0%, #0a0a16 55%, #000 100%)',
                    }}
                    aria-hidden="true"
                />
                <motion.div
                    className="absolute inset-0"
                    style={reduceMotion ? undefined : { scale: imgScale, filter }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/crowd/euforia.jpg"
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover opacity-80"
                    />
                </motion.div>
                <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(0,0,0,0.7)_75%,#000_100%)]"
                    aria-hidden="true"
                />
                {/* Scrim that deepens as the copy arrives — confetti is busy. */}
                <motion.div
                    style={{ opacity: reduceMotion ? 0.5 : scrim }}
                    className="pointer-events-none absolute inset-0 bg-black"
                    aria-hidden="true"
                />

                <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
                    {/* Beat 1 — the pivot */}
                    <motion.p
                        style={reduceMotion ? undefined : { opacity: introOpacity, y: introY }}
                        className="absolute font-space-mono text-lg uppercase tracking-[8px] text-white/85 md:text-2xl md:tracking-[14px]"
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
                        className="animate-glitch font-sora text-[52px] font-extrabold uppercase leading-[0.88] tracking-tighter text-white [text-shadow:0_4px_40px_rgba(0,0,0,0.8)] md:text-[130px]"
                    >
                        {t('slamA')}
                        <br />
                        <span
                            className="text-[#CCFF00]"
                            style={{ textShadow: '0 0 70px rgba(204,255,0,0.5)' }}
                        >
                            {t('slamB')}
                        </span>
                    </motion.h2>

                    {/* Beat 3 — live, and from anywhere. The commercial point. */}
                    {/* Solid pills, not bare text — these sat on confetti and
                        were unreadable as thin glowing mono. */}
                    <motion.div
                        style={reduceMotion ? undefined : { opacity: placesOpacity }}
                        className="mt-10 flex flex-col items-center gap-3 md:mt-14 md:flex-row md:gap-4"
                    >
                        {PLACES.map((key, i) => (
                            <span
                                key={key}
                                className="border-2 bg-black/80 px-5 py-3 font-space-mono text-sm font-bold uppercase tracking-[3px] backdrop-blur-sm md:text-base"
                                style={{
                                    color: ACCENTS[i],
                                    borderColor: ACCENTS[i],
                                    boxShadow: `0 0 30px ${ACCENTS[i]}45`,
                                }}
                            >
                                {t(key)}
                            </span>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
