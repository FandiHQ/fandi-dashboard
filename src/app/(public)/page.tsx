'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown, Coins, Trophy, Gavel, Check } from 'lucide-react';

import ImageSequenceCanvas from '@/components/landing/ImageSequenceCanvas';
import ScrollText from '@/components/landing/ScrollText';
import ScrollCard from '@/components/landing/ScrollCard';
import EnVivoReveal from '@/components/landing/EnVivoReveal';
import LandingNav from '@/components/landing/LandingNav';

/* ─── Scroll range calculations ─── */
const SECTIONS = {
    concert: { vh: 400 },
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
    const heroOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);
    const heroDisplay = useTransform(scrollYProgress, (v) => (v >= 0.05 ? 'none' : 'flex'));
    const heroY = useTransform(scrollYProgress, [0, 0.05], [0, -100]);

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

            {/* ===== A & B. COMBINED HERO & CONCERT IMAGE SEQUENCE ===== */}
            <ImageSequenceCanvas folder="concert" frameCount={240} heightVh={SECTIONS.concert.vh}>
                {/* Hero Overlay */}
                <motion.div
                    style={{ opacity: heroOpacity, y: heroY, display: heroDisplay }}
                    className="absolute inset-0 flex-col items-center justify-center px-4 z-20 pointer-events-auto"
                >
                    {/* Background: subtle radial gradient to ensure text readability against the first video frame */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(18,18,18,0.7)_0%,rgba(0,0,0,0.9)_80%)] pointer-events-none" />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center text-center">
                        {/* Purple Masked Fandi Logo */}
                        <div
                            className="w-[60vw] max-w-[400px] md:w-[40vw] h-[16vw] md:h-[130px] bg-[#8B5CF6] drop-shadow-2xl"
                            style={{
                                maskImage: 'url(/fandi-logo.svg)',
                                WebkitMaskImage: 'url(/fandi-logo.svg)',
                                maskSize: 'contain',
                                WebkitMaskSize: 'contain',
                                maskRepeat: 'no-repeat',
                                WebkitMaskRepeat: 'no-repeat',
                                maskPosition: 'center',
                                WebkitMaskPosition: 'center',
                            }}
                        />
                        <p className="font-space-mono text-[#A0A0A0] text-sm md:text-lg uppercase tracking-[3px] mt-6 max-w-lg drop-shadow-md">
                            {t('subtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 mt-10">
                            <a
                                href="#para-fans"
                                className="font-space-mono text-[11px] uppercase tracking-[2px]
                bg-[#2D00F7] text-white px-8 py-4
                hover:bg-[#8B5CF6] transition-colors text-center shadow-[0_0_20px_rgba(45,0,247,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)]"
                            >
                                {t('ctaFan')}
                            </a>
                            <a
                                href="/login"
                                className="font-space-mono text-[11px] uppercase tracking-[2px]
                border border-[#2A2A2A] text-white px-8 py-4 backdrop-blur-md bg-black/30
                hover:border-[#8B5CF6] transition-colors text-center"
                            >
                                {t('ctaOrganizer')}
                            </a>
                        </div>
                    </div>

                    <motion.div
                        style={{ opacity: scrollIndicatorOpacity }}
                        className="absolute bottom-10 animate-bounce text-[#6B6B6B]"
                    >
                        <ChevronDown size={24} />
                    </motion.div>
                </motion.div>
            </ImageSequenceCanvas>

            {/* ===== C. EN VIVO REVEAL ===== */}
            <section id="en-vivo" style={{ height: `${SECTIONS.enVivo.vh}vh` }}>
                <EnVivoReveal scrollRange={ranges.enVivo} />
            </section>

            {/* ===== D. THREE PRODUCT CARDS ===== */}
            <section id="para-fans" style={{ height: `${SECTIONS.cards.vh}vh` }}>
                {/* Card 1: Fandies — Deep Translucent with massive rate focus on the right */}
                <ScrollCard scrollRange={subRange(ranges.cards, 0, 3)} accent="blue">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-12 relative z-10 w-full h-full">

                        {/* Left Side: Title & Desc */}
                        <div className="flex-1 space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2D00F7]/20 border border-[#2D00F7]/40">
                                <Coins size={14} className="text-[#2D00F7]" />
                                <span className="font-space-mono text-xs text-[#2D00F7] uppercase tracking-wider font-bold">Economía Fandi</span>
                            </div>

                            <h2 className="font-sora font-extrabold text-4xl md:text-5xl lg:text-7xl text-white tracking-tight leading-none drop-shadow-lg">
                                {t('fandiesTitle')}
                            </h2>
                            <p className="font-space-mono text-sm md:text-base text-[#A0A0A0] leading-relaxed max-w-sm">
                                {t('fandiesDesc')}
                            </p>
                        </div>

                        {/* Right Side: Massive Rate Focus */}
                        <div className="flex-none p-6 md:p-8 rounded-2xl bg-[#000000]/40 border border-white/5 backdrop-blur-3xl shadow-inner relative overflow-hidden group/rate">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,0,247,0.3),transparent_70%)] opacity-30 group-hover/rate:opacity-60 transition-opacity duration-500" />
                            <p className="font-sora font-bold text-5xl md:text-7xl text-transparent bg-clip-text bg-gradient-to-br from-[#2D00F7] to-[#8B5CF6] tracking-tighter">
                                $5<span className="text-3xl md:text-5xl">K</span>
                            </p>
                            <p className="font-space-mono text-xs md:text-sm text-[#6B6B6B] uppercase tracking-widest mt-2">
                                = 1 Fandi (COP)
                            </p>
                        </div>

                    </div>
                </ScrollCard>

                {/* Card 2: Contributions / Escuadras — Structured Tiered Layout */}
                <ScrollCard scrollRange={subRange(ranges.cards, 1, 3)} accent="blue">
                    <div className="relative z-10 w-full h-full">
                        {/* Header Area */}
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2D00F7] to-[#8B5CF6] flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                                <Trophy size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="font-sora font-extrabold text-3xl md:text-5xl lg:text-6xl text-white tracking-tight">
                                    {t('contributionsTitle')}
                                </h2>
                                <p className="font-space-mono text-sm text-[#A0A0A0] mt-1 tracking-wider uppercase">
                                    {t('contributionsPrice')}
                                </p>
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="h-[1px] w-full bg-gradient-to-r from-[#2A2A2A] via-[#2A2A2A] to-transparent mb-8" />

                        {/* Benefits Checklist */}
                        <div className="space-y-4">
                            {[t('contributionsBenefit1'), t('contributionsBenefit2'), t('contributionsBenefit3')].map((benefit, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors group">
                                    <div className="mt-1 bg-[#1A1A1A] group-hover:bg-[#2D00F7]/20 p-1.5 rounded-full transition-colors border border-white/5 group-hover:border-[#2D00F7]/50">
                                        <Check size={14} className="text-[#6B6B6B] group-hover:text-[#2D00F7] transition-colors" />
                                    </div>
                                    <p className="font-sora text-base md:text-lg text-[#A0A0A0] group-hover:text-white transition-colors">
                                        {benefit.replace('→ ', '')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </ScrollCard>

                {/* Card 3: Auctions — High-Urgency Centered Aesthetic */}
                <ScrollCard scrollRange={subRange(ranges.cards, 2, 3)} accent="red" className="!bg-[#050505]/95 border-y-0 !border-r-0 !border-l-4 !border-l-[#FF3366] shadow-[0_0_80px_rgba(255,51,102,0.1)]">

                    {/* Top Laser Accent */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#FF3366] to-transparent opacity-50" />

                    <div className="relative z-10 flex flex-col items-center text-center w-full h-full py-4">

                        {/* Custom Pulsating LIVE Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF3366]/10 border border-[#FF3366]/30 mb-8">
                            <div className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF3366] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF3366]"></span>
                            </div>
                            <span className="font-space-mono text-xs text-[#FF3366] font-bold tracking-[0.2em]">{t('enVivo')}</span>
                        </div>

                        {/* Icon & Title */}
                        <div className="w-20 h-20 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,51,102,0.2)]">
                            <Gavel size={32} className="text-white drop-shadow-[0_0_10px_rgba(255,51,102,0.8)]" />
                        </div>

                        <h2 className="font-sora font-extrabold text-4xl md:text-5xl lg:text-7xl text-white tracking-tight drop-shadow-lg mb-6">
                            {t('auctionsTitle')}
                        </h2>

                        <p className="font-space-mono text-sm md:text-base text-[#A0A0A0] leading-relaxed max-w-xl mx-auto">
                            {t('auctionsDesc')}
                        </p>
                    </div>

                    {/* Bottom Laser Accent */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#FF3366] to-transparent opacity-50" />
                </ScrollCard>
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
                        <h2 className="font-sora font-extrabold text-white text-center text-3xl md:text-5xl lg:text-7xl leading-tight tracking-tighter max-w-4xl">
                            {t('artistsTitle')}
                        </h2>
                    </ScrollText>
                </ImageSequenceCanvas>
            </section>

            {/* ===== F. ARTIST PITCH TEXTS ===== */}
            <section style={{ height: `${SECTIONS.artistPitch.vh}vh` }}>
                {/* Text 1 */}
                <ScrollText scrollRange={subRange(ranges.artistPitch, 0, 3)} className="px-6">
                    <p className="font-sora font-bold text-white text-center text-xl md:text-3xl lg:text-5xl max-w-4xl leading-tight drop-shadow-[0_0_30px_rgba(45,0,247,0.5)]">
                        {t('artistsPitch1')}
                    </p>
                </ScrollText>

                {/* Text 2 — "EN VIVO" highlighted in Neon Red */}
                <ScrollText scrollRange={subRange(ranges.artistPitch, 1, 3)} className="px-6">
                    <p className="font-sora font-bold text-white text-center text-xl md:text-3xl lg:text-5xl max-w-4xl leading-tight">
                        <span className="text-[#FF3366] drop-shadow-[0_0_30px_rgba(255,51,102,0.6)]">{t('enVivo')}</span>
                        {', '}
                        {t('artistsPitch2').split(',').slice(1).join(',').trim()}
                    </p>
                </ScrollText>

                {/* Text 3 */}
                <ScrollText scrollRange={subRange(ranges.artistPitch, 2, 3)} className="px-6">
                    <p className="font-sora font-bold text-white text-center text-xl md:text-3xl lg:text-5xl max-w-4xl leading-tight drop-shadow-[0_0_30px_rgba(139,92,246,0.6)]">
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
