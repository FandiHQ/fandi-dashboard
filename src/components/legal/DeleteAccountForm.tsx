'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Fallback deletion request for people who no longer have the app.
 *
 * Unauthenticated by necessity: fans sign in with a phone number and an
 * SMS code, so there is no web account to log into. A human verifies
 * identity before anything is executed — which is why this posts a
 * *request* and never reports whether the number exists.
 *
 * The response text is deliberately identical for registered and
 * unregistered numbers. Anything else turns this box into a free "is this
 * person a Fandi user?" lookup for anyone holding a phone list.
 */

type Status = 'idle' | 'sending' | 'sent' | 'error';

const E164 = /^\+[1-9]\d{7,14}$/;

export function DeleteAccountForm() {
    const [phone, setPhone] = useState('+57');
    const [status, setStatus] = useState<Status>('idle');

    const valid = E164.test(phone.trim());

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!valid || status === 'sending') return;
        setStatus('sending');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/account-deletion/request`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: phone.trim() }),
                },
            );
            // 429 means the rate limiter fired. Telling the visitor their
            // request "failed" would invite a retry loop, and the request
            // they already sent is queued — so treat it as accepted.
            setStatus(res.ok || res.status === 429 ? 'sent' : 'error');
        } catch {
            setStatus('error');
        }
    }

    if (status === 'sent') {
        return (
            <div className="rounded-[12px] border-2 border-ink bg-ink p-5">
                <p className="text-base leading-relaxed text-white">
                    Recibimos tu solicitud. Si existe una cuenta asociada a ese
                    número, la eliminaremos en un máximo de{' '}
                    <strong>15 días hábiles</strong> y te confirmaremos por SMS.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-ink">
                    ¿Necesitas que sea inmediato? Hazlo desde la app, en Perfil ›
                    Configuración › Eliminar mi cuenta.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <label
                htmlFor="delete-phone"
                className="label-mono text-[11px] text-muted-white"
            >
                Número de celular registrado
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
                <input
                    id="delete-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+573001234567"
                    aria-describedby="delete-phone-hint"
                    className="h-12 min-w-0 flex-1 rounded-[10px] border-2 border-ink bg-white px-4 text-base text-ink outline-none transition-colors placeholder:text-muted-ink focus:border-blue"
                />
                <Button
                    type="submit"
                    size="lg"
                    disabled={!valid || status === 'sending'}
                >
                    {status === 'sending' ? 'Enviando…' : 'Solicitar'}
                </Button>
            </div>
            <p
                id="delete-phone-hint"
                className="text-sm text-muted-white"
            >
                Formato internacional, empezando por +57.
            </p>
            {status === 'error' && (
                <p role="alert" className="text-sm font-bold text-alert-white">
                    No pudimos enviar tu solicitud. Intenta de nuevo, o
                    escríbenos a hola@fandi.app.
                </p>
            )}
        </form>
    );
}
