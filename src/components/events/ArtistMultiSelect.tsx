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
            <p className="font-space-mono text-[10px] leading-relaxed text-muted-foreground">
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
                        className={`press rounded-full border-2 px-3 py-1.5 text-[13px] font-extrabold transition-colors ${
                            selected
                                ? 'border-ink bg-blue text-white shadow-ext-sm'
                                : 'border-foreground bg-transparent text-foreground hover:bg-accent'
                        }`}
                    >
                        {entry.name}
                    </button>
                );
            })}
        </div>
    );
}
