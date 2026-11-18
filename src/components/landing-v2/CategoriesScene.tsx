'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { escuadraColors } from '@/lib/chart-colors';
import PhoneFrame from './PhoneFrame';
import { ScrollCue } from './ScrollAffordance';
import { reveal, useReducedMotionSafe, useSceneProgress } from './scroll';

/**
 * #2 OPORTUNIDADES: "Así se gana". The section the landing exists for.
 *
 * Two halves:
 *   1. The mechanic SIMULATED (pinned): 600 dots (fans) fly in, sort into
 *      four categorías, every categoría shows the SAME prize, then one dot
 *      per categoría lights up: the fan who answered right the fastest
 *      (fandi-api knowledge contest, RFC §2). The steps sit beside it in
 *      readable type, so the canvas never carries the explanation alone.
 *   2. The PROOF (normal flow): the real live and results screens, then the
 *      rule in one opaque block. It used to fade in over the dot grid,
 *      half transparent; now it has its own place.
 *
 * No statistics, no odds copy (DESIGN_GUIDELINES §6). Bands are NEUTRAL on
 * purpose: the same number of dots each. Categories are placed by each
 * fan's share of the money, not by head count, so fixed fan proportions
 * would teach a rule that does not exist. Inside a band the fastest right
 * answer wins: contributing more never buys the prize. Nothing random.
 */

const BAND_DOTS = 150;

const BANDS = [
    { key: 'vip', count: BAND_DOTS, accent: escuadraColors[4], seed: 0.37 },
    { key: 'alta', count: BAND_DOTS, accent: escuadraColors[3], seed: 0.62 },
    { key: 'media', count: BAND_DOTS, accent: escuadraColors[2], seed: 0.18 },
    { key: 'base', count: BAND_DOTS, accent: escuadraColors[1], seed: 0.81 },
] as const;

/** Canvas needs literal colours: ink and the pre-sort "anonymous" dot. */
const INK = '#0B0B0F';
const DOT_IDLE = 'rgba(255,255,255,0.6)';

const TOTAL = BANDS.reduce((s, b) => s + b.count, 0);

/** Scroll phase boundaries (scene progress). */
const P = {
    scatterIn: 0.08,
    sortStart: 0.16,
    sortEnd: 0.4,
    prizes: 0.46,
    draw: 0.64,
} as const;

/** Which step caption is current, by scene progress. */
const STEPS = ['c1', 'c2', 'c3', 'c4'] as const;
const STEP_AT = [0, 0.18, 0.44, 0.62];
const stepFor = (p: number) =>
    STEP_AT.reduce((cur, at, i) => (p >= at ? i : cur), 0);

interface Dot {
    band: number;
    sx: number;
    sy: number;
    tx: number;
    ty: number;
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

function Simulation() {
    const t = useTranslations('landingV2.categorias');
    const wrapRef = useRef<HTMLElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dotsRef = useRef<Dot[]>([]);
    const boxesRef = useRef<BandBox[]>([]);
    const progressRef = useRef(0);
    const rafRef = useRef<number>(0);
    const reduceMotion = useReducedMotionSafe();
    const progress = useSceneProgress(wrapRef);
    const [step, setStep] = useState(0);

    useMotionValueEvent(progress, 'change', (v) => {
        progressRef.current = v;
        setStep(stepFor(v));
    });

    /** Sorted layout + scatter field for the canvas's own box. */
    const buildLayout = useCallback((w: number, h: number) => {
        const labelRoom = 26; // band label above each grid
        const prizeRoom = 120; // "1 GANADOR" chip right of each grid
        const topPad = 20;
        const botPad = 28;
        const avail = Math.max(120, h - topPad - botPad);

        const shapes = BANDS.map((b) => {
            const cols = Math.max(6, Math.ceil(Math.sqrt(b.count * 3.4)));
            return { cols, rows: Math.ceil(b.count / cols) };
        });
        const totalRows = shapes.reduce((s, x) => s + x.rows, 0);
        const maxCols = Math.max(...shapes.map((s) => s.cols));
        const n = BANDS.length;
        // Fit both ways: tall enough for the bands and their labels with a
        // minimum gap, narrow enough to leave the prize chip its room.
        const byH = (avail - n * labelRoom - (n - 1) * 10) / totalRows;
        const byW = (w - prizeRoom - 24) / maxCols;
        const spacing = Math.max(4, Math.min(13, byH, byW));
        const used = totalRows * spacing + n * labelRoom;
        const gap = Math.min(28, Math.max(10, (avail - used) / (n - 1)));
        // Centre the whole stack vertically in the canvas.
        let y = topPad + labelRoom + Math.max(0, (avail - used - gap * (n - 1)) / 2);

        const gridW = maxCols * spacing;
        const cx = Math.max(12 + gridW / 2, (w - prizeRoom) / 2);

        const dots: Dot[] = [];
        const boxes: BandBox[] = [];
        BANDS.forEach((band, bi) => {
            const { cols, rows } = shapes[bi];
            const bandH = rows * spacing;
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
                labelY: y - 9,
                centerY: y + bandH / 2,
                gridLeft,
                gridRight: gridLeft + gridW,
            });
            y += bandH + labelRoom + gap;
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
        // Canvas can't read CSS vars in `font`; resolve the next/font
        // family behind --font-space-mono once.
        const mono =
            getComputedStyle(document.body)
                .getPropertyValue('--font-space-mono')
                .trim() || 'ui-monospace, monospace';

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = rect.width;
            h = rect.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            buildLayout(w, h);
            lastP = -1;
        };

        // Runs only while the scene is on (or near) screen, and skips the
        // repaint when neither the scroll nor the drift has moved.
        let visible = false;
        let running = false;
        let lastP = -1;

        resize();
        window.addEventListener('resize', resize);

        const draw = (time: number) => {
            if (!visible) {
                running = false;
                rafRef.current = 0;
                return;
            }

            const p = reduceMotion ? 1 : progressRef.current;
            const dots = dotsRef.current;
            const boxes = boxesRef.current;

            const sort = easeInOut(clamp01((p - P.sortStart) / (P.sortEnd - P.sortStart)));
            const appear = clamp01(p / P.scatterIn + 0.15);
            const prizeIn = clamp01((p - P.prizes) / 0.08);
            const drawIn = clamp01((p - P.draw) / 0.1);
            const drift = reduceMotion ? 0 : (1 - sort) * 9;

            if (p === lastP && drift === 0) {
                rafRef.current = requestAnimationFrame(draw);
                return;
            }
            lastP = p;

            ctx.clearRect(0, 0, w, h);

            for (let i = 0; i < dots.length; i++) {
                const d = dots[i];
                const band = BANDS[d.band];
                const wob = drift ? Math.sin(time / 900 + d.phase) * drift : 0;
                const x = lerp(d.sx + wob, d.tx, sort);
                const y = lerp(d.sy + wob * 0.6, d.ty, sort);
                const won = d.isWinner && drawIn > 0;
                const r = won ? 2.8 + drawIn * 3.4 : 2;

                ctx.globalAlpha = appear * (won ? 1 : 0.55 + sort * 0.45);
                if (won) {
                    // Winner: hard ink extrusion + ink outline, no glow.
                    ctx.fillStyle = INK;
                    ctx.beginPath();
                    ctx.arc(x + 2, y + 2, r + 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = band.accent;
                    ctx.strokeStyle = INK;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                } else {
                    ctx.fillStyle = sort > 0.05 ? band.accent : DOT_IDLE;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;

            // Band labels + the identical prize.
            if (sort > 0.55 && boxes.length === BANDS.length) {
                BANDS.forEach((band, bi) => {
                    const box = boxes[bi];
                    const a = clamp01((sort - 0.55) / 0.35);
                    ctx.globalAlpha = a;
                    ctx.fillStyle = band.accent;
                    ctx.font = `700 13px ${mono}`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'alphabetic';
                    ctx.fillText(t(`band.${band.key}`).toUpperCase(), box.gridLeft, box.labelY);

                    if (prizeIn > 0) {
                        const px = box.gridRight + 18;
                        const py = box.centerY;
                        ctx.globalAlpha = prizeIn * a;
                        // Prize chip: band colour, ink outline, hard ink
                        // extrusion (no blur).
                        ctx.fillStyle = INK;
                        ctx.fillRect(px - 6 + 2, py - 6 + 2, 12, 12);
                        ctx.fillStyle = band.accent;
                        ctx.strokeStyle = INK;
                        ctx.lineWidth = 1.5;
                        ctx.fillRect(px - 6, py - 6, 12, 12);
                        ctx.strokeRect(px - 6, py - 6, 12, 12);
                        ctx.fillStyle = '#FFFFFF';
                        ctx.font = `700 12px ${mono}`;
                        ctx.fillText(t('onePrize').toUpperCase(), px + 14, py + 4);
                    }
                });
                ctx.globalAlpha = 1;
            }

            rafRef.current = requestAnimationFrame(draw);
        };

        const start = () => {
            if (running) return;
            running = true;
            lastP = -1;
            rafRef.current = requestAnimationFrame(draw);
        };

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

    return (
        <section
            ref={wrapRef}
            id="categorias"
            aria-label={t('title')}
            className="relative bg-blue"
            style={{ height: reduceMotion ? 'auto' : '210vh' }}
        >
            <div
                className={
                    reduceMotion
                        ? 'relative mx-auto flex max-w-6xl flex-col gap-8 px-5 pt-20 md:flex-row md:px-9'
                        : 'sticky top-0 mx-auto flex h-screen max-w-6xl flex-col px-5 pt-[92px] md:flex-row md:items-center md:gap-10 md:px-9 md:pt-[72px]'
                }
            >
                {/* Steps. Desktop: all four, the current one in a white
                    block. Phone: one at a time, the old one out before the
                    new one in (no two lines on top of each other). */}
                <div className="relative z-10 flex shrink-0 flex-col gap-3 md:w-[44%] md:gap-5">
                    <span className="label-mono text-[13px] text-lilac">{t('kicker')}</span>
                    <h2 className="font-hero text-[40px] text-white md:text-[64px] lg:text-[76px]">
                        {t('title')}
                    </h2>

                    <ol className="mt-3 hidden flex-col gap-2.5 md:flex">
                        {STEPS.map((k, i) => {
                            const on = reduceMotion || i === step;
                            return (
                                <li
                                    key={k}
                                    aria-current={!reduceMotion && on ? 'step' : undefined}
                                    className={`flex gap-4 rounded-[14px] border-2 px-4 py-3.5 text-[18px] leading-snug transition-colors duration-300 lg:text-[19px] ${
                                        on
                                            ? 'border-ink bg-white text-ink shadow-ext-md'
                                            : 'border-transparent text-white'
                                    }`}
                                >
                                    <span
                                        className={`tabular mt-0.5 grid size-7 shrink-0 place-items-center rounded-[8px] font-space-mono text-[14px] font-bold ${
                                            on ? 'bg-blue text-white' : 'bg-ink text-white'
                                        }`}
                                        aria-hidden="true"
                                    >
                                        {i + 1}
                                    </span>
                                    <span>{t(k)}</span>
                                </li>
                            );
                        })}
                    </ol>

                    <div className="relative min-h-[104px] md:hidden">
                        {reduceMotion ? (
                            <ol className="flex flex-col gap-3">
                                {STEPS.map((k) => (
                                    <li key={k} className="text-[17px] leading-snug text-white">{t(k)}</li>
                                ))}
                            </ol>
                        ) : (
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.p
                                    key={step}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.18 }}
                                    className="text-[17px] leading-snug text-white"
                                >
                                    <span className="font-space-mono font-bold text-lime">
                                        {step + 1}/4
                                    </span>{' '}
                                    {t(STEPS[step])}
                                </motion.p>
                            </AnimatePresence>
                        )}
                    </div>
                </div>

                {/* The crowd, sorting itself. */}
                <div
                    className={
                        reduceMotion
                            ? 'relative h-[520px] w-full md:flex-1'
                            : // pb clears the phone's sticky action bar (≈70px).
                            'relative mb-[84px] min-h-0 w-full min-w-0 flex-1 md:mb-0 md:h-[78vh] md:max-h-[640px]'
                    }
                >
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 h-full w-full"
                        role="img"
                        aria-label={t('canvasAlt', { total: TOTAL })}
                    />
                </div>

                {!reduceMotion && <ScrollCue targetRef={wrapRef} />}
            </div>
        </section>
    );
}

/** The real screens, then the rule, in opaque blocks of their own. */
function Proof() {
    const t = useTranslations('landingV2.categorias');
    const rise = (delay = 0) => reveal(delay, 40, 0.25);

    const phones = [
        { k: 'proof1', src: '/images/app/opportunity-live.webp', alt: t('phone1Alt') },
        { k: 'proof2', src: '/images/app/winners-question.webp', alt: t('phone2Alt') },
    ] as const;

    return (
        <section aria-label={t('proofLabel')} className="bg-blue px-5 pb-16 pt-8 md:px-9 md:pb-28 md:pt-16">
            <div className="mx-auto flex max-w-6xl flex-col gap-10 md:gap-14">
                <div className="grid gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
                    {phones.map((p, i) => (
                        <motion.figure key={p.k} {...rise(i * 0.12)} className="flex flex-col gap-6">
                            <div className="mx-auto w-full max-w-[300px] md:max-w-[380px]">
                                <PhoneFrame
                                    src={p.src}
                                    alt={p.alt}
                                    width={720}
                                    height={1354}
                                    sizes="(min-width: 768px) 290px, 72vw"
                                />
                            </div>
                            <figcaption className="mx-auto flex max-w-[440px] flex-col gap-2 text-center">
                                <span className="font-display text-[24px] text-white md:text-[28px]">
                                    {t(`${p.k}Title`)}
                                </span>
                                <span className="text-[17px] leading-relaxed text-white md:text-[18px]">
                                    {t(`${p.k}Body`)}
                                </span>
                            </figcaption>
                        </motion.figure>
                    ))}
                </div>

                <motion.div {...rise()} className="grid gap-5 lg:grid-cols-[1.25fr_1fr] lg:gap-6">
                    <p className="block-white font-display px-6 py-6 text-[22px] text-ink md:px-8 md:py-8 md:text-[30px]">
                        {t('payoffA')}{' '}
                        <span className="text-blue">{t('payoffB')}</span>
                    </p>
                    {/* The live moment: ink block, lime extrusion. */}
                    <div className="block-ink flex flex-col justify-center gap-3 px-6 py-6 shadow-ext-live md:px-8 md:py-8">
                        <span className="flex items-center gap-2.5 text-lime">
                            <span className="live-dot" aria-hidden="true" />
                            <span className="font-display text-[22px] md:text-[26px]">{t('liveA')}</span>
                        </span>
                        <p className="text-[17px] leading-relaxed text-white md:text-[18px]">{t('liveB')}</p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

export default function CategoriesScene() {
    return (
        <>
            <Simulation />
            <Proof />
        </>
    );
}
