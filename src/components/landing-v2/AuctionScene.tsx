'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';

/**
 * §4 — SUBASTAS. The deliberate opposite of §3.
 *
 * Categorías is a draw: you improve your position, luck picks the winner.
 * A subasta has no luck in it at all — the highest bid at the buzzer wins,
 * full stop. Stating that contrast plainly is what stops fans conflating
 * the two mechanics.
 *
 * The tension is simulated: while the card is on screen bids keep landing
 * and the clock keeps falling, so the section *feels* like the thing it
 * describes. Pauses when off-screen and under reduced-motion.
 */

const NAMES = ['Mariana', 'Andrés', 'Valentina', 'Sofía', 'Camilo', 'Daniela'];

export default function AuctionScene() {
    const t = useTranslations('landingV2.subastas');
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { amount: 0.4 });
    const reduceMotion = useReducedMotion();

    const [bid, setBid] = useState(46);
    const [leader, setLeader] = useState(0);
    const [seconds, setSeconds] = useState(74);
    const [flash, setFlash] = useState(false);

    useEffect(() => {
        if (!inView || reduceMotion) return;

        const clock = setInterval(() => {
            setSeconds((s) => (s <= 1 ? 74 : s - 1));
        }, 1000);

        const bids = setInterval(() => {
            setBid((b) => (b >= 120 ? 46 : b + Math.floor(Math.random() * 4) + 2));
            setLeader((l) => (l + 1) % NAMES.length);
            setFlash(true);
            setTimeout(() => setFlash(false), 550);
        }, 2600);

        return () => {
            clearInterval(clock);
            clearInterval(bids);
        };
    }, [inView, reduceMotion]);

    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');

    return (
        <section
            ref={ref}
            id="subastas"
            aria-label={t('title')}
            className="relative overflow-hidden bg-black px-6 py-28 md:py-40"
        >
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        'radial-gradient(55% 45% at 80% 30%, rgba(255,0,85,0.16), transparent 70%), radial-gradient(40% 40% at 10% 80%, rgba(45,0,247,0.14), transparent 70%)',
                }}
                aria-hidden="true"
            />

            <div className="relative mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-16">
                {/* Copy */}
                <motion.div
                    {...(reduceMotion
                        ? {}
                        : {
                              initial: { opacity: 0, y: 30 },
                              whileInView: { opacity: 1, y: 0 },
                              viewport: { once: true, amount: 0.4 },
                              transition: { duration: 0.6 },
                          })}
                    className="flex flex-col gap-6"
                >
                    <span className="font-space-mono text-[10px] uppercase tracking-[6px] text-[#FF0055]">
                        {t('kicker')}
                    </span>
                    <h2 className="font-sora text-[42px] font-extrabold uppercase leading-[0.9] tracking-tighter text-white md:text-[76px]">
                        {t('title')}
                    </h2>
                    <p className="max-w-md font-sora text-lg text-[#B8B8C2] md:text-xl">
                        {t('body')}
                    </p>

                    {/* The one-line contrast that prevents confusion */}
                    <div className="flex flex-col gap-3 border-l-2 border-[#FF0055] pl-5">
                        <p className="font-sora text-base text-white md:text-lg">
                            <strong className="text-[#FF0055]">{t('contrastA')}</strong>{' '}
                            {t('contrastARest')}
                        </p>
                        <p className="font-sora text-base text-white md:text-lg">
                            <strong className="text-[#CCFF00]">{t('contrastB')}</strong>{' '}
                            {t('contrastBRest')}
                        </p>
                    </div>
                </motion.div>

                {/* Live auction card */}
                <motion.div
                    {...(reduceMotion
                        ? {}
                        : {
                              initial: { opacity: 0, scale: 0.94 },
                              whileInView: { opacity: 1, scale: 1 },
                              viewport: { once: true, amount: 0.4 },
                              transition: { duration: 0.6, delay: 0.15 },
                          })}
                    className="hud-card hud-brackets hud-brackets-magenta scanlines relative flex flex-col gap-5 p-6 md:p-8"
                    style={{
                        boxShadow: flash
                            ? '0 0 60px rgba(255,0,85,0.45)'
                            : '0 0 0 rgba(0,0,0,0)',
                        transition: 'box-shadow 400ms ease',
                    }}
                >
                    <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 border border-[#FF0055]/40 bg-[#FF0055]/10 px-3 py-1.5">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF0055]" />
                            <span className="font-space-mono text-[10px] uppercase tracking-[2px] text-[#FF0055]">
                                {t('live')}
                            </span>
                        </span>
                        <span className="font-space-mono text-2xl font-bold tabular-nums text-white">
                            {mm}:{ss}
                        </span>
                    </div>

                    <h3 className="font-sora text-2xl font-extrabold uppercase leading-tight tracking-tight text-white md:text-3xl">
                        {t('lotName')}
                    </h3>

                    <div className="flex flex-col gap-1">
                        <span className="font-space-mono text-[10px] uppercase tracking-[3px] text-[#6B6B6B]">
                            {t('currentBid')}
                        </span>
                        <motion.span
                            key={bid}
                            initial={reduceMotion ? false : { y: -14, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="font-sora text-5xl font-extrabold tabular-nums text-[#CCFF00] md:text-6xl"
                            style={{ textShadow: '0 0 40px rgba(204,255,0,0.45)' }}
                        >
                            {bid} F
                        </motion.span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-4">
                        <span className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0]">
                            {t('leading')}
                        </span>
                        <motion.span
                            key={leader}
                            initial={reduceMotion ? false : { opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className="font-sora text-base font-bold text-white"
                        >
                            {NAMES[leader]}
                        </motion.span>
                    </div>

                    <p className="font-space-mono text-[10px] uppercase leading-relaxed tracking-[1.5px] text-[#5A5A64]">
                        {t('cardNote')}
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
