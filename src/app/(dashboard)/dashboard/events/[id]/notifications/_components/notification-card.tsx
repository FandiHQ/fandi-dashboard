'use client';

/**
 * NotificationCard — one launch control per trigger (white block).
 *
 * State machine:
 *     idle      → user can click CTA
 *     confirming → AlertDialog open
 *     sending   → mutation pending (spinner on confirm button)
 *     cooldown  → countdown until next available send
 *
 * Cooldown is CLIENT-ONLY (per Step 4.15 preflight D — the backend
 * does not enforce). This leaks across browsers / organizers on
 * the same event; remove this block once Step 4.15-backend ships
 * a 429-with-retry-after enforcement path.
 *
 * Success feedback is the durable "Último envío" badge on the
 * card itself — we do NOT fire a toast on success. Toast is
 * reserved for error / cooldown-breach paths only.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale, enUS as enLocale } from 'date-fns/locale';
import { Loader2, Bell, Check, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { NotificationSendResult } from '@/types/api';

// ─── Cooldown persistence (TEMP — client-only) ───────────────

/**
 * TEMP — backend cooldown enforcement pending (Step 4.15-backend).
 * Client-only guardrail leaks on multi-organizer events; a second
 * organizer logged into a different browser bypasses this entirely.
 * Remove this whole block once the backend returns 429 with
 * retry-after and the page reads `cooldownEndsAt` from the
 * mutation response.
 */
function cooldownKey(eventId: string, trigger: string): string {
    return `fandi:notif:lastSent:${eventId}:${trigger}`;
}

function readLastSentMs(eventId: string, trigger: string): number | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(cooldownKey(eventId, trigger));
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function writeLastSentMs(eventId: string, trigger: string, ms: number): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(cooldownKey(eventId, trigger), String(ms));
}

function computeSecondsRemaining(
    lastSentMs: number,
    windowSeconds: number,
    nowMs: number,
): number {
    const elapsedSeconds = Math.floor((nowMs - lastSentMs) / 1000);
    return Math.max(0, windowSeconds - elapsedSeconds);
}

// ─── Component types ─────────────────────────────────────────

export type NotificationTrigger =
    | 'walletReminder'
    | 'eventReminder'
    | 'nextEvent';

export interface NotificationCardProps {
    /** Used as the localStorage namespace key. */
    eventId: string;
    /** Identifies the trigger (drives copy + cooldown key). */
    trigger: NotificationTrigger;
    /** Cooldown window in seconds (single source of truth lives on the page). */
    cooldownSeconds: number;
    /** Mutation function — closed over eventId by the parent. */
    mutationFn: () => Promise<NotificationSendResult>;
    /** i18n key prefix under `notifications.*` (e.g. 'walletReminder'). */
    i18nNamespace: NotificationTrigger;
}

interface LastResult {
    sent: number;
    skipped: number;
    at: number;
}

// ─── Component ───────────────────────────────────────────────

export function NotificationCard({
    eventId,
    trigger,
    cooldownSeconds,
    mutationFn,
    i18nNamespace,
}: NotificationCardProps) {
    const t = useTranslations('notifications');
    const locale = useLocale();
    const dateLocale = locale === 'en' ? enLocale : esLocale;

    const [dialogOpen, setDialogOpen] = useState(false);
    const [lastResult, setLastResult] = useState<LastResult | null>(null);
    const [secondsRemaining, setSecondsRemaining] = useState(0);

    // Single shared ticker — countdown when on cooldown, slow
    // 60s tick when idle to keep the "hace X min" badge fresh.
    // We track tick #s in state so React re-renders the relative
    // time even though `lastResult` itself didn't change.
    const [, setTick] = useState(0);

    // ─── Initial cooldown read (from localStorage) ───────────
    // This effect synchronizes React state with an EXTERNAL system
    // (window.localStorage), which is the canonical use case the
    // `set-state-in-effect` rule permits. We can't do this in
    // `useState`'s lazy initializer because it would run during SSR
    // (where `window` is undefined) and would produce a hydration
    // mismatch on the client. The setState calls here are
    // hydration of external state on mount, not cascading-render
    // misuse — disable the rule for this block.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        const lastSentMs = readLastSentMs(eventId, trigger);
        if (lastSentMs === null) return;
        const remaining = computeSecondsRemaining(
            lastSentMs,
            cooldownSeconds,
            Date.now(),
        );
        if (remaining > 0) {
            setSecondsRemaining(remaining);
        }
        // Seed lastResult.at so the "Último envío" badge can render
        // even on a fresh mount (we don't persist sent/skipped to
        // localStorage — those are only durable for the in-page
        // mutation result).
        setLastResult((prev) => prev ?? { sent: 0, skipped: 0, at: lastSentMs });
        // Run-once on mount per (eventId, trigger).
    }, [eventId, trigger, cooldownSeconds]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // ─── Ticker ──────────────────────────────────────────────
    // Latest secondsRemaining for the interval callback to read
    // without re-creating itself on every tick. The previous
    // implementation tore down + recreated setInterval once per
    // second during an active cooldown — wasteful, and the brief
    // gap between teardown and recreate could drop a tick.
    const secondsRemainingRef = useRef(secondsRemaining);
    useEffect(() => {
        secondsRemainingRef.current = secondsRemaining;
    }, [secondsRemaining]);

    // Single interval lifetime. Cadence toggles 1s ↔ 60s ONLY when
    // crossing the on-cooldown boundary (`> 0` flips), not on
    // every tick. Depending on the boolean (rather than the raw
    // number) keeps the effect's identity stable across each
    // active second of the countdown.
    const onCooldownFlag = secondsRemaining > 0;
    useEffect(() => {
        const intervalMs = onCooldownFlag ? 1_000 : 60_000;
        const id = setInterval(() => {
            setTick((n) => n + 1);
            if (secondsRemainingRef.current > 0) {
                setSecondsRemaining((s) => Math.max(0, s - 1));
            }
        }, intervalMs);
        return () => clearInterval(id);
    }, [onCooldownFlag]);

    // ─── Mutation ────────────────────────────────────────────
    const enterCooldown = useCallback(
        (seconds: number) => {
            setSecondsRemaining(seconds);
            // We only persist when the cooldown was started by a
            // successful send. A 429-driven cooldown also needs a
            // persisted floor so a refresh doesn't reset it.
            writeLastSentMs(eventId, trigger, Date.now());
        },
        [eventId, trigger],
    );

    const mutation = useMutation({
        mutationFn,
        onSuccess: (result) => {
            setLastResult({
                sent: result.sent,
                skipped: result.skipped,
                at: Date.now(),
            });
            enterCooldown(cooldownSeconds);
            setDialogOpen(false);
        },
        onError: (err: unknown) => {
            const message =
                err instanceof Error ? err.message : t('sendError');
            toast.error(message);
            setDialogOpen(false);
        },
    });

    // ─── Derived UI state ────────────────────────────────────
    const onCooldown = secondsRemaining > 0;
    const ctaDisabled = onCooldown || mutation.isPending;

    return (
        <div className="block-white flex flex-col gap-4 px-6 py-5">
            {/* ─── Header: title + status pill ─── */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-ink text-white">
                        <Bell size={16} />
                    </span>
                    <div className="flex flex-col gap-1">
                        <h3 className="font-display text-[17px]">
                            {t(`${i18nNamespace}.title`)}
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-white">
                            {t(`${i18nNamespace}.description`)}
                        </p>
                    </div>
                </div>
                <StatusPill
                    onCooldown={onCooldown}
                    secondsRemaining={secondsRemaining}
                    t={t}
                />
            </div>

            {/* ─── Last-send badge ─── */}
            {lastResult && lastResult.at > 0 && (
                <div className="flex flex-wrap items-center gap-3 border-t-2 border-line-white pt-3">
                    <span className="font-space-mono text-[11px] text-muted-white">
                        {t('lastSent', {
                            relative: formatDistanceToNow(
                                new Date(lastResult.at),
                                { locale: dateLocale, addSuffix: true },
                            ),
                        })}
                    </span>
                    {lastResult.sent > 0 && (
                        <span className="flex items-center gap-1 font-space-mono text-[11px] font-bold text-ink">
                            <Check size={12} strokeWidth={3} />
                            {t('sent', { count: lastResult.sent })}
                        </span>
                    )}
                    {lastResult.skipped > 0 && (
                        <span className="flex items-center gap-1 font-space-mono text-[11px] text-muted-white">
                            <XIcon size={12} />
                            {t('skipped', { count: lastResult.skipped })}
                        </span>
                    )}
                </div>
            )}

            {/* ─── CTA ─── */}
            <div className="flex justify-end">
                <Button
                    variant="secondary"
                    onClick={() => setDialogOpen(true)}
                    disabled={ctaDisabled}
                >
                    {mutation.isPending && (
                        <Loader2 size={14} className="animate-spin" />
                    )}
                    {t('cta.send')}
                </Button>
            </div>

            {/* ─── Confirmation AlertDialog ─── */}
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialogContent className="surface-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-display text-[22px]">
                            {t('confirm.title')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(`${i18nNamespace}.confirm`)}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={mutation.isPending}
                        >
                            {t('cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                // Prevent the default close — we
                                // want the dialog to stay open while
                                // the mutation is pending so the
                                // spinner remains visible.
                                e.preventDefault();
                                mutation.mutate();
                            }}
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? (
                                <Loader2
                                    size={14}
                                    className="animate-spin"
                                />
                            ) : (
                                t('confirm.send')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ─── Status pill ─────────────────────────────────────────────

function StatusPill({
    onCooldown,
    secondsRemaining,
    t,
}: {
    onCooldown: boolean;
    secondsRemaining: number;
    t: ReturnType<typeof useTranslations>;
}) {
    // The word carries the state (§8): available = lime (your action),
    // cooldown = lilac (waiting, no urgency).
    const label = onCooldown
        ? t('cooldown', { seconds: secondsRemaining })
        : t('available');

    return (
        <span
            className={`tabular inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-0.5 font-space-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink ${
                onCooldown ? 'bg-lilac' : 'bg-lime'
            }`}
        >
            <span aria-hidden className="inline-block size-[7px] rounded-full bg-ink" />
            {label}
        </span>
    );
}
