'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            add();
                        }
                    }}
                    placeholder={placeholder}
                    className="h-11 flex-1 text-base"
                />
                <Button
                    type="button"
                    variant="secondary"
                    onClick={add}
                    className="h-11"
                >
                    <Plus size={14} />
                    {addLabel}
                </Button>
            </div>
            {value.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {value.map((entry) => (
                        <span
                            key={entry.id}
                            className="flex items-center gap-2 rounded-full border-2 border-foreground bg-transparent py-1 pl-3 pr-2 text-[13px] font-extrabold uppercase text-foreground"
                        >
                            {entry.name}
                            <button
                                type="button"
                                onClick={() => remove(entry.id)}
                                aria-label={`Remove ${entry.name}`}
                                className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
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
