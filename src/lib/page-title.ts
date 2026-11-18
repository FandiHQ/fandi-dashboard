import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServer } from './supabase-server';

/**
 * Browser tab titles for the dashboard: "Eventos · Fandi", "Equipo · Fandi",
 * "<event name> · Fandi". The dashboard layout sets the template; each
 * route segment's (server) layout names itself with these helpers.
 *
 * Every title keeps passing the template down (`default` + `template`):
 * a plain string title would drop it for the segments below.
 */
export const TITLE_TEMPLATE = '%s · Fandi';

export async function dashboardTitle(
    namespace: 'dashboardNav' | 'pageTitles',
    key: string,
): Promise<Metadata> {
    const t = await getTranslations(namespace);
    return { title: { default: t(key), template: TITLE_TEMPLATE } };
}

/**
 * The event's name for its tab title, read with the signed-in user's
 * session (the proxy already validated it). Any failure falls back to a
 * generic title: a tab title must never block or break the page.
 */
export async function fetchEventName(eventId: string): Promise<string | null> {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return null;
    try {
        const supabase = await createSupabaseServer();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return null;
        const res = await fetch(`${base}/dashboard/events/${encodeURIComponent(eventId)}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
            signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return null;
        const body = (await res.json()) as { data?: { name?: unknown }; name?: unknown };
        const name = body.data?.name ?? body.name;
        return typeof name === 'string' && name.trim() ? name.trim() : null;
    } catch {
        return null;
    }
}
