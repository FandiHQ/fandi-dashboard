'use client';

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
 * spend. That's a product-wide rule and it holds here — the phone mock
 * below is drawn as Azul Bloque blocks (not a screenshot) and carries no
 * amounts and no percentages.
 */

const TIERS = ['leyenda', 'elite', 'superfan', 'fanReal'] as const;

/** Illustrative ranking rows; the middle one is "you". */
const RANK_ROWS = [
    { pos: 11, key: 'row1' },
    { pos: 12, key: 'you' },
    { pos: 13, key: 'row3' },
] as const;

/** The app as blocks: blue screen, white rank block, ink badge + list sheets. */
function RankingPhone({ label }: { label: string }) {
    const t = useTranslations('landingV2.loQueQueda');
    return (
        <div
            role="img"
            aria-label={label}
            className="w-[290px] rounded-[40px] border-2 border-ink bg-ink p-2 shadow-ext-xl md:w-[320px]"
        >
            <div
                className="flex flex-col gap-4 overflow-hidden rounded-[32px] bg-blue px-4 pb-5 pt-5"
                aria-hidden="true"
            >
                <div className="flex items-center justify-between">
                    <span className="label-mono text-lilac">{t('mock.header')}</span>
                    <span className="label-mono text-lilac">{t('mock.idol')}</span>
                </div>

                {/* The protagonist of the mock: the one tilt */}
                <div className="surface-white tilt-hero flex flex-col gap-1 rounded-2xl border-2 border-ink bg-white px-4 py-3 shadow-ext-lg">
                    <span className="label-mono text-muted-white">{t('mock.rankLabel')}</span>
                    <div className="flex items-baseline justify-between gap-3">
                        <span className="font-hero tabular text-[58px] leading-[0.9] text-blue">#12</span>
                        <span className="label-mono rounded-full border-2 border-ink px-2.5 py-1 text-ink">
                            {t('tier.superfan')}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-2.5 rounded-2xl bg-ink p-3">
                    <span className="label-mono text-muted-ink">{t('mock.badges')}</span>
                    <div className="grid grid-cols-3 gap-2">
                        {(['badge1', 'badge2'] as const).map((b) => (
                            <div
                                key={b}
                                className="flex aspect-[3/4] items-end rounded-[10px] border-2 border-ink bg-white p-1.5 shadow-ext-cta"
                            >
                                <span className="font-space-mono text-[8px] font-bold uppercase leading-tight tracking-[0.08em] text-ink">
                                    {t(`mock.${b}`)}
                                </span>
                            </div>
                        ))}
                        <div className="flex aspect-[3/4] items-center justify-center rounded-[10px] border-2 border-dashed border-dash-ink p-1.5 text-center">
                            <span className="font-space-mono text-[7px] uppercase leading-tight tracking-[0.08em] text-muted-ink">
                                {t('mock.locked')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 rounded-2xl bg-ink p-2.5">
                    {RANK_ROWS.map((r) => (
                        <div
                            key={r.key}
                            className={`flex items-center gap-3 rounded-[10px] px-3 py-2 ${
                                r.key === 'you'
                                    ? 'border-2 border-white bg-chip-ink'
                                    : 'border-2 border-transparent'
                            }`}
                        >
                            <span className="tabular font-space-mono text-[11px] text-muted-ink">
                                #{r.pos}
                            </span>
                            <span className="font-display flex-1 text-[14px] text-white">
                                {t(`mock.${r.key}`)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function KeepScene() {
    const t = useTranslations('landingV2.loQueQueda');
    const reduceMotion = useReducedMotion();

    return (
        <section
            id="insignias"
            aria-label={t('title')}
            className="relative overflow-hidden bg-blue px-5 py-28 md:px-9 md:py-40"
        >
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
                    <span className="label-mono text-lilac md:text-[12px]">
                        {t('kicker')}
                    </span>
                    <h2 className="font-hero max-w-4xl text-[40px] text-white md:text-[76px]">
                        {t('title')}
                    </h2>
                    <p className="max-w-2xl text-lg text-lilac md:text-xl">
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
                        <RankingPhone label={t('rankAlt')} />
                    </motion.div>

                    {/* Tiers + badges */}
                    <div className="flex flex-col gap-10">
                        <div className="flex flex-col gap-4">
                            <span className="label-mono text-lilac">
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
                                        className="flex items-center gap-4 rounded-[12px] border-2 border-ink bg-ink px-4 py-3"
                                    >
                                        <span className="tabular font-space-mono text-[11px] text-muted-ink">
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <span className="font-display text-lg text-white md:text-xl">
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
                            className="block-white px-5 py-4"
                        >
                            <p className="font-display text-lg text-ink md:text-xl">
                                {t('noMoney')}
                            </p>
                            <p className="mt-2 text-sm text-muted-white md:text-base">
                                {t('noMoneySub')}
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
