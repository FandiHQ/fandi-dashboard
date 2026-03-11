'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface Props {
    progress: number;
    loaded: boolean;
}

export default function LandingLoader({ progress, loaded }: Props) {
    return (
        <AnimatePresence>
            {!loaded && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black"
                >
                    {/* Pulsing Logo */}
                    <motion.div
                        animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <Image
                            src="/fandi-logo.png"
                            alt="Fandi"
                            width={200}
                            height={65}
                            priority
                            className="w-[180px] md:w-[220px] h-auto drop-shadow-[0_4px_30px_rgba(139,92,246,0.4)]"
                        />
                    </motion.div>

                    {/* Subtitle */}
                    <p className="font-space-mono text-[12px] uppercase tracking-[3px] text-[#6B6B6B] mt-8">
                        Cargando experiencia...
                    </p>

                    {/* Progress bar */}
                    <div className="w-48 h-[2px] bg-[#1A1A1A] mt-6 overflow-hidden">
                        <motion.div
                            className="h-full bg-[#2D00F7]"
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
