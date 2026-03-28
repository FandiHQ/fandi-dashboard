'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { authApi } from '@/lib/api-hooks';
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function InviteAcceptPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSessionReady, setIsSessionReady] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // On mount: sign out any existing session, then exchange the invite token
    useEffect(() => {
        async function exchangeToken() {
            try {
                // CRITICAL: Sign out any existing session FIRST to avoid
                // collisions (e.g., owner is logged in when invitee clicks link)
                await supabase.auth.signOut();

                // Supabase invite links redirect with hash params:
                // /invite/accept#access_token=...&type=invite
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const type = hashParams.get('type');

                if (accessToken && refreshToken && (type === 'invite' || type === 'magiclink' || type === 'recovery')) {
                    // Set the session using the tokens from the URL
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (error) {
                        console.error('Session error:', error);
                        setIsExpired(true);
                        return;
                    }

                    setIsSessionReady(true);
                    // Clean the URL hash
                    window.history.replaceState(null, '', '/invite/accept');
                } else {
                    // No tokens in URL — this page needs a valid invite link
                    setIsExpired(true);
                }
            } catch {
                setIsExpired(true);
            }
        }
        exchangeToken();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setIsLoading(true);

        try {
            // 1. Set the password for the INVITE user (session was set above)
            const { error: updateError } = await supabase.auth.updateUser({ password });

            if (updateError) {
                setError(updateError.message);
                setIsLoading(false);
                return;
            }

            // 2. Sync with our backend (this activates the pending membership)
            try {
                await authApi.sync();
            } catch {
                // Sync might fail if the backend rejects the token for some reason,
                // but the password was already set. We'll still show success.
                console.warn('Sync after password set failed — user can still login');
            }

            // 3. Sign out the invite session — user should login fresh
            await supabase.auth.signOut();

            // 4. Show success message, then redirect to login
            setIsSuccess(true);
            setTimeout(() => {
                router.push('/');
            }, 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Algo salió mal');
            setIsLoading(false);
        }
    };

    // Success state — password has been set
    if (isSuccess) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#050505]">
                <div className="w-full max-w-md border border-[#22C55E40] bg-[#0A0A0A] p-10">
                    <div className="text-center">
                        <div className="mb-4 flex justify-center">
                            <CheckCircle size={48} className="text-[#22C55E]" />
                        </div>
                        <h1 className="font-sora text-2xl font-bold uppercase text-white">
                            ¡Contraseña Establecida!
                        </h1>
                        <p className="mt-4 font-space-mono text-sm text-[#737373]">
                            Tu contraseña ha sido configurada exitosamente.
                            Redirigiendo al inicio de sesión...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Expired link state
    if (isExpired) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#050505]">
                <div className="w-full max-w-md border border-[#FF336640] bg-[#0A0A0A] p-10">
                    <div className="text-center">
                        <h1 className="font-sora text-2xl font-bold uppercase text-white">
                            Enlace Expirado
                        </h1>
                        <p className="mt-4 font-space-mono text-sm text-[#737373]">
                            Este enlace de invitación ha expirado o ya fue utilizado.
                            Contacta al administrador de tu organización para recibir
                            una nueva invitación.
                        </p>
                        <button
                            onClick={() => router.push('/')}
                            className="mt-6 cursor-pointer font-space-mono text-xs uppercase tracking-[1px] text-[#2D00F7] hover:underline"
                        >
                            Ir al Inicio de Sesión
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading session state
    if (!isSessionReady) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#050505]">
                <Loader2 size={32} className="animate-spin text-[var(--color-tactical-acid)]" />
            </div>
        );
    }

    // Main form
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050505]">
            <div className="w-full max-w-md border border-[var(--color-tactical-acid)] bg-[#0A0A0A] p-10 shadow-[0_0_30px_rgba(204,255,0,0.1)]">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center bg-[#2D00F7]">
                            <Lock size={28} className="text-white" />
                        </div>
                    </div>
                    <h1 className="font-sora text-2xl font-bold uppercase text-white">
                        Bienvenido a Fandi
                    </h1>
                    <p className="mt-2 font-space-mono text-sm text-[#737373]">
                        Establece tu contraseña para acceder al dashboard
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Password */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                            Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 8 caracteres"
                                className="h-12 w-full rounded-none border border-[#1A1A1A] bg-[#0A0A0A] px-4 pr-12 font-space-mono text-sm text-white placeholder:text-[#4A4A4A] focus:border-[var(--color-tactical-acid)] focus:outline-none focus:ring-0"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#737373] hover:text-white"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="flex flex-col gap-2">
                        <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                            Confirmar Contraseña
                        </label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repite tu contraseña"
                            className="h-12 w-full rounded-none border border-[#1A1A1A] bg-[#0A0A0A] px-4 font-space-mono text-sm text-white placeholder:text-[#4A4A4A] focus:border-[var(--color-tactical-acid)] focus:outline-none focus:ring-0"
                            required
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="font-space-mono text-sm text-[#FF3366]">{error}</p>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading || !password || !confirmPassword}
                        className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-none bg-[#2D00F7] font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all duration-200 hover:shadow-[0_0_30px_rgba(45,0,247,0.6)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Configurando...
                            </>
                        ) : (
                            'ESTABLECER CONTRASEÑA'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
