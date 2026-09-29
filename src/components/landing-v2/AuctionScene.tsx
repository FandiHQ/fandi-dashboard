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
            className="relative overflow-hidden bg-blue px-5 py-28 md:px-9 md:py-40"
        >
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
                    <span className="label-mono text-lilac md:text-[12px]">
                        {t('kicker')}
                    </span>
                    <h2 className="font-hero text-[42px] text-white md:text-[76px]">
                        {t('title')}
                    </h2>
                    <p className="max-w-md text-lg text-lilac md:text-xl">
                        {t('body')}
                    </p>

                    {/* The one-line contrast that prevents confusion */}
                    <div className="block-white flex flex-col divide-y-2 divide-line-white">
                        <p className="px-5 py-4 text-base text-body-white md:text-lg">
                            <strong className="font-display text-blue">{t('contrastA')}</strong>{' '}
                            {t('contrastARest')}
                        </p>
                        <p className="px-5 py-4 text-base text-body-white md:text-lg">
                            <strong className="font-display text-ink">{t('contrastB')}</strong>{' '}
                            {t('contrastBRest')}
                        </p>
                    </div>
                </motion.div>

                {/* Live auction card — the live moment: ink block, lime
                    extrusion. A new bid flashes the border lime (flat, no
                    glow). */}
                <motion.div
                    {...(reduceMotion
                        ? {}
                        : {
                              initial: { opacity: 0, scale: 0.94 },
                              whileInView: { opacity: 1, scale: 1 },
                              viewport: { once: true, amount: 0.4 },
                              transition: { duration: 0.6, delay: 0.15 },
                          })}
                    className={`surface-ink relative flex flex-col gap-5 rounded-[18px] border-2 bg-ink p-6 shadow-ext-live-xl transition-colors duration-300 md:p-8 ${
                        flash ? 'border-lime' : 'border-ink'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        {/* Live pill (§3): lime, ink border, pulsing ink dot */}
                        <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-lime px-3 py-1.5 text-ink">
                            <span className="live-dot" aria-hidden="true" />
                            <span className="label-mono font-bold">
                                {t('live')}
                            </span>
                        </span>
                        <span className="tabular font-space-mono text-2xl font-bold text-white">
                            {mm}:{ss}
                        </span>
                    </div>

                    <h3 className="font-display text-2xl text-white md:text-3xl">
                        {t('lotName')}
                    </h3>

                    <div className="flex flex-col gap-1">
                        <span className="label-mono text-muted-ink">
                            {t('currentBid')}
                        </span>
                        <motion.span
                            key={bid}
                            initial={reduceMotion ? false : { y: -14, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="font-hero tabular text-[58px] text-white md:text-[66px]"
                        >
                            {bid} F
                        </motion.span>
                    </div>

                    <div className="flex items-center justify-between rounded-[12px] bg-chip-ink px-4 py-3">
                        <span className="label-mono flex items-center gap-2 text-[11px] text-muted-ink">
                            <span className="live-dot text-lime" aria-hidden="true" />
                            {t('leading')}
                        </span>
                        <motion.span
                            key={leader}
                            initial={reduceMotion ? false : { opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-base font-bold text-white"
                        >
                            {NAMES[leader]}
                        </motion.span>
                    </div>

                    <p className="label-mono leading-relaxed text-muted-ink">
                        {t('cardNote')}
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
