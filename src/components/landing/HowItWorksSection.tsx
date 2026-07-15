'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';

/**
 * "Cómo funciona" — the landing previously never explained the actual
 * mechanic (Fandies → participate live → win & climb). Three HUD
 * cards in the product's tactical language close that gap right after
 * the EN VIVO reveal, before the feature deep-dive.
 */
const STEPS = [
    { key: 'step1', accent: '#CCFF00' },
    { key: 'step2', accent: '#FF3366' },
    { key: 'step3', accent: '#2D00F7' },
] as const;

/** Keep in sync with SECTIONS.howItWorks.vh in page.tsx. */
export const HOW_IT_WORKS_VH = 120;

export default function HowItWorksSection() {
    const t = useTranslations('landing.howItWorks');
    const reduceMotion = useReducedMotion();

    return (
        <div
            style={{ height: `${HOW_IT_WORKS_VH}vh` }}
            className="relative flex items-center justify-center overflow-hidden bg-black"
        >
            <div className="w-full max-w-6xl mx-auto px-6 md:px-10 flex flex-col gap-10 md:gap-14">

                <motion.div
                    {...(reduceMotion
                        ? {}
                        : {
                              initial: { opacity: 0, y: 30 },
                              whileInView: { opacity: 1, y: 0 },
                              viewport: { once: true, amount: 0.4 },
                              transition: { duration: 0.6 },
                          })}
                    className="flex flex-col items-center text-center gap-3"
                >
                    <span className="font-space-mono text-[11px] md:text-xs uppercase tracking-[4px] text-[#CCFF00]">
                        {t('kicker')}
                    </span>
                    <h2 className="animate-glitch font-sora font-extrabold text-white text-[32px] md:text-6xl leading-tight tracking-tighter">
                        {t('title')}
                    </h2>
                </motion.div>

                <div className="grid gap-4 md:gap-6 md:grid-cols-3">
                    {STEPS.map((step, i) => (
                        <motion.div
                            key={step.key}
                            {...(reduceMotion
                                ? {}
                                : {
                                      initial: { opacity: 0, y: 40 },
                                      whileInView: { opacity: 1, y: 0 },
                                      viewport: { once: true, amount: 0.4 },
                                      transition: { duration: 0.6, delay: i * 0.12 },
                                  })}
                            className="hud-card hud-brackets relative flex flex-col gap-4 p-6 md:p-8 scanlines"
                        >
                            <span
                                className="font-space-mono text-sm font-bold tracking-[2px]"
                                style={{ color: step.accent, textShadow: `0 0 15px ${step.accent}60` }}
                            >
                                {`0${i + 1}`}
                            </span>
                            <h3 className="font-sora font-extrabold text-white text-xl md:text-2xl uppercase tracking-tight">
                                {t(`${step.key}Title`)}
                            </h3>
                            <p className="font-sora text-sm md:text-base text-[#A0A0A0] leading-relaxed">
                                {t(`${step.key}Desc`)}
                            </p>
                            <div
                                className="mt-auto h-[2px] w-12"
                                style={{ backgroundColor: step.accent, boxShadow: `0 0 12px ${step.accent}` }}
                                aria-hidden="true"
                            />
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
