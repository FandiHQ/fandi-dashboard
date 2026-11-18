'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ScrollCue } from './ScrollAffordance';
import { useRange, useReducedMotionSafe, useSceneProgress } from './scroll';

/**
 * §1 LA FRUSTRACIÓN.
 *
 * The thesis: as a fan, no matter how much you spend, you never get past
 * the stage or the screen.
 *
 * The crowd photo pushes in toward the stage as you scroll and stops short
 * of it: you strain, you stay in the crowd. The first line is already on
 * screen while the scene scrolls in, so the pinned stretch only has to
 * carry two lines and the slam. Lines stay at full strength once in: a
 * dimmed line on a photo is a contrast failure, not a mood.
 */

const LINES = ['l1', 'l2', 'l3'] as const;

/** When each line arrives (scene progress). l1 is there from the start. */
const LINE_IN = [null, [0.06, 0.18], [0.24, 0.36]] as const;

export default function FrustrationScene() {
    const t = useTranslations('landingV2.frustracion');
    const ref = useRef<HTMLElement>(null);
    const progress = useSceneProgress(ref);
    // Reduced motion: one static screen, nothing to scrub through.
    const reduceMotion = useReducedMotionSafe();

    // The push-in that never arrives: decelerating, capped short.
    const scale = useRange(progress, [0, 0.8, 1], [1.04, 1.2, 1.22]);
    // A flat ink cover closes in (no vignette gradient).
    const cover = useRange(progress, [0, 0.6], [0.62, 0.8]);

    const slamOpacity = useRange(progress, [0.46, 0.58], [0, 1]);
    const slamY = useRange(progress, [0.46, 0.58], [36, 0]);

    return (
        <section
            ref={ref}
            aria-label="La frustración del fan"
            className="relative bg-ink"
            style={{ height: reduceMotion ? '100vh' : '190vh' }}
        >
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                <motion.div
                    className="absolute inset-0"
                    style={{ scale }}
                >
                    {/* Decorative: the copy carries the meaning. A static
                        filter (drained colour) is rastered once; animating
                        it repainted the whole photo every frame. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/crowd/frustracion.webp"
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover saturate-[0.35]"
                    />
                </motion.div>
                <motion.div
                    className="pointer-events-none absolute inset-0 bg-ink"
                    style={{ opacity: cover }}
                    aria-hidden="true"
                />

                <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-center px-6 md:px-10">
                    <div className="flex flex-col gap-2 md:gap-3">
                        {LINES.map((key, i) => (
                            <Line
                                key={key}
                                text={t(key)}
                                range={LINE_IN[i]}
                                progress={progress}
                            />
                        ))}
                    </div>

                    <motion.p
                        style={{ opacity: slamOpacity, y: slamY }}
                        className="font-hero mt-8 text-[clamp(34px,9vw,44px)] text-white md:mt-12 md:text-[72px] lg:text-[84px]"
                    >
                        {t('slamA')}{' '}
                        <span className="text-alert">{t('slamB')}</span>
                    </motion.p>
                </div>

                <ScrollCue targetRef={ref} />
            </div>
        </section>
    );
}

function Line({
    text,
    range,
    progress,
}: {
    text: string;
    range: readonly [number, number] | null;
    progress: ReturnType<typeof useSceneProgress>;
}) {
    const [a, b] = range ?? [0, 1];
    const opacity = useRange(progress, [a, b], [range ? 0 : 1, 1]);
    const y = useRange(progress, [a, b], [range ? 24 : 0, 0]);

    return (
        <motion.p
            style={range ? { opacity, y } : undefined}
            className="text-[24px] font-bold leading-tight text-white md:text-[40px]"
        >
            {text}
        </motion.p>
    );
}
