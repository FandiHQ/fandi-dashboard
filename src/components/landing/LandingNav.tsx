'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

interface Props {
    onSignInClick?: () => void;
}

export default function LandingNav({ onSignInClick }: Props) {
    const t = useTranslations('nav');
    const locale = useLocale();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const switchLocale = (loc: string) => {
        document.cookie = `locale=${loc};path=/;max-age=31536000`;
        window.location.reload();
    };

    return (
        <header
            className="fixed top-0 left-0 right-0 z-50
                h-14 md:h-16 px-4 md:px-6
                bg-black/90 backdrop-blur-lg
                border-b border-[#1A1A1A]
                flex items-center justify-between"
            role="banner"
        >
            {/* Left: Logo */}
            <Image
                src="/fandi-logo.png"
                alt="Fandi — Home"
                width={100}
                height={40}
                className="h-8 md:h-12 w-auto cursor-pointer flex-shrink-0"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />

            {/* Center: Desktop Anchor Links */}
            <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
                <a href="#en-vivo" className="font-space-mono text-[13px] text-[#A0A0A0] hover:text-[#8B5CF6] transition-colors uppercase tracking-[0.2em] relative group">
                    {t('howItWorks')}
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#FF3366] transition-all duration-300 group-hover:w-full" aria-hidden="true" />
                </a>
                <a href="#como-funciona" className="font-space-mono text-[13px] text-[#A0A0A0] hover:text-[#8B5CF6] transition-colors uppercase tracking-[0.2em] relative group">
                    {t('forFans')}
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#2D00F7] transition-all duration-300 group-hover:w-full" aria-hidden="true" />
                </a>
                <a href="#para-artistas" className="font-space-mono text-[13px] text-[#A0A0A0] hover:text-[#8B5CF6] transition-colors uppercase tracking-[0.2em] relative group">
                    {t('forArtists')}
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#8B5CF6] transition-all duration-300 group-hover:w-full" aria-hidden="true" />
                </a>
            </nav>

            {/* Right: Desktop — Language toggle + Login */}
            <div className="hidden md:flex items-center gap-4">
                <div className="flex gap-1 font-space-mono text-[13px]" role="group" aria-label="Language selector">
                    <button
                        onClick={() => switchLocale('es')}
                        className={`cursor-pointer ${locale === 'es' ? 'text-white' : 'text-[#6B6B6B] hover:text-white transition-colors'}`}
                        aria-pressed={locale === 'es'}
                        aria-label="Español"
                    >
                        ES
                    </button>
                    <span className="text-[#6B6B6B]" aria-hidden="true">|</span>
                    <button
                        onClick={() => switchLocale('en')}
                        className={`cursor-pointer ${locale === 'en' ? 'text-white' : 'text-[#6B6B6B] hover:text-white transition-colors'}`}
                        aria-pressed={locale === 'en'}
                        aria-label="English"
                    >
                        EN
                    </button>
                </div>
                <button
                    onClick={onSignInClick}
                    className="btn-tactical font-space-mono text-[13px] font-bold uppercase tracking-[2px]
                        px-6 py-2 transition-all cursor-pointer"
                >
                    {t('login')}
                </button>
            </div>

            {/* Right: Mobile — Hamburger */}
            <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white p-1 cursor-pointer"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-14 left-0 right-0 bg-black/95 backdrop-blur-lg border-b border-[#1A1A1A] px-6 py-6 flex flex-col gap-5">
                    <a href="#en-vivo" onClick={() => setMobileMenuOpen(false)} className="font-space-mono text-sm text-[#A0A0A0] hover:text-white transition-colors uppercase tracking-[0.15em]">
                        {t('howItWorks')}
                    </a>
                    <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)} className="font-space-mono text-sm text-[#A0A0A0] hover:text-white transition-colors uppercase tracking-[0.15em]">
                        {t('forFans')}
                    </a>
                    <a href="#para-artistas" onClick={() => setMobileMenuOpen(false)} className="font-space-mono text-sm text-[#A0A0A0] hover:text-white transition-colors uppercase tracking-[0.15em]">
                        {t('forArtists')}
                    </a>
                    <div className="flex items-center gap-4 pt-2 border-t border-[#1A1A1A]">
                        <div className="flex gap-2 font-space-mono text-sm" role="group" aria-label="Language selector">
                            <button
                                onClick={() => switchLocale('es')}
                                className={`cursor-pointer ${locale === 'es' ? 'text-white' : 'text-[#6B6B6B]'}`}
                                aria-pressed={locale === 'es'}
                            >
                                ES
                            </button>
                            <span className="text-[#6B6B6B]" aria-hidden="true">|</span>
                            <button
                                onClick={() => switchLocale('en')}
                                className={`cursor-pointer ${locale === 'en' ? 'text-white' : 'text-[#6B6B6B]'}`}
                                aria-pressed={locale === 'en'}
                            >
                                EN
                            </button>
                        </div>
                        <button
                            onClick={() => { setMobileMenuOpen(false); onSignInClick?.(); }}
                            className="btn-tactical font-space-mono text-sm font-bold uppercase tracking-[2px]
                                px-6 py-2 transition-all cursor-pointer ml-auto"
                        >
                            {t('login')}
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}
