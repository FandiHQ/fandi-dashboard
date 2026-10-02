'use client';

/**
 * Shown by the protected layouts when the session is valid but our API did
 * not answer on load. The person stays signed in and can retry; nothing
 * sends them back to the login form for a server hiccup.
 */
import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function SessionUnreachable({ onRetry }: { onRetry: () => Promise<void> }) {
    const t = useTranslations('auth');
    const tCommon = useTranslations('common');
    const [retrying, setRetrying] = useState(false);

    const retry = async () => {
        setRetrying(true);
        try {
            await onRetry();
        } finally {
            setRetrying(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-blue px-4">
            <div className="block-white flex max-w-[420px] flex-col items-center gap-4 p-8 text-center" role="alert">
                <AlertCircle size={32} className="text-alert-white" aria-hidden="true" />
                <p className="text-sm font-semibold text-ink">{t('sessionUnreachable')}</p>
                <Button variant="secondary" onClick={retry} disabled={retrying}>
                    {retrying && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                    {tCommon('retry')}
                </Button>
            </div>
        </div>
    );
}
