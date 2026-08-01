'use client';

import { useRef, useEffect, useCallback } from 'react';
import {
    motion,
    useScroll,
    useTransform,
    useMotionValueEvent,
    useReducedMotion,
} from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ScrollCue } from './ScrollAffordance';

/**
 * §3 — CATEGORÍAS. The section the whole landing exists for.
 *
 * The mechanic is not explained in prose, it is SIMULATED: 600 dots (fans)
 * fly in, sort themselves into four categorías, every categoría receives
 * the SAME prize, and then the draw fires — one dot lights up per
 * categoría, at random.
 *
 * The visual injustice does the teaching: VIP is a tiny cluster, Base is a
 * swarm, and both are playing for one prize. Nobody needs a percentage to
 * understand that.
 *
 * Deliberately NO statistics on screen (no 5% / 20% / odds ratios) — dot
 * counts carry the ratio implicitly (30 / 90 / 180 / 300 ≈ 1:3:6:10).
 *
 * Faithful to experiences.service.ts: ranking is by cumulative aporte,
 * bands are relative to the other participants, and the winner inside a
 * band is drawn uniformly at random — contributing more never buys the
 * prize, it moves you where fewer fans compete.
 */

const BANDS = [
    { key: 'vip', count: 30, accent: '#CCFF00', seed: 0.37 },
    { key: 'alta', count: 90, accent: '#00E5FF', seed: 0.62 },
    { key: 'media', count: 180, accent: '#2D00F7', seed: 0.18 },
    { key: 'base', count: 300, accent: '#FF0055', seed: 0.81 },
] as const;

const TOTAL = BANDS.reduce((s, b) => s + b.count, 0);

/** Scroll phase boundaries. */
const P = {
    scatterIn: 0.1,
    sortStart: 0.2,
    sortEnd: 0.44,
    prizes: 0.54,
    draw: 0.66,
    payoff: 0.8,
} as const;

interface Dot {
    band: number;
    /** chaotic starting point */
    sx: number;
    sy: number;
    /** sorted destination */
    tx: number;
    ty: number;
    /** per-dot drift so the crowd breathes */
    phase: number;
    isWinner: boolean;
}

interface BandBox {
    labelY: number;
    gridLeft: number;
    gridRight: number;
    centerY: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export default function CategoriesScene() {
    const t = useTranslations('landingV2.categorias');
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dotsRef = useRef<Dot[]>([]);
    const boxesRef = useRef<BandBox[]>([]);
    const progressRef = useRef(0);
    const rafRef = useRef<number>(0);
    const reduceMotion = useReducedMotion();

    const { scrollYProgress } = useScroll({
        target: wrapRef,
        offset: ['start start', 'end end'],
    });

    useMotionValueEvent(scrollYProgress, 'change', (v) => {
        progressRef.current = v;
    });

    /** Recompute the sorted layout + scatter field for the current size. */
    const buildLayout = useCallback((w: number, h: number) => {
        // Generous top/bottom padding: the heading block sits above and the
        // payoff line below, and neither may collide with the bands.
        const topPad = h * 0.42;
        const botPad = h * 0.24;
        const avail = Math.max(120, h - topPad - botPad);

        // Grid shape per band — wide-ish blocks read as "a crowd".
        const shapes = BANDS.map((b) => {
            const cols = Math.max(6, Math.ceil(Math.sqrt(b.count * 3.4)));
            return { cols, rows: Math.ceil(b.count / cols) };
        });

        const totalRows = shapes.reduce((s, x) => s + x.rows, 0);
        const gapRows = (BANDS.length - 1) * 1.9;
        const spacing = Math.max(
            4.5,
            Math.min(15, avail / (totalRows + gapRows))
        );

        const cx = w * 0.5;

        const dots: Dot[] = [];
        const boxes: BandBox[] = [];
        let y = topPad;

        BANDS.forEach((band, bi) => {
            const { cols, rows } = shapes[bi];
            const bandH = rows * spacing;
            const gridW = cols * spacing;
            const gridLeft = cx - gridW / 2;
            const winnerIdx = Math.floor(band.seed * band.count);

            for (let i = 0; i < band.count; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                dots.push({
                    band: bi,
                    sx: Math.random() * w,
                    sy: Math.random() * h,
                    tx: gridLeft + col * spacing + spacing / 2,
                    ty: y + row * spacing + spacing / 2,
                    phase: Math.random() * Math.PI * 2,
                    isWinner: i === winnerIdx,
                });
            }

            boxes.push({
                labelY: y - spacing * 1.1,
                centerY: y + bandH / 2,
                gridLeft,
                gridRight: gridLeft + gridW,
            });

            y += bandH + spacing * 1.9;
        });

        dotsRef.current = dots;
        boxesRef.current = boxes;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let w = 0;
        let h = 0;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = rect.width;
            h = rect.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            buildLayout(w, h);
        };

        resize();
        window.addEventListener('resize', resize);

        // This loop previously ran at 60fps for the entire life of the page,
        // redrawing 600 dots even with the section nowhere near the viewport.
        // It now runs only while the scene is on (or close to) screen, and
        // inside that it skips the redraw when neither the scroll position
        // nor the drift animation has moved.
        let visible = false;
        let running = false;
        let lastP = -1;

        const draw = (time: number) => {
            if (!visible) {
                running = false;
                rafRef.current = 0;
                return;
            }

            const p = reduceMotion ? 1 : progressRef.current;
            const dots = dotsRef.current;
            const boxes = boxesRef.current;

            // Sorting progress + reveal gates
            const sort = easeInOut(
                clamp01((p - P.sortStart) / (P.sortEnd - P.sortStart))
            );
            const appear = clamp01(p / P.scatterIn);
            const prizeIn = clamp01((p - P.prizes) / 0.08);
            const drawIn = clamp01((p - P.draw) / 0.1);
            const drift = reduceMotion ? 0 : (1 - sort) * 9;

            // Nothing moved and nothing is drifting: the last frame is still
            // correct, so don't repaint it.
            if (p === lastP && drift === 0) {
                rafRef.current = requestAnimationFrame(draw);
                return;
            }
            lastP = p;

            ctx.clearRect(0, 0, w, h);

            // ── dots ──
            for (let i = 0; i < dots.length; i++) {
                const d = dots[i];
                const band = BANDS[d.band];
                const wob = drift
                    ? Math.sin(time / 900 + d.phase) * drift
                    : 0;
                const x = lerp(d.sx + wob, d.tx, sort);
                const y = lerp(d.sy + wob * 0.6, d.ty, sort);

                const won = d.isWinner && drawIn > 0;
                const r = won ? 2.6 + drawIn * 2.2 : 1.9;

                // Unsorted dots are anonymous grey; sorted ones take the
                // band colour — the sort itself is the reveal.
                ctx.globalAlpha = appear * (won ? 1 : 0.35 + sort * 0.5);
                if (won) {
                    ctx.shadowColor = band.accent;
                    ctx.shadowBlur = 16 * drawIn;
                    ctx.fillStyle = '#FFFFFF';
                } else {
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = sort > 0.05 ? band.accent : '#6B6B74';
                }
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;

            // ── band labels + the identical prize ──
            if (sort > 0.55 && boxes.length === BANDS.length) {
                BANDS.forEach((band, bi) => {
                    const box = boxes[bi];
                    const a = clamp01((sort - 0.55) / 0.35);

                    ctx.globalAlpha = a;
                    ctx.fillStyle = band.accent;
                    ctx.font =
                        '700 11px ui-monospace, "Cascadia Code", "SF Mono", monospace';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'alphabetic';
                    ctx.fillText(
                        t(`band.${band.key}`).toUpperCase(),
                        box.gridLeft,
                        box.labelY
                    );

                    // identical prize marker per band, right of the grid
                    if (prizeIn > 0) {
                        const px = Math.min(w - 16, box.gridRight + 26);
                        const py = box.centerY;
                        ctx.globalAlpha = prizeIn * a;

                        ctx.save();
                        ctx.translate(px, py);
                        ctx.rotate(Math.PI / 4);
                        ctx.shadowColor = band.accent;
                        ctx.shadowBlur = 14;
                        ctx.fillStyle = band.accent;
                        ctx.fillRect(-4.5, -4.5, 9, 9);
                        ctx.restore();
                        ctx.shadowBlur = 0;

                        ctx.fillStyle = 'rgba(255,255,255,0.72)';
                        ctx.font =
                            '700 9px ui-monospace, "Cascadia Code", monospace';
                        ctx.textAlign = 'left';
                        ctx.fillText(t('onePrize').toUpperCase(), px + 12, py + 3);
                    }
                });
                ctx.globalAlpha = 1;
            }

            rafRef.current = requestAnimationFrame(draw);
        };

        const start = () => {
            if (running) return;
            running = true;
            lastP = -1; // force one repaint on re-entry
            rafRef.current = requestAnimationFrame(draw);
        };

        // rootMargin gives the loop a screen of lead time so the first
        // painted frame is already correct when the scene scrolls in.
        const io = new IntersectionObserver(
            ([entry]) => {
                visible = entry.isIntersecting;
                if (visible) start();
            },
            { rootMargin: '100% 0px' }
        );
        const wrap = wrapRef.current;
        if (wrap) io.observe(wrap);

        return () => {
            io.disconnect();
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
        };
    }, [buildLayout, reduceMotion, t]);

    // ── narrative captions, cross-fading over the simulation ──
    const cap1 = useTransform(scrollYProgress, [0.03, 0.1, 0.19, 0.24], [0, 1, 1, 0]);
    const cap2 = useTransform(scrollYProgress, [0.24, 0.3, 0.44, 0.5], [0, 1, 1, 0]);
    const cap3 = useTransform(scrollYProgress, [0.5, 0.56, 0.63, 0.68], [0, 1, 1, 0]);
    const cap4 = useTransform(scrollYProgress, [0.68, 0.73, 0.78, 0.82], [0, 1, 1, 0]);
    // Two payoffs: the rule, then the fact that it's all live and moving.
    const payoff = useTransform(scrollYProgress, [P.payoff, 0.86, 0.9, 0.93], [0, 1, 1, 0]);
    const payoffY = useTransform(scrollYProgress, [P.payoff, 0.86], [30, 0]);
    const payoff2 = useTransform(scrollYProgress, [0.93, 0.97], [0, 1]);
    const payoff2Y = useTransform(scrollYProgress, [0.93, 0.97], [26, 0]);
    const headOpacity = useTransform(scrollYProgress, [0, 0.04, 0.9, 0.97], [0, 1, 1, 0]);

    return (
        <section
            ref={wrapRef}
            id="categorias"
            aria-label={t('title')}
            className="relative h-[480vh] bg-black"
        >
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                {/* atmosphere */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(60% 45% at 50% 0%, rgba(45,0,247,0.20), transparent 70%), #000',
                    }}
                    aria-hidden="true"
                />

                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 h-full w-full"
                    role="img"
                    aria-label={t('canvasAlt', { total: TOTAL })}
                />

                {/* Heading. Offset is a fixed px value, not vh: the nav is
                    72px tall and a vh-based top pushed the kicker underneath
                    it on shorter viewports. */}
                <motion.div
                    style={{ opacity: headOpacity }}
                    className="pointer-events-none absolute left-0 right-0 top-[96px] z-10 flex flex-col items-center gap-5 px-6 text-center md:top-[108px] md:gap-6"
                >
                    <span className="font-space-mono text-[10px] uppercase tracking-[6px] text-[#CCFF00] md:text-xs md:tracking-[8px]">
                        {t('kicker')}
                    </span>
                    <h2 className="font-sora text-[38px] font-extrabold uppercase leading-[0.9] tracking-tighter text-white md:text-[82px]">
                        {t('title')}
                    </h2>

                    {/* captions occupy one reserved block, so no layout shift */}
                    <div className="relative mt-4 h-20 w-full max-w-3xl md:mt-6 md:h-16">
                        {[
                            { o: cap1, k: 'c1' },
                            { o: cap2, k: 'c2' },
                            { o: cap3, k: 'c3' },
                            { o: cap4, k: 'c4' },
                        ].map(({ o, k }) => (
                            <motion.p
                                key={k}
                                style={{ opacity: o }}
                                className="absolute inset-0 font-sora text-base text-[#C8C8D0] md:text-2xl"
                            >
                                {t(k)}
                            </motion.p>
                        ))}
                    </div>
                </motion.div>

                {/* payoff 1 — the sentence the whole section is built to earn */}
                <motion.div
                    style={{ opacity: payoff, y: payoffY }}
                    className="pointer-events-none absolute bottom-[7vh] left-0 right-0 z-10 px-6 text-center"
                >
                    <p className="mx-auto max-w-4xl font-sora text-xl font-extrabold uppercase leading-tight tracking-tight text-white md:text-4xl">
                        {t('payoffA')}{' '}
                        <span
                            className="text-[#CCFF00]"
                            style={{ textShadow: '0 0 40px rgba(204,255,0,0.5)' }}
                        >
                            {t('payoffB')}
                        </span>
                    </p>
                </motion.div>

                {/* payoff 2 — nothing here is fixed; it moves with the crowd */}
                <motion.div
                    style={{ opacity: payoff2, y: payoff2Y }}
                    className="pointer-events-none absolute bottom-[7vh] left-0 right-0 z-10 px-6 text-center"
                >
                    <p className="mx-auto max-w-4xl font-sora text-xl font-extrabold uppercase leading-tight tracking-tight text-white md:text-4xl">
                        <span
                            className="text-[#00E5FF]"
                            style={{ textShadow: '0 0 40px rgba(0,229,255,0.5)' }}
                        >
                            {t('liveA')}
                        </span>{' '}
                        {t('liveB')}
                    </p>
                </motion.div>

                <ScrollCue targetRef={wrapRef} />
            </div>
        </section>
    );
}
