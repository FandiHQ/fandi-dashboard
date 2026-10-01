'use client';

/**
 * A shared event, seen by a GUEST idol — view only (fandi-api RFC §3).
 * Event totals (aggregates), and for each dynamic my org was tagged on:
 * every participating fan by name (never a per-fan amount), and the
 * contest results once final (oportunidades only). Nothing of the host's
 * other dynamics. An ended collaboration shows data up to its end. Plus
 * "Por quién vienen" (RFC §4): its fans by affinity, small groups withheld.
 */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { enUS as enLocale, es as esLocale } from 'date-fns/locale';
import { ApiError } from '@/types/api';
import type { Collaboration } from '@/types/api';
import { collaborationsApi, contestApi } from '@/lib/api-hooks';
import { showSharedResults } from '@/lib/collaborations';
import { formatCop, formatFandis } from '@/lib/currency';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CategoryResult } from '@/components/contest/ContestResultsSection';
import { CollaborationStatusPill } from '@/components/collaborations/CollaborationStatusPill';
import { SharedSegmentsSection } from '@/components/collaborations/SegmentsSection';

export default function SharedEventPage() {
    const { eventId } = useParams() as { eventId: string };
    const t = useTranslations('collaborations');
    const locale = useLocale();
    const dateLocale = locale === 'en' ? enLocale : esLocale;
    const totals = useQuery({
        queryKey: ['collaborations', 'shared', eventId],
        queryFn: () => collaborationsApi.sharedEvent(eventId),
        retry: false,
    });
    const events = useQuery({
        queryKey: ['collaborations', 'shared'],
        queryFn: () => collaborationsApi.sharedEvents(),
    });
    const dynamics = events.data?.find((e) => e.eventId === eventId)?.dynamics ?? [];

    if (totals.error) {
        return <p className="text-sm text-lilac">{t('sharedNotFound')}</p>;
    }
    if (!totals.data) return <Skeleton className="h-60 w-full rounded-2xl" />;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <Link href="/dashboard/collaborations" className="font-space-mono text-[11px] uppercase text-lilac hover:underline">
                    ‹ {t('pageTitle')}
                </Link>
                <h1 className="mt-2 font-hero text-4xl text-white">{totals.data.eventName}</h1>
                <p className="mt-1 font-space-mono text-[11px] uppercase text-lilac">
                    {t('hostedBy', { host: totals.data.hostOrgName })} · {t('viewOnly')}
                    {totals.data.until && ` · ${t('until', { date: format(parseISO(totals.data.until), 'd MMM HH:mm', { locale: dateLocale }) })}`}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-[18px]">
                <div className="block-white px-5 py-4 text-ink">
                    <p className="label-mono text-muted-white">{t('participants')}</p>
                    <p className="font-display tabular mt-2 text-[36px]">
                        {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CO').format(totals.data.participants)}
                    </p>
                </div>
                <div className="block-white px-5 py-4 text-ink">
                    <p className="label-mono text-muted-white">{t('contributed')}</p>
                    <p className="font-display tabular mt-2 text-[36px]">
                        {formatFandis(totals.data.contributedCop)} <span className="text-blue">F</span>
                    </p>
                    <p className="font-space-mono text-[10px] text-muted-white">{formatCop(totals.data.contributedCop)}</p>
                </div>
            </div>

            <SharedSegmentsSection eventId={eventId} hostName={totals.data.hostOrgName} />

            {dynamics.map((c) => (
                <SharedDynamic key={c.id} collaboration={c} />
            ))}
        </div>
    );
}

function SharedDynamic({ collaboration }: { collaboration: Collaboration }) {
    const t = useTranslations('collaborations');
    const locale = useLocale();
    const dateLocale = locale === 'en' ? enLocale : esLocale;
    const participants = useQuery({
        queryKey: ['collaborations', 'shared', collaboration.dynamicType, collaboration.dynamicId],
        queryFn: () => collaborationsApi.sharedParticipants(collaboration.dynamicType, collaboration.dynamicId),
    });
    const results = useQuery({
        queryKey: ['experiences', collaboration.dynamicId, 'contest-results'],
        queryFn: () => contestApi.results(collaboration.dynamicId),
        enabled: collaboration.dynamicType === 'experience' && collaboration.dynamicKind !== 'impacto',
        retry: false,
    });
    const pendingResults = results.error instanceof ApiError && results.error.code === 'CONTEST_NOT_FINALIZED';
    const showResults = showSharedResults({
        dynamicType: collaboration.dynamicType,
        dynamicKind: collaboration.dynamicKind,
        categories: results.data?.categories,
        notFinalized: pendingResults,
    });

    return (
        <section className="block-white flex flex-col gap-4 px-5 py-4 text-ink" data-testid={`shared-dynamic-${collaboration.dynamicId}`}>
            <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-[18px]">{collaboration.dynamicName}</h2>
                <CollaborationStatusPill status={collaboration.status} />
            </div>

            {participants.data && (
                <>
                    <p className="font-space-mono text-[10px] uppercase text-muted-white">
                        {t('participantsLine', { total: participants.data.totalParticipants })}
                    </p>
                    {participants.data.fans.length > 0 && (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>{t('fan')}</TableHead>
                                    <TableHead>{t('instagram')}</TableHead>
                                    <TableHead className="text-right">{t('since')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {participants.data.fans.map((f) => (
                                    <TableRow key={f.userId}>
                                        <TableCell className="font-bold">{f.displayName ?? '—'}</TableCell>
                                        <TableCell className="font-space-mono text-xs">
                                            {f.instagramHandle ? `@${f.instagramHandle}` : '—'}
                                        </TableCell>
                                        <TableCell className="text-right font-space-mono text-xs tabular">
                                            {format(parseISO(f.firstAt), 'd MMM HH:mm', { locale: dateLocale })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {participants.data.hasMore && (
                        <p className="font-space-mono text-[10px] uppercase text-muted-white">{t('moreFans')}</p>
                    )}
                </>
            )}

            {showResults && (
                <div className="flex flex-col gap-3" data-testid={`shared-results-${collaboration.dynamicId}`}>
                    <h3 className="label-mono text-muted-white">{t('results')}</h3>
                    {pendingResults && <p className="text-sm text-muted-white">{t('resultsPending')}</p>}
                    {results.data &&
                        [...results.data.categories]
                            .sort((a, b) => b.level - a.level)
                            .map((category) => (
                                <CategoryResult key={category.level} category={category} name={category.name} />
                            ))}
                </div>
            )}
        </section>
    );
}
