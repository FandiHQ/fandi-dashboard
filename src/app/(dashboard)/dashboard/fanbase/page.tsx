'use client';

/**
 * Fanbase (fandi-api RFC §8): who the idol's fans are. Tabs — Resumen,
 * Top fans (the named ranking, owner/admin), Lealtad, Dónde, Valor,
 * Afinidad, Conocimiento — each reading one aggregate route when opened.
 * The tab lives in `?tab=` so a link can open it (the old /top-fans
 * redirects to `?tab=top`). One primary action: plan the next event.
 */
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CalendarPlus } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TopFansTab } from '@/components/fanbase/TopFansTab';
import {
    AffinityTab,
    KnowledgeTab,
    LoyaltyTab,
    OverviewTab,
    ValueTab,
    WhereTab,
} from '@/components/fanbase/FanbaseTabs';
import { tabFromParam, visibleTabs, type FanbaseTab } from '@/lib/fanbase';

const TAB_CONTENT: Record<FanbaseTab, () => React.ReactNode> = {
    overview: () => <OverviewTab />,
    top: () => <TopFansTab />,
    loyalty: () => <LoyaltyTab />,
    where: () => <WhereTab />,
    value: () => <ValueTab />,
    affinity: () => <AffinityTab />,
    knowledge: () => <KnowledgeTab />,
};

export default function FanbasePage() {
    return (
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-2xl" />}>
            <Fanbase />
        </Suspense>
    );
}

function Fanbase() {
    const t = useTranslations('fanbase');
    const { memberRole } = useAuth();
    const router = useRouter();
    const params = useSearchParams();
    const tabs = visibleTabs(memberRole);
    const active = tabFromParam(params.get('tab'), memberRole);
    const canPlan = memberRole === 'owner' || memberRole === 'admin';

    const select = (value: string) => {
        const tab = tabFromParam(value, memberRole);
        router.replace(tab === 'overview' ? '/dashboard/fanbase' : `/dashboard/fanbase?tab=${tab}`, {
            scroll: false,
        });
    };

    return (
        <div className="flex flex-col gap-7" data-testid="fanbase-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="font-hero text-[44px] text-white lg:text-[48px]">{t('title')}</h1>
                    <p className="label-mono text-[11px] text-lilac">{t('subtitle')}</p>
                </div>
                {canPlan && (
                    <Button asChild>
                        <Link href="/dashboard/events/new" data-testid="fanbase-create-event">
                            <CalendarPlus />
                            {t('createEvent')}
                        </Link>
                    </Button>
                )}
            </div>

            {/* Section tabs: the ink segmented bar (§7). Scrolls sideways on
                narrow screens, with no visible bar. */}
            <Tabs value={active} onValueChange={select}>
                <TabsList className="no-scrollbar max-w-full justify-start overflow-x-auto overflow-y-hidden">
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab}
                            value={tab}
                            className="flex-none cursor-pointer px-3.5"
                            data-testid={`fanbase-tab-${tab}`}>
                            {t(`tabs.${tab}`)}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div>{TAB_CONTENT[active]()}</div>
        </div>
    );
}
