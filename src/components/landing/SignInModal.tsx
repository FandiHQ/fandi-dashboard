'use client';

import { useState } from 'react';
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Placeholder — no backend yet
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
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

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
                                <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] block mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white font-sora text-base
                                        px-4 py-3 outline-none focus:border-[#2D00F7] transition-colors"
                                    placeholder="tucorreo@ejemplo.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] block mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white font-sora text-base
                                        px-4 py-3 outline-none focus:border-[#2D00F7] transition-colors"
                                    placeholder="••••••••"
                                    required
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
