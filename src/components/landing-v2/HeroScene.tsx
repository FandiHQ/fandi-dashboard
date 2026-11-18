'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

import { Cta, DASHBOARD_URL, IDOL_MAILTO, StoreBadges } from './Cta';
import ScrollSequence from './ScrollSequence';
import { useRange, useReducedMotionSafe, useSceneProgress } from './scroll';

/**
 * §0 EL MICRÓFONO: the hero, then the mic sequence with the founder line.
 *
 * The hand-off is physical, not a fade. The hero is an opaque blue block
 * laid over the first screen of the stage; it scrolls away like any page
 * content and uncovers the sequence underneath. Nothing of it can ghost
 * through what comes next, and it never comes back.
 *
 * The hero is plain HTML on flat blue with the logo as its one image, so it
 * is the LCP on its own: the frames load on idle, behind it.
 */

/** Rule-flanked label that separates the two hero audiences. */
function GroupLabel({ children }: { children: React.ReactNode }) {
    return (
        <span className="label-mono flex items-center gap-3 text-[12px] text-lilac md:text-[13px]">
            <span className="h-[2px] w-6 bg-lilac" aria-hidden="true" />
            {children}
            <span className="h-[2px] w-6 bg-lilac" aria-hidden="true" />
        </span>
    );
}

export default function HeroScene() {
    const t = useTranslations('landingV2.hero');
    const ref = useRef<HTMLElement>(null);
    const reduceMotion = useReducedMotionSafe();
    const progress = useSceneProgress(ref);

    // The section is 270vh: the hero takes the first 100vh of its 170vh of
    // travel to leave (≈0.59), so the founder line lands once the stage is
    // fully uncovered and the mic is in the hand.
    const cardOpacity = useRange(progress, [0.62, 0.7], [0, 1]);
    const cardY = useRange(progress, [0.62, 0.72], [36, 0]);
    const lineB = useRange(progress, [0.72, 0.8], [0, 1]);

    return (
        <section
            ref={ref}
            aria-label="Fandi"
            className="relative"
            style={{ height: reduceMotion ? '200vh' : '270vh' }}
        >
            {/* The stage: pinned for the whole section. */}
            <div className="sticky top-0 h-screen w-full overflow-hidden bg-ink">
                <ScrollSequence
                    folder="concert"
                    frameCount={120}
                    progress={progress}
                    staticFrame={104}
                    reduceMotion={reduceMotion}
                    eager
                />

                {/* Founder voice, spoken into the mic now aimed at the
                    viewer. An opaque white block, the view's one tilt. */}
                <div className="pointer-events-none absolute inset-x-0 top-[88px] flex justify-center px-5 md:inset-y-0 md:top-0 md:items-center md:justify-start md:px-[7vw]">
                    <motion.div
                        style={{ opacity: cardOpacity, y: cardY }}
                        className="surface-white tilt-hero flex max-w-[640px] flex-col gap-3 rounded-[18px] border-2 border-ink bg-white px-6 py-6 shadow-ext-xl md:gap-4 md:px-10 md:py-9"
                    >
                        <p className="font-hero text-[clamp(26px,7.4vw,32px)] text-ink md:text-[48px] lg:text-[56px]">
                            {t('founderA')}
                        </p>
                        <motion.p
                            style={{ opacity: lineB }}
                            className="font-hero text-[clamp(26px,7.4vw,32px)] text-blue md:text-[48px] lg:text-[56px]"
                        >
                            {t('founderB')}
                        </motion.p>
                    </motion.div>
                </div>
            </div>

            {/* The hero: opaque, in flow over the stage's first screen. */}
            <div className="absolute inset-x-0 top-0 z-20 flex min-h-screen flex-col items-center justify-center bg-blue px-5 pb-24 pt-12 text-center">
                <Image
                    src="/fandi-logo.png"
                    alt="Fandi"
                    width={967}
                    height={747}
                    priority
                    className="h-auto w-[min(30vw,150px)]"
                />
                {/* Sized by its longest word, CONVERTIMOS (≈9.4× the font
                    size), so it never runs off a 320px screen. */}
                <p className="font-hero mt-6 max-w-5xl text-[clamp(30px,9.4vw,40px)] text-white sm:text-[56px] md:text-[72px] lg:text-[88px]">
                    {t('slogan')}
                </p>
                <p className="mt-5 max-w-xl text-balance text-[18px] leading-snug text-white md:text-[21px]">
                    {t('sub')}
                </p>

                {/* Two audiences, labelled: fans get the app, ídolos get
                    the dashboard. Unlabelled, "Ingresar" read as a fan
                    action. */}
                <div className="mt-9 flex flex-col items-center gap-4">
                    <GroupLabel>{t('forFans')}</GroupLabel>
                    <StoreBadges priority />
                </div>

                <div className="mt-8 flex flex-col items-center gap-4">
                    <GroupLabel>{t('forIdols')}</GroupLabel>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Cta
                            href={DASHBOARD_URL}
                            newTab={false}
                            variant="ghost"
                            className="min-h-12 !px-7 !py-3 !text-[14px]"
                        >
                            {t('signIn')}
                        </Cta>
                        <Cta
                            href={IDOL_MAILTO}
                            variant="primary"
                            className="min-h-12 !px-7 !py-3 !text-[14px]"
                        >
                            {t('idol')}
                        </Cta>
                    </div>
                </div>

                <span
                    className="absolute bottom-6 animate-bounce text-white motion-reduce:animate-none"
                    aria-hidden="true"
                >
                    <ChevronDown size={28} />
                </span>
            </div>
        </section>
    );
}
