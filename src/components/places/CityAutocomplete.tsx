'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { placesApi } from '@/lib/api-hooks';

export interface CityAutocompleteValue {
    id: string;
    name: string;
}

interface CityAutocompleteProps {
    value: CityAutocompleteValue | null;
    onChange: (v: CityAutocompleteValue | null) => void;
    countryCode?: string;
    error?: string;
}

export function CityAutocomplete({
    value,
    onChange,
    countryCode = 'CO',
    error,
}: CityAutocompleteProps) {
    const t = useTranslations('events.form');
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
                <div className="flex min-h-10 items-center justify-between border border-[#2A2A2A] bg-[#141414] px-3 font-sora text-base text-white">
                    <span>{value.name}</span>
                    <button
                        type="button"
                        aria-label={t('cityClear')}
                        onClick={() => {
                            onChange(null);
                            setQuery('');
                            setOpen(true);
                        }}
                        className="cursor-pointer text-[#A0A0A0] transition-colors hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <Popover open={showDropdown} onOpenChange={setOpen}>
                <PopoverAnchor asChild>
                    <Input
                        value={query}
                        onFocus={() => setOpen(true)}
                        onChange={(event) => {
                            const nextQuery = event.target.value;
                            setQuery(nextQuery);
                            setOpen(true);
                        }}
                        placeholder={t('cityPlaceholder')}
                        className="h-14 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-xl text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:shadow-[0_0_12px_rgba(45,0,247,0.3)] focus:ring-0"
                    />
                </PopoverAnchor>
                <PopoverContent
                    align="start"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                    className="w-(--radix-popover-trigger-width) rounded-none border-[#2A2A2A] bg-[#121212] p-0"
                >
                    <Command shouldFilter={false} className="rounded-none bg-[#121212]">
                        <CommandList>
                            <CommandEmpty className="py-4 font-space-mono text-sm text-[#737373]">
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
                                        className="cursor-pointer rounded-none px-4 py-3 font-sora text-base text-white data-[selected=true]:bg-[#1A1A1A] data-[selected=true]:text-white"
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
                    <span className="font-space-mono text-sm text-[#FF3366]">
                        {t('cityNetworkError')}
                    </span>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="cursor-pointer font-space-mono text-sm uppercase tracking-[1px] text-[#2D00F7] hover:text-white"
                    >
                        {t('retry')}
                    </button>
                </div>
            )}

            {error && (
                <span className="font-space-mono text-base text-[#FF3366]">
                    {error}
                </span>
            )}
        </div>
    );
}
