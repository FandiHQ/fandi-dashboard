'use client';

import { useState, useRef } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';

export default function LandingNav() {
    const t = useTranslations('nav');
    const locale = useLocale();
    const { scrollY } = useScroll();
    const [visible, setVisible] = useState(false);
    const lastScrollY = useRef(0);

    useMotionValueEvent(scrollY, 'change', (current) => {
        const direction = current < lastScrollY.current ? 'up' : 'down';
        lastScrollY.current = current;

        if (direction === 'up' && current > 100) {
            setVisible(true);
        } else {
            setVisible(false);
        }
    });

    const switchLocale = (loc: string) => {
        document.cookie = `locale=${loc};path=/;max-age=31536000`;
        window.location.reload();
    };

    return (
        <motion.header
            initial={{ y: -80 }}
            animate={{ y: visible ? 0 : -80 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-50
        h-16 px-4 md:px-6
        bg-black/80 backdrop-blur-lg
        border-b border-[#1A1A1A]
        flex items-center justify-between"
        >
            {/* Left: Logo */}
            <Image src="/fandi-logo.svg" alt="Fandi" width={100} height={32} className="h-8 w-auto" />

            {/* Right: Language toggle + Login */}
            <div className="flex items-center gap-4">
                {/* ES/EN toggle */}
                <div className="flex gap-1 font-space-mono text-xs">
                    <button
                        onClick={() => switchLocale('es')}
                        className={locale === 'es' ? 'text-white' : 'text-[#6B6B6B] hover:text-white transition-colors'}
                    >
                        ES
                    </button>
                    <span className="text-[#6B6B6B]">|</span>
                    <button
                        onClick={() => switchLocale('en')}
                        className={locale === 'en' ? 'text-white' : 'text-[#6B6B6B] hover:text-white transition-colors'}
                    >
                        EN
                    </button>
                </div>

                {/* Login CTA */}
                <a
                    href="/login"
                    className="font-space-mono text-[11px] uppercase tracking-[2px]
            text-white border border-[#2D00F7] px-4 py-2
            hover:bg-[#2D00F7] transition-colors"
                >
                    {t('login')}
                </a>
            </div>
        </motion.header>
    );
}
