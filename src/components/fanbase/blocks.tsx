'use client';

/**
 * Fanbase building blocks (Azul Bloque §7): stat blocks, white/ink
 * sections, relative bars and explanatory empty states. Withheld counts
 * ("<5", "hidden") are always written as words, never drawn.
 */
import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReportedCount } from '@/lib/fanbase';

export function useNumberFormat() {
    const locale = useLocale();
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CO');
}

/** A reported count as text: numbers, "<5", or "oculto". */
export function useReported() {
    const t = useTranslations('fanbase');
    const numbers = useNumberFormat();
    return (value: ReportedCount) =>
        value === '<5' ? t('small') : value === 'hidden' ? t('hidden') : numbers.format(value);
}

export function StatBlock({
    label,
    value,
    sub,
    testId,
}: {
    label: string;
    value: string;
    sub?: string;
    testId?: string;
}) {
    return (
        <div className="block-white flex min-w-0 flex-col px-5 py-4" data-testid={testId}>
            <span className="label-mono text-muted-white">{label}</span>
            <span className="font-display tabular mt-2 truncate text-[36px] text-ink">{value}</span>
            {sub ? (
                <span className="mt-1.5 font-space-mono text-[10px] uppercase leading-snug text-muted-white">
                    {sub}
                </span>
            ) : null}
        </div>
    );
}

export function StatGrid({ children }: { children: ReactNode }) {
    return <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function Section({
    title,
    aside,
    tone = 'white',
    children,
    testId,
}: {
    title: string;
    aside?: ReactNode;
    tone?: 'white' | 'ink';
    children: ReactNode;
    testId?: string;
}) {
    const surface =
        tone === 'white'
            ? 'surface-white border-2 border-ink bg-white text-ink shadow-ext-lg'
            : 'surface-ink bg-ink text-white';
    return (
        <section
            className={`${surface} flex min-w-0 flex-col gap-4 rounded-[18px] px-[22px] py-5`}
            data-testid={testId}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-display text-[17px]">{title}</h2>
                {aside ? (
                    <span
                        className={`label-mono ${tone === 'white' ? 'text-muted-white' : 'text-muted-ink'}`}>
                        {aside}
                    </span>
                ) : null}
            </div>
            {children}
        </section>
    );
}

/** Says what will appear here and what makes it appear. */
export function EmptyState({ title, body, testId }: { title: string; body: string; testId?: string }) {
    return (
        <div className="block-quiet flex flex-col gap-2 px-6 py-10 text-center" data-testid={testId}>
            <p className="font-display text-[20px] text-white">{title}</p>
            <p className="mx-auto max-w-[560px] text-sm text-lilac">{body}</p>
        </div>
    );
}

/** A relative bar: `share` 0–1, nothing drawn when withheld (null). */
export function Bar({
    share,
    tone = 'bg-blue',
    track = 'bg-line-white',
}: {
    share: number | null;
    tone?: string;
    track?: string;
}) {
    return (
        <div className={`h-2 w-full overflow-hidden rounded-full ${track}`}>
            {share !== null && (
                <div
                    className={`h-full ${tone}`}
                    style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%` }}
                />
            )}
        </div>
    );
}

export function WithheldNote({ tone = 'white' }: { tone?: 'white' | 'ink' }) {
    const t = useTranslations('fanbase');
    return (
        <p
            className={`font-space-mono text-[10px] uppercase ${tone === 'white' ? 'text-muted-white' : 'text-muted-ink'}`}
            data-testid="fanbase-withheld">
            {t('withheldNote')}
        </p>
    );
}

/**
 * Loading / error / content for one tab's query. A 403 is the role (or
 * an event-scoped membership), not a failure: say so.
 */
export function QueryState<T>({
    query,
    children,
}: {
    query: UseQueryResult<T>;
    children: (data: T) => ReactNode;
}) {
    const t = useTranslations('fanbase');
    if (query.isError) {
        const forbidden = query.error instanceof ApiError && query.error.status === 403;
        return (
            <EmptyState
                title={forbidden ? t('noAccessTitle') : t('errorTitle')}
                body={forbidden ? t('noAccess') : t('errorLoading')}
                testId={forbidden ? 'fanbase-forbidden' : 'fanbase-error'}
            />
        );
    }
    if (!query.data) {
        return (
            <div className="flex flex-col gap-[18px]" data-testid="fanbase-loading">
                <StatGrid>
                    {[0, 1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                    ))}
                </StatGrid>
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        );
    }
    return <>{children(query.data)}</>;
}

/** Idol avatar: the image, or the initial on lilac. */
export function Avatar({ name, url }: { name: string; url: string | null }) {
    return url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={url}
            alt=""
            className="size-10 shrink-0 rounded-full border-2 border-ink object-cover"
        />
    ) : (
        <span
            aria-hidden
            className="font-display flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-tier-vip text-[16px] text-ink">
            {name.trim().charAt(0) || '·'}
        </span>
    );
}
