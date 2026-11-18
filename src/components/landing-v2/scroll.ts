'use client';

import { useState, useSyncExternalStore, type RefObject } from 'react';
import {
    transform,
    useScroll,
    useTransform,
    type MotionValue,
} from 'framer-motion';

/**
 * Scroll plumbing shared by the landing scenes.
 */

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReduce(onChange: () => void) {
    const mq = window.matchMedia(REDUCE_QUERY);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
}

/**
 * `prefers-reduced-motion`, hydration-safe.
 *
 * framer-motion's useReducedMotion reads the media query during the first
 * client render, so with reduced motion on, that render disagreed with the
 * server HTML and React threw a hydration mismatch. This reports `false`
 * while hydrating (the server's answer) and the real value right after.
 */
export function useReducedMotionSafe(): boolean {
    return useSyncExternalStore(
        subscribeReduce,
        () => window.matchMedia(REDUCE_QUERY).matches,
        () => false
    );
}

/**
 * Scroll progress mapped onto a range, the way every scene needs it.
 *
 * Why not plain `useTransform(progress, [..], [..])`: framer-motion 12
 * hands that exact pattern (a target-bound useScroll + an array range,
 * bound to opacity/transform/filter) to the browser as a native
 * ViewTimeline animation. Here those native animations did not hold their
 * end values: outside the mapped range an element snapped back to its CSS
 * value, so the hero came back at full opacity, scaled, over the founder
 * card, and section titles sat at partial opacity while still on screen.
 * Mapping through a function keeps the value on the JS path, which honours
 * the clamp exactly.
 *
 * Reduced motion: the value is pinned to the range's END state (the scene
 * as it reads when finished), so a scene never has to branch its markup
 * and nothing it shows depends on scrolling.
 */
export function useRange<T extends number | string>(
    progress: MotionValue<number>,
    input: number[],
    output: T[]
): MotionValue<T> {
    const reduce = useReducedMotionSafe();
    // Built once: the ranges are literals that never change for a scene.
    const [map] = useState(
        () => transform(input, output) as (v: number) => T
    );
    const end = output[output.length - 1];
    // The closure is re-read on every render (framer recomputes the value
    // during render), so flipping `reduce` takes effect immediately.
    return useTransform(progress, (v: number) => (reduce ? end : map(v)));
}

/**
 * 0 → 1 while a pinned scene is stuck: from its top meeting the top of the
 * viewport to its bottom meeting the bottom.
 */
export function useSceneProgress(ref: RefObject<HTMLElement | null>) {
    return useScroll({ target: ref, offset: ['start start', 'end end'] })
        .scrollYProgress;
}

/**
 * The one reveal used by the normal-flow sections. Same props on server
 * and client (no reduced-motion branch, so no hydration mismatch); the
 * landing's <MotionConfig reducedMotion="user"> drops the movement for
 * people who asked for less and keeps only the fade.
 */
export const reveal = (delay = 0, y = 30, amount = 0.3) => ({
    initial: { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount },
    transition: { duration: 0.55, delay },
});
