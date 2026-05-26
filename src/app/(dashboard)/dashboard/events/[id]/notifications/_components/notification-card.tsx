'use client';

/**
 * NotificationCard — one tactical launch control per trigger.
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
import { textColors } from '@/lib/chart-colors';
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
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    useEffect(() => {
        // Fast ticker (1s) while counting down; slow (60s) otherwise.
        const intervalMs = secondsRemaining > 0 ? 1_000 : 60_000;
        intervalRef.current = setInterval(() => {
            setTick((n) => n + 1);
            if (secondsRemaining > 0) {
                setSecondsRemaining((s) => Math.max(0, s - 1));
            }
        }, intervalMs);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [secondsRemaining]);

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
        <div className="hud-card flex flex-col gap-4 px-6 py-5">
            {/* ─── Header: title + status pill ─── */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <Bell
                        size={18}
                        className="mt-1 shrink-0"
                        style={{ color: textColors.muted }}
                    />
                    <div className="flex flex-col gap-1">
                        <h3 className="font-sora text-base font-semibold text-white">
                            {t(`${i18nNamespace}.title`)}
                        </h3>
                        <p
                            className="font-space-mono text-xs leading-relaxed"
                            style={{ color: textColors.secondary }}
                        >
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
                <div className="flex flex-wrap items-center gap-3 border-t border-[#1A1A1A] pt-3">
                    <span
                        className="font-space-mono text-[11px]"
                        style={{ color: textColors.muted }}
                    >
                        {t('lastSent', {
                            relative: formatDistanceToNow(
                                new Date(lastResult.at),
                                { locale: dateLocale, addSuffix: true },
                            ),
                        })}
                    </span>
                    {lastResult.sent > 0 && (
                        <span
                            className="flex items-center gap-1 font-space-mono text-[11px]"
                            style={{ color: '#22C55E' }}
                        >
                            <Check size={12} />
                            {t('sent', { count: lastResult.sent })}
                        </span>
                    )}
                    {lastResult.skipped > 0 && (
                        <span
                            className="flex items-center gap-1 font-space-mono text-[11px]"
                            style={{ color: textColors.muted }}
                        >
                            <XIcon size={12} />
                            {t('skipped', { count: lastResult.skipped })}
                        </span>
                    )}
                </div>
            )}

            {/* ─── CTA ─── */}
            <div className="flex justify-end">
                <button
                    onClick={() => setDialogOpen(true)}
                    disabled={ctaDisabled}
                    className="btn-tactical flex cursor-pointer items-center gap-2 rounded-none bg-[#2D00F7] px-6 py-3 font-space-mono text-sm uppercase tracking-[1px] text-white transition-all duration-200 hover:bg-[#2400C5] hover:shadow-[0_0_30px_rgba(45,0,247,0.6)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#2D00F7] disabled:hover:shadow-none"
                >
                    {mutation.isPending && (
                        <Loader2 size={14} className="animate-spin" />
                    )}
                    {t('cta.send')}
                </button>
            </div>

            {/* ─── Confirmation AlertDialog ─── */}
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialogContent className="hud-brackets-magenta rounded-none border border-[var(--color-tactical-magenta)] bg-[#121212] shadow-[0_0_20px_rgba(255,0,85,0.2)]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-sora text-xl text-white">
                            {t('confirm.title')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="font-space-mono text-sm text-[#A0A0A0]">
                            {t(`${i18nNamespace}.confirm`)}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-none border-[#2A2A2A] bg-transparent font-space-mono text-sm uppercase tracking-[1px] text-white hover:bg-[#1A1A1A] hover:text-white">
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
                            className="btn-tactical rounded-none bg-[var(--color-tactical-magenta)] font-space-mono text-sm uppercase tracking-[1px] text-white hover:bg-[var(--color-tactical-magenta)] hover:shadow-[0_0_30px_rgba(255,0,85,0.8)] disabled:opacity-50"
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
    const color = onCooldown ? '#EAB308' : '#22C55E';
    const label = onCooldown
        ? t('cooldown', { seconds: secondsRemaining })
        : t('available');

    return (
        <div className="flex shrink-0 items-center gap-2">
            <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${onCooldown ? '' : 'animate-pulse'}`}
                style={{
                    background: color,
                    boxShadow: `0 0 6px ${color}`,
                }}
            />
            <span
                className="font-space-mono text-[11px] uppercase tracking-[1px] tabular-nums"
                style={{ color }}
            >
                {label}
            </span>
        </div>
    );
}
