import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Fandi — Interactuar con tus ídolos ahora no es imposible',
    description:
        'Plataforma de engagement en tiempo real para eventos masivos. Fans compiten en escuadras para ganar experiencias VIP únicas.',
    openGraph: {
        title: 'Fandi',
        description: 'Democratiza las experiencias VIP en eventos en vivo',
        type: 'website',
        locale: 'es_CO',
        url: 'https://fandi.app',
    },
};

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
