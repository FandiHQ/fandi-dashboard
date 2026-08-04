'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ScrollCue } from './ScrollAffordance';

/**
 * §1 — LA FRUSTRACIÓN.
 *
 * The thesis: as a fan, no matter how much money you spend, you never
 * get past the stage or the screen. That barrier is the problem Fandi
 * exists to break.
 *
 * The motion IS the argument: the crowd photo pushes in toward the stage
 * as you scroll, and deliberately never arrives — it eases out and stops
 * short. You scroll, you strain, you stay in the crowd. The copy lands
 * on top of that failed approach.
 *
 * Local scroll (target ref) rather than a global vh map, so this scene's
 * timing can never be desynced by sections added above or below it.
 */

/** Beats: each line owns a slice of the scroll. */
const LINES = ['l1', 'l2', 'l3'] as const;

export default function FrustrationScene() {
    const t = useTranslations('landingV2.frustracion');
    const ref = useRef<HTMLDivElement>(null);
    const reduceMotion = useReducedMotion();

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end end'],
    });

    // The push-in that never arrives — decelerating, and capped well
    // short of the stage.
    const scale = useTransform(scrollYProgress, [0, 0.75, 1], [1.06, 1.28, 1.3]);
    const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '-6%']);
    // Colour drains out of the crowd as the frustration builds.
    const saturate = useTransform(scrollYProgress, [0, 0.6, 1], [0.9, 0.5, 0.25]);
    const filter = useTransform(saturate, (s) => `saturate(${s}) contrast(1.1)`);
    // Vignette closes in.
    const vignette = useTransform(scrollYProgress, [0, 1], [0.55, 0.92]);

    // The slam line arrives last and stays.
    const slamOpacity = useTransform(scrollYProgress, [0.7, 0.82], [0, 1]);
    const slamY = useTransform(scrollYProgress, [0.7, 0.82], [40, 0]);
    const slamBlur = useTransform(scrollYProgress, [0.7, 0.82], [12, 0]);
    const slamFilter = useTransform(slamBlur, (b) => `blur(${b}px)`);

    return (
        <section
            ref={ref}
            aria-label="La frustración del fan"
            className="relative h-[320vh] bg-black"
        >
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                {/* Crowd plate. Gradient sits underneath so the scene still
                    reads if the photo hasn't been added yet. */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(70% 50% at 50% 12%, #1a2740 0%, #070709 60%, #000 100%)',
                    }}
                    aria-hidden="true"
                />
                <motion.div
                    className="absolute inset-0"
                    style={
                        reduceMotion
                            ? undefined
                            : { scale, y: imageY, filter }
                    }
                >
                    {/* Decorative: the copy carries the meaning.
                        lazy + async decode: this scene sits several
                        screens below the fold, and eager-loading it put
                        the photo on the critical path of the FIRST paint
                        for something nobody sees until they scroll.
                        WebP q72 — invisible at 70% opacity behind the
                        vignette, and 45% smaller than the JPEG. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/crowd/frustracion.webp"
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover opacity-70"
                    />
                </motion.div>

                {/* Closing vignette */}
                <motion.div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        opacity: reduceMotion ? 0.7 : vignette,
                        background:
                            'radial-gradient(ellipse at 50% 30%, transparent 20%, rgba(0,0,0,0.75) 65%, #000 100%)',
                    }}
                    aria-hidden="true"
                />

                {/* ── Copy ── */}
                <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
                    {/* Staged lines */}
                    <div className="flex flex-col gap-1 md:gap-2">
                        {LINES.map((key, i) => (
                            <Line
                                key={key}
                                text={t(key)}
                                index={i}
                                total={LINES.length}
                                progress={scrollYProgress}
                                reduceMotion={!!reduceMotion}
                            />
                        ))}
                    </div>

                    {/* The slam */}
                    <motion.p
                        style={
                            reduceMotion
                                ? undefined
                                : { opacity: slamOpacity, y: slamY, filter: slamFilter }
                        }
                        className="mt-8 max-w-5xl font-sora text-[34px] font-extrabold uppercase leading-[0.95] tracking-tighter text-white md:mt-12 md:text-[86px]"
                    >
                        {t('slamA')}{' '}
                        <span
                            className="text-[#FF0055]"
                            style={{ textShadow: '0 0 48px rgba(255,0,85,0.55)' }}
                        >
                            {t('slamB')}
                        </span>
                    </motion.p>
                </div>

                <ScrollCue targetRef={ref} />
            </div>
        </section>
    );
}

function Line({
    text,
    index,
    total,
    progress,
    reduceMotion,
}: {
    text: string;
    index: number;
    total: number;
    progress: ReturnType<typeof useScroll>['scrollYProgress'];
    reduceMotion: boolean;
}) {
    // Each line fades in over its own slice of the first 65% of scroll,
    // then dims (but stays) so the stack reads as an accumulating list.
    const span = 0.65 / total;
    const start = index * span;
    const inAt = start + span * 0.25;
    const dimAt = start + span * 1.4;

    const opacity = useTransform(progress, [start, inAt, dimAt], [0, 1, 0.4]);
    const y = useTransform(progress, [start, inAt], [24, 0]);

    return (
        <motion.p
            style={reduceMotion ? undefined : { opacity, y }}
            className="font-space-mono text-base uppercase tracking-[6px] text-[#C8C8D0] md:text-xl md:tracking-[10px]"
        >
            {text}
        </motion.p>
    );
}
