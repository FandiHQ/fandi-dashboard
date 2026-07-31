'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';

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
            className="relative h-[420vh] bg-black"
        >
            <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(55% 45% at 50% 10%, rgba(45,0,247,0.20), transparent 70%), #000',
                    }}
                    aria-hidden="true"
                />

                {/* step heading */}
                <motion.div
                    style={{ opacity: headOpacity }}
                    className="absolute left-0 right-0 top-[96px] z-20 flex flex-col items-center gap-3 px-6 text-center md:top-[108px]"
                >
                    <span className="font-space-mono text-[10px] uppercase tracking-[6px] text-[#CCFF00] md:text-xs md:tracking-[8px]">
                        {t('kicker')}
                    </span>
                    <h2 className="font-sora text-[34px] font-extrabold uppercase leading-[0.92] tracking-tighter text-white md:text-[72px]">
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
                        className="grid h-32 w-32 place-items-center rounded-full border-2 border-[#CCFF00] bg-[#CCFF00]/10 md:h-44 md:w-44"
                        aria-hidden="true"
                    >
                        <span
                            className="font-sora text-6xl font-extrabold text-[#CCFF00] md:text-8xl"
                            style={{ textShadow: '0 0 50px rgba(204,255,0,0.6)' }}
                        >
                            F
                        </span>
                    </motion.div>
                    <p className="max-w-2xl font-sora text-xl font-bold text-white md:text-3xl">
                        {t('b1')}
                    </p>
                    <span className="font-space-mono text-sm uppercase tracking-[4px] text-[#CCFF00] md:text-base">
                        {t('rate')}
                    </span>
                </motion.div>

                {/* ── Beat 2 — it stays in your wallet ── */}
                <motion.div
                    style={{ opacity: b2 }}
                    className="absolute inset-x-0 z-10 flex flex-col items-center gap-7 px-6 text-center"
                >
                    <p className="max-w-3xl font-sora text-2xl font-bold text-white md:text-4xl">
                        {t('b2')}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {WALLET_CHIPS.map((k, i) => (
                            <span
                                key={k}
                                className="border px-5 py-2.5 font-space-mono text-[11px] uppercase tracking-[3px] md:text-sm"
                                style={{
                                    borderColor: ['#CCFF00', '#00E5FF', '#FF0055'][i] + '55',
                                    color: ['#CCFF00', '#00E5FF', '#FF0055'][i],
                                }}
                            >
                                {t(k)}
                            </span>
                        ))}
                    </div>
                    <p className="max-w-xl font-sora text-base text-[#A0A0A8] md:text-lg">
                        {t('b2sub')}
                    </p>
                </motion.div>

                {/* ── Beat 3 — the event opens (the unlock) ── */}
                <motion.div
                    style={{ opacity: b3 }}
                    className="absolute inset-x-0 z-10 flex flex-col items-center gap-8 px-6 text-center"
                >
                    <div className="relative flex items-center gap-4 md:gap-8">
                        {/* before */}
                        <motion.div
                            style={{ opacity: lockedOpacity }}
                            className="flex min-w-[130px] flex-col items-center gap-2 border border-white/15 px-5 py-6 md:min-w-[190px]"
                        >
                            <span className="text-2xl" aria-hidden="true">
                                🔒
                            </span>
                            <span className="font-space-mono text-[10px] uppercase tracking-[2px] text-[#6B6B74]">
                                {t('before')}
                            </span>
                        </motion.div>

                        <motion.span
                            style={{ opacity: unlock }}
                            className="font-space-mono text-2xl text-[#CCFF00]"
                            aria-hidden="true"
                        >
                            →
                        </motion.span>

                        {/* after */}
                        <motion.div
                            style={{
                                opacity: unlock,
                                scale: liveScale,
                                borderColor: '#FF0055',
                                boxShadow: '0 0 40px rgba(255,0,85,0.35)',
                            }}
                            className="flex min-w-[130px] flex-col items-center gap-2 border-2 px-5 py-6 md:min-w-[190px]"
                        >
                            <span className="flex items-center gap-2">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF0055]" />
                                <span className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#FF0055]">
                                    {t('live')}
                                </span>
                            </span>
                            <span className="font-sora text-lg font-extrabold uppercase text-white">
                                {t('after')}
                            </span>
                        </motion.div>
                    </div>

                    <p className="max-w-3xl font-sora text-xl font-bold text-white md:text-3xl">
                        {t('b3')}
                    </p>
                </motion.div>

                {/* ── Beat 4 — two ways to play ── */}
                <motion.div
                    style={{ opacity: b4 }}
                    className="absolute inset-x-0 z-10 flex flex-col items-center gap-8 px-6 text-center"
                >
                    <p className="max-w-2xl font-sora text-xl font-bold text-white md:text-3xl">
                        {t('b4')}
                    </p>
                    <div className="flex flex-col items-stretch gap-4 md:flex-row md:gap-6">
                        {(['oportunidades', 'subastas'] as const).map((k, i) => (
                            <div
                                key={k}
                                className="hud-brackets min-w-[240px] border px-8 py-7"
                                style={{
                                    borderColor: (i === 0 ? '#CCFF00' : '#FF0055') + '55',
                                    background: `linear-gradient(160deg, ${
                                        i === 0 ? 'rgba(204,255,0,0.08)' : 'rgba(255,0,85,0.08)'
                                    }, transparent 70%)`,
                                }}
                            >
                                <span
                                    className="font-sora text-2xl font-extrabold uppercase tracking-tight md:text-3xl"
                                    style={{ color: i === 0 ? '#CCFF00' : '#FF0055' }}
                                >
                                    {t(k)}
                                </span>
                                <p className="mt-2 font-space-mono text-[10px] uppercase tracking-[2px] text-[#8A8A94]">
                                    {t(`${k}Sub`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
