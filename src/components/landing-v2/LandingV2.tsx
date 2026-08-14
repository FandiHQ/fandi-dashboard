'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import ImageSequenceCanvas from '@/components/landing/ImageSequenceCanvas';
import LandingLoader from '@/components/landing/LandingLoader';
import SignInModal from '@/components/landing/SignInModal';

import NavV2 from './NavV2';
import FrustrationScene from './FrustrationScene';
import TurnScene from './TurnScene';
import RechargeScene from './RechargeScene';
import CategoriesScene from './CategoriesScene';
import AuctionScene from './AuctionScene';
import KeepScene from './KeepScene';
import IdolsScene from './IdolsScene';
import { DownloadScene, FaqScene, FooterV2 } from './CloseScene';
import { Cta, WEB_APP_URL } from './Cta';
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
/** Hairline-flanked label that separates the two hero audiences. */
function GroupLabel({ children }: { children: React.ReactNode }) {
    return (
        <span className="flex items-center gap-3 font-space-mono text-[10px] uppercase tracking-[4px] text-[#9A9AA6]">
            <span className="h-px w-6 bg-white/20" aria-hidden="true" />
            {children}
            <span className="h-px w-6 bg-white/20" aria-hidden="true" />
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
    const [signInOpen, setSignInOpen] = useState(false);
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
    // logo lingers half-transparent over a busy plate. Short exit with blur
    // + lift so it reads as a deliberate move rather than a dissolve.
    const heroOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
    const heroY = useTransform(scrollYProgress, [0, 0.1], [0, -70]);
    const heroScale = useTransform(scrollYProgress, [0, 0.1], [1, 0.94]);
    const heroBlurRaw = useTransform(scrollYProgress, [0, 0.1], [0, 14]);
    const heroBlur = useTransform(heroBlurRaw, (b) => `blur(${b}px)`);
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
            <NavV2 onSignIn={() => setSignInOpen(true)} />
            <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />

            {/* pb on mobile clears the sticky action bar */}
            <main id="main-content" className="bg-black pb-24 md:pb-0">
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
                                filter: heroBlur,
                            }}
                            className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4"
                        >
                            <motion.div
                                style={{ opacity: scrimOpacity }}
                                className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,6,8,0.82)_0%,rgba(0,0,0,0.95)_75%)]"
                                aria-hidden="true"
                            />

                            <div className="relative z-10 flex flex-col items-center text-center">
                                <Image
                                    src="/fandi-logo.png"
                                    alt="Fandi"
                                    width={967}
                                    height={747}
                                    priority
                                    className="h-auto w-[52vw] max-w-[380px] drop-shadow-[0_6px_50px_rgba(45,0,247,0.5)]"
                                />
                                <p className="mt-6 max-w-2xl font-sora text-lg font-extrabold uppercase leading-tight tracking-tight text-white md:text-[30px]">
                                    {t('hero.slogan')}
                                </p>
                                <p className="mt-3 max-w-md font-sora text-sm text-[#B8B8C2] md:text-base">
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
                                            onClick={() => setSignInOpen(true)}
                                            variant="ghost"
                                            className="!px-7 !py-3"
                                        >
                                            {t('hero.signIn')}
                                        </Cta>
                                        <Cta
                                            href="mailto:hola@fandi.app?subject=Quiero%20llevar%20Fandi%20a%20mi%20evento"
                                            variant="ghost"
                                            className="!px-7 !py-3"
                                        >
                                            {t('hero.idol')}
                                        </Cta>
                                    </div>
                                </div>
                            </div>

                            <motion.div
                                style={{ opacity: cueOpacity }}
                                className="absolute bottom-8 animate-bounce text-[#6B6B6B]"
                                aria-hidden="true"
                            >
                                <ChevronDown size={28} />
                            </motion.div>
                        </motion.div>

                        {/* Founder voice, spoken straight into the mic that's
                            now aimed at the viewer. */}
                        <motion.div
                            style={{ opacity: founderOpacity, y: founderY }}
                            className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 px-6 text-center"
                        >
                            <div
                                className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.9)_70%)]"
                                aria-hidden="true"
                            />
                            <p className="relative z-10 max-w-4xl font-sora text-2xl font-extrabold uppercase leading-[1.05] tracking-tight text-white md:text-[54px]">
                                {t('hero.founderA')}
                            </p>
                            <motion.p
                                style={{ opacity: founderBOpacity }}
                                className="relative z-10 max-w-4xl font-sora text-2xl font-extrabold uppercase leading-[1.05] tracking-tight md:text-[54px]"
                            >
                                <span
                                    className="text-[#CCFF00]"
                                    style={{ textShadow: '0 0 50px rgba(204,255,0,0.45)' }}
                                >
                                    {t('hero.founderB')}
                                </span>
                            </motion.p>
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
                        <div className="absolute inset-0 flex items-end justify-center pb-[12vh]">
                            <div
                                className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_40%,rgba(0,0,0,0.9)_100%)]"
                                aria-hidden="true"
                            />
                            <p className="relative z-10 px-6 text-center font-space-mono text-xs uppercase tracking-[8px] text-white/80 md:text-base md:tracking-[12px]">
                                {t('idolos.overline')}
                            </p>
                        </div>
                    </LazyImageSequence>
                </section>
                <IdolsScene />

                {/* ═══ CIERRE ═══ */}
                <DownloadScene />
                <FaqScene />
                <FooterV2 onSignIn={() => setSignInOpen(true)} />
            </main>
        </>
    );
}
