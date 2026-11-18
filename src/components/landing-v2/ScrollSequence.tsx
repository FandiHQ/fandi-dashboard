'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useMotionValueEvent, type MotionValue } from 'framer-motion';

/**
 * A scroll-scrubbed image sequence drawn on a canvas, driven by a progress
 * value the parent scene owns (so the scene decides the timing, not this).
 *
 * Load rules, in order of importance:
 *   1. Never compete with first paint. Frames start loading when the canvas
 *      is near the viewport, or for the hero on idle after mount, so the
 *      hero's text and logo are the LCP and nothing waits on frames.
 *   2. Coarse pass first: every 8th frame, then the gaps. A fast scroll
 *      lands on the nearest loaded frame instead of a blank canvas.
 *   3. Released when far away. A decoded 1280x720 frame is ~3.7MB of RGBA
 *      whatever its size on the wire; dropping `src` lets the browser free
 *      it, and coming back is a re-decode from the HTTP cache.
 *   4. Reduced motion: only `staticFrame` is fetched and it is all you see.
 */
const framePath = (folder: string, i: number) =>
    `/images/${folder}/frame-${String(i + 1).padStart(4, '0')}.webp`;

export default function ScrollSequence({
    folder,
    frameCount,
    progress,
    staticFrame,
    reduceMotion,
    eager = false,
    className = '',
}: {
    folder: string;
    frameCount: number;
    progress: MotionValue<number>;
    /** 0-based frame shown under reduced motion. */
    staticFrame: number;
    reduceMotion: boolean;
    /** Start on idle after mount instead of when scrolled near. */
    eager?: boolean;
    className?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imagesRef = useRef<(HTMLImageElement | undefined)[]>([]);
    const currentRef = useRef(0);

    const targetIndex = useCallback(
        (p: number) =>
            reduceMotion
                ? staticFrame
                : Math.min(frameCount - 1, Math.max(0, Math.round(p * (frameCount - 1)))),
        [frameCount, reduceMotion, staticFrame]
    );

    const draw = useCallback((wanted: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        // Nearest loaded frame at or below the wanted one, else above it.
        const imgs = imagesRef.current;
        let img: HTMLImageElement | undefined;
        for (let d = 0; d < imgs.length && !img; d++) {
            const lo = imgs[wanted - d];
            const hi = imgs[wanted + d];
            if (lo?.complete && lo.naturalWidth) img = lo;
            else if (hi?.complete && hi.naturalWidth) img = hi;
        }
        if (!img) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }, []);

    // Size the backing store (dpr capped at 2: sharper buys nothing on a
    // 1280px source and costs fill rate) and repaint on resize.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(canvas.clientWidth * dpr);
            canvas.height = Math.round(canvas.clientHeight * dpr);
            canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
            draw(currentRef.current);
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [draw]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let started = false;
        let cancelled = false;

        const order = (): number[] => {
            if (reduceMotion) return [staticFrame];
            const coarse: number[] = [];
            const fine: number[] = [];
            for (let i = 0; i < frameCount; i++) (i % 8 === 0 ? coarse : fine).push(i);
            if (!coarse.includes(frameCount - 1)) coarse.push(frameCount - 1);
            return [...coarse, ...fine.filter((i) => i !== frameCount - 1)];
        };

        const load = () => {
            if (started) return;
            started = true;
            cancelled = false;
            const queue = order();
            imagesRef.current = new Array(frameCount);
            // A few requests in flight at a time, not 120 at once.
            let next = 0;
            const pump = () => {
                if (cancelled || next >= queue.length) return;
                const i = queue[next++];
                const img = new Image();
                img.decoding = 'async';
                img.onload = img.onerror = () => {
                    if (cancelled) return;
                    if (Math.abs(i - currentRef.current) <= 8) draw(currentRef.current);
                    pump();
                };
                img.src = framePath(folder, i);
                imagesRef.current[i] = img;
            };
            for (let k = 0; k < 6; k++) pump();
        };

        const release = () => {
            if (!started) return;
            started = false;
            cancelled = true;
            for (const img of imagesRef.current) {
                if (!img) continue;
                img.onload = img.onerror = null;
                img.src = '';
            }
            imagesRef.current = [];
        };

        // Hysteresis: load a viewport and a half ahead, release far behind.
        const near = new IntersectionObserver(
            ([e]) => e.isIntersecting && load(),
            { rootMargin: '150% 0px' }
        );
        const far = new IntersectionObserver(
            ([e]) => !e.isIntersecting && release(),
            { rootMargin: '300% 0px' }
        );
        far.observe(canvas);

        // The hero's canvas is on screen at mount, so "near" would fire at
        // once and race the first paint. Eager waits for idle (Safari has no
        // requestIdleCallback: a short timeout instead) before it observes.
        let idle: number | undefined;
        let timer: number | undefined;
        const begin = () => {
            load();
            near.observe(canvas);
        };
        let begun = false;
        const beginOnce = () => {
            if (begun) return;
            begun = true;
            window.removeEventListener('scroll', beginOnce);
            begin();
        };
        if (!eager) near.observe(canvas);
        else {
            // ...or at the first scroll, whichever comes first: a visitor
            // who scrolls at once must not uncover an empty stage.
            window.addEventListener('scroll', beginOnce, { passive: true });
            if (typeof window.requestIdleCallback === 'function')
                idle = window.requestIdleCallback(beginOnce, { timeout: 2500 });
            else timer = window.setTimeout(beginOnce, 1200);
        }

        return () => {
            near.disconnect();
            far.disconnect();
            if (idle !== undefined) window.cancelIdleCallback(idle);
            if (timer !== undefined) window.clearTimeout(timer);
            window.removeEventListener('scroll', beginOnce);
            release();
        };
    }, [folder, frameCount, reduceMotion, staticFrame, eager, draw]);

    useMotionValueEvent(progress, 'change', (p) => {
        const i = targetIndex(p);
        if (i === currentRef.current) return;
        currentRef.current = i;
        draw(i);
    });

    // First paint and reduced-motion switches.
    useEffect(() => {
        currentRef.current = targetIndex(progress.get());
        draw(currentRef.current);
    }, [targetIndex, progress, draw]);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full ${className}`}
        />
    );
}
