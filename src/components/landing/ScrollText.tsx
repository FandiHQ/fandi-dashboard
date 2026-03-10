'use client';

import { motion, useScroll, useTransform } from 'framer-motion';

interface Props {
    children: React.ReactNode;
    scrollRange: [number, number];
    className?: string;
    interactive?: boolean;
}

export default function ScrollText({ children, scrollRange, className, interactive = false }: Props) {
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

    return (
        <motion.div
            style={{ opacity, y }}
            className={`fixed inset-0 flex items-center justify-center pointer-events-none z-10 ${className ?? ''}`}
        >
            <div className={interactive ? 'pointer-events-auto' : 'pointer-events-none'}>
                {children}
            </div>
        </motion.div>
    );
}
