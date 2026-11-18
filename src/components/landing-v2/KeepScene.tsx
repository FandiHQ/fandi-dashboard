'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { reveal } from './scroll';

/**
 * §5 LO QUE TE QUEDA.
 *
 * Answers the objection every draw-based product faces: "and if I don't
 * win?" You still leave with insignias and a permanent rank with that
 * ídolo. The retention argument: the reason a fan comes back to the next
 * show instead of treating one night as a lottery ticket.
 *
 * Never shows money: the fan ranking exposes position and tier, never
 * spend. The panel below is the app's ranking drawn as Azul Bloque blocks
 * at a size you can read (it used to be a phone mock with 7 to 11px
 * text), with no amounts and no percentages.
 */

const TIERS = ['leyenda', 'elite', 'superfan', 'fanReal'] as const;

/** Illustrative ranking rows; the middle one is "you". */
const RANK_ROWS = [
    { pos: 11, key: 'row1' },
    { pos: 12, key: 'you' },
    { pos: 13, key: 'row3' },
] as const;

function RankingPanel({ label }: { label: string }) {
    const t = useTranslations('landingV2.loQueQueda');
    return (
        <div
            role="img"
            aria-label={label}
            className="surface-ink w-full max-w-[440px] rounded-[22px] border-2 border-ink bg-ink p-4 shadow-ext-xl md:p-5"
        >
            <div className="flex flex-col gap-4" aria-hidden="true">
                <div className="flex items-center justify-between px-1">
                    <span className="label-mono text-[12px] text-muted-ink">{t('mock.header')}</span>
                    <span className="label-mono text-[12px] text-muted-ink">{t('mock.idol')}</span>
                </div>

                {/* The protagonist of the panel: the view's one tilt. */}
                <div className="surface-white tilt-hero flex flex-col gap-1 rounded-2xl border-2 border-ink bg-white px-5 py-4 shadow-ext-cta">
                    <span className="label-mono text-[12px] text-muted-white">{t('mock.rankLabel')}</span>
                    <div className="flex items-baseline justify-between gap-3">
                        <span className="font-hero tabular text-[60px] leading-[0.9] text-blue">#12</span>
                        <span className="label-mono rounded-full border-2 border-ink px-3 py-1.5 text-[12px] font-bold text-ink">
                            {t('tier.superfan')}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl bg-chip-ink p-3.5">
                    <span className="label-mono text-[12px] text-muted-ink">{t('mock.badges')}</span>
                    <div className="grid grid-cols-3 gap-2.5">
                        {(['badge1', 'badge2'] as const).map((b) => (
                            <div
                                key={b}
                                className="flex aspect-[3/4] items-end rounded-[10px] border-2 border-ink bg-white p-2 shadow-ext-cta"
                            >
                                <span className="font-space-mono text-[12px] font-bold uppercase leading-tight text-ink">
                                    {t(`mock.${b}`)}
                                </span>
                            </div>
                        ))}
                        <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-dash-ink p-2 text-center">
                            <Lock className="size-5 text-muted-ink" />
                            {/* The word does not fit a phone-width tile; the lock
                                says it there. */}
                            <span className="hidden font-space-mono text-[12px] uppercase leading-tight text-muted-ink sm:block">
                                {t('mock.locked')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    {RANK_ROWS.map((r) => (
                        <div
                            key={r.key}
                            className={`flex items-center gap-4 rounded-[12px] border-2 px-4 py-2.5 ${
                                r.key === 'you'
                                    ? 'border-white bg-chip-ink'
                                    : 'border-transparent'
                            }`}
                        >
                            <span className="tabular font-space-mono text-[14px] text-muted-ink">#{r.pos}</span>
                            <span className="font-display flex-1 text-[17px] text-white">{t(`mock.${r.key}`)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function KeepScene() {
    const t = useTranslations('landingV2.loQueQueda');
    const rise = reveal;

    return (
        <section
            id="insignias"
            aria-label={t('title')}
            className="relative overflow-hidden bg-blue px-5 py-16 md:px-9 md:py-28"
        >
            <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div className="flex min-w-0 flex-col gap-8">
                    <motion.div {...rise()} className="flex flex-col gap-4">
                        <span className="label-mono text-[13px] text-lilac">{t('kicker')}</span>
                        <h2 className="font-hero text-[40px] text-white md:text-[56px] lg:text-[64px]">
                            {t('title')}
                        </h2>
                        <p className="max-w-xl text-[18px] leading-relaxed text-white md:text-[20px]">
                            {t('body')}
                        </p>
                    </motion.div>

                    <motion.div {...rise(0.1)} className="flex flex-col gap-3">
                        <span className="label-mono text-[13px] text-lilac">{t('tiersLabel')}</span>
                        <ol className="grid grid-cols-2 gap-2.5">
                            {TIERS.map((tier, i) => (
                                <li
                                    key={tier}
                                    className="flex min-w-0 items-center gap-3 rounded-[12px] border-2 border-ink bg-ink px-3 py-3 sm:px-4"
                                >
                                    <span className="tabular hidden font-space-mono text-[13px] text-muted-ink min-[360px]:inline">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <span className="font-display text-[16px] text-white sm:text-[17px] md:text-[19px]">
                                        {t(`tier.${tier}`)}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </motion.div>

                    <motion.div {...rise(0.15)} className="block-white px-5 py-5">
                        <p className="font-display text-[19px] text-ink md:text-[21px]">{t('noMoney')}</p>
                        <p className="mt-2 text-[16px] leading-relaxed text-body-white md:text-[18px]">
                            {t('noMoneySub')}
                        </p>
                    </motion.div>
                </div>

                <motion.div {...rise(0.1, 44)} className="flex justify-center">
                    <RankingPanel label={t('rankAlt')} />
                </motion.div>
            </div>
        </section>
    );
}
