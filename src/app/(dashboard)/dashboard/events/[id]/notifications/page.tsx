'use client';

/**
 * Notification triggers — Step 4.15.
 *
 * Manual fire controls for the three N11/N12/N14 push triggers.
 * Owner/admin only — viewer/staff are redirected to the event
 * overview rather than rendered an access-denied card.
 *
 * Visibility rules per card (event status):
 *   - walletReminder  → published, live
 *   - eventReminder   → published, live
 *   - nextEvent       → ended
 *
 * Page-level guard: 'draft' renders an info card; no triggers fire.
 *
 * Cooldown: CLIENT-ONLY localStorage fallback. Backend enforcement
 * is the correct architecture (multi-organizer events bypass the
 * client guardrail) — flagged as Step 4.15-backend follow-up.
 */

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { eventsApi, notificationsApi } from '@/lib/api-hooks';
import { useAuth } from '@/contexts/auth-context';
import { textColors } from '@/lib/chart-colors';
import { NotificationCard } from './_components/notification-card';

/**
 * Per-trigger cooldown windows (seconds). Single source of truth.
 * Justification:
 *   walletReminder / eventReminder: 600s (10 min) — blast radius
 *     is hundreds of fans; 10 min is the minimum where a second
 *     send is a deliberate decision, not a misclick.
 *   nextEvent: 1800s (30 min) — lower-urgency re-engagement push,
 *     spam risk higher if mis-fired post-event.
 */
const COOLDOWN_SECONDS = {
    walletReminder: 600,
    eventReminder: 600,
    nextEvent: 1800,
} as const;

export default function NotificationsPage() {
    const { id: eventId } = useParams() as { id: string };
    const t = useTranslations('notifications');
    const { memberRole } = useAuth();
    const router = useRouter();
    const isWriteRole = memberRole === 'owner' || memberRole === 'admin';

    const { data: event } = useQuery({
        queryKey: ['events', eventId],
        queryFn: () => eventsApi.get(eventId),
    });

    // Owner/admin only — viewer/staff bounce to overview. We wait
    // for memberRole to resolve (null = unauth, string = resolved)
    // so we don't redirect on the initial render before the auth
    // context has settled.
    useEffect(() => {
        if (memberRole === null) return; // still resolving
        if (!isWriteRole) {
            router.replace(`/dashboard/events/${eventId}`);
        }
    }, [memberRole, isWriteRole, eventId, router]);

    if (!isWriteRole) return null;

    // Draft guard.
    if (event?.status === 'draft') {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="hud-card hud-brackets px-8 py-6">
                    <p
                        className="font-space-mono text-sm uppercase tracking-[1px]"
                        style={{ color: textColors.secondary }}
                    >
                        {t('unavailableOnDraft')}
                    </p>
                </div>
            </div>
        );
    }

    const showPreEventCards =
        event?.status === 'published' || event?.status === 'live';
    const showNextEventCard = event?.status === 'ended';

    return (
        <div className="flex flex-col gap-6 py-6">
            <header className="flex flex-col gap-2">
                <h1 className="font-sora text-3xl font-bold tracking-[-0.5px] text-white">
                    {t('title')}
                </h1>
                <p
                    className="font-space-mono text-sm"
                    style={{ color: textColors.muted }}
                >
                    {t('subtitle')}
                </p>
            </header>

            {/* Section frame — `.hud-brackets` wraps the launch
                cards so they read as a single weapons-rack. */}
            <section className="hud-brackets flex flex-col gap-4 p-1">
                {showPreEventCards && (
                    <>
                        <NotificationCard
                            eventId={eventId}
                            trigger="walletReminder"
                            i18nNamespace="walletReminder"
                            cooldownSeconds={COOLDOWN_SECONDS.walletReminder}
                            mutationFn={() =>
                                notificationsApi.sendWalletReminder(eventId)
                            }
                        />
                        <NotificationCard
                            eventId={eventId}
                            trigger="eventReminder"
                            i18nNamespace="eventReminder"
                            cooldownSeconds={COOLDOWN_SECONDS.eventReminder}
                            mutationFn={() =>
                                notificationsApi.sendEventReminder(eventId)
                            }
                        />
                    </>
                )}

                {showNextEventCard && (
                    <NotificationCard
                        eventId={eventId}
                        trigger="nextEvent"
                        i18nNamespace="nextEvent"
                        cooldownSeconds={COOLDOWN_SECONDS.nextEvent}
                        mutationFn={() =>
                            notificationsApi.sendNextEvent(eventId)
                        }
                    />
                )}

                {/* No cards visible for the current status — give
                    the organizer a hint about why instead of a
                    silent empty pane. */}
                {!showPreEventCards && !showNextEventCard && (
                    <div className="hud-card flex items-center justify-center px-6 py-8">
                        <span
                            className="font-space-mono text-sm"
                            style={{ color: textColors.muted }}
                        >
                            {t('noTriggersForStatus')}
                        </span>
                    </div>
                )}
            </section>
        </div>
    );
}
