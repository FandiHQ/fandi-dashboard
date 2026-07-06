'use client';

import type { LineupEntry } from '@/types/api';

interface ArtistMultiSelectProps {
    lineup: LineupEntry[];
    value: string[];
    onChange: (ids: string[]) => void;
    emptyHint: string;
}

/**
 * Multi-select "Artistas" control (Step 6.4) — toggle chips populated from
 * the event lineup. Stored as tag ids; the item is tagged with every
 * selected id.
 */
export function ArtistMultiSelect({
    lineup,
    value,
    onChange,
    emptyHint,
}: ArtistMultiSelectProps) {
    if (lineup.length === 0) {
        return (
            <p className="font-space-mono text-[11px] leading-relaxed text-[#737373]">
                {emptyHint}
            </p>
        );
    }

    const toggle = (id: string) =>
        value.includes(id)
            ? onChange(value.filter((v) => v !== id))
            : onChange([...value, id]);

    return (
        <div className="flex flex-wrap gap-2">
            {lineup.map((entry) => {
                const selected = value.includes(entry.id);
                return (
                    <button
                        key={entry.id}
                        type="button"
                        onClick={() => toggle(entry.id)}
                        aria-pressed={selected}
                        className={`rounded-full border px-3 py-1.5 font-sora text-sm transition-colors ${
                            selected
                                ? 'border-[#2D00F7] bg-[#2D00F7] text-white'
                                : 'border-[#2A2A2A] bg-[#141414] text-[#A0A0A0] hover:border-[#2D00F7]'
                        }`}
                    >
                        {entry.name}
                    </button>
                );
            })}
        </div>
    );
}
