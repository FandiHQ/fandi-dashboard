'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useScroll, useTransform, useMotionValueEvent } from 'framer-motion';

interface Props {
    folder: string;
    frameCount: number;
    heightVh?: number;
    children?: React.ReactNode;
    onLoadProgress?: (progress: number) => void;
}

/**
 * Frames are WebP at native 1920x1080. The sequences were JPEG (~47MB for
 * both cinematics, downloaded on every full scroll); WebP at q75 keeps the
 * same resolution while roughly halving the bytes, which matters a lot on
 * Colombian mobile data.
 */
const getFramePath = (folder: string, index: number): string =>
    `/images/${folder}/frame-${String(index).padStart(4, '0')}.webp`;

export default function ImageSequenceCanvas({
    folder,
    frameCount,
    heightVh = 300,
    children,
    onLoadProgress,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imagesRef = useRef<HTMLImageElement[]>([]);
    const currentFrameRef = useRef(0);
    const [loadProgress, setLoadProgress] = useState(0);

    const drawFrame = useCallback((index: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const img = imagesRef.current[index];
        if (!canvas || !ctx || !img || !img.complete) return;

        const rect = canvas.getBoundingClientRect();
        // Cover-fit drawing (use CSS pixels, dpr is handled by ctx.scale)
        const scale = Math.max(
            rect.width / img.naturalWidth,
            rect.height / img.naturalHeight
        );
        const x = (rect.width - img.naturalWidth * scale) / 2;
        const y = (rect.height - img.naturalHeight * scale) / 2;

        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
    }, []);

    // Retina canvas sizing
    const updateCanvasSize = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
        }
        // Redraw current frame after resize
        drawFrame(currentFrameRef.current);
    }, [drawFrame]);

    // Setup canvas and load images
    useEffect(() => {
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, [updateCanvasSize]);

    // Image preloading in batches
    useEffect(() => {
        const images: HTMLImageElement[] = new Array(frameCount);
        let loaded = 0;
        const BATCH_SIZE = 20;

        const loadBatch = (startIndex: number) => {
            const end = Math.min(startIndex + BATCH_SIZE, frameCount);
            for (let i = startIndex; i < end; i++) {
                const img = new Image();
                img.src = getFramePath(folder, i + 1); // 1-indexed
                img.onload = () => {
                    loaded++;
                    const p = loaded / frameCount;
                    setLoadProgress(p);
                    onLoadProgress?.(p);
                    // Draw first frame immediately
                    if (i === 0 && canvasRef.current) {
                        drawFrame(0);
                    }
                    // When this batch is done, load the next
                    if (loaded >= end && end < frameCount) {
                        loadBatch(end);
                    }
                };
                img.onerror = () => {
                    loaded++;
                    const p = loaded / frameCount;
                    setLoadProgress(p);
                    onLoadProgress?.(p);
                    if (loaded >= end && end < frameCount) {
                        loadBatch(end);
                    }
                };
                images[i] = img;
            }
        };

        loadBatch(0);
        imagesRef.current = images;
    }, [folder, frameCount, drawFrame]);

    // Scroll-driven frame drawing
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end start'],
    });

    const frameIndex = useTransform(scrollYProgress, [0, 1], [0, frameCount - 1]);

    useMotionValueEvent(frameIndex, 'change', (latest) => {
        const index = Math.round(latest);
        if (index === currentFrameRef.current) return;
        currentFrameRef.current = index;
        drawFrame(index);
    });

    return (
        <div ref={containerRef} style={{ height: `${heightVh}vh` }}>
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    role="img"
                    aria-label={`${folder} image sequence`}
                />
                {/* Loading progress bar */}
                {loadProgress < 1 && (
                    <div
                        className="absolute bottom-0 left-0 h-[3px] bg-[#2D00F7] transition-all duration-200"
                        style={{ width: `${loadProgress * 100}%` }}
                    />
                )}
                {/* Optional children (text overlays) */}
                {children && (
                    <div className="absolute inset-0 z-10">{children}</div>
                )}
            </div>
        </div>
    );
}
