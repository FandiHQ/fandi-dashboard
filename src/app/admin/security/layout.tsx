import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { TITLE_TEMPLATE } from '@/lib/page-title';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('adminNav');
    return { title: { default: t('securityTitle'), template: TITLE_TEMPLATE } };
}

export default function AdminSecurityLayout({ children }: { children: React.ReactNode }) {
    return children;
}
