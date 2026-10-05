import Image from 'next/image';
import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

/**
 * Blue canvas + the white login-style block (design "01 Login"), for the
 * email-link pages: reset password and invite accept.
 */
export function AuthShell({ children }: { children: ReactNode }) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-blue px-4 py-10 text-white">
            <Image
                src="/fandi-tile.png"
                alt="Fandi"
                width={64}
                height={64}
                unoptimized
                priority
                className="size-16 -rotate-[4deg] rounded-[16px] border-[3px] border-ink shadow-ext-lg"
            />
            <div className="surface-white w-full max-w-[460px] rounded-[20px] border-2 border-ink bg-white p-6 text-ink shadow-ext-xl sm:p-10">
                {children}
            </div>
        </main>
    );
}

/** Title block used at the top of each state. */
export function AuthShellHeader({
    icon,
    tone = 'blue',
    title,
    children,
}: {
    icon?: ReactNode;
    tone?: 'blue' | 'lime' | 'alert';
    title: string;
    children?: ReactNode;
}) {
    const toneClass = tone === 'lime' ? 'bg-lime text-ink' : tone === 'alert' ? 'bg-alert text-ink' : 'bg-blue text-white';
    return (
        <div className="mb-6 flex flex-col gap-3">
            <span
                aria-hidden="true"
                className={`flex size-12 items-center justify-center rounded-[12px] border-2 border-ink shadow-ext-sm ${toneClass}`}
            >
                {icon ?? <Lock size={22} />}
            </span>
            <h1 className="font-display text-[30px] leading-none text-ink sm:text-[34px]">{title}</h1>
            {children}
        </div>
    );
}

/** "Checking your link…" placeholder while the email link is verified. */
export function AuthShellChecking({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 py-6" role="status" aria-live="polite">
            <span className="live-dot size-3 text-blue" aria-hidden="true" />
            <span className="text-[15px] font-semibold text-body-white">{label}</span>
        </div>
    );
}
