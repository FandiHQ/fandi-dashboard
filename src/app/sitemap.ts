import type { MetadataRoute } from 'next';

const SITE = 'https://fandi.app';

/**
 * Serves /sitemap.xml (Next file convention).
 *
 * Every URL here must return 200 — handing Google broken URLs hurts more
 * than omitting them. The legal pages carry lower priority and a yearly
 * change frequency because they change only when Legal revises them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    return [
        {
            url: SITE,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 1,
        },
        ...[
            '/terminos',
            '/privacidad',
            '/datos-personales',
            // Google Play requires this URL to be publicly reachable and
            // it is named in all three legal documents, so it must be
            // discoverable rather than an orphan page.
            '/eliminar-cuenta',
        ].map((path) => ({
            url: `${SITE}${path}`,
            lastModified: now,
            changeFrequency: 'yearly' as const,
            priority: 0.4,
        })),
    ];
}
