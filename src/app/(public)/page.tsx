'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import ImageSequenceCanvas from '@/components/landing/ImageSequenceCanvas';
import ScrollText from '@/components/landing/ScrollText';
import EnVivoReveal from '@/components/landing/EnVivoReveal';
import LandingNav from '@/components/landing/LandingNav';
import PhoneMockupSection, { MOCKUP_SECTION_VH } from '@/components/landing/PhoneMockupSection';
import HowItWorksSection, { HOW_IT_WORKS_VH } from '@/components/landing/HowItWorksSection';
import CommandCenterSection, { COMMAND_CENTER_VH } from '@/components/landing/CommandCenterSection';
import AppStripMarquee, { MARQUEE_VH } from '@/components/landing/AppStripMarquee';
import ScrollProgressRail, { type RailStop } from '@/components/landing/ScrollProgressRail';
import SignInModal from '@/components/landing/SignInModal';
import LandingLoader from '@/components/landing/LandingLoader';

/* ─── Scroll range calculations ─── */
// Every section's real DOM height MUST be listed here — the pinned
// scroll scenes (concert text, EN VIVO, artist pitch, participate)
// derive their global scroll fractions from this map.
const SECTIONS = {
    concert: { vh: 400 },
    enVivo: { vh: 250 },
    howItWorks: { vh: HOW_IT_WORKS_VH },
    mockup: { vh: MOCKUP_SECTION_VH },
    artist: { vh: 300 },
    commandCenter: { vh: COMMAND_CENTER_VH },
    artistPitch: { vh: 250 },
    participate: { vh: 100 },
    marquee: { vh: MARQUEE_VH },
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
    const [signInOpen, setSignInOpen] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const [loaded, setLoaded] = useState(false);

    const handleLoadProgress = useCallback((p: number) => {
        setLoadProgress(p);
        if (p >= 0.15 && !loaded) setLoaded(true);
    }, [loaded]);

    const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.02], [1, 0]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);
    const heroDisplay = useTransform(scrollYProgress, (v) => (v >= 0.05 ? 'none' : 'flex'));
    const heroY = useTransform(scrollYProgress, [0, 0.05], [0, -100]);

    // Concert statement text at ~40-70% of concert range
    const concertRange = ranges.concert;
    const statementRange: [number, number] = [
        concertRange[0] + (concertRange[1] - concertRange[0]) * 0.4,
        concertRange[0] + (concertRange[1] - concertRange[0]) * 0.7,
    ];

    // HUD rail stops — derived from the same range math, so they stay
    // correct if section heights change.
    const railStops: RailStop[] = [
        { key: 'inicio', at: 0, anchor: 'main-content' },
        { key: 'enVivo', at: ranges.enVivo[0], anchor: 'en-vivo' },
        { key: 'laApp', at: ranges.mockup[0], anchor: 'como-funciona' },
        { key: 'artistas', at: ranges.artist[0], anchor: 'para-artistas' },
        { key: 'unete', at: ranges.participate[0], anchor: 'participa' },
    ];

    return (
        <>
            {/* Skip-to-content link for accessibility */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200]
                    focus:bg-[#2D00F7] focus:text-white focus:px-4 focus:py-2 font-space-mono text-sm"
            >
                Skip to main content
            </a>

            {/* Page Loader */}
            <LandingLoader progress={loadProgress} loaded={loaded} />

            {/* Navbar */}
            <LandingNav onSignInClick={() => setSignInOpen(true)} />

            {/* HUD scroll rail (desktop) — orientation across ~2000vh */}
            <ScrollProgressRail stops={railStops} />

            {/* Sign-In Modal */}
            <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />

            <main id="main-content">
                {/* SEO h1 — visually hidden */}
                <h1 className="sr-only">Fandi — Experiencias VIP en Eventos en Vivo</h1>

                {/* JSON-LD structured data */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'Organization',
                            name: 'Fandi',
                            url: 'https://fandi.app',
                            logo: 'https://fandi.app/fandi-logo.png',
                            description:
                                'Plataforma de engagement en tiempo real para eventos masivos',
                            sameAs: [],
                        }),
                    }}
                />

                {/* ===== A & B. CONCERT IMAGE SEQUENCE + HERO ===== */}
                <section aria-label="Hero and concert experience">
                    <ImageSequenceCanvas
                        folder="concert"
                        frameCount={240}
                        heightVh={SECTIONS.concert.vh}
                        onLoadProgress={handleLoadProgress}
                    >
                        {/* Hero Overlay */}
                        <motion.div
                            style={{ opacity: heroOpacity, y: heroY, display: heroDisplay }}
                            className="absolute inset-0 flex-col items-center justify-center px-4 z-20"
                        >
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(18,18,18,0.7)_0%,rgba(0,0,0,0.9)_80%)] pointer-events-none" aria-hidden="true" />

                            <div className="relative z-10 flex flex-col items-center text-center pointer-events-auto">
                                <Image
                                    src="/fandi-logo.png"
                                    alt="Fandi logo"
                                    width={500}
                                    height={160}
                                    priority
                                    className="w-[65vw] max-w-[500px] h-auto drop-shadow-[0_4px_30px_rgba(139,92,246,0.4)]"
                                />
                                <p className="font-space-mono text-white/80 text-lg md:text-[22px] uppercase tracking-[3px] mt-6 max-w-lg [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">
                                    {t('subtitle')}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 mt-10">
                                    <a
                                        href="#como-funciona"
                                        className="btn-tactical font-space-mono text-[13px] font-bold uppercase tracking-[2px] px-8 py-4 transition-all text-center"
                                        aria-label="Download the Fandi app"
                                    >
                                        {t('ctaFan')}
                                    </a>
                                    <button
                                        onClick={() => setSignInOpen(true)}
                                        className="font-space-mono text-[13px] font-bold uppercase tracking-[2px]
                                            border border-[rgba(255,255,255,0.1)] text-white px-8 py-4 backdrop-blur-md bg-[rgba(18,18,18,0.4)]
                                            hover:border-[var(--color-tactical-acid)] hover:bg-[rgba(204,255,0,0.05)] hover:shadow-[0_0_20px_rgba(204,255,0,0.2)]
                                            active:scale-95 transition-all text-center cursor-pointer"
                                    >
                                        {t('ctaOrganizer')}
                                    </button>
                                </div>
                            </div>

                            <motion.div
                                style={{ opacity: scrollIndicatorOpacity }}
                                className="absolute bottom-10 animate-bounce text-[#6B6B6B]"
                                aria-hidden="true"
                            >
                                <ChevronDown size={28} />
                            </motion.div>
                        </motion.div>

                        {/* Cinematic text during concert sequence (~40-70%) */}
                        <ScrollText scrollRange={statementRange} className="px-6">
                            <h2 className="animate-glitch font-sora font-extrabold text-white text-center text-[28px] md:text-5xl lg:text-[72px] max-w-5xl leading-tight tracking-tighter [text-shadow:0_4px_20px_rgba(0,0,0,0.9)]">
                                {t('heroStatement')}
                            </h2>
                        </ScrollText>
                    </ImageSequenceCanvas>
                </section>

                {/* ===== C. EN VIVO REVEAL ===== */}
                <section id="en-vivo" style={{ height: `${SECTIONS.enVivo.vh}vh` }} aria-label="Live experience">
                    {/*
                        Start: 15% of concert span BEFORE concert ends → text fades in over last concert frames
                        End: 30% before enVivo boundary → text is completely gone before mockups appear
                    */}
                    <EnVivoReveal
                        scrollRange={[
                            ranges.concert[1] - (ranges.concert[1] - ranges.concert[0]) * 0.15,
                            ranges.enVivo[1] - (ranges.enVivo[1] - ranges.enVivo[0]) * 0.30,
                        ]}
                    />
                </section>

                {/* ===== C2. CÓMO FUNCIONA — the mechanic, in HUD cards ===== */}
                <section aria-label="How Fandi works">
                    <HowItWorksSection />
                </section>

                {/* ===== D. PHONE MOCKUP SECTION (real app captures) ===== */}
                <section id="como-funciona" aria-label="Features for fans">
                    <PhoneMockupSection />
                </section>

                {/* ===== E. ARTIST IMAGE SEQUENCE ===== */}
                <section id="para-artistas" aria-label="For artists and teams">
                    <ImageSequenceCanvas folder="artist" frameCount={240} heightVh={300}>
                        <ScrollText
                            scrollRange={[
                                ranges.artist[0] + (ranges.artist[1] - ranges.artist[0]) * 0.6,
                                ranges.artist[1],
                            ]}
                            className="px-4"
                        >
                            <h2 className="animate-glitch font-sora font-extrabold text-white text-center text-[28px] md:text-5xl lg:text-[72px] leading-tight tracking-tighter max-w-4xl [text-shadow:0_4px_20px_rgba(0,0,0,0.9)]">
                                {t('artistsTitle')}
                            </h2>
                        </ScrollText>
                    </ImageSequenceCanvas>
                </section>

                {/* ===== E2. CENTRO DE COMANDO — the real dashboard ===== */}
                <section aria-label="Artist command center">
                    <CommandCenterSection onOrganizerClick={() => setSignInOpen(true)} />
                </section>

                {/* ===== F. ARTIST PITCH TEXTS ===== */}
                <section style={{ height: `${SECTIONS.artistPitch.vh}vh` }} aria-label="Artist benefits">
                    <ScrollText scrollRange={subRange(ranges.artistPitch, 0, 3)} className="px-6">
                        <p className="font-sora font-bold text-white text-center text-[28px] md:text-5xl lg:text-[72px] max-w-4xl leading-tight drop-shadow-[0_0_30px_rgba(45,0,247,0.5)] [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
                            {t('artistsPitch1')}
                        </p>
                    </ScrollText>

                    <ScrollText scrollRange={subRange(ranges.artistPitch, 1, 3)} className="px-6">
                        <p className="font-sora font-bold text-white text-center text-[28px] md:text-5xl lg:text-[72px] max-w-4xl leading-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
                            <span className="text-[#FF3366] drop-shadow-[0_0_30px_rgba(255,51,102,0.6)]">{t('enVivo')}</span>
                            {', '}
                            {t('artistsPitch2').split(',').slice(1).join(',').trim()}
                        </p>
                    </ScrollText>

                    <ScrollText scrollRange={subRange(ranges.artistPitch, 2, 3)} className="px-6">
                        <p className="font-sora font-bold text-white text-center text-[28px] md:text-5xl lg:text-[72px] max-w-4xl leading-tight drop-shadow-[0_0_30px_rgba(139,92,246,0.6)] [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
                            {t('artistsPitch3')}
                        </p>
                    </ScrollText>
                </section>

                {/* ===== G. PARTICIPA + CTAs ===== */}
                <section id="participa" style={{ height: `${SECTIONS.participate.vh}vh` }} aria-label="Call to action">
                    <ScrollText scrollRange={ranges.participate} interactive>
                        <div className="flex flex-col items-center text-center px-6">
                            <h2 className="animate-glitch font-sora font-extrabold text-white text-[28px] md:text-5xl lg:text-[72px] leading-tight tracking-tighter [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
                                {t('participateTitle')}
                            </h2>
                            <p className="font-sora text-[#A0A0A0] text-base md:text-lg max-w-xl mt-6">
                                {t('participateDesc')}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 mt-10">
                                <a
                                    href="#como-funciona"
                                    className="btn-tactical font-space-mono text-[13px] font-bold uppercase tracking-[2px] px-8 py-4 transition-all text-center"
                                    aria-label="Download the Fandi app"
                                >
                                    {t('ctaFan')}
                                </a>
                                <button
                                    onClick={() => setSignInOpen(true)}
                                    className="font-space-mono text-[13px] font-bold uppercase tracking-[2px]
                                        border border-[rgba(255,255,255,0.1)] text-white px-8 py-4 backdrop-blur-md bg-[rgba(18,18,18,0.4)]
                                        hover:border-[var(--color-tactical-acid)] hover:bg-[rgba(204,255,0,0.05)] hover:shadow-[0_0_20px_rgba(204,255,0,0.2)]
                                        active:scale-95 transition-all text-center cursor-pointer"
                                >
                                    {t('ctaOrganizer')}
                                </button>
                            </div>
                        </div>
                    </ScrollText>
                </section>

                {/* ===== G2. APP STRIP — end on product, not words ===== */}
                <section aria-label="App gallery">
                    <AppStripMarquee />
                </section>

                {/* ===== H. FOOTER ===== */}
                <footer className="bg-[#121212] py-12 px-6 md:px-12">
                    <div className="max-w-6xl mx-auto">
                        <Image
                            src="/fandi-logo.png"
                            alt="Fandi"
                            width={120}
                            height={40}
                            className="h-10 w-auto"
                        />
                        <nav aria-label="Footer links" className="flex flex-wrap gap-6 mt-6">
                            <a href="#como-funciona" className="font-space-mono text-[14px] text-[#A0A0A0] hover:text-white transition-colors">
                                {tFooter('terms')}
                            </a>
                            <a href="#como-funciona" className="font-space-mono text-[14px] text-[#A0A0A0] hover:text-white transition-colors">
                                {tFooter('privacy')}
                            </a>
                            <a href="mailto:hola@fandi.app" className="font-space-mono text-[14px] text-[#A0A0A0] hover:text-white transition-colors">
                                {tFooter('contact')}
                            </a>
                        </nav>
                        <p className="font-space-mono text-[14px] text-[#6B6B6B] mt-4">
                            {tFooter('madeIn')}
                        </p>
                        <p className="font-space-mono text-[14px] text-[#6B6B6B] mt-1">
                            {tFooter('copyright')}
                        </p>
                    </div>
                </footer>
            </main>
        </>
    );
}
