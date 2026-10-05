'use client';

/**
 * Shared Recharts tooltip: an ink block (Azul Bloque §2, charts §7).
 * Used by every chart on the Analytics page — never reach for
 * Recharts' default `<Tooltip />` content. The export names keep the
 * legacy "Hud" prefix so existing call sites don't move.
 *
 * Recharts passes `active`, `payload`, and `label` props on the
 * `content` prop. We render only when there's something to show,
 * so the tooltip doesn't flash on first mount.
 *
 * Money is rendered as Fandis via `formatFandis` by default. Pass a
 * custom `formatValue` for non-money series (e.g. participant counts).
 */
import { formatFandis } from '@/lib/currency';

export interface HudTooltipPayloadEntry {
    name?: string;
    value?: number;
    color?: string;
    payload?: Record<string, unknown>;
}

export interface HudTooltipProps {
    active?: boolean;
    payload?: HudTooltipPayloadEntry[];
    label?: string | number;
    /** Optional formatter for the value field. Defaults to formatFandis + " F" suffix. */
    formatValue?: (v: number) => string;
}

const defaultFormatValue = (v: number) => `${formatFandis(v)} F`;

export function HudTooltip({
    active,
    payload,
    label,
    formatValue = defaultFormatValue,
}: HudTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="surface-ink min-w-[160px] rounded-[10px] border-2 border-ink bg-ink px-3 py-2 text-white shadow-ext-sm">
            {label !== undefined && label !== '' && (
                <div className="label-mono mb-1 text-muted-ink">{label}</div>
            )}
            <div className="flex flex-col gap-1">
                {payload.map((entry, i) => (
                    <div
                        key={`${entry.name ?? 'entry'}-${i}`}
                        className="flex items-center gap-2 font-space-mono text-[12px]"
                    >
                        {entry.color && (
                            <span
                                aria-hidden
                                className="inline-block size-2.5 shrink-0 rounded-[3px] border border-white/40"
                                style={{ backgroundColor: entry.color }}
                            />
                        )}
                        {entry.name && (
                            <span className="text-muted-ink">{entry.name}</span>
                        )}
                        <span className="tabular ml-auto font-bold text-white">
                            {typeof entry.value === 'number'
                                ? formatValue(entry.value)
                                : '—'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
