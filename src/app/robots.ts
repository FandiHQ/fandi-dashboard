import type { MetadataRoute } from 'next';

const SITE = 'https://fandi.app';

/**
 * Serves /robots.txt (Next file convention).
 *
 * Two jobs:
 *  - point crawlers at the sitemap, which is how Google discovers pages
 *    without waiting to stumble across inbound links;
 *  - keep the private surfaces out of the index. The dashboard, login,
 *    staff and invite routes are auth-gated but were still crawlable, and
 *    a login screen ranking for "Fandi" would be worse than not ranking.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/dashboard/',
                    '/login',
                    '/staff',
                    '/invite/',
                    '/api/',
                ],
            },
        ],
        sitemap: `${SITE}/sitemap.xml`,
        host: SITE,
    };
}
