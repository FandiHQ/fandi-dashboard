// fandi-dashboard\src\components\landing\SignInModal.tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import type { UserSyncResponse } from '@/types/api';

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function SignInModal({ open, onClose }: Props) {
    const router = useRouter();
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

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
                        ref={modalRef}
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

                        {/* Login form with logo + role-based routing */}
                        <LoginForm
                            showLogo={true}
                            onSuccess={(me: UserSyncResponse) => {
                                onClose();
                                const destination = me.organization?.memberRole === 'staff'
                                    ? '/staff'
                                    : '/dashboard';
                                router.push(destination);
                            }}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
