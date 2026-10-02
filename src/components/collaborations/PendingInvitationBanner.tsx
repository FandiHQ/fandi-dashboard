'use client';

/**
 * Home banner for the guest's owners/admins: "{Host} te invitó a
 * {dinámica} de {evento} · Ver invitación", like a friend request. Shows
 * the newest pending invitation and how many more wait; renders nothing
 * when none do (or the member cannot answer). White block: it informs;
 * the CTA stays secondary so the hero's lime action keeps its place (§1.6).
 */
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { COLLABORATIONS_HREF, dynamicLabelKey } from '@/lib/collaborations';
import { IdolAvatar } from './IdolAvatar';
import { usePendingInvitations } from './usePendingInvitations';

export function PendingInvitationBanner() {
    const t = useTranslations('collaborations');
    const summary = usePendingInvitations();
    const latest = summary?.latest;
    if (!summary || summary.count <= 0 || !latest) return null;
    const more = summary.count - 1;

    return (
        <section
            className="block-white flex flex-wrap items-center gap-4 px-5 py-4 text-ink"
            aria-label={t('pendingBadge', { count: summary.count })}
            data-testid="pending-invitation-banner"
        >
            <IdolAvatar name={latest.hostOrgName} src={latest.hostAvatarUrl} size={44} />
            <div className="min-w-0 flex-1">
                <p className="label-mono text-[10px] text-muted-white">
                    {t('tokenTitle')} · {t(`kind.${dynamicLabelKey(latest)}`)}
                </p>
                <p className="mt-1 font-display text-[17px] leading-snug">
                    {t('banner', {
                        host: latest.hostOrgName,
                        dynamic: latest.dynamicName,
                        event: latest.eventName,
                    })}
                    {more > 0 && <span className="text-muted-white"> {t('bannerMore', { count: more })}</span>}
                </p>
            </div>
            <Button asChild variant="secondary">
                <Link href={COLLABORATIONS_HREF} data-testid="pending-invitation-cta">
                    {t('bannerCta', { count: summary.count })} ›
                </Link>
            </Button>
        </section>
    );
}
