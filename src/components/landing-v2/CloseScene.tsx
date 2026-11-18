'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Cta, DASHBOARD_URL, IDOL_MAILTO, StoreBadges } from './Cta';
import { reveal } from './scroll';

/**
 * The close: download → objections → footer, plus the compact download
 * moment that follows "AHORA SÍ PASAS." mid-page.
 *
 * The FAQ is doing double duty. It answers the questions that actually
 * stop a fan converting (is it rigged? is my money safe? do I need to be
 * at the stadium?) and it's also what a payment gateway looks for during
 * merchant review.
 */

const FAQ_ITEMS = [1, 2, 3, 4, 5] as const;

/** 44px tall: on a phone these wrap into rows of small mono text. */
const FOOTER_LINK =
    'label-mono inline-flex min-h-11 items-center text-[12px] text-muted-ink transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

/**
 * Desktop only: whoever reads this on a computer has the phone in their
 * hand, not this screen. Static SVG of `https://fandi.app/descargar`
 * (generated once with qrcode@1.5.4, ECC M, 4-module quiet zone), so the
 * phone that scans it lands in its own store.
 *
 * 111px = 37 modules × 3px, so every module is whole pixels and stays
 * crisp. The white block is extra quiet zone, not decoration.
 */
function DownloadQr() {
    const t = useTranslations('landingV2.store');
    return (
        <div className="block-white hidden items-center gap-4 p-2.5 pr-5 lg:flex">
            {/* eslint-disable-next-line @next/next/no-img-element -- static vector, nothing to optimise */}
            <img
                src="/badges/qr-descargar.svg"
                alt={t('qrAlt')}
                width={111}
                height={111}
                loading="lazy"
                decoding="async"
                className="block size-[111px]"
            />
            <span className="label-mono max-w-[14ch] text-left text-[12px] leading-snug text-ink">
                {t('scanQr')}
            </span>
        </div>
    );
}

/**
 * The mid-page download moment, right after "AHORA SÍ PASAS.": the payoff
 * of the turn is "and it's in your pocket". Compact on purpose: one line,
 * the badges, no second headline competing with the slam above it.
 */
export function MidDownload() {
    const t = useTranslations('landingV2.descargarMid');

    return (
        <section aria-label={t('title')} className="bg-blue px-5 py-14 md:px-9 md:py-20">
            <motion.div
                {...reveal(0, 26, 0.5)}
                className="mx-auto flex max-w-5xl flex-col items-center gap-6 rounded-[22px] border-2 border-ink bg-white px-6 py-8 text-center shadow-ext-xl md:flex-row md:justify-between md:gap-10 md:px-10 md:text-left"
            >
                <div className="flex flex-col gap-2">
                    <p className="font-display text-[26px] text-ink md:text-[32px]">{t('title')}</p>
                    <p className="text-[17px] leading-relaxed text-body-white md:text-[18px]">{t('body')}</p>
                </div>
                <StoreBadges className="shrink-0" />
            </motion.div>
        </section>
    );
}

export function DownloadScene() {
    const t = useTranslations('landingV2.descargar');

    return (
        <section
            id="descargar"
            aria-label={t('title')}
            // Focus target for the nav's "Descargar" (scrollToDownloadIfNoStore);
            // scroll-mt clears the fixed 72px nav it scrolls under.
            tabIndex={-1}
            className="relative scroll-mt-[72px] overflow-hidden bg-blue px-5 py-16 outline-none md:px-9 md:py-28"
        >
            <motion.div
                {...reveal(0, 34, 0.3)}
                className="relative mx-auto flex max-w-4xl flex-col items-center gap-8 text-center"
            >
                <span className="label-mono text-[13px] text-lilac">
                    {t('kicker')}
                </span>
                <h2 className="font-hero text-[48px] text-white md:text-[120px]">
                    {t('title')}
                </h2>
                <p className="max-w-xl text-[18px] leading-relaxed text-white md:text-[20px]">
                    {t('body')}
                </p>

                <div className="flex flex-col items-center gap-8 lg:flex-row lg:gap-10">
                    <StoreBadges size="lg" />
                    <DownloadQr />
                </div>

                <div className="mt-2 flex flex-col items-center gap-3">
                    <span className="label-mono tabular text-[13px] text-white">
                        {t('priceNote')}
                    </span>
                </div>
            </motion.div>
        </section>
    );
}

export function FaqScene() {
    const t = useTranslations('landingV2.faq');

    return (
        <section
            id="faq"
            aria-label={t('title')}
            className="relative bg-blue px-5 py-16 md:px-9 md:py-28"
        >
            <div className="mx-auto max-w-3xl">
                <motion.div
                    {...reveal(0, 26, 0.4)}
                    className="text-center"
                >
                    <span className="label-mono text-[13px] text-lilac">
                        {t('kicker')}
                    </span>
                    <h2 className="font-hero mt-4 text-4xl text-white md:text-6xl">
                        {t('title')}
                    </h2>
                </motion.div>

                {/* One white block, questions divided by line-white rules. */}
                <div className="block-white mt-12 overflow-hidden">
                    {FAQ_ITEMS.map((i) => (
                        <details key={i} open={i === 1} className="group border-b-2 border-line-white px-5 last:border-b-0 md:px-7">
                            {/* Inset focus ring: the block's overflow-hidden
                                would clip an outset one on the first row. */}
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-[10px] py-5 text-lg font-bold text-ink transition-colors marker:content-none hover:text-blue focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue md:py-6 md:text-[22px] [&::-webkit-details-marker]:hidden">
                                <span>{t(`q${i}`)}</span>
                                <span
                                    className="grid size-8 shrink-0 place-items-center rounded-[10px] border-2 border-ink font-display text-xl text-ink transition-transform duration-300 group-open:rotate-45 group-open:bg-ink group-open:text-white motion-reduce:transition-none"
                                    aria-hidden="true"
                                >
                                    +
                                </span>
                            </summary>
                            <p className="max-w-[62ch] pb-6 text-[17px] leading-relaxed text-body-white md:pb-7 md:text-[18px]">
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
        // pb-36 on phones clears the fixed action bar (≈70px) below md.
        <footer className="surface-ink border-t-2 border-ink bg-ink px-5 pb-36 pt-16 md:px-12 md:pb-16">
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
                        <p className="max-w-xs text-base text-muted-ink">
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
                        <Cta href={IDOL_MAILTO} variant="primary" onInk>
                            {t('idolCta')}
                        </Cta>
                    </div>
                </div>

                <nav
                    aria-label={t('linksLabel')}
                    // gap-y-0: the links' own 44px height already spaces the rows.
                    className="flex flex-wrap items-center gap-x-7 gap-y-0 border-t-2 border-line-ink pt-6"
                >
                    <a
                        href="/terminos"
                        className={FOOTER_LINK}
                    >
                        {t('terms')}
                    </a>
                    <a
                        href="/privacidad"
                        className={FOOTER_LINK}
                    >
                        {t('privacy')}
                    </a>
                    <a
                        href="/datos-personales"
                        className={FOOTER_LINK}
                    >
                        {t('dataPolicy')}
                    </a>
                    <a
                        href="/eliminar-cuenta"
                        className={FOOTER_LINK}
                    >
                        {t('deleteAccount')}
                    </a>
                    <a
                        href="mailto:hola@fandi.app"
                        className={FOOTER_LINK}
                    >
                        hola@fandi.app
                    </a>
                    {/* muted-ink, not nav-inactive: that one is 3.9:1 on
                        ink, under AA for small text. */}
                    <span className="label-mono text-[12px] text-muted-ink">
                        {t('madeIn')}
                    </span>
                    <span className="label-mono text-[12px] text-muted-ink md:ml-auto">
                        {t('copyright')}
                    </span>
                </nav>
            </div>
        </footer>
    );
}
