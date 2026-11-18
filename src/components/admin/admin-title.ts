import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { TITLE_TEMPLATE } from '@/lib/page-title';

/** "Ídolos · Fandi" and friends, keeping the template for the segments below. */
export async function adminTitle(key: 'organizations' | 'topups' | 'fans' | 'fan' | 'audit'): Promise<Metadata> {
    const t = await getTranslations('fandiAdmin.titles');
    return { title: { default: t(key), template: TITLE_TEMPLATE } };
}
