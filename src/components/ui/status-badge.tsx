'use client';

import { useTranslations } from 'next-intl';

/**
 * Event status pill (Azul Bloque §7 tables): the word always carries the
 * state, colour only reinforces it.
 *   live      lime + pulsing ink dot ("EN VIVO")
 *   published white + ink border ("PROGRAMADO")
 *   draft     white + grey border ("BORRADOR")
 *   ended/*   grey ("FINALIZADO")
 */
export function StatusBadge({ status }: { status: string }) {
    const t = useTranslations('events');
    const base =
        'inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 font-space-mono text-[10px] font-bold uppercase tracking-[0.12em]';

    if (status === 'live') {
        return (
            <span className={`${base} border-ink bg-lime text-ink`}>
                <span className="live-dot text-ink" aria-hidden="true" />
                {t('status.live')}
            </span>
        );
    }

    if (status === 'published') {
        return <span className={`${base} border-ink bg-white text-ink`}>{t('status.published')}</span>;
    }

    if (status === 'draft') {
        return <span className={`${base} border-muted-ink bg-white text-muted-white`}>{t('status.draft')}</span>;
    }

    return <span className={`${base} border-transparent bg-muted-ink text-ink`}>{t(`status.${status}`)}</span>;
}
