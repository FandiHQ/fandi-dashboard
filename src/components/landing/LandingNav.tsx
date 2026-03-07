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
        <>
            {/* Invisible Top Hit-Area for Hover Trigger */}
            <div
                className="fixed top-0 left-0 right-0 h-10 z-[60]"
                onMouseEnter={() => setVisible(true)}
            />

            <motion.header
                initial={{ y: -80 }}
                animate={{ y: visible ? 0 : -80 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onMouseLeave={() => {
                    // Only auto-hide on leave if we're not scrolling up
                    if (window.scrollY > 100) setVisible(false);
                }}
                className="fixed top-0 left-0 right-0 z-[50]
        h-16 px-4 md:px-6
        bg-black/80 backdrop-blur-lg
        border-b border-[#1A1A1A]
        flex items-center justify-between"
            >
                {/* Left: Logo */}
                <Image src="/fandi-logo.svg" alt="Fandi" width={100} height={32} className="h-8 w-auto cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

                {/* Center: Desktop Anchor Links */}
                <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
                    <a href="#en-vivo" className="font-space-mono text-xs text-[#A0A0A0] hover:text-[#8B5CF6] transition-colors uppercase tracking-[0.2em] relative group">
                        {t('howItWorks')}
                        <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#FF3366] transition-all duration-300 group-hover:w-full"></span>
                    </a>
                    <a href="#para-fans" className="font-space-mono text-xs text-[#A0A0A0] hover:text-[#8B5CF6] transition-colors uppercase tracking-[0.2em] relative group">
                        {t('forFans')}
                        <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#2D00F7] transition-all duration-300 group-hover:w-full"></span>
                    </a>
                    <a href="#para-artistas" className="font-space-mono text-xs text-[#A0A0A0] hover:text-[#8B5CF6] transition-colors uppercase tracking-[0.2em] relative group">
                        {t('forArtists')}
                        <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#8B5CF6] transition-all duration-300 group-hover:w-full"></span>
                    </a>
                </div>

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
        </>
    );
}
