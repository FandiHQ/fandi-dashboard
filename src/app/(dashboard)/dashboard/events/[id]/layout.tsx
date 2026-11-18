import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { fetchEventName, TITLE_TEMPLATE } from '@/lib/page-title';
import EventDetailShell from './event-detail-shell';

/** Tab title: "<event name> · Fandi" (generic "Evento" if it cannot be read). */
export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const name = (await fetchEventName(id)) ?? (await getTranslations('pageTitles'))('event');
    return { title: { default: name, template: TITLE_TEMPLATE } };
}

export default function EventDetailLayout({ children }: { children: React.ReactNode }) {
    return <EventDetailShell>{children}</EventDetailShell>;
}
