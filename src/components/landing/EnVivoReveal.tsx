'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface Props {
    scrollRange: [number, number];
}

const DOTS = Array.from({ length: 20 });

export default function EnVivoReveal({ scrollRange }: Props) {
    const t = useTranslations('landing');
    const { scrollYProgress } = useScroll();
    const [start, end] = scrollRange;
    const span = end - start;

    const opacity = useTransform(
        scrollYProgress,
        [start, start + span * 0.2, end - span * 0.2, end],
        [0, 1, 1, 0]
    );
    const y = useTransform(
        scrollYProgress,
        [start, start + span * 0.2, end - span * 0.2, end],
        [40, 0, 0, -40]
    );
    const color = useTransform(
        scrollYProgress,
        [start, start + span * 0.5, end],
        ['#FF3366', '#8B5CF6', '#2D00F7']
    );

    // Dot row movement driven by scroll progress (local)
    const localProgress = useTransform(scrollYProgress, [start, end], [0, 1]);
    const blueRowX = useTransform(localProgress, [0, 1], ['-20%', '20%']);
    const redRowX = useTransform(localProgress, [0, 1], ['20%', '-20%']);

    return (
        <motion.div
            style={{ opacity, y }}
            className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none z-20 px-6"
        >
            {/* Top Dot Row — Electric Blue, translates RIGHT */}
            <motion.div style={{ x: blueRowX }} className="flex gap-2 mb-8">
                {DOTS.map((_, i) => (
                    <div
                        key={i}
                        className="w-2 h-2 bg-[#2D00F7] animate-pulse"
                        style={{ animationDelay: `${i * 80}ms` }}
                    />
                ))}
            </motion.div>

            {/* Main text — centered */}
            <motion.h2
                style={{ color }}
                className="font-sora font-extrabold text-4xl md:text-6xl lg:text-[80px] tracking-tighter text-center max-w-5xl leading-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]"
            >
                {t('enVivoFull')}
            </motion.h2>

            {/* Bottom Dot Row — Neon Red, translates LEFT */}
            <motion.div style={{ x: redRowX }} className="flex gap-2 mt-8">
                {DOTS.map((_, i) => (
                    <div
                        key={i}
                        className="w-2 h-2 bg-[#FF3366] animate-pulse"
                        style={{ animationDelay: `${i * 80}ms` }}
                    />
                ))}
            </motion.div>
        </motion.div>
    );
}
