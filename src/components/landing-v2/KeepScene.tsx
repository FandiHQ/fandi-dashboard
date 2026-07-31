'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';

/**
 * §5 — LO QUE TE QUEDA.
 *
 * Answers the objection every draw-based product faces: "and if I don't
 * win?" You still leave with insignias and a permanent rank with that
 * ídolo. This is the retention argument — the reason a fan comes back to
 * the next show rather than treating one night as a lottery ticket.
 *
 * Never shows money: the fan ranking exposes position and tier, never
 * spend. That's a product-wide rule and it holds here.
 */

const TIERS = ['leyenda', 'elite', 'superfan', 'fanReal'] as const;
const TIER_ACCENTS = ['#CCFF00', '#00E5FF', '#2D00F7', '#FF0055'];

export default function KeepScene() {
    const t = useTranslations('landingV2.loQueQueda');
    const reduceMotion = useReducedMotion();

    return (
        <section
            id="insignias"
            aria-label={t('title')}
            className="relative overflow-hidden bg-black px-6 py-28 md:py-40"
        >
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        'radial-gradient(50% 40% at 20% 20%, rgba(204,255,0,0.10), transparent 70%), radial-gradient(45% 45% at 85% 75%, rgba(0,229,255,0.10), transparent 70%)',
                }}
                aria-hidden="true"
            />

            <div className="relative mx-auto max-w-6xl">
                <motion.div
                    {...(reduceMotion
                        ? {}
                        : {
                              initial: { opacity: 0, y: 30 },
                              whileInView: { opacity: 1, y: 0 },
                              viewport: { once: true, amount: 0.35 },
                              transition: { duration: 0.6 },
                          })}
                    className="flex flex-col items-center gap-4 text-center"
                >
                    <span className="font-space-mono text-[10px] uppercase tracking-[6px] text-[#CCFF00]">
                        {t('kicker')}
                    </span>
                    <h2 className="max-w-4xl font-sora text-[40px] font-extrabold uppercase leading-[0.9] tracking-tighter text-white md:text-[76px]">
                        {t('title')}
                    </h2>
                    <p className="max-w-2xl font-sora text-lg text-[#B8B8C2] md:text-xl">
                        {t('body')}
                    </p>
                </motion.div>

                <div className="mt-16 grid items-center gap-12 md:grid-cols-2 md:gap-16">
                    {/* Ranking phone */}
                    <motion.div
                        {...(reduceMotion
                            ? {}
                            : {
                                  initial: { opacity: 0, y: 40 },
                                  whileInView: { opacity: 1, y: 0 },
                                  viewport: { once: true, amount: 0.3 },
                                  transition: { duration: 0.7 },
                              })}
                        className="flex justify-center"
                    >
                        <Image
                            src="/images/mockups/Frames_Android/artist_profile_ranking.png"
                            alt={t('rankAlt')}
                            width={420}
                            height={860}
                            className="h-auto w-[70%] max-w-[330px] drop-shadow-[0_20px_70px_rgba(45,0,247,0.45)] md:w-full"
                        />
                    </motion.div>

                    {/* Tiers + badges */}
                    <div className="flex flex-col gap-10">
                        <div className="flex flex-col gap-4">
                            <span className="font-space-mono text-[10px] uppercase tracking-[3px] text-[#6B6B6B]">
                                {t('tiersLabel')}
                            </span>
                            <div className="flex flex-col gap-2.5">
                                {TIERS.map((tier, i) => (
                                    <motion.div
                                        key={tier}
                                        {...(reduceMotion
                                            ? {}
                                            : {
                                                  initial: { opacity: 0, x: -24 },
                                                  whileInView: { opacity: 1, x: 0 },
                                                  viewport: { once: true, amount: 0.5 },
                                                  transition: {
                                                      duration: 0.45,
                                                      delay: i * 0.09,
                                                  },
                                              })}
                                        className="flex items-center gap-3 border border-white/10 bg-white/[0.02] px-4 py-3"
                                    >
                                        <span
                                            className="h-2.5 w-2.5 rotate-45"
                                            style={{
                                                backgroundColor: TIER_ACCENTS[i],
                                                boxShadow: `0 0 14px ${TIER_ACCENTS[i]}`,
                                            }}
                                            aria-hidden="true"
                                        />
                                        <span
                                            className="font-sora text-lg font-extrabold uppercase tracking-tight md:text-xl"
                                            style={{ color: TIER_ACCENTS[i] }}
                                        >
                                            {t(`tier.${tier}`)}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <motion.div
                            {...(reduceMotion
                                ? {}
                                : {
                                      initial: { opacity: 0, y: 24 },
                                      whileInView: { opacity: 1, y: 0 },
                                      viewport: { once: true, amount: 0.5 },
                                      transition: { duration: 0.5, delay: 0.2 },
                                  })}
                            className="border-l-2 border-[#CCFF00] pl-5"
                        >
                            <p className="font-sora text-lg font-bold text-white md:text-xl">
                                {t('noMoney')}
                            </p>
                            <p className="mt-2 font-sora text-sm text-[#9A9AA6] md:text-base">
                                {t('noMoneySub')}
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
