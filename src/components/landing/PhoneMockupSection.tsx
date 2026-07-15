'use client';

import { useCallback, useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

/* ─── Feature config — REAL app captures (device bezel included) ─── */
const FEATURES = [
    { key: 'subastas', accent: '#FF3366', image: '/images/mockups/Frames_Android/auction_detail.png' },
    { key: 'oportunidades', accent: '#2D00F7', image: '/images/mockups/Frames_Android/opportunity_detail.png' },
    { key: 'ranking', accent: '#CCFF00', image: '/images/mockups/Frames_Android/artist_profile_ranking.png' },
    { key: 'insignias', accent: '#22C55E', image: '/images/mockups/Frames_Android/fan_related_artist_profile.png' },
] as const;

const FEATURE_COUNT = FEATURES.length;
/** Keep in sync with SECTIONS.mockup.vh in page.tsx. */
export const MOCKUP_SECTION_VH = 650;

/* ─── Blur-based transition: content blurs out/in, no text overlap ─── */
function featureVisibility(rawIndex: number, featureIndex: number): { opacity: number; blur: number } {
    const center = featureIndex + 0.5;
    const dist = Math.abs(rawIndex - center);
    if (dist < 0.35) {
        return { opacity: 1, blur: 0 };
    } else if (dist < 0.5) {
        const t = (dist - 0.35) / 0.15;
        return { opacity: 1 - t, blur: t * 8 };
    }
    return { opacity: 0, blur: 8 };
}

/* ─── Per-feature text renderers ─── */
function SubastasText({ t, accent }: { t: (key: string) => string; accent: string }) {
    return (
        <div className="flex flex-col gap-3 md:gap-5">
            <h3
                className="animate-glitch font-sora font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-none"
                style={{ color: accent, textShadow: `0 0 40px ${accent}40` }}
            >
                {t('subastasTitle')}
            </h3>
            <p className="font-sora text-base md:text-xl lg:text-2xl text-white/70 italic leading-relaxed">
                {t('subastasSubheading')}
            </p>
            <ul className="flex flex-col gap-2.5 font-sora text-base md:text-xl lg:text-2xl text-white">
                <li className="flex items-center gap-3"><span className="font-space-mono text-sm" style={{ color: accent }}>[01]</span> {t('subastasBullet1')}</li>
                <li className="flex items-center gap-3"><span className="font-space-mono text-sm" style={{ color: accent }}>[02]</span> {t('subastasBullet2')}</li>
                <li className="flex items-center gap-3"><span className="font-space-mono text-sm" style={{ color: accent }}>[03]</span> {t('subastasBullet3')}</li>
            </ul>
            <p
                className="font-sora font-bold text-xl md:text-2xl lg:text-3xl"
                style={{ color: accent, textShadow: `0 0 30px ${accent}50` }}
            >
                {t('subastasTagline')}
            </p>
        </div>
    );
}

function OportunidadesText({ t, accent }: { t: (key: string) => string; accent: string }) {
    return (
        <div className="flex flex-col gap-3 md:gap-5">
            <h3
                className="animate-glitch font-sora font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-none"
                style={{ color: accent, textShadow: `0 0 40px ${accent}40` }}
            >
                {t('oportunidadesTitle')}
            </h3>
            <p className="font-sora text-base md:text-xl lg:text-2xl text-white/70 italic leading-relaxed">
                {t('oportunidadesSubheading')}
            </p>
            <ul className="flex flex-col gap-2.5 font-sora text-base md:text-xl lg:text-2xl text-white">
                <li className="flex items-center gap-3"><span className="font-space-mono text-sm" style={{ color: accent }}>[01]</span> {t('oportunidadesBullet1')}</li>
                <li className="flex items-center gap-3"><span className="font-space-mono text-sm" style={{ color: accent }}>[02]</span> {t('oportunidadesBullet2')}</li>
                <li className="flex items-center gap-3"><span className="font-space-mono text-sm" style={{ color: accent }}>[03]</span> {t('oportunidadesBullet3')}</li>
            </ul>
            <p className="font-sora font-bold text-lg md:text-xl lg:text-2xl" style={{ color: accent }}>
                {t('oportunidadesMore')}
            </p>
            <p
                className="font-space-mono text-xs md:text-sm lg:text-base uppercase tracking-[3px] font-bold"
                style={{ color: accent, textShadow: `0 0 20px ${accent}50` }}
            >
                {t('oportunidadesTagline')}
            </p>
        </div>
    );
}

function RankingText({ t, accent }: { t: (key: string) => string; accent: string }) {
    return (
        <div className="flex flex-col gap-3 md:gap-5">
            <h3
                className="animate-glitch font-sora font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-none"
                style={{ color: accent, textShadow: `0 0 40px ${accent}40` }}
            >
                {t('rankingTitle')}
            </h3>
            <p className="font-sora text-base md:text-xl lg:text-2xl text-white/70 italic leading-relaxed">
                {t('rankingSubheading')}
            </p>
            <ul className="flex flex-col gap-2.5 font-sora text-base md:text-xl lg:text-2xl text-white">
                <li className="flex items-center gap-3"><span className="font-space-mono text-sm" style={{ color: accent }}>[01]</span> {t('rankingBullet1')}</li>
                <li className="flex items-center gap-3"><span className="font-space-mono text-sm" style={{ color: accent }}>[02]</span> {t('rankingBullet2')}</li>
                <li className="flex items-center gap-3"><span className="font-space-mono text-sm" style={{ color: accent }}>[03]</span> {t('rankingBullet3')}</li>
            </ul>
            {/* Tier ladder — the LOCKED loyalty bands, straight from the app */}
            <div className="flex flex-wrap gap-2 md:gap-3">
                {[
                    { label: 'LEYENDA', color: '#FF0055' },
                    { label: 'ÉLITE', color: '#6C63FF' },
                    { label: 'SUPERFAN', color: '#CCFF00' },
                    { label: 'FAN REAL', color: '#FFFFFF' },
                ].map((tier) => (
                    <span
                        key={tier.label}
                        className="font-space-mono text-[10px] md:text-xs uppercase tracking-[2px] border px-2.5 py-1"
                        style={{ color: tier.color, borderColor: `${tier.color}66` }}
                    >
                        {tier.label}
                    </span>
                ))}
            </div>
            <p
                className="font-sora font-bold text-xl md:text-2xl lg:text-3xl"
                style={{ color: accent, textShadow: `0 0 30px ${accent}50` }}
            >
                {t('rankingTagline')}
            </p>
        </div>
    );
}

function InsigniasText({ t, accent }: { t: (key: string) => string; accent: string }) {
    return (
        <div className="flex flex-col gap-3 md:gap-5">
            <h3
                className="animate-glitch font-sora font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-none"
                style={{ color: accent, textShadow: `0 0 40px ${accent}40` }}
            >
                {t('insigniasTitle')}
            </h3>
            <p className="font-sora text-base md:text-xl lg:text-2xl text-white/80 leading-relaxed">
                {t('insigniasBody')}
            </p>
            <p
                className="font-sora font-bold text-xl md:text-2xl lg:text-3xl animate-pulse"
                style={{ color: accent, textShadow: `0 0 30px ${accent}50` }}
            >
                {t('insigniasTagline')}
            </p>
        </div>
    );
}

const TEXT_RENDERERS = [SubastasText, OportunidadesText, RankingText, InsigniasText];

/* ─── Per-feature motion values (custom hook, called once per index) ─── */
function useFeatureMotion(rawIndex: MotionValue<number>, i: number) {
    return {
        opacity: useTransform(rawIndex, (v) => featureVisibility(v, i).opacity),
        blur: useTransform(rawIndex, (v) => `blur(${featureVisibility(v, i).blur}px)`),
        phone: useTransform(rawIndex, (v) => {
            if (i === 0) return v >= -0.1 && v < 1.15 ? 1 : 0;
            if (i === FEATURE_COUNT - 1) return v >= i + 0.15 ? 1 : 0;
            return v >= i + 0.15 && v < i + 1.15 ? 1 : 0;
        }),
        label: useTransform(rawIndex, (v) => (featureVisibility(v, i).opacity > 0.5 ? 1 : 0.25)),
        labelScale: useTransform(rawIndex, (v) => (featureVisibility(v, i).opacity > 0.5 ? 1.15 : 1)),
    };
}

/* ─── Main component ─── */
export default function PhoneMockupSection() {
    const t = useTranslations('landing.mockup');
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end start'],
    });

    // Dead zone at start (8%) so content doesn't appear while EN VIVO fades out.
    // Even distribution across the 4 features after that.
    const rawIndex = useTransform(
        scrollYProgress,
        [0, 0.08, 0.31, 0.54, 0.77, 1],
        [-0.5, 0, 1, 2, 3, 4],
    );

    // One explicit hook call per feature (FEATURES is a fixed 4-tuple)
    // keeps rules-of-hooks satisfied without dynamic hook creation.
    const vis0 = useFeatureMotion(rawIndex, 0);
    const vis1 = useFeatureMotion(rawIndex, 1);
    const vis2 = useFeatureMotion(rawIndex, 2);
    const vis3 = useFeatureMotion(rawIndex, 3);
    const vis = [vis0, vis1, vis2, vis3];

    // ─── Staged entrance ───
    const tabsEntrance = useTransform(scrollYProgress, [0, 0.04], [0, 1]);
    const contentEntrance = useTransform(scrollYProgress, [0.04, 0.08], [0, 1]);
    const contentY = useTransform(scrollYProgress, [0.04, 0.08], [30, 0]);

    // Tabs are BUTTONS: clicking scrolls the window to that feature's
    // slice of this pinned section — direct navigation instead of
    // forcing the user to scrub scroll until the right beat appears.
    const scrollToFeature = useCallback((index: number) => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const sectionTop = window.scrollY + rect.top;
        const scrollable = el.offsetHeight - window.innerHeight;
        // Progress fractions mirroring the rawIndex keyframes above:
        const targets = [0.16, 0.4, 0.63, 0.86];
        window.scrollTo({
            top: sectionTop + scrollable * (targets[index] ?? 0),
            behavior: 'smooth',
        });
    }, []);

    return (
        <div ref={containerRef} style={{ height: `${MOCKUP_SECTION_VH}vh` }} role="region" aria-label="Features showcase">
            {/* Sticky viewport */}
            <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden pt-14 md:pt-16">

                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-20 px-6 md:px-10 max-w-7xl mx-auto w-full">

                    {/* ─── Phone side — real capture framed by HUD brackets ─── */}
                    <motion.div
                        style={{ opacity: contentEntrance, y: contentY }}
                        className="relative flex-none w-[190px] md:w-[340px] lg:w-[380px] aspect-[9/19]"
                    >
                        {/* Colored glow */}
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={`glow-${f.key}`}
                                style={{ opacity: vis[i]!.opacity }}
                                className="absolute inset-0 rounded-[40px] blur-3xl -z-10"
                                aria-hidden="true"
                            >
                                <div
                                    className="w-full h-full rounded-[40px]"
                                    style={{ backgroundColor: f.accent, opacity: 0.25 }}
                                />
                            </motion.div>
                        ))}

                        {/* HUD corner brackets anchor the device to the design system */}
                        <div className="hud-brackets absolute -inset-3 md:-inset-5 pointer-events-none" aria-hidden="true" />

                        {/* Real app captures — instant swap */}
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={`phone-${f.key}`}
                                style={{ opacity: vis[i]!.phone }}
                                className="absolute inset-0"
                            >
                                <Image
                                    src={f.image}
                                    alt={`Fandi app — ${f.key}`}
                                    fill
                                    className="object-contain"
                                    sizes="(max-width: 768px) 190px, 380px"
                                    priority={i === 0}
                                />
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* ─── Text side ─── */}
                    <div className="flex-1 min-w-0 flex flex-col gap-4 md:gap-6">

                        {/* Neon tabs — now clickable navigation */}
                        <motion.div
                            style={{ opacity: tabsEntrance }}
                            className="flex flex-wrap items-center gap-2.5 md:gap-4"
                            role="tablist"
                            aria-label="App features"
                        >
                            {FEATURES.map((f, i) => (
                                <motion.button
                                    key={`tab-${f.key}`}
                                    type="button"
                                    onClick={() => scrollToFeature(i)}
                                    style={{
                                        opacity: vis[i]!.label,
                                        scale: vis[i]!.labelScale,
                                        borderColor: f.accent,
                                        backgroundColor: `${f.accent}15`,
                                        boxShadow: `0 0 12px ${f.accent}40, 0 0 30px ${f.accent}20, inset 0 0 8px ${f.accent}10`,
                                    }}
                                    className="px-3 py-1.5 md:px-5 md:py-2.5 border transition-all duration-300 cursor-pointer"
                                    role="tab"
                                >
                                    <span
                                        className="font-space-mono text-[10px] md:text-xs lg:text-sm uppercase tracking-[2px] md:tracking-[3px] font-bold whitespace-nowrap"
                                        style={{
                                            color: f.accent,
                                            textShadow: `0 0 10px ${f.accent}80, 0 0 25px ${f.accent}40`,
                                        }}
                                    >
                                        {t(`${f.key}Title`)}
                                    </span>
                                </motion.button>
                            ))}
                        </motion.div>

                        {/* Feature text */}
                        <motion.div
                            style={{ opacity: contentEntrance, y: contentY }}
                            className="relative h-[340px] md:h-[460px] lg:h-[500px]"
                        >
                            {FEATURES.map((f, i) => {
                                const TextRenderer = TEXT_RENDERERS[i]!;
                                return (
                                    <motion.div
                                        key={`text-${f.key}`}
                                        style={{ opacity: vis[i]!.opacity, filter: vis[i]!.blur }}
                                        className="absolute inset-0 flex flex-col justify-center"
                                    >
                                        <TextRenderer t={t} accent={f.accent} />
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
