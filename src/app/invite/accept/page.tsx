'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * IMPORTANT: This page uses its OWN Supabase client instance, isolated from
 * the global AuthProvider. The AuthProvider's init() detects sessions on mount
 * and can call signOut() for users without org access — which would kill the
 * invite session before we can use it to set the password.
 */
function createIsolatedSupabaseClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            // Use a separate storage key so it doesn't collide with the main client
            cookieOptions: { name: 'sb-invite' },
        },
    );
}

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
    const clientRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);

    // On mount: extract tokens from hash, establish session on isolated client
    useEffect(() => {
        async function exchangeToken() {
            try {
                // Create an isolated Supabase client for this page only
                const isolatedClient = createIsolatedSupabaseClient();
                clientRef.current = isolatedClient;

                // Sign out any pre-existing session on the MAIN client
                // so the owner's dashboard doesn't persist after this flow
                const { createBrowserClient: _ } = await import('@supabase/ssr');
                const mainClient = (await import('@/lib/supabase')).supabase;
                await mainClient.auth.signOut();

                // Supabase invite links redirect with hash params:
                // /invite/accept#access_token=...&type=invite
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const type = hashParams.get('type');

                if (accessToken && refreshToken && (type === 'invite' || type === 'magiclink' || type === 'recovery')) {
                    // Set the session on the ISOLATED client using the tokens from the URL
                    const { error } = await isolatedClient.auth.setSession({
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
            } catch (err) {
                console.error('Token exchange failed:', err);
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

        const client = clientRef.current;
        if (!client) {
            setError('Error de sesión. Intenta abrir el enlace de invitación de nuevo.');
            return;
        }

        setIsLoading(true);

        try {
            // 1. Verify we have a valid session on the isolated client
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                setError('La sesión ha expirado. Solicita una nueva invitación.');
                setIsLoading(false);
                return;
            }

            console.log('Setting password for user:', session.user.email, session.user.id);

            // 2. Set the password for the INVITE user
            const { error: updateError } = await client.auth.updateUser({ password });

            if (updateError) {
                console.error('updateUser error:', updateError);
                setError(updateError.message);
                setIsLoading(false);
                return;
            }

            console.log('Password set successfully for:', session.user.email);

            // 3. Try to sync with backend (activates the pending membership)
            try {
                const token = session.access_token;
                const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                await fetch(`${apiBase}/users/sync`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
            } catch {
                console.warn('Sync after password set failed — user can still login');
            }

            // 4. Sign out the isolated client session
            await client.auth.signOut();

            // 5. Also ensure the main client is signed out
            const mainClient = (await import('@/lib/supabase')).supabase;
            await mainClient.auth.signOut();

            // 6. Show success, then redirect to login
            setIsSuccess(true);
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        } catch (err) {
            console.error('Password setup error:', err);
            setError(err instanceof Error ? err.message : 'Algo salió mal');
            setIsLoading(false);
        }
    };

    // Success state — password has been set
    if (isSuccess) {
        return (
            <InviteShell>
                <div className="flex flex-col items-center gap-5 text-center">
                    <span className="flex size-16 items-center justify-center rounded-full border-2 border-ink bg-lime text-ink shadow-ext-sm">
                        <CheckCircle size={30} strokeWidth={2.5} />
                    </span>
                    <h1 className="font-display text-[30px] text-ink">
                        Contraseña establecida
                    </h1>
                    <p className="text-[15px] leading-relaxed text-muted-white">
                        Tu contraseña ha sido configurada exitosamente.
                        Redirigiendo al inicio de sesión...
                    </p>
                </div>
            </InviteShell>
        );
    }

    // Expired link state
    if (isExpired) {
        return (
            <InviteShell>
                <div className="flex flex-col items-center gap-5 text-center">
                    <span className="flex size-16 items-center justify-center rounded-full border-2 border-ink bg-alert text-ink shadow-ext-sm" aria-hidden="true">
                        <Lock size={26} strokeWidth={2.5} />
                    </span>
                    <h1 className="font-display text-[30px] text-ink">
                        Enlace expirado
                    </h1>
                    <p className="text-[15px] leading-relaxed text-muted-white">
                        Este enlace de invitación ha expirado o ya fue utilizado.
                        Contacta al administrador de tu organización para recibir
                        una nueva invitación.
                    </p>
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => { window.location.href = '/'; }}
                        className="w-full"
                    >
                        Ir al inicio de sesión
                    </Button>
                </div>
            </InviteShell>
        );
    }

    // Loading session state
    if (!isSessionReady) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-blue text-lime">
                <span className="live-dot size-3" aria-hidden="true" />
            </div>
        );
    }

    // Main form
    return (
        <InviteShell>
            {/* Header */}
            <div className="mb-7 flex flex-col gap-3">
                <span className="flex size-12 items-center justify-center rounded-[12px] border-2 border-ink bg-blue text-white shadow-ext-sm">
                    <Lock size={22} />
                </span>
                <h1 className="font-display text-[34px] leading-none text-ink">
                    Bienvenido a Fandi
                </h1>
                <p className="text-[15px] leading-relaxed text-muted-white">
                    Establece tu contraseña para acceder al panel.
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Password */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="invite-password" className="label-mono text-[11px] text-muted-white">
                        Contraseña
                    </label>
                    <div className="relative">
                        <Input
                            id="invite-password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 8 caracteres"
                            className="h-[54px] rounded-[12px] px-4 pr-12 text-base md:text-base"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[10px] text-muted-white transition-colors hover:text-ink"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="invite-password-confirm" className="label-mono text-[11px] text-muted-white">
                        Confirmar contraseña
                    </label>
                    <Input
                        id="invite-password-confirm"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repite tu contraseña"
                        className="h-[54px] rounded-[12px] px-4 text-base md:text-base"
                        required
                    />
                </div>

                {/* Error */}
                {error && (
                    <p role="alert" className="flex items-center gap-2 text-sm font-bold text-alert-white">
                        <span className="inline-block size-2 shrink-0 rounded-full bg-alert-white" aria-hidden="true" />
                        {error}
                    </p>
                )}

                {/* Submit */}
                <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading || !password || !confirmPassword}
                    className="mt-1 h-[58px] w-full rounded-[14px] text-[18px] [font-stretch:115%] font-black shadow-ext-block"
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Configurando...
                        </>
                    ) : (
                        'Establecer contraseña'
                    )}
                </Button>
            </form>
        </InviteShell>
    );
}

/** Blue canvas + the white login-style block (design "01 Login"). */
function InviteShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-blue px-4 py-10 text-white">
            <Image
                src="/fandi-tile.png"
                alt="Fandi"
                width={64}
                height={64}
                unoptimized
                className="size-16 -rotate-[4deg] rounded-[16px] border-[3px] border-ink shadow-ext-lg"
            />
            <div className="w-full max-w-[460px] rounded-[20px] border-2 border-ink bg-white p-8 text-ink shadow-ext-xl sm:p-10">
                {children}
            </div>
        </div>
    );
}
