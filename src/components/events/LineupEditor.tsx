'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { LineupEntry } from '@/types/api';

interface LineupEditorProps {
    value: LineupEntry[];
    onChange: (next: LineupEntry[]) => void;
    addLabel: string;
    placeholder: string;
}

/**
 * Event lineup editor (Step 6.4) — type a name → a stable client id is
 * generated on add (the backend keeps it). Removing an entry that is still
 * tagged on items is rejected by the API (LINEUP_ENTRY_IN_USE), surfaced as
 * a toast by the form's onError.
 */
export function LineupEditor({
    value,
    onChange,
    addLabel,
    placeholder,
}: LineupEditorProps) {
    const [name, setName] = useState('');

    const add = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const id =
            globalThis.crypto?.randomUUID?.() ??
            `tmp-${Date.now()}-${value.length}`;
        onChange([...value, { id, name: trimmed }]);
        setName('');
    };

    const remove = (id: string) => onChange(value.filter((e) => e.id !== id));

    return (
        <div className="flex flex-col gap-3">
            <div className="flex gap-2">
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            add();
                        }
                    }}
                    placeholder={placeholder}
                    className="h-11 flex-1 rounded-none border border-[#2A2A2A] bg-[#141414] px-4 font-sora text-base text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:outline-none"
                />
                <button
                    type="button"
                    onClick={add}
                    className="flex h-11 items-center gap-2 rounded-none border border-[#2D00F7] bg-transparent px-4 font-space-mono text-[12px] uppercase tracking-[1px] text-[#2D00F7] transition-colors hover:bg-[#2D00F710]"
                >
                    <Plus size={14} />
                    {addLabel}
                </button>
            </div>
            {value.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {value.map((entry) => (
                        <span
                            key={entry.id}
                            className="flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#141414] py-1.5 pl-3 pr-2 font-sora text-sm text-white"
                        >
                            {entry.name}
                            <button
                                type="button"
                                onClick={() => remove(entry.id)}
                                aria-label={`Remove ${entry.name}`}
                                className="text-[#737373] transition-colors hover:text-[#FF3366]"
                            >
                                <X size={14} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
