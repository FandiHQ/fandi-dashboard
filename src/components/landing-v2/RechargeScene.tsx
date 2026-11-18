'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import PhoneFrame from './PhoneFrame';
import { reveal } from './scroll';

/**
 * #1 RECARGAS. The premise before any mechanic: Fandis are credits you buy
 * once, they live in your wallet, and they work the moment an event goes
 * live, in two ways (handed off to #2 and #3).
 *
 * Proof is the real Home screen (wallet block, live card), not a drawing.
 * Normal flow, not pinned: three short steps read faster than four
 * scroll-scrubbed beats did across four screens.
 */

export default function RechargeScene() {
    const t = useTranslations('landingV2.recargas');

    return (
        <section
            id="recargas"
            aria-label={t('title')}
            className="relative overflow-hidden bg-blue px-5 py-16 md:px-9 md:py-28"
        >
            <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_360px] lg:gap-14 xl:grid-cols-[1fr_400px] xl:gap-20">
                <div className="flex min-w-0 flex-col gap-8">
                    <motion.div {...reveal()} className="flex flex-col gap-4">
                        <span className="label-mono text-[13px] text-lilac">{t('kicker')}</span>
                        <h2 className="font-hero text-[40px] text-white md:text-[64px] lg:text-[72px]">
                            {t('title')}
                        </h2>
                    </motion.div>

                    <ol className="flex flex-col gap-4">
                        <motion.li {...reveal(0.05)} className="block-white flex flex-col gap-3 px-5 py-5 min-[360px]:flex-row min-[360px]:gap-4 md:px-6">
                            <Step n={1} />
                            <div className="flex min-w-0 flex-col items-start gap-3">
                                <p className="text-[18px] font-bold leading-snug text-ink md:text-[20px]">{t('b1')}</p>
                                <span className="tabular rounded-full border-2 border-ink bg-ink px-4 py-1.5 font-space-mono text-[14px] uppercase tracking-[0.12em] text-white">
                                    {t('rate')}
                                </span>
                            </div>
                        </motion.li>

                        <motion.li {...reveal(0.1)} className="block-white flex flex-col gap-3 px-5 py-5 min-[360px]:flex-row min-[360px]:gap-4 md:px-6">
                            <Step n={2} />
                            <div className="flex min-w-0 flex-col gap-2">
                                <p className="text-[18px] font-bold leading-snug text-ink md:text-[20px]">{t('b2')}</p>
                                <p className="text-[16px] leading-relaxed text-body-white md:text-[18px]">{t('b2sub')}</p>
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {(['w1', 'w2', 'w3'] as const).map((k) => (
                                        <span
                                            key={k}
                                            className="rounded-full border-2 border-ink px-3 py-1 font-space-mono text-[13px] uppercase tracking-[0.1em] text-ink"
                                        >
                                            {t(k)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.li>

                        <motion.li {...reveal(0.15)} className="block-white flex flex-col gap-3 px-5 py-5 min-[360px]:flex-row min-[360px]:gap-4 md:px-6">
                            <Step n={3} />
                            <div className="flex w-full min-w-0 flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <p className="text-[18px] font-bold leading-snug text-ink md:text-[20px]">{t('b3')}</p>
                                    <p className="text-[16px] leading-relaxed text-body-white md:text-[18px]">{t('b4')}</p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                    {(['oportunidades', 'subastas'] as const).map((k) => (
                                        <a
                                            key={k}
                                            href={k === 'oportunidades' ? '#categorias' : '#subastas'}
                                            className="press group flex flex-col gap-1 rounded-[12px] border-2 border-ink bg-white px-4 py-3 shadow-ext-sm transition-colors hover:bg-line-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                                        >
                                            <span className="font-display text-[20px] text-blue">
                                                {t(k)} <span aria-hidden="true">↓</span>
                                            </span>
                                            <span className="text-[16px] text-body-white">{t(`${k}Sub`)}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </motion.li>
                    </ol>
                </div>

                {/* The real Home: wallet block + a live card. */}
                <motion.div
                    {...reveal(0, 60, 0.2)}
                    className="mx-auto w-[min(80vw,320px)] md:w-[340px] lg:w-full"
                >
                    <PhoneFrame
                        src="/images/app/home-wallet.webp"
                        alt={t('phoneAlt')}
                        width={621}
                        height={1200}
                        sizes="(min-width: 1280px) 300px, (min-width: 768px) 270px, 64vw"
                    />
                </motion.div>
            </div>
        </section>
    );
}

function Step({ n }: { n: number }) {
    return (
        <span
            className="tabular grid size-9 shrink-0 place-items-center rounded-[10px] bg-blue font-space-mono text-[15px] font-bold text-white"
            aria-hidden="true"
        >
            {n}
        </span>
    );
}
