'use client';

/**
 * Staff QR redemption scanner — Step 4.16.
 *
 * MOBILE-FIRST phone-browser page (staff scan at the venue with their
 * phone camera). Designed for ≥375px, 48px+ touch targets, large
 * high-contrast text, full-width buttons, no hover-only interactions.
 *
 * Auth is gated by (staff)/staff/layout.tsx — NOT re-implemented here.
 *
 * ⚠ Camera requires a SECURE CONTEXT (HTTPS or localhost). On plain
 * HTTP getUserMedia silently fails; the scanner surfaces an
 * 'insecure-context' error and we fall back to manual entry.
 *
 * Section 5 (stats + recent redemptions) is OMITTED: it needs an
 * eventId, and there is no `/staff/me/events` endpoint to discover
 * the staff member's event(s). Flagged as a backend follow-up.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import {
    Scanner,
    type IDetectedBarcode,
    type IScannerError,
} from '@yudiel/react-qr-scanner';
import {
    Check,
    X,
    AlertTriangle,
    Loader2,
    WifiOff,
    KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { redemptionsApi } from '@/lib/api-hooks';
import { formatFandis } from '@/lib/currency';
import { escuadraColors, escuadraDefaultNames } from '@/lib/chart-colors';
import type { ScanResultResponse } from '@/types/api';

// ─── Offline cache (read-only verification) ──────────────────

const CACHE_KEY = 'fandi:staff:scanCache';
const CACHE_MAX = 50;
const DEDUPE_MS = 3_000;
const SUCCESS_AUTOCLOSE_MS = 2_000;

type CacheEntry = { qrCode: string; data: ScanResultResponse };

function readCache(): CacheEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        return Array.isArray(parsed) ? (parsed as CacheEntry[]) : [];
    } catch {
        return [];
    }
}

function cacheResult(data: ScanResultResponse): void {
    if (typeof window === 'undefined') return;
    try {
        const next = readCache().filter((e) => e.qrCode !== data.qrCode);
        next.push({ qrCode: data.qrCode, data });
        window.localStorage.setItem(
            CACHE_KEY,
            JSON.stringify(next.slice(-CACHE_MAX)),
        );
    } catch {
        // Storage full / disabled — caching is best-effort.
    }
}

function getCached(qrCode: string): ScanResultResponse | null {
    return readCache().find((e) => e.qrCode === qrCode)?.data ?? null;
}

// ─── Outcome model ───────────────────────────────────────────

type Outcome =
    | { type: 'result'; data: ScanResultResponse; stale: boolean }
    | { type: 'error'; kind: 'notFound' | 'network' };

// ─── Page ────────────────────────────────────────────────────

export default function StaffScannerPage() {
    const t = useTranslations('redemption');

    const [outcome, setOutcome] = useState<Outcome | null>(null);
    const [cameraError, setCameraError] = useState<IScannerError | null>(null);
    const [manualCode, setManualCode] = useState('');
    const [isOnline, setIsOnline] = useState(true);
    const [confirmed, setConfirmed] = useState(false);

    // Dedupe guard — ignore the same code re-detected within DEDUPE_MS.
    const lastScanRef = useRef<{ code: string; at: number } | null>(null);
    const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Online/offline detection ───────────────────────────
    useEffect(() => {
        const sync = () => setIsOnline(navigator.onLine);
        sync();
        window.addEventListener('online', sync);
        window.addEventListener('offline', sync);
        return () => {
            window.removeEventListener('online', sync);
            window.removeEventListener('offline', sync);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
        };
    }, []);

    // ─── Mutations ───────────────────────────────────────────
    const scanMutation = useMutation({
        mutationFn: (qrCode: string) => redemptionsApi.scan(qrCode),
        onSuccess: (res) => {
            cacheResult(res);
            setOutcome({ type: 'result', data: res, stale: false });
        },
        // Online error = unknown QR (404). Offline is intercepted
        // before the mutation runs (cached lookup), so reaching here
        // means "not found".
        onError: () => setOutcome({ type: 'error', kind: 'notFound' }),
    });

    const confirmMutation = useMutation({
        mutationFn: (winnerId: string) => redemptionsApi.confirm(winnerId),
        onSuccess: () => {
            toast.success(t('confirmed'));
            setConfirmed(true);
            autoCloseRef.current = setTimeout(() => {
                setConfirmed(false);
                setOutcome(null);
            }, SUCCESS_AUTOCLOSE_MS);
        },
        onError: () => toast.error(t('confirmError')),
    });

    // ─── Decode handler (shared by camera + manual) ─────────
    const handleCode = useCallback(
        (raw: string | undefined | null) => {
            const code = raw?.trim();
            if (!code) return;
            if (outcome || confirmed) return; // modal open → ignore

            const now = Date.now();
            const last = lastScanRef.current;
            if (last && last.code === code && now - last.at < DEDUPE_MS) return;
            lastScanRef.current = { code, at: now };

            if (!navigator.onLine) {
                // Offline: READ-ONLY verification from cache. NEVER
                // hit the network or allow confirmation.
                const cached = getCached(code);
                setOutcome(
                    cached
                        ? { type: 'result', data: cached, stale: true }
                        : { type: 'error', kind: 'network' },
                );
                return;
            }

            scanMutation.mutate(code);
        },
        [outcome, confirmed, scanMutation],
    );

    const handleScan = useCallback(
        (codes: IDetectedBarcode[]) => handleCode(codes[0]?.rawValue),
        [handleCode],
    );

    const handleManualSubmit = useCallback(() => {
        handleCode(manualCode);
        setManualCode('');
    }, [handleCode, manualCode]);

    const closeModal = useCallback(() => {
        if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
        setConfirmed(false);
        setOutcome(null);
    }, []);

    // Pause the live scanner whenever a result/modal is showing.
    const scannerPaused = outcome !== null || confirmed;
    const cameraBlocked = cameraError !== null;

    return (
        <div className="flex min-h-screen flex-col gap-4 bg-black px-4 pb-8 pt-4 text-white">
            {/* Status pills */}
            <div className="flex flex-wrap items-center gap-2">
                <StatusPill
                    tone={cameraBlocked ? 'error' : 'ok'}
                    label={cameraBlocked ? t('cameraDenied') : t('cameraReady')}
                />
                {!isOnline && (
                    <StatusPill
                        tone="warn"
                        icon={<WifiOff size={14} />}
                        label={t('offline')}
                    />
                )}
            </div>

            {/* Camera viewfinder OR denied explainer */}
            {cameraBlocked ? (
                <CameraDenied message={t('cameraRequest')} />
            ) : (
                <div className="relative aspect-square w-full overflow-hidden border border-[#1A1A1A] bg-[#0A0A0A]">
                    <Scanner
                        onScan={handleScan}
                        onError={(err) => setCameraError(err)}
                        paused={scannerPaused}
                        // Rear camera at the highest reasonable resolution —
                        // a small/soft screen-QR decodes far more reliably
                        // from a 1080p+ stream than the default low-res one.
                        constraints={{
                            facingMode: 'environment',
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                        }}
                        components={{ finder: false }}
                        styles={{
                            container: { width: '100%', height: '100%' },
                            video: {
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            },
                        }}
                    />
                    <Reticle />
                    <p className="absolute inset-x-0 bottom-3 text-center font-space-mono text-[12px] uppercase tracking-[1px] text-white/80">
                        {t('scanHint')}
                    </p>
                </div>
            )}

            {/* Manual entry — always available, primary when camera is blocked */}
            <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                    <KeyRound size={14} /> {t('manualEntry')}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleManualSubmit();
                        }}
                        placeholder={t('manualPlaceholder')}
                        inputMode="text"
                        autoCapitalize="characters"
                        className="h-12 w-full rounded-none border border-[#2A2A2A] bg-[#141414] px-4 text-[18px] text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:outline-none"
                    />
                    <button
                        onClick={handleManualSubmit}
                        disabled={!manualCode.trim() || scanMutation.isPending}
                        className="flex h-12 min-w-[120px] items-center justify-center gap-2 rounded-none bg-[#2D00F7] px-6 text-[16px] font-bold uppercase tracking-[1px] text-white transition-all hover:bg-[#2400C5] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {scanMutation.isPending ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            t('manualEntry')
                        )}
                    </button>
                </div>
            </div>

            {/* Section 5 (stats + recent list) omitted — no staff event
                source endpoint. Flagged as a backend follow-up. */}
            <p className="mt-2 text-center font-space-mono text-[11px] text-[#4A4A4A]">
                {t('statsUnavailable')}
            </p>

            {outcome && (
                <ResultModal
                    outcome={outcome}
                    online={isOnline}
                    confirming={confirmMutation.isPending}
                    confirmed={confirmed}
                    onConfirm={(winnerId) => confirmMutation.mutate(winnerId)}
                    onClose={closeModal}
                />
            )}
        </div>
    );
}

// ─── Reticle (4-corner HUD targeting brackets) ───────────────

function Reticle() {
    const corner =
        'pointer-events-none absolute h-8 w-8 border-[var(--color-tactical-acid)]';
    return (
        <div className="pointer-events-none absolute inset-0">
            {/* Scanning pulse */}
            <div className="absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 animate-pulse border border-[#2D00F7]/30" />
            <div className="absolute inset-[18%]">
                <div className={`${corner} left-0 top-0 border-l-2 border-t-2`} />
                <div className={`${corner} right-0 top-0 border-r-2 border-t-2`} />
                <div className={`${corner} bottom-0 left-0 border-b-2 border-l-2`} />
                <div className={`${corner} bottom-0 right-0 border-b-2 border-r-2`} />
            </div>
        </div>
    );
}

function CameraDenied({ message }: { message: string }) {
    return (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-4 border border-[#2A2A2A] bg-[#0A0A0A] px-6 text-center">
            <AlertTriangle size={48} className="text-[#EAB308]" />
            <p className="font-space-mono text-[14px] leading-relaxed text-[#A0A0A0]">
                {message}
            </p>
        </div>
    );
}

function StatusPill({
    tone,
    label,
    icon,
}: {
    tone: 'ok' | 'warn' | 'error';
    label: string;
    icon?: React.ReactNode;
}) {
    const color =
        tone === 'ok' ? '#22C55E' : tone === 'warn' ? '#EAB308' : '#FF3366';
    return (
        <div
            className="flex items-center gap-1.5 border px-2.5 py-1 font-space-mono text-[11px] uppercase tracking-[1px]"
            style={{ borderColor: color, color }}
        >
            {icon ?? (
                <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: color }}
                />
            )}
            {label}
        </div>
    );
}

// ─── Result modal (glassmorphic over the camera) ─────────────

function ResultModal({
    outcome,
    online,
    confirming,
    confirmed,
    onConfirm,
    onClose,
}: {
    outcome: Outcome;
    online: boolean;
    confirming: boolean;
    confirmed: boolean;
    onConfirm: (winnerId: string) => void;
    onClose: () => void;
}) {
    const t = useTranslations('redemption');

    // Error / not-found / network → red.
    if (outcome.type === 'error') {
        const heading =
            outcome.kind === 'network' ? t('networkError') : t('notFound');
        return (
            <ModalShell onClose={onClose}>
                <div className="flex flex-col items-center gap-4">
                    <IconBadge tone="error">
                        <X size={40} strokeWidth={3} />
                    </IconBadge>
                    <h2 className="text-center font-sora text-[24px] font-extrabold text-white">
                        {heading}
                    </h2>
                    <FullButton tone="neutral" onClick={onClose}>
                        {t('close')}
                    </FullButton>
                </div>
            </ModalShell>
        );
    }

    const { data, stale } = outcome;
    const status = data.redemptionStatus;

    // Already redeemed → yellow. No timestamp (ScanResultResponse has
    // no redeemedAt — flagged as a backend follow-up).
    if (status === 'redeemed') {
        return (
            <ModalShell onClose={onClose}>
                <div className="flex flex-col items-center gap-4">
                    <IconBadge tone="warn">
                        <AlertTriangle size={40} strokeWidth={2.5} />
                    </IconBadge>
                    <h2 className="text-center font-sora text-[24px] font-extrabold text-[#EAB308]">
                        {t('alreadyRedeemed')}
                    </h2>
                    <div className="w-full border border-[#2A2A2A] bg-[#0A0A0A] p-4 text-center">
                        <p className="font-sora text-[20px] font-bold text-white">
                            {data.fanName}
                        </p>
                        <p className="mt-1 font-space-mono text-[14px] text-[#A0A0A0]">
                            {data.prizeName}
                        </p>
                    </div>
                    <FullButton tone="neutral" onClick={onClose}>
                        {t('close')}
                    </FullButton>
                </div>
            </ModalShell>
        );
    }

    // Expired / cancelled → red.
    if (status === 'expired' || status === 'cancelled') {
        return (
            <ModalShell onClose={onClose}>
                <div className="flex flex-col items-center gap-4">
                    <IconBadge tone="error">
                        <X size={40} strokeWidth={3} />
                    </IconBadge>
                    <h2 className="text-center font-sora text-[24px] font-extrabold text-white">
                        {status === 'expired' ? t('expired') : t('cancelled')}
                    </h2>
                    <FullButton tone="neutral" onClick={onClose}>
                        {t('close')}
                    </FullButton>
                </div>
            </ModalShell>
        );
    }

    // pending → VALID (green) — the deliverable path.
    const level = data.escuadraLevel;
    const showEscuadra =
        data.prizeType === 'experience' &&
        level !== null &&
        level >= 1 &&
        level <= 4;
    const tier = (level ?? 1) as 1 | 2 | 3 | 4;
    const confirmDisabled = !online || stale || confirming || confirmed;

    return (
        <ModalShell onClose={onClose}>
            <div className="flex flex-col items-center gap-4">
                <IconBadge tone="ok">
                    <Check size={confirmed ? 48 : 40} strokeWidth={3} />
                </IconBadge>
                <h2 className="text-center font-sora text-[24px] font-extrabold text-[#22C55E]">
                    {confirmed ? t('confirmed') : t('valid')}
                </h2>

                {stale && (
                    <div className="w-full border border-[#EAB308] bg-[#EAB30815] px-3 py-2 text-center font-space-mono text-[12px] text-[#EAB308]">
                        {t('offlineStale')}
                    </div>
                )}

                {/* Winner identity card — name (animate-glitch) + phone.
                    fanEmail is intentionally NOT shown (always null for
                    fan winners). Identity = name + phone. */}
                <div className="w-full border border-[#2A2A2A] bg-[#0A0A0A] p-4">
                    <p className="animate-glitch font-sora text-[24px] font-extrabold leading-tight text-white">
                        {data.fanName}
                    </p>
                    {data.fanPhone && (
                        <p className="mt-1 font-space-mono text-[16px] text-[#A0A0A0]">
                            {data.fanPhone}
                        </p>
                    )}
                    <p className="mt-3 font-sora text-[20px] font-bold text-white">
                        {data.prizeName}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="border border-[#2A2A2A] px-2 py-0.5 font-space-mono text-[11px] uppercase tracking-[1px] text-[#A0A0A0]">
                            {data.prizeType}
                        </span>
                        {showEscuadra && (
                            <span
                                className="px-2 py-0.5 font-space-mono text-[11px] font-bold uppercase tracking-[1px] text-black"
                                style={{ background: escuadraColors[tier] }}
                            >
                                {escuadraDefaultNames[tier]}
                            </span>
                        )}
                        <span className="ml-auto font-space-mono text-[12px] text-[#4A4A4A]">
                            {formatFandis(data.finalAmount)} F
                        </span>
                    </div>
                </div>

                {/* Verify-identity warning */}
                <div className="w-full border-l-4 border-[#EAB308] bg-[#141414] px-3 py-2 font-space-mono text-[13px] text-[#EAB308]">
                    {t('verifyIdentity')}
                </div>

                {/* Actions */}
                <div className="flex w-full flex-col gap-3">
                    <FullButton
                        tone="ok"
                        disabled={confirmDisabled}
                        onClick={() => onConfirm(data.winnerId)}
                    >
                        {confirming ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <>✅ {t('confirmDelivery')}</>
                        )}
                    </FullButton>
                    {(!online || stale) && (
                        <p className="text-center font-space-mono text-[12px] text-[#EAB308]">
                            {t('offlineNoConfirm')}
                        </p>
                    )}
                    <FullButton
                        tone="neutral"
                        onClick={onClose}
                        disabled={confirming}
                    >
                        {t('cancel')}
                    </FullButton>
                </div>
            </div>
        </ModalShell>
    );
}

// ─── Modal primitives ────────────────────────────────────────

function ModalShell({
    children,
    onClose,
}: {
    children: React.ReactNode;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Glass backdrop over the (paused) camera feed. */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[24px]"
                onClick={onClose}
            />
            <div className="hud-card hud-brackets relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto p-5">
                {children}
            </div>
        </div>
    );
}

function IconBadge({
    tone,
    children,
}: {
    tone: 'ok' | 'warn' | 'error';
    children: React.ReactNode;
}) {
    const color =
        tone === 'ok' ? '#22C55E' : tone === 'warn' ? '#EAB308' : '#FF3366';
    return (
        <div
            className="flex h-20 w-20 items-center justify-center rounded-full border-2"
            style={{ borderColor: color, color, boxShadow: `0 0 30px ${color}55` }}
        >
            {children}
        </div>
    );
}

function FullButton({
    tone,
    children,
    onClick,
    disabled,
}: {
    tone: 'ok' | 'neutral';
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
}) {
    const base =
        'flex h-14 w-full items-center justify-center gap-2 rounded-none text-[18px] font-bold uppercase tracking-[1px] transition-all disabled:cursor-not-allowed disabled:opacity-40';
    const toneClass =
        tone === 'ok'
            ? 'bg-[#22C55E] text-black hover:bg-[#1FB155]'
            : 'border border-[#2A2A2A] bg-transparent text-white hover:bg-[#1A1A1A]';
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${base} ${toneClass}`}
        >
            {children}
        </button>
    );
}
