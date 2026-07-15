'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';

/**
 * "Centro de comando" — the artist-side proof. Until now the landing
 * asked organizers to sign in to a product it never showed; this is
 * the real dashboard (Top Fans CRM front and center) in an angled
 * tactical collage, speaking the exact design language of the product
 * (HUD brackets, scanlines, mono labels).
 *
 * Screenshots ship with device bezels baked in — swap the PNGs in
 * /images/mockups/Frames_Web to refresh content with zero code change.
 */
const SHOTS = {
    main: '/images/mockups/Frames_Web/loyalty.png',
    left: '/images/mockups/Frames_Web/home.png',
    right: '/images/mockups/Frames_Web/subastas.png',
} as const;

/** Keep in sync with SECTIONS.commandCenter.vh in page.tsx. */
export const COMMAND_CENTER_VH = 160;

export default function CommandCenterSection({
    onOrganizerClick,
}: {
    onOrganizerClick: () => void;
}) {
    const t = useTranslations('landing.commandCenter');
    const reduceMotion = useReducedMotion();

    const reveal = (delay: number) =>
        reduceMotion
            ? {}
            : {
                  initial: { opacity: 0, y: 40 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true, amount: 0.3 },
                  transition: { duration: 0.7, delay, ease: 'easeOut' as const },
              };

    return (
        <div
            style={{ height: `${COMMAND_CENTER_VH}vh` }}
            className="relative flex items-center justify-center overflow-hidden bg-black"
        >
            <div className="w-full max-w-7xl mx-auto px-6 md:px-10 flex flex-col items-center gap-10 md:gap-14">

                {/* ─── Heading ─── */}
                <motion.div {...reveal(0)} className="flex flex-col items-center text-center gap-4">
                    <span className="font-space-mono text-[11px] md:text-xs uppercase tracking-[4px] text-[#CCFF00]">
                        {t('kicker')}
                    </span>
                    <h2 className="animate-glitch font-sora font-extrabold text-white text-[32px] md:text-6xl lg:text-7xl leading-tight tracking-tighter">
                        {t('title')}
                    </h2>
                    <p className="font-sora text-[#A0A0A0] text-base md:text-lg max-w-2xl">
                        {t('desc')}
                    </p>
                </motion.div>

                {/* ─── Angled dashboard collage ─── */}
                <motion.div
                    {...reveal(0.15)}
                    className="relative w-full max-w-5xl aspect-[1539/1000] md:aspect-[16/8]"
                >
                    {/* Back-left: home */}
                    <div className="absolute left-0 top-[12%] w-[42%] -rotate-[4deg] opacity-70 hidden md:block">
                        <div className="relative aspect-[1539/1000]">
                            <Image
                                src={SHOTS.left}
                                alt="Fandi dashboard — inicio"
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 0px, 40vw"
                            />
                        </div>
                    </div>

                    {/* Back-right: subastas */}
                    <div className="absolute right-0 top-[18%] w-[42%] rotate-[3deg] opacity-70 hidden md:block">
                        <div className="relative aspect-[1539/1000]">
                            <Image
                                src={SHOTS.right}
                                alt="Fandi dashboard — subastas"
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 0px, 40vw"
                            />
                        </div>
                    </div>

                    {/* Front-center: the Top Fans CRM */}
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 w-full md:w-[64%]">
                        <div className="hud-brackets relative p-2 md:p-3">
                            <div className="relative aspect-[1539/1000] scanlines">
                                <Image
                                    src={SHOTS.main}
                                    alt="Fandi dashboard — Top Fans CRM"
                                    fill
                                    className="object-contain drop-shadow-[0_20px_60px_rgba(204,255,0,0.12)]"
                                    sizes="(max-width: 768px) 90vw, 60vw"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ─── Capability chips + CTA ─── */}
                <motion.div {...reveal(0.3)} className="flex flex-col items-center gap-8">
                    <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
                        {(['chip1', 'chip2', 'chip3'] as const).map((chip) => (
                            <span
                                key={chip}
                                className="font-space-mono text-[10px] md:text-xs uppercase tracking-[2px] text-white/80
                                    border border-white/15 bg-white/[0.03] px-4 py-2"
                            >
                                {t(chip)}
                            </span>
                        ))}
                    </div>
                    <button
                        onClick={onOrganizerClick}
                        className="btn-tactical font-space-mono text-[13px] font-bold uppercase tracking-[2px] px-8 py-4 transition-all cursor-pointer"
                    >
                        {t('cta')}
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
