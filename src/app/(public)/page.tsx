'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import ImageSequenceCanvas from '@/components/landing/ImageSequenceCanvas';
import ScrollText from '@/components/landing/ScrollText';
import ScrollCard from '@/components/landing/ScrollCard';
import EnVivoReveal from '@/components/landing/EnVivoReveal';
import LandingNav from '@/components/landing/LandingNav';

/* ─── Scroll range calculations ─── */
const SECTIONS = {
    hero: { vh: 100 },
    concert: { vh: 300 },
    enVivo: { vh: 150 },
    cards: { vh: 350 },
    artist: { vh: 300 },
    artistPitch: { vh: 250 },
    participate: { vh: 100 },
    footer: { vh: 0 },
} as const;

const entries = Object.entries(SECTIONS) as [string, { vh: number }][];
const totalVh = entries.reduce((s, [, v]) => s + v.vh, 0);

let acc = 0;
const ranges: Record<string, [number, number]> = {};
for (const [key, { vh }] of entries) {
    const s = acc / totalVh;
    acc += vh;
    const e = acc / totalVh;
    ranges[key] = [s, e];
}

const subRange = (
    range: [number, number],
    index: number,
    total: number
): [number, number] => {
    const span = range[1] - range[0];
    return [
        range[0] + (span / total) * index,
        range[0] + (span / total) * (index + 1),
    ];
};

/* ─── Page component ─── */
export default function LandingPage() {
    const t = useTranslations('landing');
    const tFooter = useTranslations('footer');
    const { scrollYProgress } = useScroll();

    const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.02], [1, 0]);

    return (
        <main>
            {/* JSON-LD structured data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Organization',
                        name: 'Fandi',
                        url: 'https://fandi.app',
                        description:
                            'Plataforma de engagement en tiempo real para eventos masivos',
                    }),
                }}
            />

            {/* ===== A. HERO ===== */}
            <section className="relative h-screen flex flex-col items-center justify-center px-4">
                {/* Background: subtle radial gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#121212_0%,#000000_70%)]" />

                {/* Content — centered, above gradient */}
                <div className="relative z-10 flex flex-col items-center text-center">
                    {/* Fandi Logo — HUGE, dominant */}
                    <Image
                        src="/fandi-logo.svg"
                        alt="Fandi"
                        width={400}
                        height={130}
                        priority
                        className="w-[60vw] max-w-[400px] md:w-[40vw] h-auto"
                    />

                    {/* Subtitle */}
                    <p className="font-space-mono text-[#A0A0A0] text-sm md:text-lg uppercase tracking-[3px] mt-6 max-w-lg">
                        {t('subtitle')}
                    </p>

                    {/* CTAs — IMMEDIATELY VISIBLE */}
                    <div className="flex flex-col sm:flex-row gap-4 mt-10">
                        <a
                            href="#"
                            className="font-space-mono text-[11px] uppercase tracking-[2px]
                bg-[#2D00F7] text-white px-8 py-4
                hover:bg-[#2400CC] transition-colors text-center"
                        >
                            {t('ctaFan')}
                        </a>
                        <a
                            href="/login"
                            className="font-space-mono text-[11px] uppercase tracking-[2px]
                border border-[#2A2A2A] text-white px-8 py-4
                hover:border-[#2D00F7] transition-colors text-center"
                        >
                            {t('ctaOrganizer')}
                        </a>
                    </div>
                </div>

                {/* Scroll indicator — fades out as user scrolls */}
                <motion.div
                    style={{ opacity: scrollIndicatorOpacity }}
                    className="absolute bottom-8 animate-bounce text-[#6B6B6B]"
                >
                    <ChevronDown size={24} />
                </motion.div>
            </section>

            {/* ===== B. CONCERT IMAGE SEQUENCE ===== */}
            <ImageSequenceCanvas folder="concert" frameCount={240} heightVh={300} />

            {/* ===== C. EN VIVO REVEAL ===== */}
            <section style={{ height: `${SECTIONS.enVivo.vh}vh` }}>
                <EnVivoReveal scrollRange={ranges.enVivo} />
            </section>

            {/* ===== D. THREE PRODUCT CARDS ===== */}
            <section style={{ height: `${SECTIONS.cards.vh}vh` }}>
                {/* Card 1: Fandies */}
                <ScrollCard scrollRange={subRange(ranges.cards, 0, 3)} accent="blue">
                    <h2 className="font-sora font-extrabold text-3xl md:text-5xl lg:text-6xl text-white tracking-tight">
                        {t('fandiesTitle')}
                    </h2>
                    <p className="font-sora font-semibold text-xl md:text-3xl text-[#2D00F7] mt-4">
                        {t('fandiesRate')}
                    </p>
                    <p className="font-space-mono text-sm md:text-base text-[#A0A0A0] mt-4">
                        {t('fandiesDesc')}
                    </p>
                </ScrollCard>

                {/* Card 2: Contributions / Escuadras */}
                <ScrollCard scrollRange={subRange(ranges.cards, 1, 3)} accent="blue">
                    <h2 className="font-sora font-extrabold text-3xl md:text-5xl lg:text-6xl text-white tracking-tight">
                        {t('contributionsTitle')}
                    </h2>
                    <p className="font-sora font-bold text-xl md:text-3xl text-[#2D00F7] mt-4">
                        {t('contributionsPrice')}
                    </p>
                    <div className="mt-6 space-y-3">
                        <p className="font-sora text-base md:text-lg text-[#A0A0A0]">
                            {t('contributionsBenefit1')}
                        </p>
                        <p className="font-sora text-base md:text-lg text-[#A0A0A0]">
                            {t('contributionsBenefit2')}
                        </p>
                        <p className="font-sora text-base md:text-lg text-[#A0A0A0]">
                            {t('contributionsBenefit3')}
                        </p>
                    </div>
                </ScrollCard>

                {/* Card 3: Auctions */}
                <ScrollCard scrollRange={subRange(ranges.cards, 2, 3)} accent="red">
                    <h2 className="font-sora font-extrabold text-3xl md:text-5xl lg:text-6xl text-white tracking-tight">
                        {t('auctionsTitle')}
                    </h2>
                    <p className="font-sora text-base md:text-xl text-[#A0A0A0] mt-4 max-w-lg">
                        {t('auctionsDesc')}
                    </p>
                </ScrollCard>
            </section>

            {/* ===== E. ARTIST IMAGE SEQUENCE ===== */}
            <ImageSequenceCanvas folder="artist" frameCount={240} heightVh={300}>
                {/* Artist title overlays the last ~40% of the sequence */}
                <ScrollText
                    scrollRange={[
                        ranges.artist[0] + (ranges.artist[1] - ranges.artist[0]) * 0.6,
                        ranges.artist[1],
                    ]}
                    className="px-4"
                >
                    <h2 className="font-sora font-extrabold text-white text-center text-3xl md:text-5xl lg:text-7xl leading-tight tracking-tighter max-w-4xl">
                        {t('artistsTitle')}
                    </h2>
                </ScrollText>
            </ImageSequenceCanvas>

            {/* ===== F. ARTIST PITCH TEXTS ===== */}
            <section style={{ height: `${SECTIONS.artistPitch.vh}vh` }}>
                {/* Text 1 */}
                <ScrollText scrollRange={subRange(ranges.artistPitch, 0, 3)} className="px-6">
                    <p className="font-sora font-bold text-white text-center text-xl md:text-3xl lg:text-5xl max-w-4xl leading-tight">
                        {t('artistsPitch1')}
                    </p>
                </ScrollText>

                {/* Text 2 — "EN VIVO" highlighted in Neon Red */}
                <ScrollText scrollRange={subRange(ranges.artistPitch, 1, 3)} className="px-6">
                    <p className="font-sora font-bold text-white text-center text-xl md:text-3xl lg:text-5xl max-w-4xl leading-tight">
                        <span className="text-[#FF3366]">{t('enVivo')}</span>
                        {', '}
                        {t('artistsPitch2').split(',').slice(1).join(',').trim()}
                    </p>
                </ScrollText>

                {/* Text 3 */}
                <ScrollText scrollRange={subRange(ranges.artistPitch, 2, 3)} className="px-6">
                    <p className="font-sora font-bold text-white text-center text-xl md:text-3xl lg:text-5xl max-w-4xl leading-tight">
                        {t('artistsPitch3')}
                    </p>
                </ScrollText>
            </section>

            {/* ===== G. PARTICIPA + CTAs ===== */}
            <section style={{ height: `${SECTIONS.participate.vh}vh` }}>
                <ScrollText scrollRange={ranges.participate}>
                    <div className="flex flex-col items-center text-center px-6">
                        <h2 className="font-sora font-extrabold text-white text-3xl md:text-5xl lg:text-7xl leading-tight tracking-tighter">
                            {t('participateTitle')}
                        </h2>
                        <p className="font-space-mono text-[#A0A0A0] text-sm md:text-base max-w-xl mt-6">
                            {t('participateDesc')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 mt-10 pointer-events-auto">
                            <a
                                href="#"
                                className="font-space-mono text-[11px] uppercase tracking-[2px]
                  bg-[#2D00F7] text-white px-8 py-4
                  hover:bg-[#2400CC] transition-colors text-center"
                            >
                                {t('ctaFan')}
                            </a>
                            <a
                                href="/login"
                                className="font-space-mono text-[11px] uppercase tracking-[2px]
                  border border-[#2A2A2A] text-white px-8 py-4
                  hover:border-[#2D00F7] transition-colors text-center"
                            >
                                {t('ctaOrganizer')}
                            </a>
                        </div>
                    </div>
                </ScrollText>
            </section>

            {/* ===== H. FOOTER (static, not scroll-animated) ===== */}
            <footer className="bg-[#121212] py-12 px-6 md:px-12">
                <div className="max-w-6xl mx-auto">
                    <Image
                        src="/fandi-logo.svg"
                        alt="Fandi"
                        width={120}
                        height={40}
                        className="h-8 w-auto"
                    />
                    <div className="flex flex-wrap gap-6 mt-6">
                        <a
                            href="#"
                            className="font-space-mono text-xs text-[#A0A0A0] hover:text-white transition-colors"
                        >
                            {tFooter('terms')}
                        </a>
                        <a
                            href="#"
                            className="font-space-mono text-xs text-[#A0A0A0] hover:text-white transition-colors"
                        >
                            {tFooter('privacy')}
                        </a>
                        <a
                            href="mailto:hola@fandi.app"
                            className="font-space-mono text-xs text-[#A0A0A0] hover:text-white transition-colors"
                        >
                            {tFooter('contact')}
                        </a>
                    </div>
                    <p className="font-space-mono text-xs text-[#6B6B6B] mt-4">
                        {tFooter('madeIn')}
                    </p>
                    <p className="font-space-mono text-xs text-[#6B6B6B] mt-1">
                        {tFooter('copyright')}
                    </p>
                </div>
            </footer>

            {/* Nav renders last (fixed position, z-50, above everything) */}
            <LandingNav />
        </main>
    );
}
