'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function SignInModal({ open, onClose }: Props) {
    const t = useTranslations('nav');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const emailRef = useRef<HTMLInputElement>(null);

    // Focus trap: focus email on open
    useEffect(() => {
        if (open) {
            setTimeout(() => emailRef.current?.focus(), 100);
        }
    }, [open]);

    // Close on Escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    onClick={onClose}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Sign in to Fandi"
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />

                    {/* Modal Card */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-[90vw] max-w-md p-8 md:p-10
                            bg-[#121212]/95 backdrop-blur-xl
                            border border-[#2A2A2A]
                            shadow-[0_0_60px_rgba(45,0,247,0.15)]"
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-[#6B6B6B] hover:text-white transition-colors cursor-pointer"
                            aria-label="Close sign-in modal"
                        >
                            <X size={20} />
                        </button>

                        {/* Logo */}
                        <div className="flex justify-center mb-8">
                            <Image
                                src="/fandi-logo.png"
                                alt="Fandi"
                                width={160}
                                height={52}
                                className="h-12 w-auto"
                            />
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="signin-email" className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] block mb-2">
                                    Email
                                </label>
                                <input
                                    id="signin-email"
                                    ref={emailRef}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white font-sora text-base
                                        px-4 py-3 outline-none focus:border-[#2D00F7] focus:shadow-[0_0_10px_rgba(45,0,247,0.2)] transition-all"
                                    placeholder="tucorreo@ejemplo.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <div>
                                <label htmlFor="signin-password" className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] block mb-2">
                                    Password
                                </label>
                                <input
                                    id="signin-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white font-sora text-base
                                        px-4 py-3 outline-none focus:border-[#2D00F7] focus:shadow-[0_0_10px_rgba(45,0,247,0.2)] transition-all"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full font-space-mono text-[13px] uppercase tracking-[2px]
                                    bg-[#2D00F7] text-white py-4
                                    hover:shadow-[0_0_25px_rgba(45,0,247,0.5)]
                                    active:scale-95 transition-all cursor-pointer"
                            >
                                {t('login')}
                            </button>
                        </form>

                        {/* Register link */}
                        <p className="font-space-mono text-[13px] text-[#6B6B6B] text-center mt-6">
                            ¿No tienes cuenta?{' '}
                            <span className="text-[#2D00F7] hover:text-[#8B5CF6] cursor-pointer transition-colors">
                                Regístrate
                            </span>
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
