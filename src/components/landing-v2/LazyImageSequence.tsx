'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import ImageSequenceCanvas from '@/components/landing/ImageSequenceCanvas';

/**
 * Defers an ImageSequenceCanvas until it is near the viewport.
 *
 * ImageSequenceCanvas preloads every frame the moment it mounts. With two
 * sequences on the page that meant 480 frames decoded at page load — and a
 * decoded 1920x1080 frame costs ~8.3MB of RGBA regardless of how small the
 * WebP is on the wire, so the two sequences together were reserving
 * multiple GB before the visitor had scrolled anywhere.
 *
 * The hero sequence stays eager (it is the first thing on screen and drives
 * the loader). Anything further down should use this instead, so its frames
 * are fetched and decoded only once the visitor is heading toward it.
 *
 * The placeholder holds the section's full height, so nothing shifts when
 * the real canvas swaps in.
 */
export default function LazyImageSequence({
    folder,
    frameCount,
    heightVh,
    children,
}: {
    folder: string;
    frameCount: number;
    heightVh: number;
    children?: ReactNode;
}) {
    const placeholderRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (mounted) return;
        const el = placeholderRef.current;
        if (!el) return;

        // Two viewports of lead time: enough for the batched preload to get
        // ahead of the scroll, still far short of "load it immediately".
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setMounted(true);
                    io.disconnect();
                }
            },
            { rootMargin: '200% 0px' }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [mounted]);

    if (mounted) {
        return (
            <ImageSequenceCanvas
                folder={folder}
                frameCount={frameCount}
                heightVh={heightVh}
            >
                {children}
            </ImageSequenceCanvas>
        );
    }

    return (
        <div
            ref={placeholderRef}
            style={{ height: `${heightVh}vh` }}
            aria-hidden="true"
        />
    );
}
