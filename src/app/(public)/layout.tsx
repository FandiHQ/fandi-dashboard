import type { Metadata, Viewport } from 'next';

const TITLE = 'Fandi: Convertimos a tu ídolo en tu amigo';

/**
 * Description sits in the 110-160 char band search engines and social
 * previews render in full. The previous one was 65 chars and left half
 * the snippet empty.
 */
const DESCRIPTION =
    'Compite en vivo por experiencias con tu ídolo durante sus eventos: oportunidades y subastas en tiempo real, desde la tribuna o desde tu casa.';

const OG_IMAGE = {
    url: '/og-image.jpg',
    width: 1200,
    height: 630,
    alt: 'Fandi: convertimos a tu ídolo en tu amigo',
};

export const metadata: Metadata = {
    metadataBase: new URL('https://fandi.app'),
    title: TITLE,
    description: DESCRIPTION,
    applicationName: 'Fandi',
    manifest: '/site.webmanifest',
    alternates: { canonical: '/' },
    openGraph: {
        title: TITLE,
        description: DESCRIPTION,
        type: 'website',
        locale: 'es_CO',
        url: 'https://fandi.app',
        siteName: 'Fandi',
        images: [OG_IMAGE],
    },
    twitter: {
        card: 'summary_large_image',
        title: TITLE,
        description: DESCRIPTION,
        images: [OG_IMAGE],
        // `site` intentionally omitted until there is a real @handle —
        // pointing it at a non-existent account is worse than absent.
    },
    icons: {
        icon: [
            { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
            { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        ],
        apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
};

export const viewport: Viewport = {
    themeColor: '#000000',
};

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
