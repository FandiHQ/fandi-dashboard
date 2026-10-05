'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import ImageSequenceCanvas from '@/components/landing/ImageSequenceCanvas';
import LandingLoader from '@/components/landing/LandingLoader';

import NavV2 from './NavV2';
import FrustrationScene from './FrustrationScene';
import TurnScene from './TurnScene';
import RechargeScene from './RechargeScene';
import CategoriesScene from './CategoriesScene';
import AuctionScene from './AuctionScene';
import KeepScene from './KeepScene';
import IdolsScene from './IdolsScene';
import { DownloadScene, FaqScene, FooterV2 } from './CloseScene';
import { Cta, DASHBOARD_URL, WEB_APP_URL } from './Cta';
import { ScrollProgress, ScrollCue } from './ScrollAffordance';
import LazyImageSequence from './LazyImageSequence';

/**
 * The Fandi landing page.
 *
 * Rendered at `/`. Deliberately has NO global vh/scroll map: every scene
 * owns its scroll via a local `useScroll({ target })`, so sections can be
 * added, cut or reordered without ever desyncing each other. (The previous
 * landing derived every pinned scene from one shared SECTIONS map, which
 * made any edit to one section silently break the timing of the others.)
 *
 * Narrative:
 *   §0 el micrófono   the hook, with the real CTAs in reach
 *   §1 la frustración no matter what you pay, you never pass the stage
 *   §2 el giro        ahora sí pasas, live and from anywhere
 *   #1 recargas       Fandis, your wallet, and the event unlocking
 *   #2 oportunidades  the mechanic, simulated on canvas
 *   #3 subastas       the contrast: no draw, highest bid wins
 *   §  lo que queda   insignias + rank, win or lose
 *   §  ídolos         monetizamos · identificamos · fidelizamos
 *   §  descargar / faq / footer
 */
/** Rule-flanked label that separates the two hero audiences. */
function GroupLabel({ children }: { children: React.ReactNode }) {
    return (
        <span className="label-mono flex items-center gap-3 text-lilac">
            <span className="h-[2px] w-6 bg-lilac" aria-hidden="true" />
            {children}
            <span className="h-[2px] w-6 bg-lilac" aria-hidden="true" />
        </span>
    );
}

export default function LandingV2() {
    const t = useTranslations('landingV2');
    // Hero timing is LOCAL to the concert section, so adding or cutting any
    // section below can never shift when the logo exits or the founder line
    // appears.
    const heroRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ['start start', 'end end'],
    });
    const [loadProgress, setLoadProgress] = useState(0);
    const [loaded, setLoaded] = useState(false);

    const handleLoadProgress = useCallback(
        (p: number) => {
            setLoadProgress(p);
            if (p >= 0.15 && !loaded) setLoaded(true);
        },
        [loaded]
    );

    // The hero must clear the frame BEFORE the mic gets close, otherwise the
    // headline lingers half-transparent over a busy plate. Short exit with a
    // lift so it reads as a deliberate move rather than a dissolve. The flat
    // blue cover lifts with it and uncovers the concert sequence.
    const heroOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
    const heroY = useTransform(scrollYProgress, [0, 0.1], [0, -70]);
    const heroScale = useTransform(scrollYProgress, [0, 0.1], [1, 0.94]);
    const scrimOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
    const cueOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);

    // Founder voice, delivered while the mic is aimed at the viewer: the
    // people who built this are fans, and the frustration in §1 is theirs
    // too. Sets up la frustración as testimony rather than marketing.
    const founderOpacity = useTransform(
        scrollYProgress,
        [0.3, 0.4, 0.72, 0.82],
        [0, 1, 1, 0]
    );
    const founderY = useTransform(scrollYProgress, [0.3, 0.42], [34, 0]);
    const founderBOpacity = useTransform(scrollYProgress, [0.5, 0.6], [0, 1]);

    return (
        <>
            <LandingLoader progress={loadProgress} loaded={loaded} />
            {/* "There is more" — global, always on. */}
            <ScrollProgress />
            <NavV2 />

            {/* pb on mobile clears the sticky action bar */}
            <main id="main-content" className="bg-blue pb-24 text-white md:pb-0">
                <h1 className="sr-only">{t('seoTitle')}</h1>

                {/* ═══ §0 — EL MICRÓFONO ═══ */}
                <section ref={heroRef} aria-label="Fandi">
                    <ImageSequenceCanvas
                        folder="concert"
                        frameCount={240}
                        heightVh={400}
                        onLoadProgress={handleLoadProgress}
                    >
                        <motion.div
                            style={{
                                opacity: heroOpacity,
                                y: heroY,
                                scale: heroScale,
                            }}
                            className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4"
                        >
                            <motion.div
                                style={{ opacity: scrimOpacity }}
                                className="absolute inset-0 bg-blue"
                                aria-hidden="true"
                            />

                            <div className="relative z-10 flex flex-col items-center text-center">
                                <Image
                                    src="/fandi-logo.png"
                                    alt="Fandi"
                                    width={967}
                                    height={747}
                                    priority
                                    className="h-auto w-[30vw] max-w-[150px]"
                                />
                                <p className="font-hero mt-6 max-w-5xl text-[40px] text-white sm:text-[56px] md:text-[88px]">
                                    {t('hero.slogan')}
                                </p>
                                <p className="mt-4 max-w-md text-[15px] leading-snug text-lilac md:text-[17px]">
                                    {t('hero.sub')}
                                </p>

                                {/* Two audiences, explicitly labelled. Fans
                                    open the web app; "Ingresar" is the
                                    dashboard login and belongs to ídolos, not
                                    to fans — unlabelled it read as a fan
                                    action.

                                    The stores have not approved yet, so the
                                    web app IS the product for launch. This is
                                    a same-tab handoff, not a download. */}
                                <div className="mt-8 flex flex-col items-center gap-3.5">
                                    <GroupLabel>{t('hero.forFans')}</GroupLabel>
                                    <Cta
                                        href={WEB_APP_URL}
                                        newTab={false}
                                        variant="acid"
                                    >
                                        {t('cta.openApp')}
                                    </Cta>
                                </div>

                                <div className="mt-7 flex flex-col items-center gap-3.5">
                                    <GroupLabel>{t('hero.forIdols')}</GroupLabel>
                                    <div className="flex flex-col items-center gap-3 sm:flex-row">
                                        <Cta
                                            href={DASHBOARD_URL}
                                            newTab={false}
                                            variant="ghost"
                                            className="!px-7 !py-3 !text-[13px]"
                                        >
                                            {t('hero.signIn')}
                                        </Cta>
                                        <Cta
                                            href="mailto:hola@fandi.app?subject=Quiero%20llevar%20Fandi%20a%20mi%20evento"
                                            variant="primary"
                                            className="!px-7 !py-3 !text-[13px]"
                                        >
                                            {t('hero.idol')}
                                        </Cta>
                                    </div>
                                </div>
                            </div>

                            <motion.div
                                style={{ opacity: cueOpacity }}
                                className="absolute bottom-8 animate-bounce text-white motion-reduce:animate-none"
                                aria-hidden="true"
                            >
                                <ChevronDown size={28} />
                            </motion.div>
                        </motion.div>

                        {/* Founder voice, spoken straight into the mic that's
                            now aimed at the viewer. */}
                        {/* A white info block on the plate (the screen's one
                            tilt) instead of a dark vignette. */}
                        <motion.div
                            style={{ opacity: founderOpacity, y: founderY }}
                            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-5"
                        >
                            <div className="surface-white tilt-hero flex max-w-4xl flex-col gap-4 rounded-[18px] border-2 border-ink bg-white px-6 py-7 text-center shadow-ext-xl md:px-12 md:py-10">
                                <p className="font-hero text-[28px] text-ink md:text-[54px]">
                                    {t('hero.founderA')}
                                </p>
                                <motion.p
                                    style={{ opacity: founderBOpacity }}
                                    className="font-hero text-[28px] text-blue md:text-[54px]"
                                >
                                    {t('hero.founderB')}
                                </motion.p>
                            </div>
                        </motion.div>

                        {/* Labelled once, here, to teach the pattern. Later
                            scenes use the bare cue. */}
                        <ScrollCue targetRef={heroRef} label={t('scrollCue')} />
                    </ImageSequenceCanvas>
                </section>

                {/* ═══ §1 · §2 — LA FRUSTRACIÓN → EL GIRO ═══ */}
                <FrustrationScene />
                <TurnScene />

                {/* ═══ #1 — RECARGAS ═══ */}
                <RechargeScene />

                {/* ═══ #2 — OPORTUNIDADES (simulated) ═══ */}
                <CategoriesScene />

                {/* ═══ #3 — SUBASTAS ═══ */}
                <AuctionScene />

                {/* ═══ LO QUE TE QUEDA ═══ */}
                <KeepScene />

                {/* ═══ PARA ÍDOLOS ═══ */}
                {/* Lazy: this sequence is ~20 viewports down, so its 240
                    frames must not be decoded at page load. */}
                <section aria-label={t('idolos.title')}>
                    <LazyImageSequence folder="artist" frameCount={240} heightVh={280}>
                        <div className="absolute inset-0 flex items-end justify-center px-5 pb-[12vh]">
                            <p className="label-mono rounded-full border-2 border-ink bg-ink px-5 py-2.5 text-center text-[11px] text-white shadow-ext-cta md:text-[13px]">
                                {t('idolos.overline')}
                            </p>
                        </div>
                    </LazyImageSequence>
                </section>
                <IdolsScene />

                {/* ═══ CIERRE ═══ */}
                <DownloadScene />
                <FaqScene />
                <FooterV2 />
            </main>
        </>
    );
}
