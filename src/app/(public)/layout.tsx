import type { Metadata } from 'next';

export const metadata: Metadata = {
    metadataBase: new URL('https://fandi.app'),
    title: 'Fandi: Convertimos a tu ídolo en tu amigo',
    description:
        'Compite en vivo por experiencias con tu ídolo, desde donde estés. Oportunidades y subastas mientras el evento sucede.',
    openGraph: {
        title: 'Fandi: Convertimos a tu ídolo en tu amigo',
        description:
            'Compite en vivo por experiencias con tu ídolo, desde donde estés.',
        type: 'website',
        locale: 'es_CO',
        url: 'https://fandi.app',
        siteName: 'Fandi',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Fandi: Convertimos a tu ídolo en tu amigo',
        description:
            'Compite en vivo por experiencias con tu ídolo, desde donde estés.',
    },
    alternates: { canonical: '/' },
};

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
