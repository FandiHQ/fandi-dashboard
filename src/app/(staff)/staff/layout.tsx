'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { SessionUnreachable } from '@/components/auth/session-unreachable';
import { useRouter } from 'next/navigation';

export default function StaffLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading, isAuthenticated, isUnreachable, retrySession, memberRole, user, logout } = useAuth();
    const router = useRouter();
    const t = useTranslations('redemption');

    useEffect(() => {
        if (!isLoading && !isAuthenticated && !isUnreachable) {
            router.replace('/login');
        } else if (!isLoading && isAuthenticated && memberRole !== 'staff') {
            router.replace('/dashboard');
        }
    }, [isLoading, isAuthenticated, isUnreachable, memberRole, router]);

    if (!isLoading && isUnreachable) {
        return <SessionUnreachable onRetry={retrySession} />;
    }

    if (isLoading || !isAuthenticated || memberRole !== 'staff') {
        return (
            <div className="flex h-screen items-center justify-center bg-blue text-lime">
                <span className="live-dot size-3" aria-hidden="true" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-blue text-white">
            <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 bg-ink px-4">
                <div className="flex min-w-0 items-center gap-3">
                    <Image
                        src="/fandi-tile.png"
                        alt="Fandi"
                        width={36}
                        height={36}
                        unoptimized
                        className="size-9 shrink-0 rounded-[10px] object-cover"
                    />
                    <span className="label-mono shrink-0 rounded-full border-2 border-lilac px-2.5 py-0.5 text-[11px] font-bold text-lilac">
                        Staff
                    </span>
                </div>
                <div className="flex min-w-0 items-center gap-3">
                    {/* Who's signed in — a shared/borrowed venue phone
                        should make the active account obvious. */}
                    {user?.displayName ? (
                        <span className="hidden max-w-[40vw] truncate font-space-mono text-[11px] text-muted-ink sm:inline">
                            {user.displayName}
                        </span>
                    ) : null}
                    <button
                        onClick={() => void logout()}
                        aria-label={t('logout')}
                        className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-[12px] border-2 border-dash-ink px-3 font-space-mono text-[11px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:border-alert hover:text-alert"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">{t('logout')}</span>
                    </button>
                </div>
            </header>
            <main className="flex-1 px-4 py-5">{children}</main>
        </div>
    );
}
