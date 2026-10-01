'use client';

/**
 * Ganadores → "Resultados del concurso": per closed oportunidad, the
 * winners of each category in order (fastest right answer, then earliest
 * first aporte), their time, their first aporte, and the VACANTE seats.
 *
 * Results exist only after finalization (≤ 25 s after close): before that
 * the API answers 409 and this waits. The CSV is owner/admin only (the API
 * enforces it too).
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/types/api';
import type { ContestCategoryResult, Experience } from '@/types/api';
import { contestApi, experiencesApi } from '@/lib/api-hooks';
import { escuadraColors, escuadraDefaultNames } from '@/lib/chart-colors';
import { formatSeconds } from '@/lib/contest-bank';
import { slugifyForFilename } from '@/lib/slugify';
import { triggerBrowserDownload } from '@/lib/download';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const NOT_FINALIZED = 'CONTEST_NOT_FINALIZED';

export function ContestResultsSection({
    eventId,
    eventName,
    canExport,
}: {
    eventId: string;
    eventName?: string;
    canExport: boolean;
}) {
    const t = useTranslations('winners.contest');
    const { data: experiences = [] } = useQuery({
        queryKey: ['experiences', eventId],
        queryFn: () => experiencesApi.list(eventId),
    });
    const closed = experiences.filter((e: Experience) => e.kind !== 'impacto' && e.status === 'closed');
    const [picked, setPicked] = useState<string | null>(null);
    const experienceId = picked ?? closed[0]?.id ?? null;
    const experience = closed.find((e) => e.id === experienceId);

    const results = useQuery({
        queryKey: ['experiences', experienceId, 'contest-results'],
        queryFn: () => contestApi.results(experienceId!),
        enabled: !!experienceId,
        retry: false,
        // Finalization lands ≤ 25 s after the close.
        refetchInterval: (query) =>
            query.state.error instanceof ApiError && query.state.error.code === NOT_FINALIZED ? 5_000 : false,
    });

    const csv = useMutation({
        mutationFn: () => contestApi.resultsCsv(experienceId!),
        onSuccess: (blob) => {
            const name = `${slugifyForFilename(eventName ?? 'evento')}_${slugifyForFilename(experience?.name ?? 'oportunidad')}`;
            triggerBrowserDownload(blob, `resultados_${name}.csv`);
        },
        onError: () => toast.error(t('csvFailed')),
    });

    const pending = results.error instanceof ApiError && results.error.code === NOT_FINALIZED;
    const hasData = (results.data?.categories ?? []).some((c) => c.participants > 0);

    return (
        <section className="block-white flex flex-col gap-4 px-5 py-4 text-ink" data-testid="contest-results">
            <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-[17px]">{t('title')}</h2>
                {closed.length > 0 && (
                    <Select value={experienceId ?? undefined} onValueChange={setPicked}>
                        <SelectTrigger className="w-72" aria-label={t('pick')}>
                            <SelectValue placeholder={t('pick')} />
                        </SelectTrigger>
                        <SelectContent>
                            {closed.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                    {e.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {canExport && experienceId && hasData && (
                    <Button
                        variant="secondary"
                        onClick={() => csv.mutate()}
                        disabled={csv.isPending}
                        className="ml-auto"
                        data-testid="contest-results-csv"
                    >
                        {csv.isPending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        {t('csv')}
                    </Button>
                )}
            </div>
            <p className="font-space-mono text-[10px] uppercase text-muted-white">{t('rule')}</p>

            {closed.length === 0 && <p className="text-sm font-semibold text-muted-white">{t('empty')}</p>}
            {results.isLoading && <Skeleton className="h-40 w-full rounded-2xl" />}
            {pending && <p className="text-sm font-semibold text-muted-white">{t('pending')}</p>}
            {results.data && !hasData && (
                <p className="text-sm font-semibold text-muted-white">{t('noContestData')}</p>
            )}
            {results.data &&
                hasData &&
                [...results.data.categories]
                    .sort((a, b) => b.level - a.level)
                    .map((category) => (
                        <CategoryResult
                            key={category.level}
                            category={category}
                            name={experience?.escuadraNames?.[String(category.level)] || category.name}
                        />
                    ))}
        </section>
    );
}

export function CategoryResult({ category, name }: { category: ContestCategoryResult; name: string }) {
    const t = useTranslations('winners.contest');
    const level = (category.level === 4 || category.level === 3 || category.level === 2 ? category.level : 1) as
        | 1
        | 2
        | 3
        | 4;
    return (
        <div className="overflow-hidden rounded-[12px] border-2 border-ink" data-testid={`contest-category-${category.level}`}>
            <div className="flex items-center justify-between gap-3 border-b-2 border-ink px-4 py-2.5">
                <span className="flex items-center gap-2 font-display text-[15px] uppercase">
                    <span
                        aria-hidden
                        className="inline-block size-3 rounded-[3px] border-2 border-ink"
                        style={{ backgroundColor: escuadraColors[level] }}
                    />
                    {name || escuadraDefaultNames[level]}
                </span>
                <span className="font-space-mono text-[10px] uppercase text-muted-white">
                    {t('categoryLine', { participants: category.participants, eligible: category.eligible })}
                </span>
                {(category.tooFast ?? 0) > 0 && (
                    <span className="font-space-mono text-[10px] uppercase text-alert-white">
                        {t('tooFast', { count: category.tooFast ?? 0 })}
                    </span>
                )}
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-20 pl-4">{t('position')}</TableHead>
                        <TableHead>{t('fan')}</TableHead>
                        <TableHead className="text-right">{t('time')}</TableHead>
                        <TableHead className="pr-4 text-right">{t('firstAporte')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {category.winners.map((w) => (
                        <TableRow key={`w-${w.position}`}>
                            <TableCell className="pl-4 font-space-mono text-xs font-bold text-blue">#{w.position}</TableCell>
                            <TableCell className="font-bold">
                                {w.displayName ?? '—'}
                            </TableCell>
                            <TableCell className="text-right tabular font-black">{formatSeconds(w.responseMs)}</TableCell>
                            <TableCell className="pr-4 text-right font-space-mono text-xs text-muted-white">
                                {format(parseISO(w.firstContributionAt), 'HH:mm:ss')}
                            </TableCell>
                        </TableRow>
                    ))}
                    {Array.from({ length: category.vacancies }, (_, i) => (
                        <TableRow key={`vacant-${i}`} data-testid={`contest-vacant-${category.level}`}>
                            <TableCell className="pl-4 font-space-mono text-xs text-muted-white">
                                #{category.winners.length + i + 1}
                            </TableCell>
                            <TableCell colSpan={3} className="font-space-mono text-[11px] font-bold uppercase text-muted-white">
                                {t('vacant')}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
