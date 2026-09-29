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
import { formatCop, formatFandis } from '@/lib/currency';
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
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-8 text-white">
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
                <div className="relative aspect-square w-full overflow-hidden rounded-[18px] border-2 border-ink bg-ink shadow-ext-lg">
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
                    <p className="absolute inset-x-0 bottom-3 flex justify-center px-3">
                        <span className="label-mono rounded-full bg-ink px-3 py-1.5 text-center text-[11px] text-white">
                            {t('scanHint')}
                        </span>
                    </p>
                </div>
            )}

            {/* Manual entry — always available, primary when camera is blocked */}
            <div className="flex flex-col gap-2">
                <label className="label-mono flex items-center gap-2 text-[11px] text-lilac">
                    <KeyRound size={14} /> {t('manualEntry')}
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleManualSubmit();
                        }}
                        placeholder={t('manualPlaceholder')}
                        inputMode="text"
                        autoCapitalize="characters"
                        className="h-14 w-full rounded-[12px] border-2 border-ink bg-white px-4 font-space-mono text-[18px] font-bold text-ink placeholder:font-sans placeholder:text-[16px] placeholder:font-semibold placeholder:text-muted-white focus-visible:shadow-ext-sm focus-visible:outline-none"
                    />
                    <button
                        onClick={handleManualSubmit}
                        disabled={!manualCode.trim() || scanMutation.isPending}
                        className="flex h-14 min-w-[140px] items-center justify-center gap-2 rounded-[14px] border-2 border-ink bg-white px-6 text-[16px] font-extrabold uppercase text-ink shadow-ext-md transition-[transform,box-shadow] duration-75 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-45"
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
            <p className="mt-2 text-center font-space-mono text-[11px] text-lilac">
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

// ─── Reticle (four corner guides over the camera) ────────────

function Reticle() {
    const corner = 'pointer-events-none absolute h-10 w-10 border-white';
    return (
        <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-[18%]">
                <div className={`${corner} left-0 top-0 rounded-tl-[14px] border-l-4 border-t-4`} />
                <div className={`${corner} right-0 top-0 rounded-tr-[14px] border-r-4 border-t-4`} />
                <div className={`${corner} bottom-0 left-0 rounded-bl-[14px] border-b-4 border-l-4`} />
                <div className={`${corner} bottom-0 right-0 rounded-br-[14px] border-b-4 border-r-4`} />
            </div>
        </div>
    );
}

function CameraDenied({ message }: { message: string }) {
    return (
        <div className="block-white flex aspect-square w-full flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex size-16 items-center justify-center rounded-full border-2 border-ink bg-alert text-ink">
                <AlertTriangle size={30} strokeWidth={2.5} />
            </span>
            <p className="text-[16px] font-semibold leading-relaxed text-ink">
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
    // ok = lime (live camera), warn = ink (offline), error = alert.
    const toneClass =
        tone === 'ok'
            ? 'bg-lime text-ink'
            : tone === 'warn'
              ? 'bg-ink text-white'
              : 'bg-alert text-ink';
    return (
        <div
            className={`label-mono flex min-h-8 items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-[11px] font-bold ${toneClass}`}
        >
            {icon ?? (
                <span
                    className={
                        tone === 'ok'
                            ? 'live-dot'
                            : 'inline-block h-2 w-2 rounded-[2px] bg-current'
                    }
                />
            )}
            {label}
        </div>
    );
}

// ─── Result modal (white block over the paused camera) ───────

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

    // Error / not-found / network → alert.
    if (outcome.type === 'error') {
        const heading =
            outcome.kind === 'network' ? t('networkError') : t('notFound');
        return (
            <ModalShell onClose={onClose}>
                <ResultBand tone="error" icon={<X size={30} strokeWidth={3} />}>
                    {heading}
                </ResultBand>
                <div className="flex flex-col gap-4 p-5">
                    <FullButton tone="neutral" onClick={onClose}>
                        {t('close')}
                    </FullButton>
                </div>
            </ModalShell>
        );
    }

    const { data, stale } = outcome;
    const status = data.redemptionStatus;

    // Already redeemed → alert (do not deliver twice). No timestamp
    // (ScanResultResponse has no redeemedAt — flagged as a backend
    // follow-up).
    if (status === 'redeemed') {
        return (
            <ModalShell onClose={onClose}>
                <ResultBand tone="error" icon={<AlertTriangle size={28} strokeWidth={2.5} />}>
                    {t('alreadyRedeemed')}
                </ResultBand>
                <div className="flex flex-col gap-4 p-5">
                    <div className="rounded-[12px] border-2 border-line-white p-4 text-center">
                        <p className="font-display text-[22px] text-ink">
                            {data.fanName}
                        </p>
                        <p className="mt-1.5 text-[15px] font-semibold text-muted-white">
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

    // Expired / cancelled → alert.
    if (status === 'expired' || status === 'cancelled') {
        return (
            <ModalShell onClose={onClose}>
                <ResultBand tone="error" icon={<X size={30} strokeWidth={3} />}>
                    {status === 'expired' ? t('expired') : t('cancelled')}
                </ResultBand>
                <div className="flex flex-col gap-4 p-5">
                    <FullButton tone="neutral" onClick={onClose}>
                        {t('close')}
                    </FullButton>
                </div>
            </ModalShell>
        );
    }

    // pending → VALID (lime) — the deliverable path.
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
            <ResultBand tone="ok" icon={<Check size={confirmed ? 34 : 30} strokeWidth={3} />}>
                {confirmed ? t('confirmed') : t('valid')}
            </ResultBand>

            <div className="flex flex-col gap-4 p-5">
                {stale && (
                    <div className="label-mono flex items-center gap-2 rounded-[12px] bg-ink px-3 py-2.5 text-[11px] text-white">
                        <WifiOff size={14} className="shrink-0" />
                        {t('offlineStale')}
                    </div>
                )}

                {/* Winner identity card — name + phone.
                    fanEmail is intentionally NOT shown (always null for
                    fan winners). Identity = name + phone. */}
                <div className="rounded-[12px] border-2 border-line-white p-4">
                    <p className="font-display text-[26px] leading-tight text-ink">
                        {data.fanName}
                    </p>
                    {data.fanPhone && (
                        <p className="mt-1.5 font-space-mono text-[17px] font-bold text-blue">
                            {data.fanPhone}
                        </p>
                    )}
                    <p className="mt-3 text-[19px] font-extrabold text-ink">
                        {data.prizeName}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="label-mono rounded-full border-2 border-ink px-2.5 py-0.5 text-[11px] font-bold text-ink">
                            {data.prizeType}
                        </span>
                        {showEscuadra && (
                            <span
                                className="label-mono rounded-full border-2 border-ink px-2.5 py-0.5 text-[11px] font-bold text-ink"
                                style={{ background: escuadraColors[tier] }}
                            >
                                {escuadraDefaultNames[tier]}
                            </span>
                        )}
                        <span className="ml-auto font-space-mono text-[12px] text-muted-white tabular">
                            {formatFandis(data.finalAmount)} F · {formatCop(data.finalAmount)}
                        </span>
                    </div>
                </div>

                {/* Verify-identity instruction */}
                <div className="rounded-[12px] border-l-[6px] border-blue bg-line-white px-3 py-2.5 text-[15px] font-bold text-ink">
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
                            <>
                                <Check size={20} strokeWidth={3} />
                                {t('confirmDelivery')}
                            </>
                        )}
                    </FullButton>
                    {(!online || stale) && (
                        <p className="label-mono text-center text-[11px] font-bold text-alert-white">
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
            {/* Flat ink scrim over the (paused) camera feed. */}
            <div
                className="absolute inset-0 bg-ink/70"
                onClick={onClose}
            />
            <div className="block-white relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto shadow-ext-xl">
                {children}
            </div>
        </div>
    );
}

// Status band on top of the white result block: the word always carries
// the state (never colour alone) — lime = deliver, alert = do not.
function ResultBand({
    tone,
    icon,
    children,
}: {
    tone: 'ok' | 'error';
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div
            role="status"
            className={`flex items-center gap-3 border-b-2 border-ink px-5 py-4 text-ink ${
                tone === 'ok' ? 'bg-lime' : 'bg-alert'
            }`}
        >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-white">
                {icon}
            </span>
            <h2 className="font-display text-[26px] leading-none">
                {children}
            </h2>
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
        'flex h-14 w-full items-center justify-center gap-2 rounded-[14px] border-2 border-ink text-[18px] font-extrabold uppercase transition-[transform,box-shadow] duration-75 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-45';
    const toneClass =
        tone === 'ok'
            ? 'bg-lime text-ink shadow-ext-md'
            : 'bg-white text-ink shadow-ext-sm';
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
