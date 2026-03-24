'use client';

import { useTranslations } from 'next-intl';

export function StatusBadge({ status }: { status: string }) {
    const t = useTranslations('events');
    
    if (status === 'live') {
        return (
            <div className="live-pulse-container inline-flex items-center gap-2 rounded-none bg-[var(--color-tactical-magenta)] px-3 py-1 font-space-mono text-[11px] font-bold uppercase tracking-[2px] text-white">
                <span className="h-1.5 w-1.5 animate-pulse bg-white" />
                <span className="animate-glitch-infinite">{t('status.live')}</span>
            </div>
        );
    }
    
    if (status === 'published') {
        return (
            <div className="inline-flex items-center rounded-none bg-[var(--color-tactical-acid)] px-2 py-0.5 font-space-mono text-[10px] font-bold uppercase tracking-[1px] text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]">
                {t('status.published')}
            </div>
        );
    }

    if (status === 'draft') {
        return (
            <div className="inline-flex items-center rounded-none border border-dashed border-[#4A4A4A] bg-transparent px-2 py-0.5 font-space-mono text-[10px] uppercase tracking-[1px] text-[#A0A0A0]">
                {t('status.draft')}
            </div>
        );
    }

    return (
        <div className="inline-flex items-center rounded-none bg-[#1A1A1A] px-2 py-0.5 font-space-mono text-[10px] uppercase tracking-[1px] text-[#A0A0A0]">
            {t(`status.${status}`)}
        </div>
    );
}
