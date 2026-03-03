'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface Props {
    scrollRange: [number, number];
}

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

    return (
        <motion.div
            style={{ opacity, y }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-20"
        >
            {/* Pulsing indicator */}
            <motion.div
                style={{ backgroundColor: color }}
                className="w-4 h-4 mr-4 animate-pulse"
            />
            {/* EN VIVO text */}
            <motion.h2
                style={{ color }}
                className="font-sora font-extrabold text-6xl md:text-8xl lg:text-[96px] tracking-tighter"
            >
                {t('enVivo')}
            </motion.h2>
        </motion.div>
    );
}
