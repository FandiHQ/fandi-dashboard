import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/layout/admin-shell';
import { TITLE_TEMPLATE } from '@/lib/page-title';

/**
 * Fandi Admin (users.role 'admin'): "Fandi Admin · Fandi" here and the
 * " · Fandi" template for every page below (each names itself in its own
 * layout). The shell gates the session, the role and two-step verification.
 */
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('adminNav');
    return {
        title: { absolute: TITLE_TEMPLATE.replace('%s', t('label')), template: TITLE_TEMPLATE },
        robots: { index: false, follow: false },
    };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AdminShell>{children}</AdminShell>;
}
