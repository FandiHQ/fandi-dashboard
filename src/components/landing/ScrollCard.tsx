'use client';

import { motion, useScroll, useTransform } from 'framer-motion';

interface Props {
    children: React.ReactNode;
    scrollRange: [number, number];
    accent?: 'blue' | 'red';
    className?: string;
}

export default function ScrollCard({
    children,
    scrollRange,
    accent = 'blue',
    className,
}: Props) {
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
        [start, start + span * 0.15, end - span * 0.15, end],
        [120, 0, 0, -120]
    );
    const scale = useTransform(
        scrollYProgress,
        [start, start + span * 0.2, end - span * 0.2, end],
        [0.92, 1, 1, 0.92]
    );

    return (
        <motion.div
            style={{ opacity, y, scale }}
            className={`
        fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        w-[90vw] max-w-4xl
        p-8 md:p-12 lg:p-16
        bg-[#121212]/80
        backdrop-blur-xl
        border border-[#2A2A2A]
        ${accent === 'red'
                    ? 'border-l-4 border-l-[#FF3366] shadow-[0_0_40px_rgba(255,51,102,0.15)]'
                    : 'border-l-4 border-l-[#2D00F7] shadow-[0_0_40px_rgba(45,0,247,0.15)]'
                }
        pointer-events-none
        z-20
        ${className ?? ''}
      `}
        >
            {children}
        </motion.div>
    );
}
