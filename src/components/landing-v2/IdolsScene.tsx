'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Cta } from './Cta';

/**
 * §6/§7 — PARA ÍDOLOS.
 *
 * Built on the founder's own positioning line, delivered as three verbs
 * that land one at a time before resolving into the full sentence:
 *
 *   MONETIZAMOS · IDENTIFICAMOS · FIDELIZAMOS
 *   …tu fanbase a través de la euforia de tus eventos.
 *
 * Then the proof: the real dashboard. B2B is where the early revenue is,
 * so this section ends in a concrete "agenda una demo", not a shrug.
 *
 * Never says "artistas" — the fan-facing vocabulary is Ídolos.
 */

const VERBS = [
    { key: 'v1', accent: '#CCFF00' },
    { key: 'v2', accent: '#00E5FF' },
    { key: 'v3', accent: '#FF0055' },
] as const;

const PROOF = ['p1', 'p2', 'p3'] as const;

export default function IdolsScene() {
    const t = useTranslations('landingV2.idolos');
    const reduceMotion = useReducedMotion();

    return (
        <section
            id="idolos"
            aria-label={t('title')}
            className="relative overflow-hidden bg-black px-6 py-28 md:py-40"
        >
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        'radial-gradient(60% 50% at 50% 0%, rgba(45,0,247,0.22), transparent 70%)',
                }}
                aria-hidden="true"
            />

            <div className="relative mx-auto max-w-6xl">
                {/* The three verbs */}
                <div className="flex flex-col items-center gap-3 text-center">
                    <motion.span
                        {...(reduceMotion
                            ? {}
                            : {
                                  initial: { opacity: 0 },
                                  whileInView: { opacity: 1 },
                                  viewport: { once: true, amount: 0.5 },
                                  transition: { duration: 0.5 },
                              })}
                        className="font-space-mono text-[10px] uppercase tracking-[6px] text-[#CCFF00] md:text-xs md:tracking-[8px]"
                    >
                        {t('kicker')}
                    </motion.span>

                    {VERBS.map((v, i) => (
                        <motion.h2
                            key={v.key}
                            {...(reduceMotion
                                ? {}
                                : {
                                      initial: { opacity: 0, y: 44, filter: 'blur(10px)' },
                                      whileInView: {
                                          opacity: 1,
                                          y: 0,
                                          filter: 'blur(0px)',
                                      },
                                      viewport: { once: true, amount: 0.5 },
                                      transition: { duration: 0.55, delay: i * 0.16 },
                                  })}
                            className="font-sora text-[38px] font-extrabold uppercase leading-[0.92] tracking-tighter md:text-[92px]"
                            style={{
                                color: v.accent,
                                textShadow: `0 0 60px ${v.accent}55`,
                            }}
                        >
                            {t(v.key)}
                        </motion.h2>
                    ))}

                    <motion.p
                        {...(reduceMotion
                            ? {}
                            : {
                                  initial: { opacity: 0, y: 24 },
                                  whileInView: { opacity: 1, y: 0 },
                                  viewport: { once: true, amount: 0.5 },
                                  transition: { duration: 0.6, delay: 0.55 },
                              })}
                        className="mt-6 max-w-3xl font-sora text-xl font-bold leading-tight text-white md:text-3xl"
                    >
                        {t('pitchTail')}
                    </motion.p>
                </div>

                {/* Proof: the real dashboard */}
                <motion.div
                    {...(reduceMotion
                        ? {}
                        : {
                              initial: { opacity: 0, y: 50 },
                              whileInView: { opacity: 1, y: 0 },
                              viewport: { once: true, amount: 0.2 },
                              transition: { duration: 0.7 },
                          })}
                    className="relative mt-20 md:mt-28"
                >
                    <div className="hud-brackets relative overflow-hidden border border-white/10 bg-[#0B0B0E]">
                        <Image
                            src="/images/mockups/Frames_Web/loyalty.png"
                            alt={t('dashAlt')}
                            width={1600}
                            height={1000}
                            className="h-auto w-full"
                        />
                        <div
                            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_55%,rgba(0,0,0,0.85)_100%)]"
                            aria-hidden="true"
                        />
                    </div>
                </motion.div>

                {/* What the ídolo actually gets */}
                <div className="mt-14 grid gap-5 md:grid-cols-3">
                    {PROOF.map((key, i) => (
                        <motion.div
                            key={key}
                            {...(reduceMotion
                                ? {}
                                : {
                                      initial: { opacity: 0, y: 26 },
                                      whileInView: { opacity: 1, y: 0 },
                                      viewport: { once: true, amount: 0.4 },
                                      transition: { duration: 0.5, delay: i * 0.1 },
                                  })}
                            className="border-t-2 border-white/10 pt-5"
                            style={{ borderTopColor: VERBS[i].accent }}
                        >
                            <h3 className="font-sora text-lg font-extrabold uppercase tracking-tight text-white md:text-xl">
                                {t(`${key}Title`)}
                            </h3>
                            <p className="mt-2 font-sora text-sm leading-relaxed text-[#9A9AA6] md:text-base">
                                {t(`${key}Body`)}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* B2B CTA */}
                <div className="mt-14 flex flex-col items-center gap-4">
                    <Cta
                        href="mailto:hola@fandi.app?subject=Quiero%20llevar%20Fandi%20a%20mi%20evento"
                        variant="primary"
                    >
                        {t('cta')}
                    </Cta>
                    <span className="font-space-mono text-[10px] uppercase tracking-[3px] text-[#5A5A64]">
                        {t('ctaSub')}
                    </span>
                </div>
            </div>
        </section>
    );
}
