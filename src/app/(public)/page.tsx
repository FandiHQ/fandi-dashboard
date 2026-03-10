'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import ImageSequenceCanvas from '@/components/landing/ImageSequenceCanvas';
import ScrollText from '@/components/landing/ScrollText';
import EnVivoReveal from '@/components/landing/EnVivoReveal';
import LandingNav from '@/components/landing/LandingNav';
import PhoneMockupSection from '@/components/landing/PhoneMockupSection';
import SignInModal from '@/components/landing/SignInModal';

/* ─── Scroll range calculations ─── */
const SECTIONS = {
    concert: { vh: 400 },
    enVivo: { vh: 150 },
    mockup: { vh: 300 },
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
    const [signInOpen, setSignInOpen] = useState(false);

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

            {/* ===== NAVBAR (always fixed, always visible) ===== */}
            <LandingNav onSignInClick={() => setSignInOpen(true)} />

            {/* ===== SIGN-IN MODAL ===== */}
            <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />

            {/* ===== A & B. COMBINED HERO & CONCERT IMAGE SEQUENCE ===== */}
            <ImageSequenceCanvas folder="concert" frameCount={240} heightVh={SECTIONS.concert.vh}>
                {/* Hero Overlay */}
                <motion.div
                    style={{ opacity: heroOpacity, y: heroY, display: heroDisplay }}
                    className="absolute inset-0 flex-col items-center justify-center px-4 z-20"
                >
                    {/* Background: subtle radial gradient for text readability */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(18,18,18,0.7)_0%,rgba(0,0,0,0.9)_80%)] pointer-events-none" />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center text-center pointer-events-auto">
                        {/* Fandi Logo — PNG */}
                        <Image
                            src="/fandi-logo.png"
                            alt="Fandi"
                            width={500}
                            height={160}
                            priority
                            className="w-[65vw] max-w-[500px] h-auto drop-shadow-[0_4px_30px_rgba(139,92,246,0.4)]"
                        />
                        <p className="font-space-mono text-white/80 text-lg md:text-[22px] uppercase tracking-[3px] mt-6 max-w-lg [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">
                            {t('subtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 mt-10">
                            {/* FIX 9: Download is primary (first) */}
                            <a
                                href="#"
                                className="font-space-mono text-[13px] uppercase tracking-[2px]
                                    bg-[#2D00F7] text-white px-8 py-4
                                    hover:shadow-[0_0_25px_rgba(45,0,247,0.5)]
                                    active:scale-95 transition-all text-center"
                            >
                                {t('ctaFan')}
                            </a>
                            <button
                                onClick={() => setSignInOpen(true)}
                                className="font-space-mono text-[13px] uppercase tracking-[2px]
                                    border border-[#2A2A2A] text-white px-8 py-4 backdrop-blur-md bg-black/30
                                    hover:border-[#2D00F7] hover:shadow-[0_0_20px_rgba(45,0,247,0.3)]
                                    active:scale-95 transition-all text-center cursor-pointer"
                            >
                                {t('ctaOrganizer')}
                            </button>
                        </div>
                    </div>

                    <motion.div
                        style={{ opacity: scrollIndicatorOpacity }}
                        className="absolute bottom-10 animate-bounce text-[#6B6B6B]"
                    >
                        <ChevronDown size={28} />
                    </motion.div>
                </motion.div>

                {/* FIX 4: Cinematic text during concert sequence (~40-70%) */}
                <ScrollText scrollRange={statementRange} className="px-6">
                    <h2 className="font-sora font-extrabold text-white text-center text-[28px] md:text-5xl lg:text-[72px] max-w-5xl leading-tight tracking-tighter [text-shadow:0_4px_20px_rgba(0,0,0,0.9)]">
                        {t('heroStatement')}
                    </h2>
                </ScrollText>
            </ImageSequenceCanvas>

            {/* ===== C. EN VIVO REVEAL ===== */}
            <section id="en-vivo" style={{ height: `${SECTIONS.enVivo.vh}vh` }}>
                <EnVivoReveal scrollRange={ranges.enVivo} />
            </section>

            {/* ===== D. PHONE MOCKUP SECTION (replaces cards) ===== */}
            <section id="como-funciona">
                <PhoneMockupSection />
            </section>

            {/* ===== E. ARTIST IMAGE SEQUENCE ===== */}
            <section id="para-artistas">
                <ImageSequenceCanvas folder="artist" frameCount={240} heightVh={300}>
                    {/* Artist title overlays the last ~40% of the sequence */}
                    <ScrollText
                        scrollRange={[
                            ranges.artist[0] + (ranges.artist[1] - ranges.artist[0]) * 0.6,
                            ranges.artist[1],
                        ]}
                        className="px-4"
                    >
                        <h2 className="font-sora font-extrabold text-white text-center text-[28px] md:text-5xl lg:text-[72px] leading-tight tracking-tighter max-w-4xl [text-shadow:0_4px_20px_rgba(0,0,0,0.9)]">
                            {t('artistsTitle')}
                        </h2>
                    </ScrollText>
                </ImageSequenceCanvas>
            </section>

            {/* ===== F. ARTIST PITCH TEXTS ===== */}
            <section style={{ height: `${SECTIONS.artistPitch.vh}vh` }}>
                {/* Text 1 */}
                <ScrollText scrollRange={subRange(ranges.artistPitch, 0, 3)} className="px-6">
                    <p className="font-sora font-bold text-white text-center text-[28px] md:text-5xl lg:text-[72px] max-w-4xl leading-tight drop-shadow-[0_0_30px_rgba(45,0,247,0.5)] [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
                        {t('artistsPitch1')}
                    </p>
                </ScrollText>

                {/* Text 2 — "EN VIVO" highlighted in Neon Red */}
                <ScrollText scrollRange={subRange(ranges.artistPitch, 1, 3)} className="px-6">
                    <p className="font-sora font-bold text-white text-center text-[28px] md:text-5xl lg:text-[72px] max-w-4xl leading-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
                        <span className="text-[#FF3366] drop-shadow-[0_0_30px_rgba(255,51,102,0.6)]">{t('enVivo')}</span>
                        {', '}
                        {t('artistsPitch2').split(',').slice(1).join(',').trim()}
                    </p>
                </ScrollText>

                {/* Text 3 */}
                <ScrollText scrollRange={subRange(ranges.artistPitch, 2, 3)} className="px-6">
                    <p className="font-sora font-bold text-white text-center text-[28px] md:text-5xl lg:text-[72px] max-w-4xl leading-tight drop-shadow-[0_0_30px_rgba(139,92,246,0.6)] [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
                        {t('artistsPitch3')}
                    </p>
                </ScrollText>
            </section>

            {/* ===== G. PARTICIPA + CTAs ===== */}
            <section style={{ height: `${SECTIONS.participate.vh}vh` }}>
                <ScrollText scrollRange={ranges.participate} interactive>
                    <div className="flex flex-col items-center text-center px-6">
                        <h2 className="font-sora font-extrabold text-white text-[28px] md:text-5xl lg:text-[72px] leading-tight tracking-tighter [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
                            {t('participateTitle')}
                        </h2>
                        <p className="font-sora text-[#A0A0A0] text-base md:text-lg max-w-xl mt-6">
                            {t('participateDesc')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 mt-10">
                            {/* FIX 9: Download is primary (first) */}
                            <a
                                href="#"
                                className="font-space-mono text-[13px] uppercase tracking-[2px]
                                    bg-[#2D00F7] text-white px-8 py-4
                                    hover:shadow-[0_0_25px_rgba(45,0,247,0.5)]
                                    active:scale-95 transition-all text-center"
                            >
                                {t('ctaFan')}
                            </a>
                            <button
                                onClick={() => setSignInOpen(true)}
                                className="font-space-mono text-[13px] uppercase tracking-[2px]
                                    border border-[#2A2A2A] text-white px-8 py-4
                                    hover:border-[#2D00F7] hover:shadow-[0_0_20px_rgba(45,0,247,0.3)]
                                    active:scale-95 transition-all text-center cursor-pointer"
                            >
                                {t('ctaOrganizer')}
                            </button>
                        </div>
                    </div>
                </ScrollText>
            </section>

            {/* ===== H. FOOTER (static, not scroll-animated) ===== */}
            <footer className="bg-[#121212] py-12 px-6 md:px-12">
                <div className="max-w-6xl mx-auto">
                    <Image
                        src="/fandi-logo.png"
                        alt="Fandi"
                        width={120}
                        height={40}
                        className="h-10 w-auto"
                    />
                    <div className="flex flex-wrap gap-6 mt-6">
                        <a
                            href="#"
                            className="font-space-mono text-[14px] text-[#A0A0A0] hover:text-white transition-colors"
                        >
                            {tFooter('terms')}
                        </a>
                        <a
                            href="#"
                            className="font-space-mono text-[14px] text-[#A0A0A0] hover:text-white transition-colors"
                        >
                            {tFooter('privacy')}
                        </a>
                        <a
                            href="mailto:hola@fandi.app"
                            className="font-space-mono text-[14px] text-[#A0A0A0] hover:text-white transition-colors"
                        >
                            {tFooter('contact')}
                        </a>
                    </div>
                    <p className="font-space-mono text-[14px] text-[#6B6B6B] mt-4">
                        {tFooter('madeIn')}
                    </p>
                    <p className="font-space-mono text-[14px] text-[#6B6B6B] mt-1">
                        {tFooter('copyright')}
                    </p>
                </div>
            </footer>
        </main>
    );
}
