'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Cta, DASHBOARD_URL, IDOL_MAILTO } from './Cta';
import { reveal, useReducedMotionSafe } from './scroll';

/**
 * §6 PARA ÍDOLOS: the offer, in one screen-and-a-half.
 *
 *   MONETIZAMOS · IDENTIFICAMOS · FIDELIZAMOS
 *   Tu fanbase, a través de la euforia de tus eventos.
 *
 * Then the proof (the dashboard's Top fans, drawn as Azul Bloque blocks
 * at a readable size), what the ídolo gets, and one ink block with both
 * doors: "Escríbenos" for a first event, "Ingresar" for teams already in.
 *
 * The performer used to be a 240-frame scroll sequence (2.8 screens of
 * scroll for one pill label, 6.6MB). It is now a 16 s muted loop that only
 * downloads when the section is near, and a still under reduced motion.
 * Never says "artistas" here: the fan-facing word is Ídolos.
 */

const VERBS = ['v1', 'v2', 'v3'] as const;
const PROOF = ['p1', 'p2', 'p3'] as const;

/** Illustrative ranking rows for the dashboard mock (no money, ever). */
const MOCK_ROWS = [
    { name: 'Juan', badges: 27, events: 12 },
    { name: 'Laura', badges: 21, events: 9 },
    { name: 'Mateo', badges: 18, events: 8 },
] as const;

const POSTER = '/images/artist/stage-poster.webp';
const LOOP = '/images/artist/stage-loop.mp4';

function StageVideo() {
    const ref = useRef<HTMLVideoElement>(null);
    const reduceMotion = useReducedMotionSafe();

    useEffect(() => {
        const video = ref.current;
        if (!video || reduceMotion) return;
        const io = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    // Poster and loop both wait until the stage is near:
                    // a poster attribute downloads at page load otherwise.
                    if (!video.src) {
                        video.poster = POSTER;
                        video.src = LOOP;
                    }
                    video.play().catch(() => {
                        /* autoplay refused (data saver): the poster stays */
                    });
                } else {
                    video.pause();
                }
            },
            { rootMargin: '200px 0px' }
        );
        io.observe(video);
        return () => io.disconnect();
    }, [reduceMotion]);

    return (
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[18px] border-2 border-ink bg-ink shadow-ext-xl lg:aspect-[4/5]">
            {reduceMotion ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={POSTER} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            ) : (
                <video
                    ref={ref}
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-hidden="true"
                    className="h-full w-full object-cover"
                />
            )}
        </div>
    );
}

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

                <div className="flex flex-1 flex-col gap-4 bg-blue p-4 md:gap-5 md:p-6">
                    <div>
                        <p className="font-hero text-[30px] text-white md:text-[38px]">{t('title')}</p>
                        <p className="mt-1 text-[16px] text-lilac">{t('sub')}</p>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-1 xl:grid-cols-3">
                        {stats.map((s) => (
                            <div
                                key={s.k}
                                // A column per stat only where the mock is wide enough
                                // for MEDELLÍN; rows elsewhere.
                                className="block-white flex items-center justify-between gap-3 px-4 py-3 sm:flex-col sm:items-start sm:justify-start sm:gap-1 lg:flex-row lg:items-center lg:justify-between lg:gap-3 xl:flex-col xl:items-start xl:justify-start xl:gap-1"
                            >
                                <p className="label-mono text-[12px] text-muted-white">{t(s.k)}</p>
                                <p className="font-display tabular text-[22px] text-ink">{s.v}</p>
                            </div>
                        ))}
                    </div>

                    <div className="block-white overflow-hidden">
                        <div className="flex items-center justify-between gap-3 border-b-2 border-line-white px-4 py-3">
                            <span className="font-display text-[17px] text-ink">{t('tableTitle')}</span>
                            <span className="shrink-0 whitespace-nowrap font-space-mono text-[12px] uppercase text-blue">{t('seeAll')}</span>
                        </div>
                        {MOCK_ROWS.map((r, i) => (
                            <div
                                key={r.name}
                                className="flex flex-wrap items-center gap-x-4 gap-y-0.5 border-b border-line-white px-4 py-3 last:border-b-0"
                            >
                                <span className="tabular font-space-mono text-[14px] text-muted-white">#{i + 1}</span>
                                <span className="flex-1 text-[16px] font-bold text-ink">{r.name}</span>
                                <span className="label-mono basis-full pl-9 text-[12px] text-muted-white sm:basis-auto sm:pl-0">
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
    const rise = reveal;

    return (
        <section
            id="idolos"
            aria-label={t('title')}
            className="relative overflow-hidden bg-blue px-5 py-16 md:px-9 md:py-28"
        >
            <div className="mx-auto flex max-w-6xl flex-col gap-14 md:gap-16">
                {/* The pitch, beside the stage. */}
                <div className="grid items-center gap-10 lg:grid-cols-[1fr_340px] lg:gap-14">
                    <div className="flex flex-col gap-5">
                        <motion.span {...rise()} className="label-mono text-[13px] text-lilac">
                            {t('kicker')}
                        </motion.span>
                        <h2 className="flex flex-col gap-1">
                            {VERBS.map((key, i) => (
                                <motion.span
                                    key={key}
                                    {...rise(i * 0.12, 36)}
                                    // IDENTIFICAMOS is ≈9.9× the font size wide:
                                    // every step is sized to fit its column.
                                    className="font-hero block text-[clamp(28px,8.8vw,38px)] text-white md:text-[64px] lg:text-[length:min(5vw,72px)]"
                                >
                                    {t(key)}
                                </motion.span>
                            ))}
                        </h2>
                        <motion.p
                            {...rise(0.4)}
                            className="max-w-2xl text-[20px] font-bold leading-snug text-white md:text-[26px]"
                        >
                            {t('pitchTail')}
                        </motion.p>
                    </div>

                    <motion.div {...rise(0.15, 44)}>
                        <StageVideo />
                    </motion.div>
                </div>

                {/* Proof + what the ídolo gets. */}
                <div className="grid items-start gap-6 lg:grid-cols-[1.45fr_1fr] lg:gap-8">
                    <motion.figure {...rise(0, 44)} className="flex flex-col gap-3">
                        <DashboardMock label={t('dashAlt')} />
                        <figcaption className="label-mono text-center text-[12px] text-lilac">
                            {t('mock.note')}
                        </figcaption>
                    </motion.figure>

                    <ul className="flex flex-col gap-4">
                        {PROOF.map((key, i) => (
                            <motion.li key={key} {...rise(i * 0.08, 24)} className="block-white px-5 py-5">
                                <h3 className="font-display text-[20px] text-ink md:text-[22px]">
                                    {t(`${key}Title`)}
                                </h3>
                                <p className="mt-2 text-[16px] leading-relaxed text-body-white md:text-[18px]">
                                    {t(`${key}Body`)}
                                </p>
                            </motion.li>
                        ))}
                    </ul>
                </div>

                {/* The offer's close: both doors, one block. */}
                <motion.div
                    {...rise(0, 30)}
                    className="surface-ink flex flex-col gap-7 rounded-[22px] border-2 border-ink bg-ink px-6 py-8 shadow-ext-xl md:px-10 md:py-10 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex max-w-xl flex-col gap-3">
                        <p className="font-hero text-[30px] text-white md:text-[40px]">{t('ctaTitle')}</p>
                        <p className="text-[17px] leading-relaxed text-white md:text-[18px]">{t('ctaBody')}</p>
                        <p className="text-[16px] text-muted-ink">{t('ctaSub')}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                        <Cta href={IDOL_MAILTO} variant="primary" className="min-h-12">
                            {t('cta')}
                        </Cta>
                        <Cta href={DASHBOARD_URL} newTab={false} variant="ghost" className="min-h-12">
                            {t('signIn')}
                        </Cta>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
