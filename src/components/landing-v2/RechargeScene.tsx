'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { ScrollCue } from './ScrollAffordance';

/**
 * §3 — #1 RECARGAS. The step the narrative was missing entirely.
 *
 * Before a fan can understand Oportunidades or Subastas they need the
 * premise: Fandis are credits you buy once, they live in your wallet, and
 * they unlock the moment an event goes live. Four scroll beats:
 *
 *   1. you buy Fandis            (what the currency is)
 *   2. they stay in your wallet  (not burned on one night — any event)
 *   3. the event opens           (published → EN VIVO is the unlock)
 *   4. two ways to play          (hands off to §4 and §5)
 *
 * Beat 3 is the one that matters commercially: it explains why an event
 * you already saw in the app was un-playable until its clock opened.
 */

const WALLET_CHIPS = ['w1', 'w2', 'w3'] as const;

export default function RechargeScene() {
    const t = useTranslations('landingV2.recargas');
    const ref = useRef<HTMLDivElement>(null);
    const reduceMotion = useReducedMotion();

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end end'],
    });

    // Four evenly spaced beats.
    const b1 = useTransform(scrollYProgress, [0.02, 0.1, 0.2, 0.26], [0, 1, 1, 0]);
    const b2 = useTransform(scrollYProgress, [0.26, 0.34, 0.44, 0.5], [0, 1, 1, 0]);
    const b3 = useTransform(scrollYProgress, [0.5, 0.58, 0.68, 0.74], [0, 1, 1, 0]);
    const b4 = useTransform(scrollYProgress, [0.74, 0.82, 0.96, 1], [0, 1, 1, 1]);

    // Coin reacts across beats 1–2.
    const coinScale = useTransform(scrollYProgress, [0.02, 0.14, 0.5], [0.6, 1, 0.82]);
    const coinRotate = useTransform(scrollYProgress, [0, 1], [0, 320]);
    // The lock releases in beat 3.
    const unlock = useTransform(scrollYProgress, [0.56, 0.66], [0, 1]);
    // Hoisted (hooks must not be called inside JSX).
    const lockedOpacity = useTransform(unlock, [0, 1], [1, 0.25]);
    const liveScale = useTransform(unlock, [0, 1], [0.9, 1]);

    const headOpacity = useTransform(scrollYProgress, [0, 0.04], [0, 1]);

    return (
        <section
            ref={ref}
            id="recargas"
            aria-label={t('title')}
            className="relative h-[420vh] bg-blue"
        >
            <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">

                {/* step heading */}
                <motion.div
                    style={{ opacity: headOpacity }}
                    className="absolute left-0 right-0 top-[96px] z-20 flex flex-col items-center gap-3 px-6 text-center md:top-[108px]"
                >
                    <span className="label-mono text-lilac md:text-[12px]">
                        {t('kicker')}
                    </span>
                    <h2 className="font-hero text-[34px] text-white md:text-[72px]">
                        {t('title')}
                    </h2>
                </motion.div>

                {/* ── Beat 1 — the credit ── */}
                <motion.div
                    style={{ opacity: b1 }}
                    className="absolute inset-x-0 z-10 flex flex-col items-center gap-7 px-6 text-center"
                >
                    <motion.div
                        style={
                            reduceMotion
                                ? undefined
                                : { scale: coinScale, rotateY: coinRotate }
                        }
                        className="grid h-32 w-32 place-items-center rounded-full border-2 border-ink bg-white shadow-ext-lg md:h-44 md:w-44"
                        aria-hidden="true"
                    >
                        <span className="font-hero text-6xl text-blue md:text-8xl">
                            F
                        </span>
                    </motion.div>
                    <p className="max-w-2xl text-xl font-bold text-white md:text-3xl">
                        {t('b1')}
                    </p>
                    <span className="tabular rounded-full border-2 border-ink bg-ink px-4 py-2 font-space-mono text-sm uppercase tracking-[0.14em] text-white md:text-base">
                        {t('rate')}
                    </span>
                </motion.div>

                {/* ── Beat 2 — it stays in your wallet ── */}
                <motion.div
                    style={{ opacity: b2 }}
                    className="absolute inset-x-0 z-10 flex flex-col items-center gap-7 px-6 text-center"
                >
                    <p className="max-w-3xl text-2xl font-bold text-white md:text-4xl">
                        {t('b2')}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {WALLET_CHIPS.map((k) => (
                            <span
                                key={k}
                                className="rounded-full border-2 border-ink bg-white px-5 py-2.5 font-space-mono text-[11px] uppercase tracking-[0.14em] text-ink shadow-ext-sm md:text-sm"
                            >
                                {t(k)}
                            </span>
                        ))}
                    </div>
                    <p className="max-w-xl text-base text-lilac md:text-lg">
                        {t('b2sub')}
                    </p>
                </motion.div>

                {/* ── Beat 3 — the event opens (the unlock) ── */}
                <motion.div
                    style={{ opacity: b3 }}
                    className="absolute inset-x-0 z-10 flex flex-col items-center gap-8 px-6 text-center"
                >
                    <div className="relative flex items-center gap-4 md:gap-8">
                        {/* before — quiet block, not live yet */}
                        <motion.div
                            style={{ opacity: lockedOpacity }}
                            className="block-quiet flex min-w-[130px] flex-col items-center gap-2 px-5 py-6 md:min-w-[190px]"
                        >
                            <Lock className="size-6 text-lilac" aria-hidden="true" />
                            <span className="label-mono text-lilac">
                                {t('before')}
                            </span>
                        </motion.div>

                        <motion.span
                            style={{ opacity: unlock }}
                            className="font-display text-3xl text-white"
                            aria-hidden="true"
                        >
                            →
                        </motion.span>

                        {/* after — the live moment: ink block, lime extrusion */}
                        <motion.div
                            style={{ opacity: unlock, scale: liveScale }}
                            className="block-ink flex min-w-[130px] flex-col items-center gap-2 px-5 py-6 shadow-ext-live md:min-w-[190px]"
                        >
                            <span className="flex items-center gap-2 text-lime">
                                <span className="live-dot" aria-hidden="true" />
                                <span className="label-mono text-[11px]">
                                    {t('live')}
                                </span>
                            </span>
                            <span className="font-display text-lg text-white">
                                {t('after')}
                            </span>
                        </motion.div>
                    </div>

                    <p className="max-w-3xl text-xl font-bold text-white md:text-3xl">
                        {t('b3')}
                    </p>
                </motion.div>

                {/* ── Beat 4 — two ways to play ── */}
                <motion.div
                    style={{ opacity: b4 }}
                    className="absolute inset-x-0 z-10 flex flex-col items-center gap-8 px-6 text-center"
                >
                    <p className="max-w-2xl text-xl font-bold text-white md:text-3xl">
                        {t('b4')}
                    </p>
                    <div className="flex flex-col items-stretch gap-4 md:flex-row md:gap-6">
                        {(['oportunidades', 'subastas'] as const).map((k) => (
                            <div
                                key={k}
                                className="surface-white min-w-[240px] rounded-2xl border-2 border-ink bg-white px-8 py-7 text-left shadow-ext-lg"
                            >
                                <span className="font-display text-2xl text-ink md:text-3xl">
                                    {t(k)}
                                </span>
                                <p className="label-mono mt-2 text-muted-white">
                                    {t(`${k}Sub`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <ScrollCue targetRef={ref} />
            </div>
        </section>
    );
}
