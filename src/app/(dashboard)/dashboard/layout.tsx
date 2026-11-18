import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { TITLE_TEMPLATE } from '@/lib/page-title';

/**
 * Tab titles: "Inicio · Fandi" here, and the " · Fandi" template for every
 * dashboard route below (each one names itself in its own layout).
 */
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('dashboardNav');
    return {
        title: { absolute: TITLE_TEMPLATE.replace('%s', t('home')), template: TITLE_TEMPLATE },
    };
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardShell>{children}</DashboardShell>;
}
