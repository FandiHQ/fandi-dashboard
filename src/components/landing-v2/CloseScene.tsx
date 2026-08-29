'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Cta, DASHBOARD_URL, WEB_APP_URL } from './Cta';

/**
 * The close: download → objections → footer.
 *
 * The FAQ is doing double duty. It answers the questions that actually
 * stop a fan converting (is it rigged? is my money safe? do I need to be
 * at the stadium?) and it's also what a payment gateway looks for during
 * merchant review.
 */

const FAQ_ITEMS = [1, 2, 3, 4, 5] as const;

export function DownloadScene() {
    const t = useTranslations('landingV2.descargar');
    const tCta = useTranslations('landingV2.cta');
    const reduceMotion = useReducedMotion();

    return (
        <section
            id="descargar"
            aria-label={t('title')}
            className="relative overflow-hidden bg-black px-6 py-28 md:py-40"
        >
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        'radial-gradient(60% 60% at 50% 50%, rgba(204,255,0,0.12), transparent 70%), radial-gradient(50% 50% at 50% 100%, rgba(45,0,247,0.28), transparent 70%)',
                }}
                aria-hidden="true"
            />

            <motion.div
                {...(reduceMotion
                    ? {}
                    : {
                          initial: { opacity: 0, y: 34 },
                          whileInView: { opacity: 1, y: 0 },
                          viewport: { once: true, amount: 0.3 },
                          transition: { duration: 0.65 },
                      })}
                className="relative mx-auto flex max-w-4xl flex-col items-center gap-8 text-center"
            >
                <span className="font-space-mono text-[10px] uppercase tracking-[6px] text-[#CCFF00]">
                    {t('kicker')}
                </span>
                <h2 className="animate-glitch font-sora text-[44px] font-extrabold uppercase leading-[0.88] tracking-tighter text-white md:text-[104px]">
                    {t('title')}
                </h2>
                <p className="max-w-xl font-sora text-lg text-[#B8B8C2] md:text-xl">
                    {t('body')}
                </p>

                {/* Same-tab handoff into the web app — the stores are
                    unapproved, so this is how a fan actually gets in. */}
                <Cta href={WEB_APP_URL} newTab={false} variant="acid">
                    {tCta('openApp')}
                </Cta>

                <div className="mt-2 flex flex-col items-center gap-3">
                    <span className="font-space-mono text-[11px] uppercase tracking-[3px] text-[#6B6B6B]">
                        {t('priceNote')}
                    </span>
                </div>
            </motion.div>
        </section>
    );
}

export function FaqScene() {
    const t = useTranslations('landingV2.faq');
    const reduceMotion = useReducedMotion();

    return (
        <section
            id="faq"
            aria-label={t('title')}
            className="relative border-t border-white/10 bg-black px-6 py-24 md:py-32"
        >
            <div className="mx-auto max-w-3xl">
                <motion.div
                    {...(reduceMotion
                        ? {}
                        : {
                              initial: { opacity: 0, y: 26 },
                              whileInView: { opacity: 1, y: 0 },
                              viewport: { once: true, amount: 0.4 },
                              transition: { duration: 0.6 },
                          })}
                    className="text-center"
                >
                    <span className="font-space-mono text-[10px] uppercase tracking-[6px] text-[#CCFF00]">
                        {t('kicker')}
                    </span>
                    <h2 className="mt-4 font-sora text-4xl font-extrabold uppercase tracking-tighter text-white md:text-6xl">
                        {t('title')}
                    </h2>
                </motion.div>

                <div className="mt-12">
                    {FAQ_ITEMS.map((i) => (
                        <details key={i} open={i === 1} className="group border-b border-white/10">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-sora text-lg font-bold text-white transition-colors marker:content-none hover:text-[#CCFF00] group-open:text-[#CCFF00] md:text-2xl [&::-webkit-details-marker]:hidden">
                                <span>{t(`q${i}`)}</span>
                                <span
                                    className="font-space-mono text-2xl text-[#CCFF00] transition-transform duration-300 group-open:rotate-45"
                                    aria-hidden="true"
                                >
                                    +
                                </span>
                            </summary>
                            <p className="max-w-[62ch] pb-7 font-sora text-base leading-relaxed text-[#A8A8B4]">
                                {t(`a${i}`)}
                            </p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function FooterV2() {
    const t = useTranslations('landingV2.footer');

    return (
        <footer className="border-t border-white/10 bg-black px-6 py-16 md:px-12">
            <div className="mx-auto flex max-w-6xl flex-col gap-10">
                <div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
                    <div className="flex flex-col gap-5">
                        {/* Same treatment as the nav mark: the TRUE intrinsic
                            ratio (967x747), no glow. Rendered larger than this
                            the artwork's baked-in 3D extrusion reads as blur.

                            width/height must be the real pixel dimensions —
                            they are how next/image derives the aspect ratio
                            and picks a source width, not a display size. The
                            display size belongs in className, and `w-auto`
                            keeps the ratio instead of forcing a box the
                            artwork does not fit.

                            `self-start` is load-bearing: the parent is a flex
                            column, and its default align-items:stretch beats
                            width:auto — without it the logo smears to the full
                            column width (288px against a 60px height). */}
                        <Image
                            src="/fandi-logo.png"
                            alt="Fandi"
                            width={967}
                            height={747}
                            className="h-15 w-auto self-start"
                        />
                        <p className="max-w-xs font-sora text-base text-[#8A8A94]">
                            {t('tagline')}
                        </p>
                    </div>

                    {/* Both doors are for ídolos, not fans: this sign-in
                        opens the organizer dashboard, and fans only ever
                        exist in the mobile app. Hence the "(ídolos)"
                        qualifier on the label — an unqualified "Ingresar"
                        sends fans to a login they can never complete. */}
                    <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
                        <Cta href={DASHBOARD_URL} newTab={false} variant="ghost">
                            {t('signIn')}
                        </Cta>
                        <Cta
                            href="mailto:hola@fandi.app?subject=Quiero%20llevar%20Fandi%20a%20mi%20evento"
                            variant="primary"
                        >
                            {t('idolCta')}
                        </Cta>
                    </div>
                </div>

                <nav
                    aria-label={t('linksLabel')}
                    className="flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/10 pt-8"
                >
                    <a
                        href="/terminos"
                        className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] transition-colors hover:text-white"
                    >
                        {t('terms')}
                    </a>
                    <a
                        href="/privacidad"
                        className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] transition-colors hover:text-white"
                    >
                        {t('privacy')}
                    </a>
                    <a
                        href="/datos-personales"
                        className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] transition-colors hover:text-white"
                    >
                        {t('dataPolicy')}
                    </a>
                    <a
                        href="/eliminar-cuenta"
                        className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] transition-colors hover:text-white"
                    >
                        {t('deleteAccount')}
                    </a>
                    <a
                        href="mailto:hola@fandi.app"
                                                className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] transition-colors hover:text-white"
                    >
                        hola@fandi.app
                    </a>
                    <span className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#4A4A52]">
                        {t('madeIn')}
                    </span>
                    <span className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#4A4A52] md:ml-auto">
                        {t('copyright')}
                    </span>
                </nav>
            </div>
        </footer>
    );
}
