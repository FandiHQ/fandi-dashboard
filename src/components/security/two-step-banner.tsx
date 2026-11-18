'use client';

/**
 * The reminder for idol owners/admins during their 14 days: "Activa la
 * verificación en dos pasos antes del {fecha}", one click to Configuración.
 * After the date the layouts send them to /verificacion instead.
 */
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { colombiaDateTime } from '@/lib/colombia-time';
import { DASHBOARD_SECURITY_PATH } from '@/lib/two-step';

export function TwoStepBanner({ deadline, href = DASHBOARD_SECURITY_PATH }: { deadline: string; href?: string }) {
    const t = useTranslations('twoStep.banner');
    const locale = useLocale();
    const when = colombiaDateTime(deadline, locale);
    if (!when) return null;
    return (
        <div
            role="status"
            data-testid="two-step-banner"
            className="mb-6 flex flex-col gap-3 rounded-[16px] border-2 border-ink bg-white p-4 text-ink shadow-ext-md sm:flex-row sm:items-center sm:gap-4 sm:px-5"
        >
            <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border-2 border-ink bg-lilac"
            >
                <ShieldAlert size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-[15px] font-black leading-snug">{t('title', { date: when.date })}</p>
                <p className="text-[13px] leading-snug text-body-white">{t('why')}</p>
            </div>
            <Link
                href={href}
                data-testid="two-step-banner-cta"
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-[12px] border-2 border-ink bg-lime px-5 text-[14px] font-black text-ink shadow-ext-sm transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
            >
                {t('cta')}
            </Link>
        </div>
    );
}
