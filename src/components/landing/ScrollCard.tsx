'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';

interface Props {
    children: React.ReactNode;
    scrollRange: [number, number];
    accent?: 'blue' | 'red';
    className?: string;
}

const noiseSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`;

export default function ScrollCard({
    children,
    scrollRange,
    accent = 'blue',
    className,
}: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll();
    const [start, end] = scrollRange;
    const span = end - start;

    // Scroll progress transforms
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

    // 3D Tilt properties
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), { damping: 30, stiffness: 200 });
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), { damping: 30, stiffness: 200 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXPos = e.clientX - rect.left;
        const mouseYPos = e.clientY - rect.top;
        const xPct = mouseXPos / width - 0.5; // -0.5 to 0.5
        const yPct = mouseYPos / height - 0.5; // -0.5 to 0.5
        mouseX.set(xPct);
        mouseY.set(yPct);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ opacity, y, scale, rotateX, rotateY, transformPerspective: 1200 }}
            className={`
        fixed top-[45%] md:top-1/2 left-1/2 -ml-[45vw] md:-ml-[28rem] -translate-y-1/2
        w-[90vw] max-w-4xl
        p-8 md:p-12 lg:p-16
        bg-[#121212]/70
        backdrop-blur-2xl
        border border-[#2A2A2A]
        overflow-hidden
        pointer-events-auto
        z-20 group drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]
        ${className ?? ''}
      `}
        >
            {/* Animated left border mixing Fandi colors */}
            <div className={`absolute inset-y-0 left-0 w-2 
        ${accent === 'red' ? 'bg-gradient-to-b from-[#FF3366] via-[#8B5CF6] to-[#FF3366]'
                    : 'bg-gradient-to-b from-[#2D00F7] via-[#8B5CF6] to-[#2D00F7]'}
        opacity-80 group-hover:opacity-100 transition-opacity duration-500
      `} />

            {/* Hover internal glow */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-screen
        ${accent === 'red' ? 'bg-[radial-gradient(circle_at_50%_50%,rgba(255,51,102,0.08),transparent_70%)]'
                    : 'bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.08),transparent_70%)]'}
      `} />

            {/* Noise texture */}
            <div
                className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
                style={{ backgroundImage: noiseSvg }}
            />

            {/* Content Container */}
            <div className="relative z-10 transition-transform duration-500 group-hover:scale-[1.02]">
                {children}
            </div>
        </motion.div>
    );
}
