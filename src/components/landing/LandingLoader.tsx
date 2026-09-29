'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface Props {
    progress: number;
    loaded: boolean;
}

/**
 * First-paint cover while the hero sequence buffers. Azul Bloque: flat
 * blue, the mark at rest (no pulsing logo — spinners-as-theatre are
 * banned, §1.7) and a real progress bar in an ink track.
 */
export default function LandingLoader({ progress, loaded }: Props) {
    const t = useTranslations('landingV2');

    return (
        <AnimatePresence>
            {!loaded && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-blue"
                >
                    {/* Intrinsic 967x747 — see NavV2 for why the ratio matters. */}
                    <Image
                        src="/fandi-logo.png"
                        alt="Fandi"
                        width={967}
                        height={747}
                        priority
                        className="h-auto w-[140px] md:w-[170px]"
                    />

                    <p className="label-mono mt-8 text-[11px] text-lilac">
                        {t('loader')}
                    </p>

                    {/* Progress bar */}
                    <div className="mt-4 h-[10px] w-52 overflow-hidden rounded-full border-2 border-ink bg-ink">
                        <motion.div
                            className="h-full rounded-full bg-white"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(progress * 100)}%` }}
                            transition={{ duration: 0.2 }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
