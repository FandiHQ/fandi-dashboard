import { getTranslations } from 'next-intl/server';
import LandingV2 from '@/components/landing-v2/LandingV2';

const SITE = 'https://fandi.app';
const FAQ_IDS = [1, 2, 3, 4, 5] as const;

/**
 * `/` — the Fandi landing page.
 *
 * The implementation lives in components/landing-v2/LandingV2 so this route
 * file stays a thin entry point and can render structured data on the
 * server.
 *
 * The JSON-LD graph describes the organisation, the site, and the real FAQ.
 * FAQPage is the one with immediate upside: Google can surface those five
 * answers as expandable rich results, and they are exactly the questions
 * that gate a first-time fan (is it rigged, is my money safe, do I have to
 * be at the stadium).
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
