'use client';

import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';

/**
 * HUD scroll rail — the landing is ~2000vh of pinned scroll scenes
 * with zero orientation. This fixed right-side rail shows where you
 * are (tactical progress bar + mono section labels) and jumps on
 * click. Desktop only; hidden from screen readers except as nav.
 */
export interface RailStop {
    /** i18n key inside landing.rail */
    key: string;
    /** scrollYProgress fraction where the section starts */
    at: number;
    /** element id to scroll to (must exist in the page) */
    anchor: string;
}

export default function ScrollProgressRail({ stops }: { stops: RailStop[] }) {
    const t = useTranslations('landing.rail');
    const { scrollYProgress } = useScroll();
    const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
    const fill = useTransform(smooth, [0, 1], ['0%', '100%']);

    const jump = (anchor: string) => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <nav
            aria-label="Page sections"
            className="fixed right-5 top-1/2 -translate-y-1/2 z-[90] hidden lg:flex flex-col items-end gap-0"
        >
            <div className="relative h-[260px] w-[2px] bg-white/10">
                <motion.div
                    style={{ height: fill }}
                    className="absolute top-0 left-0 w-full bg-[#CCFF00] shadow-[0_0_8px_rgba(204,255,0,0.8)]"
                    aria-hidden="true"
                />
                {stops.map((stop) => (
                    <RailDot key={stop.key} stop={stop} onJump={jump} label={t(stop.key)} />
                ))}
            </div>
        </nav>
    );
}

function RailDot({
    stop,
    label,
    onJump,
}: {
    stop: RailStop;
    label: string;
    onJump: (anchor: string) => void;
}) {
    const { scrollYProgress } = useScroll();
    // Active while we're within ±6% of the stop.
    const active = useTransform(scrollYProgress, (v) => Math.abs(v - stop.at) < 0.06);
    const color = useTransform(active, (a) => (a ? '#CCFF00' : 'rgba(255,255,255,0.35)'));
    const labelOpacity = useTransform(active, (a) => (a ? 1 : 0));

    return (
        <div
            className="absolute -left-[5px] flex items-center"
            style={{ top: `${stop.at * 100}%` }}
        >
            <motion.span
                style={{ opacity: labelOpacity }}
                className="absolute right-5 font-space-mono text-[10px] uppercase tracking-[2px] text-[#CCFF00] whitespace-nowrap pointer-events-none"
                aria-hidden="true"
            >
                {label}
            </motion.span>
            <motion.button
                type="button"
                onClick={() => onJump(stop.anchor)}
                aria-label={label}
                style={{ backgroundColor: color }}
                className="h-3 w-3 border border-black cursor-pointer transition-transform hover:scale-150"
            />
        </div>
    );
}
