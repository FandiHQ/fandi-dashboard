'use client';

import { type RefObject } from 'react';
import {
    motion,
    useScroll,
    useSpring,
    useTransform,
    useReducedMotion,
} from 'framer-motion';

/**
 * Scroll affordances for a landing built almost entirely from PINNED
 * scenes.
 *
 * The problem this solves: while a scene is pinned the viewport looks
 * frozen — content animates in place — so a visitor can reasonably think
 * the page is stuck or finished and leave. Across ~2.700vh that risk
 * repeats at every scene.
 *
 * Two pieces, deliberately different jobs:
 *   ScrollProgress — "there IS more" (global, always on)
 *   ScrollCue      — "keep going NOW" (local to one scene, fades once
 *                     that scene has been fully scrolled)
 */

/** Hairline progress bar pinned to the very top of the viewport. */
export function ScrollProgress() {
    const { scrollYProgress } = useScroll();
    const reduceMotion = useReducedMotion();
    // Spring smooths the jitter of trackpad/inertial scrolling.
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 260,
        damping: 40,
        restDelta: 0.001,
    });

    return (
        <motion.div
            style={{ scaleX: reduceMotion ? scrollYProgress : scaleX }}
            className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-[#2D00F7] via-[#00E5FF] to-[#CCFF00]"
            aria-hidden="true"
        />
    );
}

/**
 * Per-scene "keep scrolling" cue.
 *
 * Pass the same ref the scene uses for its own `useScroll`, so the cue
 * tracks that scene exactly: solid while there's scroll left in the
 * scene, gone by the time it hands off to the next one.
 */
export function ScrollCue({
    targetRef,
    label,
}: {
    targetRef: RefObject<HTMLElement | null>;
    label?: string;
}) {
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: ['start start', 'end end'],
    });

    // Fade in once the scene is actually pinned, out as it completes.
    const opacity = useTransform(
        scrollYProgress,
        [0, 0.06, 0.82, 0.94],
        [0, 1, 1, 0]
    );

    return (
        <motion.div
            style={{ opacity }}
            className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex flex-col items-center gap-2"
            aria-hidden="true"
        >
            {label ? (
                <span className="font-space-mono text-[9px] uppercase tracking-[4px] text-white/45">
                    {label}
                </span>
            ) : null}
            {/* CSS keyframe, not a JS animation: five of these run for the
                life of the page, and framer-motion would drive each one from
                the main thread. .animate-scroll-cue already no-ops under
                prefers-reduced-motion. */}
            <span className="animate-scroll-cue block h-6 w-px bg-gradient-to-b from-transparent via-white/50 to-[#CCFF00]" />
        </motion.div>
    );
}
