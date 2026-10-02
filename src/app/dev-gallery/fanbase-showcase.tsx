'use client';

/**
 * DEV-ONLY: the Fanbase tabs (fandi-api RFC §8) with local fixtures (no
 * API), for visual review in /dev-gallery — including withheld groups.
 * The queries are seeded and never refetch.
 */
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    AffinityTab,
    KnowledgeTab,
    LoyaltyTab,
    OverviewTab,
    ValueTab,
    WhereTab,
} from '@/components/fanbase/FanbaseTabs';
import type {
    FanbaseAlsoFollows,
    FanbaseGeography,
    FanbaseKnowledge,
    FanbaseOverview,
    FanbaseValue,
} from '@/lib/fanbase';

const AT = '2026-10-01T20:00:00.000Z';

const OVERVIEW: FanbaseOverview = {
    generatedAt: AT,
    totals: { fans: 1284, confirmed: 1012, inferred: 272, viaCollaborations: 143 },
    newPerMonth: [
        ['2025-11', 0],
        ['2025-12', 12],
        ['2026-01', '<5'],
        ['2026-02', 38],
        ['2026-03', 61],
        ['2026-04', 44],
        ['2026-05', 120],
        ['2026-06', 97],
        ['2026-07', 210],
        ['2026-08', 388],
        ['2026-09', 251],
        ['2026-10', 58],
    ].map(([month, newFans]) => ({ month: month as string, newFans: newFans as number | '<5' })),
    loyalty: { returning: 402, oneTime: 882, inactive90: 517 },
    events: [
        {
            eventId: 'e1',
            name: 'Nacional vs. Millonarios',
            date: '2026-07-12T00:00:00.000Z',
            hosted: true,
            fans: 610,
            newFans: 520,
            returningFans: 90,
            cameBack: 214,
        },
        {
            eventId: 'e2',
            name: 'Noche de Messi en el Atanasio',
            date: '2026-08-20T00:00:00.000Z',
            hosted: false,
            fans: 388,
            newFans: 301,
            returningFans: 87,
            cameBack: '<5',
        },
        {
            eventId: 'e3',
            name: 'Nacional vs. Junior',
            date: '2026-09-27T00:00:00.000Z',
            hosted: true,
            fans: 286,
            newFans: 'hidden',
            returningFans: '<5',
            cameBack: 0,
        },
    ],
};

const GEOGRAPHY: FanbaseGeography = {
    generatedAt: AT,
    located: 931,
    unlocated: 353,
    cities: [
        { cityId: '1', name: 'Medellín', stateCode: 'ANT', countryCode: 'CO', fans: 702, played: true },
        { cityId: '2', name: 'Bogotá', stateCode: 'DC', countryCode: 'CO', fans: 96, played: false },
        { cityId: '3', name: 'Cali', stateCode: 'VAC', countryCode: 'CO', fans: 41, played: false },
        { cityId: '4', name: 'Envigado', stateCode: 'ANT', countryCode: 'CO', fans: 33, played: true },
        { cityId: '5', name: 'Miami', stateCode: 'FL', countryCode: 'US', fans: 9, played: false },
    ],
    otherCities: 38,
    countries: [
        { countryId: '48', name: 'Colombia', iso2: 'CO', fans: 905 },
        { countryId: '233', name: 'United States', iso2: 'US', fans: 22 },
    ],
    otherCountries: '<5',
    demandGaps: [
        { cityId: '2', name: 'Bogotá', stateCode: 'DC', countryCode: 'CO', fans: 96, played: false },
        { cityId: '3', name: 'Cali', stateCode: 'VAC', countryCode: 'CO', fans: 41, played: false },
        { cityId: '5', name: 'Miami', stateCode: 'FL', countryCode: 'US', fans: 9, played: false },
    ],
};

const VALUE: FanbaseValue = {
    generatedAt: AT,
    payingFans: 1141,
    revenueCop: 318_450_000,
    avgPerFanCop: 279_097,
    distribution: [
        { bucket: 'upTo20', fans: 702 },
        { bucket: 'upTo60', fans: 281 },
        { bucket: 'upTo200', fans: 119 },
        { bucket: 'upTo1000', fans: 'hidden' },
        { bucket: 'over1000', fans: '<5' },
    ],
    byDynamicType: [
        { type: 'oportunidad', revenueCop: 211_300_000, fans: 1032 },
        { type: 'impacto', revenueCop: 18_150_000, fans: 207 },
        { type: 'subasta', revenueCop: 89_000_000, fans: 14 },
    ],
};

const ALSO_FOLLOWS: FanbaseAlsoFollows = {
    generatedAt: AT,
    computedAt: '2026-10-01T09:00:00.000Z',
    minSharedFans: 10,
    idols: [
        { orgId: 'o1', name: 'Messi', avatarUrl: null, sharedFans: 188, jaccard: 0.142 },
        { orgId: 'o2', name: 'Karol G', avatarUrl: null, sharedFans: 74, jaccard: 0.051 },
        { orgId: 'o3', name: 'Inter Miami', avatarUrl: null, sharedFans: 12, jaccard: 0.009 },
    ],
};

const KNOWLEDGE: FanbaseKnowledge = {
    generatedAt: AT,
    oportunidades: 4,
    answers: 1830,
    accuracy: 0.612,
    questions: [
        {
            questionId: 'q1',
            prompt: '¿En qué año ganó Nacional su primera Copa Libertadores?',
            experienceId: 'x1',
            experienceName: 'Foto en el camerino',
            answers: 402,
            correctRate: 0.318,
        },
        {
            questionId: 'q2',
            prompt: '¿Quién es el máximo goleador histórico del club?',
            experienceId: 'x1',
            experienceName: 'Foto en el camerino',
            answers: 377,
            correctRate: 0.541,
        },
        {
            questionId: 'q3',
            prompt: '¿Cómo se llama el estadio del Verde?',
            experienceId: 'x2',
            experienceName: 'Saque de honor',
            answers: 512,
            correctRate: 0.902,
        },
    ],
    fewAnswers: 2,
};

function seededClient(): QueryClient {
    const client = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                refetchOnMount: false,
                refetchOnWindowFocus: false,
                refetchOnReconnect: false,
            },
        },
    });
    client.setQueryData(['fanbase', 'overview'], OVERVIEW);
    client.setQueryData(['fanbase', 'geography'], GEOGRAPHY);
    client.setQueryData(['fanbase', 'value'], VALUE);
    client.setQueryData(['fanbase', 'also-follows'], ALSO_FOLLOWS);
    client.setQueryData(['fanbase', 'knowledge'], KNOWLEDGE);
    return client;
}

export function FanbaseShowcase() {
    const [client] = useState(seededClient);
    return (
        <QueryClientProvider client={client}>
            <div className="flex flex-col gap-10" data-testid="fanbase-showcase">
                <OverviewTab />
                <LoyaltyTab />
                <WhereTab />
                <ValueTab />
                <AffinityTab />
                <KnowledgeTab />
            </div>
        </QueryClientProvider>
    );
}
