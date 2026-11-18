'use client';

/**
 * Small shared pieces of the Fandi Admin screens (Azul Bloque §7): page
 * header on blue, tables inside a white block that scroll on their own,
 * skeleton / empty / error states, Colombia times and the pager.
 */
import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { colombiaDateTime } from '@/lib/colombia-time';
import { adminErrorKey, pageCount, pageRange, resendRetryAt } from '@/lib/admin';

export const FIELD_LABEL_CLASS = 'label-mono text-[11px] text-muted-white';
export const HINT_CLASS = 'text-[13px] leading-snug text-muted-white';
export const ERROR_TEXT_CLASS = 'text-[13px] font-bold text-alert-white';
export const SELECT_CLASS =
    'h-12 w-full cursor-pointer rounded-[10px] border-2 border-ink bg-white px-3 text-sm font-semibold text-ink outline-none focus-visible:shadow-ext-sm';
export const TH_CLASS = 'label-mono whitespace-nowrap px-3 py-2.5 text-muted-white';
export const TD_CLASS = 'px-3 py-[11px] align-top';

export function AdminPageHeader({ title, lead, action }: { title: string; lead?: ReactNode; action?: ReactNode }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
                <h1 className="font-hero text-[34px] text-white sm:text-[44px]">{title}</h1>
                {lead && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-lilac">{lead}</p>}
            </div>
            {action}
        </div>
    );
}

/** A white block; its table scrolls sideways inside it, never the page. */
export function AdminTableCard({ children, testId }: { children: ReactNode; testId?: string }) {
    return (
        <div className="block-white min-w-0 overflow-hidden" data-testid={testId}>
            <div className="overflow-x-auto">{children}</div>
        </div>
    );
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
    const t = useTranslations('common');
    return (
        <div className="flex flex-col gap-2 p-4" aria-busy="true">
            <span role="status" className="sr-only">{t('loading')}</span>
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
            ))}
        </div>
    );
}

export function AdminEmpty({ children }: { children: ReactNode }) {
    return <p className="p-6 text-sm text-ink">{children}</p>;
}

/** The error of a failed load, in our own words, with a retry. */
export function AdminError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
    const t = useTranslations('fandiAdmin');
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 p-6" role="alert">
            <p className="text-sm font-bold text-alert-white">{t(`errors.${adminErrorKey(error)}`)}</p>
            {onRetry && (
                <Button size="sm" variant="secondary" onClick={onRetry}>
                    <RotateCw size={14} aria-hidden="true" />
                    {t('common.retry')}
                </Button>
            )}
        </div>
    );
}

/** "24 de noviembre, 3:40 p. m." in Colombia (the column header says so). */
export function useColombiaTime() {
    const locale = useLocale();
    const t = useTranslations('fandiAdmin');
    return (value: string | Date | null | undefined): string | null => {
        const parts = colombiaDateTime(value, locale);
        return parts ? t('dateTime', { date: parts.date, time: parts.time }) : null;
    };
}

export function ColombiaTime({ value, fallback = '' }: { value: string | Date | null | undefined; fallback?: string }) {
    const format = useColombiaTime();
    const text = format(value);
    if (!text) return <>{fallback}</>;
    const iso = typeof value === 'string' ? value : value instanceof Date ? value.toISOString() : undefined;
    return <time dateTime={iso} className="whitespace-nowrap">{text}</time>;
}

/** Our copy for a failed admin call (RESEND_LIMIT says when it opens again). */
export function useAdminErrorText() {
    const locale = useLocale();
    const t = useTranslations('fandiAdmin.errors');
    return (error: unknown): string => {
        const key = adminErrorKey(error);
        if (key === 'resendLimit') {
            const when = colombiaDateTime(resendRetryAt(error), locale);
            if (when) return t('resendLimitAt', { date: when.date, time: when.time });
        }
        return t(key);
    };
}

/** On/off control (a real switch for screen readers; the label says the state). */
export function AdminSwitch({
    id, checked, onChange, label, hint, disabled,
}: {
    id: string;
    checked: boolean;
    onChange: (next: boolean) => void;
    label: string;
    hint?: string;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor={id} className="text-sm font-bold text-ink">{label}</label>
                {hint && <p id={`${id}-hint`} className={HINT_CLASS}>{hint}</p>}
            </div>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-describedby={hint ? `${id}-hint` : undefined}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-lime' : 'bg-line-white'}`}
            >
                <span
                    aria-hidden="true"
                    className={`absolute top-1/2 size-5 -translate-y-1/2 rounded-full border-2 border-ink bg-white transition-[left] ${checked ? 'left-[26px]' : 'left-[3px]'}`}
                />
            </button>
        </div>
    );
}

/** Pill whose word carries the state (colour only reinforces it). */
export function AdminPill({ tone = 'plain', children }: { tone?: 'live' | 'plain' | 'quiet' | 'alert'; children: ReactNode }) {
    const tones = {
        live: 'border-ink bg-lime text-ink',
        plain: 'border-ink bg-white text-ink',
        quiet: 'border-muted-ink bg-white text-muted-white',
        alert: 'border-alert-white bg-white text-alert-white',
    } as const;
    return (
        <span className={`inline-flex items-center whitespace-nowrap rounded-full border-2 px-2.5 py-0.5 font-space-mono text-[10px] font-bold uppercase tracking-[0.12em] ${tones[tone]}`}>
            {children}
        </span>
    );
}

export function AdminPager({
    page, pageSize, total, onPage,
}: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
    const t = useTranslations('fandiAdmin.common');
    const pages = pageCount(total, pageSize);
    const range = pageRange(page, pageSize, total);
    if (!range) return null;
    return (
        <nav className="flex flex-wrap items-center justify-between gap-3 text-sm text-white" aria-label={t('pagination')}>
            <span className="label-mono text-[11px] text-lilac tabular">
                {t('range', { from: range.from, to: range.to, total })}
            </span>
            {pages > 1 && (
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
                        <ChevronLeft size={14} aria-hidden="true" />
                        {t('previous')}
                    </Button>
                    <span className="label-mono text-[11px] text-lilac tabular">{t('pageOf', { page, pages })}</span>
                    <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
                        {t('next')}
                        <ChevronRight size={14} aria-hidden="true" />
                    </Button>
                </div>
            )}
        </nav>
    );
}
