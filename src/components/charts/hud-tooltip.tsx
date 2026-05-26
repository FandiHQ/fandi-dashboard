'use client';

/**
 * Shared Recharts tooltip styled to match the rest of the
 * tactical-HUD surface (`.hud-card` + `.hud-brackets`). Used by
 * every chart on the Analytics + Live pages — never reach for
 * Recharts' default `<Tooltip />` content.
 *
 * Recharts passes `active`, `payload`, and `label` props on the
 * `content` prop. We render only when there's something to show,
 * so the tooltip doesn't flash on first mount.
 *
 * Money is rendered as Fandies via `formatFandis` by default
 * (matches Step 4.13's dashboard-wide convention — see
 * /events/[id]/live/page.tsx). Pass a custom `formatValue` for
 * non-money series (e.g. participant counts).
 */
import { formatFandis } from '@/lib/currency';
import { textColors } from '@/lib/chart-colors';

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
        <div
            className="hud-card hud-brackets px-3 py-2 font-space-mono text-[12px]"
            style={{ minWidth: 160 }}
        >
            {label !== undefined && label !== '' && (
                <div
                    className="mb-1 uppercase tracking-[1px]"
                    style={{ color: textColors.muted, fontSize: 10 }}
                >
                    {label}
                </div>
            )}
            <div className="flex flex-col gap-1">
                {payload.map((entry, i) => (
                    <div
                        key={`${entry.name ?? 'entry'}-${i}`}
                        className="flex items-center gap-2"
                    >
                        {entry.color && (
                            <span
                                aria-hidden
                                className="inline-block h-2 w-2 shrink-0"
                                style={{ backgroundColor: entry.color }}
                            />
                        )}
                        {entry.name && (
                            <span style={{ color: textColors.secondary }}>
                                {entry.name}
                            </span>
                        )}
                        <span
                            className="ml-auto tabular-nums"
                            style={{ color: textColors.primary }}
                        >
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
