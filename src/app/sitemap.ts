import type { MetadataRoute } from 'next';

const SITE = 'https://fandi.app';

/**
 * Serves /sitemap.xml (Next file convention).
 *
 * Only the landing is listed. A sitemap must contain URLs that return 200 —
 * listing /terminos and /privacidad while they still 404 would hand Google
 * broken URLs and hurt more than it helps. Add them here the moment those
 * pages exist.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: SITE,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
    ];
}
