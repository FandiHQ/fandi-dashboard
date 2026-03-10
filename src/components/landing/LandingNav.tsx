'use client';

import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';

interface Props {
    onSignInClick?: () => void;
}

export default function LandingNav({ onSignInClick }: Props) {
    const t = useTranslations('nav');
    const locale = useLocale();

    const switchLocale = (loc: string) => {
        document.cookie = `locale=${loc};path=/;max-age=31536000`;
        window.location.reload();
    };

    return (
        <header
            className="fixed top-0 left-0 right-0 z-50
        h-16 px-4 md:px-6
        bg-black/90 backdrop-blur-lg
        border-b border-[#1A1A1A]
        flex items-center justify-between"
        >
            {/* Left: Logo */}
            <Image
                src="/fandi-logo.png"
                alt="Fandi"
                width={120}
                height={48}
                className="h-12 w-auto cursor-pointer"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />

            {/* Center: Desktop Anchor Links */}
            <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
                <a href="#en-vivo" className="font-space-mono text-[13px] text-[#A0A0A0] hover:text-[#8B5CF6] transition-colors uppercase tracking-[0.2em] relative group">
                    {t('howItWorks')}
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#FF3366] transition-all duration-300 group-hover:w-full"></span>
                </a>
                <a href="#como-funciona" className="font-space-mono text-[13px] text-[#A0A0A0] hover:text-[#8B5CF6] transition-colors uppercase tracking-[0.2em] relative group">
                    {t('forFans')}
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#2D00F7] transition-all duration-300 group-hover:w-full"></span>
                </a>
                <a href="#para-artistas" className="font-space-mono text-[13px] text-[#A0A0A0] hover:text-[#8B5CF6] transition-colors uppercase tracking-[0.2em] relative group">
                    {t('forArtists')}
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#8B5CF6] transition-all duration-300 group-hover:w-full"></span>
                </a>
            </div>

            {/* Right: Language toggle + Login */}
            <div className="flex items-center gap-4">
                {/* ES/EN toggle */}
                <div className="flex gap-1 font-space-mono text-[13px]">
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
                <button
                    onClick={onSignInClick}
                    className="font-space-mono text-[13px] uppercase tracking-[2px]
            text-white border border-[#2D00F7] px-4 py-2
            hover:bg-[#2D00F7] hover:shadow-[0_0_20px_rgba(45,0,247,0.3)]
            active:scale-95 transition-all cursor-pointer"
                >
                    {t('login')}
                </button>
            </div>
        </header>
    );
}
