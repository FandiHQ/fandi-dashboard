import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import LandingV2 from '@/components/landing-v2/LandingV2';
import {
    APP_STORE_URL,
    PLAY_STORE_URL,
    SMART_APP_BANNER,
} from '@/lib/app-links';

const SITE = 'https://fandi.app';
const FAQ_IDS = [1, 2, 3, 4, 5] as const;

/** Everything else (title, OG, icons) comes from the (public) layout. */
export const metadata: Metadata = {
    // iOS Safari: native "Get / Open" banner for the app on top of the page.
    other: SMART_APP_BANNER,
};

/**
 * `/` — the Fandi landing page.
 *
 * The implementation lives in components/landing-v2/LandingV2 so this route
 * file stays a thin entry point and can render structured data on the
 * server.
 *
 * The JSON-LD graph describes the organisation, the site, the app and the
 * real FAQ. FAQPage is the one with immediate upside: Google can surface
 * those five answers as expandable rich results, and they are exactly the
 * questions that gate a first-time fan (is it rigged, is my money safe, do
 * I have to be at the stadium). MobileApplication ties both store listings
 * to the same entity as the organisation and the site.
 */
export default async function HomePage() {
    const t = await getTranslations('landingV2');

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': `${SITE}/#organization`,
                name: 'Fandi',
                url: SITE,
                logo: `${SITE}/icon-512.png`,
                image: `${SITE}/og-image.jpg`,
                email: 'hola@fandi.app',
                slogan: t('hero.slogan'),
                description: t('hero.sub'),
                areaServed: { '@type': 'Country', name: 'Colombia' },
            },
            {
                '@type': 'WebSite',
                '@id': `${SITE}/#website`,
                url: SITE,
                name: 'Fandi',
                inLanguage: 'es-CO',
                publisher: { '@id': `${SITE}/#organization` },
            },
            {
                '@type': 'MobileApplication',
                '@id': `${SITE}/#app`,
                name: 'Fandi',
                operatingSystem: 'iOS, Android',
                applicationCategory: 'EntertainmentApplication',
                description: t('hero.sub'),
                image: `${SITE}/icon-512.png`,
                downloadUrl: [APP_STORE_URL, PLAY_STORE_URL],
                sameAs: [APP_STORE_URL, PLAY_STORE_URL],
                offers: {
                    '@type': 'Offer',
                    price: 0,
                    priceCurrency: 'COP',
                },
                publisher: { '@id': `${SITE}/#organization` },
                author: { '@id': `${SITE}/#organization` },
            },
            {
                '@type': 'FAQPage',
                '@id': `${SITE}/#faq`,
                mainEntity: FAQ_IDS.map((i) => ({
                    '@type': 'Question',
                    name: t(`faq.q${i}`),
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: t(`faq.a${i}`),
                    },
                })),
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <LandingV2 />
        </>
    );
}
