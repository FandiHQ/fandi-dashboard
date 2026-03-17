'use client';

import { useTranslations } from 'next-intl';

const statusColors: Record<string, { text: string; bg: string }> = {
    draft: { text: '#737373', bg: '#73737320' },
    published: { text: '#2D00F7', bg: '#2D00F720' },
    live: { text: '#22C55E', bg: '#22C55E20' },
    ended: { text: '#A0A0A0', bg: '#A0A0A020' },
};

export function StatusBadge({ status }: { status: string }) {
    const t = useTranslations('events');
    const c = statusColors[status] || statusColors.draft;
    return (
        <span
            className="inline-flex items-center rounded-none px-2 py-0.5 font-space-mono text-[10px] uppercase tracking-[1px]"
            style={{ color: c.text, backgroundColor: c.bg }}
        >
            {t(`status.${status}`)}
        </span>
    );
}
