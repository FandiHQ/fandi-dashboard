'use client';

/**
 * "Por quién vienen" (fandi-api RFC §4): a shared event's fans split by
 * affinity to the host and a guest idol. The host sees every guest's
 * split over all its fans; a guest sees its own, over the fans of its
 * tagged dynamics, with small groups withheld by the API ("<5", and
 * "oculto" for the group hidden with it). Aggregates only — no fan is
 * ever named here, and no amount enters the affinity. The numbers come
 * from a nightly snapshot, so the section says so.
 */
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { collaborationsApi } from '@/lib/api-hooks';
import { hasWithheld, percentLabel, segmentBars } from '@/lib/segments';
import type { ReportedCount, SegmentGroup } from '@/types/api';

const BAR_TONE: Record<SegmentGroup, string> = {
    onlyHost: 'bg-blue',
    // Flat chart fills (§7): no lime — lime means live or your action.
    both: 'bg-ink',
    onlyGuest: 'bg-lilac',
    neither: 'bg-muted-white',
    withoutConsent: 'bg-ink/30',
};

export function SegmentBarsBlock({
    counts,
    participants,
    labels,
}: {
    counts: Record<SegmentGroup, ReportedCount>;
    participants: number;
    labels: Record<SegmentGroup, string>;
}) {
    const t = useTranslations('collaborations.segments');
    const numbers = new Intl.NumberFormat(useLocale() === 'en' ? 'en-US' : 'es-CO');
    const shown = (value: ReportedCount) =>
        value === '<5' ? t('small') : value === 'hidden' ? t('hidden') : numbers.format(value);
    return (
        <div className="flex flex-col gap-2">
            {segmentBars(counts, participants).map((bar) => (
                <div key={bar.group} className="flex flex-col gap-1" data-testid={`segment-${bar.group}`}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-bold">{labels[bar.group]}</span>
                        <span className="font-space-mono text-xs tabular">
                            {shown(bar.value)}
                            {bar.share !== null && ` · ${percentLabel(bar.share)}`}
                        </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-line-white">
                        {bar.share !== null && (
                            <div
                                className={`h-full ${BAR_TONE[bar.group]}`}
                                style={{ width: `${Math.max(0, Math.min(1, bar.share)) * 100}%` }}
                            />
                        )}
                    </div>
                </div>
            ))}
            {hasWithheld(counts) && (
                <p className="font-space-mono text-[10px] uppercase text-muted-white">{t('withheldNote')}</p>
            )}
        </div>
    );
}

/** Segments come from a nightly snapshot, not live numbers. */
function NightlyNote() {
    const t = useTranslations('collaborations.segments');
    return (
        <p className="mt-1 font-space-mono text-[10px] uppercase text-muted-white" data-testid="segments-nightly">
            {t('nightly')}
        </p>
    );
}

/** Host side, in Analítica. Renders nothing without guest idols (or for staff). */
export function HostSegmentsSection({ eventId }: { eventId: string }) {
    const t = useTranslations('collaborations.segments');
    const { data } = useQuery({
        queryKey: ['collaborations', 'segments', eventId],
        queryFn: () => collaborationsApi.hostSegments(eventId),
        retry: false,
    });
    if (!data || data.guests.length === 0) return null;
    const participants = data.participants;
    if (participants === '<5') {
        // Too few fans to split without giving someone's answer away.
        return (
            <section className="block-white flex flex-col gap-2 px-5 py-4 text-ink" data-testid="host-segments">
                <h2 className="font-display text-[22px]">{t('title')}</h2>
                <p className="text-sm text-muted-white">{t('tooFewHost')}</p>
            </section>
        );
    }
    return (
        <section className="block-white flex flex-col gap-5 px-5 py-4 text-ink" data-testid="host-segments">
            <div>
                <h2 className="font-display text-[22px]">{t('title')}</h2>
                {data.snapshotAt === null ? (
                    <p className="mt-1 text-sm text-muted-white">{t('pending')}</p>
                ) : (
                    <p className="mt-1 text-sm text-muted-white">{t('lead', { count: participants })}</p>
                )}
                <NightlyNote />
            </div>
            {data.guests.map((guest) => (
                <div key={guest.guestOrgId} className="flex flex-col gap-3">
                    <h3 className="label-mono text-muted-white">{t('with', { name: guest.guestName })}</h3>
                    {guest.counts === null ? (
                        <p className="text-sm text-muted-white">{t('pending')}</p>
                    ) : (
                    <SegmentBarsBlock
                        counts={guest.counts}
                        participants={participants}
                        labels={{
                            onlyHost: t('onlyYou'),
                            onlyGuest: t('onlyOther', { name: guest.guestName }),
                            both: t('both'),
                            neither: t('neither'),
                            withoutConsent: t('withoutConsent'),
                        }}
                    />
                    )}
                </div>
            ))}
        </section>
    );
}

/** Guest side, on the shared event page. */
export function SharedSegmentsSection({ eventId, hostName }: { eventId: string; hostName: string }) {
    const t = useTranslations('collaborations.segments');
    const { data } = useQuery({
        queryKey: ['collaborations', 'shared', eventId, 'segments'],
        queryFn: () => collaborationsApi.sharedSegments(eventId),
        retry: false,
    });
    if (!data || data.participants === 0) return null;
    if (data.participants === '<5') {
        // Too few fans to split without giving someone's answer away.
        return (
            <section className="block-white flex flex-col gap-2 px-5 py-4 text-ink" data-testid="shared-segments">
                <h2 className="font-display text-[22px]">{t('title')}</h2>
                <p className="text-sm text-muted-white">{t('tooFew')}</p>
            </section>
        );
    }
    if (data.counts === null) {
        return (
            <section className="block-white flex flex-col gap-2 px-5 py-4 text-ink" data-testid="shared-segments">
                <h2 className="font-display text-[22px]">{t('title')}</h2>
                <p className="text-sm text-muted-white">{t('pending')}</p>
            </section>
        );
    }
    return (
        <section className="block-white flex flex-col gap-4 px-5 py-4 text-ink" data-testid="shared-segments">
            <div>
                <h2 className="font-display text-[22px]">{t('title')}</h2>
                <p className="mt-1 text-sm text-muted-white">{t('leadGuest', { count: data.participants })}</p>
                <NightlyNote />
            </div>
            <SegmentBarsBlock
                counts={data.counts}
                participants={data.participants}
                labels={{
                    onlyHost: t('onlyOther', { name: hostName }),
                    onlyGuest: t('onlyYou'),
                    both: t('both'),
                    neither: t('neither'),
                    withoutConsent: t('withoutConsent'),
                }}
            />
        </section>
    );
}
