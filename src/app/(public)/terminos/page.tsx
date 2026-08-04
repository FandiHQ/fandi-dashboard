import type { Metadata } from 'next';
import LegalDoc, { type LegalBlock } from '@/components/legal/LegalDoc';
import blocks from '@/content/legal/terminos.json';

export const metadata: Metadata = {
    title: 'Términos y Condiciones · Fandi',
    description:
        'Términos y Condiciones de uso de la aplicación Fandi. Fandi Holding S.A.S., NIT 902.070.820-4, Medellín, Colombia.',
    alternates: { canonical: '/terminos' },
};

export default function TerminosPage() {
    return (
        <LegalDoc
            title="Términos y Condiciones de Uso"
            subtitle="Fandi Holding S.A.S. · NIT 902.070.820-4"
            version="Versión 1.0 · Vigente desde el 1 de agosto de 2026"
            blocks={blocks as LegalBlock[]}
            related={[
                { href: '/privacidad', label: 'Política de Privacidad' },
                { href: '/datos-personales', label: 'Tratamiento de Datos' },
            ]}
        />
    );
}
