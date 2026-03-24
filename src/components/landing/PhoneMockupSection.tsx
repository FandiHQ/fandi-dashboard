'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

/* ─── Feature config ─── */
const FEATURES = [
    { key: 'subastas', accent: '#FF3366', image: '/images/mockups/phone-subastas.png' },
    { key: 'oportunidades', accent: '#2D00F7', image: '/images/mockups/phone-oportunidades.png' },
    { key: 'insignias', accent: '#22C55E', image: '/images/mockups/phone-insignias.png' },
] as const;

/* ─── Blur-based transition: content blurs out/in, no text overlap ─── */
function featureVisibility(rawIndex: number, featureIndex: number): { opacity: number; blur: number } {
    const center = featureIndex + 0.5;
    const dist = Math.abs(rawIndex - center);
    // Active zone: dist < 0.35 = fully sharp and visible
    // Transition zone: 0.35 < dist < 0.5 = blur increases, opacity fades
    // Hidden: dist >= 0.5
    if (dist < 0.35) {
        return { opacity: 1, blur: 0 };
    } else if (dist < 0.5) {
        const t = (dist - 0.35) / 0.15; // 0→1 across transition zone
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
                <li className="flex items-center gap-3"><span className="text-2xl">🎸</span> {t('subastasBullet1')}</li>
                <li className="flex items-center gap-3"><span className="text-2xl">🎫</span> {t('subastasBullet2')}</li>
                <li className="flex items-center gap-3"><span className="text-2xl">🍽️</span> {t('subastasBullet3')}</li>
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
                <li className="flex items-center gap-3"><span className="text-2xl">🎸</span> {t('oportunidadesBullet1')}</li>
                <li className="flex items-center gap-3"><span className="text-2xl">🎫</span> {t('oportunidadesBullet2')}</li>
                <li className="flex items-center gap-3"><span className="text-2xl">🍽️</span> {t('oportunidadesBullet3')}</li>
            </ul>
            <p className="font-sora font-bold text-lg md:text-xl lg:text-2xl" style={{ color: accent }}>
                {t('oportunidadesMore')}
            </p>
            <p className="font-sora text-base md:text-lg lg:text-xl text-white/60 leading-relaxed">
                {t('oportunidadesBody')}
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

const TEXT_RENDERERS = [SubastasText, OportunidadesText, InsigniasText];

/* ─── Main component ─── */
export default function PhoneMockupSection() {
    const t = useTranslations('landing.mockup');
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end start'],
    });

    // Dead zone at start (8%) so content doesn't appear while EN VIVO fades out
    // Then weighted distribution: SUBASTAS and OPORTUNIDADES get equal share, INSIGNIAS gets 1.5x
    const rawIndex = useTransform(scrollYProgress, [0, 0.08, 0.33, 0.60, 1], [-0.5, 0, 1, 2, 3]);

    // Blur-based transitions: opacity + blur per feature
    const op0 = useTransform(rawIndex, (v) => featureVisibility(v, 0).opacity);
    const op1 = useTransform(rawIndex, (v) => featureVisibility(v, 1).opacity);
    const op2 = useTransform(rawIndex, (v) => featureVisibility(v, 2).opacity);
    const opacities = [op0, op1, op2];

    const blur0 = useTransform(rawIndex, (v) => `blur(${featureVisibility(v, 0).blur}px)`);
    const blur1 = useTransform(rawIndex, (v) => `blur(${featureVisibility(v, 1).blur}px)`);
    const blur2 = useTransform(rawIndex, (v) => `blur(${featureVisibility(v, 2).blur}px)`);
    const blurs = [blur0, blur1, blur2];

    // Phone images: swap ONLY after the next text is fully sharp (offset +0.15)
    // Text becomes sharp at center ± 0.35, so switch at featureBoundary + 0.15
    const phoneOp0 = useTransform(rawIndex, (v) => (v >= -0.1 && v < 1.15) ? 1 : 0);
    const phoneOp1 = useTransform(rawIndex, (v) => (v >= 1.15 && v < 2.15) ? 1 : 0);
    const phoneOp2 = useTransform(rawIndex, (v) => (v >= 2.15) ? 1 : 0);
    const phoneOpacities = [phoneOp0, phoneOp1, phoneOp2];

    // Neon tab: active = full glow, inactive = dimmed
    const labelOp0 = useTransform(rawIndex, (v) => featureVisibility(v, 0).opacity > 0.5 ? 1 : 0.25);
    const labelOp1 = useTransform(rawIndex, (v) => featureVisibility(v, 1).opacity > 0.5 ? 1 : 0.25);
    const labelOp2 = useTransform(rawIndex, (v) => featureVisibility(v, 2).opacity > 0.5 ? 1 : 0.25);
    const labelOpacities = [labelOp0, labelOp1, labelOp2];

    const labelScale0 = useTransform(rawIndex, (v) => featureVisibility(v, 0).opacity > 0.5 ? 1.15 : 1);
    const labelScale1 = useTransform(rawIndex, (v) => featureVisibility(v, 1).opacity > 0.5 ? 1.15 : 1);
    const labelScale2 = useTransform(rawIndex, (v) => featureVisibility(v, 2).opacity > 0.5 ? 1.15 : 1);
    const labelScales = [labelScale0, labelScale1, labelScale2];

    // ─── Staged entrance ───
    // Phase 1: Neon tabs fade in alone (0→4% of scroll)
    const tabsEntrance = useTransform(scrollYProgress, [0, 0.04], [0, 1]);
    // Phase 2: Phone + text slide up and fade in (4→8%)
    const contentEntrance = useTransform(scrollYProgress, [0.04, 0.08], [0, 1]);
    const contentY = useTransform(scrollYProgress, [0.04, 0.08], [30, 0]);

    return (
        <div ref={containerRef} style={{ height: '550vh' }} role="region" aria-label="Features showcase">
            {/* Sticky viewport */}
            <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden pt-14 md:pt-16">

                {/* ─── Main content: phone + (neon tabs + text) ─── */}
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-20 px-6 md:px-10 max-w-7xl mx-auto w-full">

                    {/* Phone side — wrapped in entrance animation */}
                    <motion.div
                        style={{ opacity: contentEntrance, y: contentY }}
                        className="relative flex-none w-[200px] md:w-[360px] lg:w-[400px] aspect-[9/19]"
                    >
                        {/* Colored glow */}
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={`glow-${f.key}`}
                                style={{ opacity: opacities[i] }}
                                className="absolute inset-0 rounded-[40px] blur-3xl -z-10"
                                aria-hidden="true"
                            >
                                <div
                                    className="w-full h-full rounded-[40px]"
                                    style={{ backgroundColor: f.accent, opacity: 0.25 }}
                                />
                            </motion.div>
                        ))}

                        {/* Phone images — instant swap, no effect */}
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={`phone-${f.key}`}
                                style={{ opacity: phoneOpacities[i] }}
                                className="absolute inset-0"
                            >
                                <Image
                                    src={f.image}
                                    alt={`${f.key} feature mockup`}
                                    fill
                                    className="object-contain"
                                    sizes="(max-width: 768px) 200px, 400px"
                                    priority={i === 0}
                                />
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Text side: neon tabs on TOP of headings, then content */}
                    <div className="flex-1 min-w-0 flex flex-col gap-4 md:gap-6">

                        {/* ─── Neon card tabs — Phase 1: appear first ─── */}
                        <motion.div
                            style={{ opacity: tabsEntrance }}
                            className="flex items-center gap-3 md:gap-6"
                        >
                            {FEATURES.map((f, i) => (
                                <motion.div
                                    key={`tab-${f.key}`}
                                    style={{
                                        opacity: labelOpacities[i],
                                        scale: labelScales[i],
                                        borderColor: f.accent,
                                        backgroundColor: `${f.accent}15`,
                                        boxShadow: `0 0 12px ${f.accent}40, 0 0 30px ${f.accent}20, inset 0 0 8px ${f.accent}10`,
                                    }}
                                    className="px-3 py-1.5 md:px-5 md:py-2.5 rounded-md border transition-all duration-300"
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
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* ─── Feature text — Phase 2: slides up after tabs ─── */}
                        <motion.div
                            style={{ opacity: contentEntrance, y: contentY }}
                            className="relative h-[320px] md:h-[450px] lg:h-[500px]"
                        >
                            {FEATURES.map((f, i) => {
                                const TextRenderer = TEXT_RENDERERS[i];
                                return (
                                    <motion.div
                                        key={`text-${f.key}`}
                                        style={{ opacity: opacities[i], filter: blurs[i] }}
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
