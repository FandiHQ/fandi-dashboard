'use client';

import { type RefObject } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { useRange, useReducedMotionSafe, useSceneProgress } from './scroll';

/**
 * Scroll affordances for a landing built almost entirely from PINNED
 * scenes.
 *
 * The problem this solves: while a scene is pinned the viewport looks
 * frozen — content animates in place — so a visitor can reasonably think
 * the page is stuck or finished and leave. That risk repeats at every
 * pinned scene.
 *
 * Two pieces, deliberately different jobs:
 *   ScrollProgress — "there IS more" (global, always on)
 *   ScrollCue      — "keep going NOW" (local to one scene, fades once
 *                     that scene has been fully scrolled)
 */

/** Solid progress bar pinned to the very top of the viewport. */
export function ScrollProgress() {
    const { scrollYProgress } = useScroll();
    const reduceMotion = useReducedMotionSafe();
    // Spring smooths the jitter of trackpad/inertial scrolling.
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 260,
        damping: 40,
        restDelta: 0.001,
    });

    return (
        <motion.div
            style={{ scaleX: reduceMotion ? scrollYProgress : scaleX }}
            className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-white"
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
    const progress = useSceneProgress(targetRef);

    // Fade in once the scene is actually pinned, out as it completes.
    const opacity = useRange(progress, [0, 0.06, 0.82, 0.94], [0, 1, 1, 0]);

    return (
        <motion.div
            style={{ opacity }}
            // Phones: hidden. The sticky action bar owns that strip, and a thumb
            // scrolls without being told to.
            className="pointer-events-none absolute inset-x-0 bottom-6 z-30 hidden flex-col items-center gap-2 md:flex"
            aria-hidden="true"
        >
            {label ? (
                <span className="label-mono rounded-full border-2 border-ink bg-ink px-3.5 py-1.5 text-[12px] text-white">
                    {label}
                </span>
            ) : null}
            {/* CSS keyframe, not a JS animation: five of these run for the
                life of the page, and framer-motion would drive each one from
                the main thread. .animate-scroll-cue already no-ops under
                prefers-reduced-motion. */}
            <span className="animate-scroll-cue block h-6 w-[3px] rounded-full border border-ink bg-white" />
        </motion.div>
    );
}
