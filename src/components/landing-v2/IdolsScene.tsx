'use client';

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
 * Then the proof: the dashboard, drawn as Azul Bloque blocks (ink rail,
 * white stat blocks, a ranking table) rather than a dark screenshot. B2B
 * is where the early revenue is, so this section ends in a concrete
 * "escríbenos", not a shrug.
 *
 * Never says "artistas" — the fan-facing vocabulary is Ídolos.
 */

const VERBS = ['v1', 'v2', 'v3'] as const;

const PROOF = ['p1', 'p2', 'p3'] as const;

/** Illustrative ranking rows for the dashboard mock (no money, ever). */
const MOCK_ROWS = [
    { name: 'Juan', badges: 27, events: 12 },
    { name: 'Laura', badges: 21, events: 9 },
    { name: 'Mateo', badges: 18, events: 8 },
] as const;

function DashboardMock({ label }: { label: string }) {
    const t = useTranslations('landingV2.idolos.mock');
    const stats = [
        { k: 'stat1', v: '1.284' },
        { k: 'stat2', v: t('city') },
        { k: 'stat3', v: '+146' },
    ] as const;

    return (
        <div
            role="img"
            aria-label={label}
            className="overflow-hidden rounded-[18px] border-2 border-ink bg-ink shadow-ext-xl"
        >
            <div className="flex" aria-hidden="true">
                {/* ink rail */}
                <div className="hidden w-14 shrink-0 flex-col items-center gap-3 py-5 sm:flex">
                    <span className="size-7 rounded-[8px] bg-blue" />
                    <span className="size-7 rounded-[8px] bg-chip-ink" />
                    <span className="size-7 rounded-[8px] bg-lime" />
                    <span className="size-7 rounded-[8px] bg-chip-ink" />
                </div>

                <div className="flex flex-1 flex-col gap-5 bg-blue p-4 md:p-7">
                    <div>
                        <p className="font-hero text-[26px] text-white md:text-[40px]">
                            {t('title')}
                        </p>
                        <p className="label-mono mt-1 text-lilac">{t('sub')}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 md:gap-4">
                        {stats.map((s) => (
                            <div key={s.k} className="block-white px-3 py-2.5 md:px-5 md:py-4">
                                <p className="label-mono text-[8px] text-muted-white md:text-[10px]">
                                    {t(s.k)}
                                </p>
                                <p className="font-display tabular mt-1 truncate text-[18px] text-ink md:text-[36px]">
                                    {s.v}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="block-white overflow-hidden">
                        <div className="flex items-center justify-between border-b-2 border-line-white px-4 py-3">
                            <span className="font-display text-[14px] text-ink md:text-[17px]">
                                {t('tableTitle')}
                            </span>
                            <span className="font-space-mono text-[10px] uppercase text-blue">
                                {t('seeAll')}
                            </span>
                        </div>
                        {MOCK_ROWS.map((r, i) => (
                            <div
                                key={r.name}
                                className="flex items-center gap-4 border-b border-line-white px-4 py-2.5 last:border-b-0"
                            >
                                <span className="tabular font-space-mono text-[11px] text-muted-white">
                                    #{i + 1}
                                </span>
                                <span className="flex-1 text-[13px] font-bold text-ink">
                                    {r.name}
                                </span>
                                <span className="label-mono hidden text-muted-white sm:inline">
                                    {t('row', { badges: r.badges, events: r.events })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function IdolsScene() {
    const t = useTranslations('landingV2.idolos');
    const reduceMotion = useReducedMotion();

    return (
        <section
            id="idolos"
            aria-label={t('title')}
            className="relative overflow-hidden bg-blue px-5 py-28 md:px-9 md:py-40"
        >
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
                        className="label-mono text-lilac md:text-[12px]"
                    >
                        {t('kicker')}
                    </motion.span>

                    {VERBS.map((key, i) => (
                        <motion.h2
                            key={key}
                            {...(reduceMotion
                                ? {}
                                : {
                                      initial: { opacity: 0, y: 44 },
                                      whileInView: { opacity: 1, y: 0 },
                                      viewport: { once: true, amount: 0.5 },
                                      transition: { duration: 0.55, delay: i * 0.16 },
                                  })}
                            className="font-hero text-[38px] text-white md:text-[92px]"
                        >
                            {t(key)}
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
                        className="mt-6 max-w-3xl text-xl font-bold leading-tight text-lilac md:text-3xl"
                    >
                        {t('pitchTail')}
                    </motion.p>
                </div>

                {/* Proof: the dashboard, as blocks */}
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
                    <DashboardMock label={t('dashAlt')} />
                    <p className="label-mono mt-4 text-center text-lilac">
                        {t('mock.note')}
                    </p>
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
                            className="block-white px-5 py-5"
                        >
                            <h3 className="font-display text-lg text-ink md:text-xl">
                                {t(`${key}Title`)}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-muted-white md:text-base">
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
                    <span className="label-mono text-center text-lilac">
                        {t('ctaSub')}
                    </span>
                </div>
            </div>
        </section>
    );
}
