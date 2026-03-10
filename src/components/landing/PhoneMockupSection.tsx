'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

const FEATURES = [
    {
        key: 'subastas',
        accent: '#FF3366',
        image: '/images/mockups/phone-subastas.png',
    },
    {
        key: 'oportunidades',
        accent: '#2D00F7',
        image: '/images/mockups/phone-oportunidades.png',
    },
    {
        key: 'insignias',
        accent: '#22C55E',
        image: '/images/mockups/phone-insignias.png',
    },
] as const;

export default function PhoneMockupSection() {
    const t = useTranslations('landing.mockup');
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end start'],
    });

    const activeIndexRaw = useTransform(scrollYProgress, [0, 1], [0, 2.99]);

    // Derive opacity for each feature
    const activeIndex0Opacity = useTransform(activeIndexRaw, (v) => (Math.round(v) === 0 ? 1 : 0));
    const activeIndex1Opacity = useTransform(activeIndexRaw, (v) => (Math.round(v) === 1 ? 1 : 0));
    const activeIndex2Opacity = useTransform(activeIndexRaw, (v) => (Math.round(v) === 2 ? 1 : 0));

    const opacities = [activeIndex0Opacity, activeIndex1Opacity, activeIndex2Opacity];

    // Indicator dot colors (must be called at top level, not inside map)
    const dot0Color = useTransform(activeIndexRaw, (v) => (Math.round(v) === 0 ? '#FFFFFF' : '#2A2A2A'));
    const dot1Color = useTransform(activeIndexRaw, (v) => (Math.round(v) === 1 ? '#FFFFFF' : '#2A2A2A'));
    const dot2Color = useTransform(activeIndexRaw, (v) => (Math.round(v) === 2 ? '#FFFFFF' : '#2A2A2A'));

    const dotColors = [dot0Color, dot1Color, dot2Color];

    return (
        <div ref={containerRef} style={{ height: '300vh' }}>
            <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20 px-6 max-w-6xl mx-auto w-full">

                    {/* Phone side */}
                    <div className="relative flex-none w-[260px] md:w-[320px] aspect-[9/19]">
                        {/* Colored glow behind phone */}
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={`glow-${f.key}`}
                                style={{ opacity: opacities[i] }}
                                className="absolute inset-0 rounded-[40px] blur-3xl -z-10"
                                aria-hidden
                            >
                                <div
                                    className="w-full h-full rounded-[40px]"
                                    style={{ backgroundColor: f.accent, opacity: 0.15 }}
                                />
                            </motion.div>
                        ))}

                        {/* Crossfading phone images */}
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={`phone-${f.key}`}
                                style={{ opacity: opacities[i] }}
                                className="absolute inset-0"
                            >
                                <Image
                                    src={f.image}
                                    alt={f.key}
                                    fill
                                    className="object-contain"
                                    sizes="320px"
                                    priority={i === 0}
                                />
                            </motion.div>
                        ))}
                    </div>

                    {/* Text side */}
                    <div className="flex-1 min-w-0 relative h-[200px] md:h-[240px]">
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={`text-${f.key}`}
                                style={{ opacity: opacities[i] }}
                                className="absolute inset-0 flex flex-col justify-center"
                            >
                                <h3
                                    className="font-sora font-extrabold text-4xl md:text-5xl lg:text-6xl tracking-tight"
                                    style={{ color: f.accent }}
                                >
                                    {t(`${f.key}Title`)}
                                </h3>
                                <p className="font-sora text-base md:text-lg lg:text-xl text-[#A0A0A0] mt-4 max-w-[450px] leading-relaxed">
                                    {t(`${f.key}Desc`)}
                                </p>
                            </motion.div>
                        ))}

                        {/* Indicator dots */}
                        <div className="absolute -bottom-12 left-0 flex gap-3">
                            {FEATURES.map((f, i) => (
                                <motion.div
                                    key={`dot-${f.key}`}
                                    className="w-3 h-3"
                                    style={{ backgroundColor: dotColors[i] }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
