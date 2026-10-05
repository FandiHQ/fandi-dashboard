'use client';

/**
 * DEV-ONLY: "Por quién vienen" bars with local fixtures (no API), for
 * visual review in /dev-gallery — the host's view and a guest's view with
 * withheld groups.
 */
import { useTranslations } from 'next-intl';
import { SegmentBarsBlock } from '@/components/collaborations/SegmentsSection';

export function SegmentsShowcase() {
    const t = useTranslations('collaborations.segments');
    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" data-testid="segments-showcase">
            <div className="block-white flex flex-col gap-3 p-5 text-ink">
                <h3 className="label-mono text-muted-white">{t('with', { name: 'J Balvin' })}</h3>
                <SegmentBarsBlock
                    counts={{ onlyHost: 412, onlyGuest: 96, both: 188, neither: 57, withoutConsent: 131 }}
                    participants={884}
                    labels={{
                        onlyHost: t('onlyYou'),
                        onlyGuest: t('onlyOther', { name: 'J Balvin' }),
                        both: t('both'),
                        neither: t('neither'),
                        withoutConsent: t('withoutConsent'),
                    }}
                />
            </div>
            <div className="block-white flex flex-col gap-3 p-5 text-ink">
                <SegmentBarsBlock
                    counts={{ onlyHost: 'hidden', onlyGuest: 0, both: 5, neither: 0, withoutConsent: '<5' }}
                    participants={12}
                    labels={{
                        onlyHost: t('onlyOther', { name: 'Yalí' }),
                        onlyGuest: t('onlyYou'),
                        both: t('both'),
                        neither: t('neither'),
                        withoutConsent: t('withoutConsent'),
                    }}
                />
            </div>
        </div>
    );
}
