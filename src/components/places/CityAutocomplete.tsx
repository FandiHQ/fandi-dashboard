'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { placesApi } from '@/lib/api-hooks';

// `retry` lives at `events.retry` (existing key, line 77 of es.json) —
// we deliberately do NOT add a duplicate `events.form.retry`. Pull
// from the parent `events` namespace via a second hook instance.

export interface CityAutocompleteValue {
    id: string;
    name: string;
}

interface CityAutocompleteProps {
    value: CityAutocompleteValue | null;
    onChange: (v: CityAutocompleteValue | null) => void;
    countryCode?: string;
    error?: string;
    /** For a <label htmlFor> on the page. */
    id?: string;
}

export function CityAutocomplete({
    value,
    onChange,
    countryCode = 'CO',
    error,
    id,
}: CityAutocompleteProps) {
    const t = useTranslations('events.form');
    const tEvents = useTranslations('events');
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedQuery(query.trim());
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [query]);

    const {
        data: cities = [],
        isFetching,
        isError,
        refetch,
    } = useQuery({
        queryKey: ['places', 'search', countryCode, debouncedQuery],
        queryFn: ({ signal }) => placesApi.searchCities(debouncedQuery, {
            country: countryCode,
            limit: 10,
            signal,
        }),
        enabled: debouncedQuery.length >= 2,
        retry: false,
    });

    const showDropdown = open && debouncedQuery.length >= 2;
    const networkError = debouncedQuery.length >= 2 && isError;

    return (
        <div className="flex flex-col gap-2">
            {value && (
                <div className="flex min-h-10 items-center justify-between rounded-[10px] border-2 border-foreground bg-accent px-3 text-[15px] font-bold text-foreground">
                    <span>{value.name}</span>
                    <button
                        type="button"
                        aria-label={t('cityClear')}
                        onClick={() => {
                            onChange(null);
                            setQuery('');
                            setOpen(true);
                        }}
                        className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <Popover open={showDropdown} onOpenChange={setOpen}>
                <PopoverAnchor asChild>
                    <Input
                        id={id}
                        value={query}
                        aria-invalid={error ? true : undefined}
                        onFocus={() => setOpen(true)}
                        onChange={(event) => {
                            const nextQuery = event.target.value;
                            setQuery(nextQuery);
                            setOpen(true);
                        }}
                        placeholder={t('cityPlaceholder')}
                        className="h-12 text-base"
                    />
                </PopoverAnchor>
                <PopoverContent
                    align="start"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                    className="w-(--radix-popover-trigger-width) overflow-hidden p-0"
                >
                    <Command shouldFilter={false}>
                        <CommandList>
                            <CommandEmpty className="py-4 font-space-mono text-[11px] text-muted-foreground">
                                {isFetching ? '...' : null}
                            </CommandEmpty>
                            <CommandGroup>
                                {cities.map((city) => (
                                    <CommandItem
                                        key={city.id}
                                        value={`${city.name}-${city.stateName}-${city.id}`}
                                        onSelect={() => {
                                            onChange({ id: city.id, name: city.name });
                                            setQuery('');
                                            setOpen(false);
                                        }}
                                        className="cursor-pointer rounded-[10px] px-3 py-2.5 text-[15px] font-semibold"
                                    >
                                        <span>{city.name}, {city.stateName}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {networkError && (
                <div className="flex items-center justify-between gap-3">
                    <span className="font-space-mono text-[11px] text-destructive">
                        {t('cityNetworkError')}
                    </span>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="label-mono cursor-pointer font-bold text-foreground underline decoration-2 underline-offset-4"
                    >
                        {tEvents('retry')}
                    </button>
                </div>
            )}

            {error && (
                <span className="font-space-mono text-[11px] text-destructive">
                    {error}
                </span>
            )}
        </div>
    );
}
