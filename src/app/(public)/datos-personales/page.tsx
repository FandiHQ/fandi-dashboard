import type { Metadata } from 'next';
import LegalDoc, { type LegalBlock } from '@/components/legal/LegalDoc';
import blocks from '@/content/legal/datos-personales.json';

/**
 * Política de Tratamiento y Protección de Datos Personales — the full
 * habeas data / Ley 1581 de 2012 compliance document. Referenced from the
 * Privacy Policy for readers who want the legal detail.
 */
export const metadata: Metadata = {
    title: 'Política de Tratamiento de Datos Personales · Fandi',
    description:
        'Política de Tratamiento y Protección de Datos Personales de Fandi Holding S.A.S. conforme a la Ley 1581 de 2012.',
    alternates: { canonical: '/datos-personales' },
};

export default function DatosPersonalesPage() {
    return (
        <LegalDoc
            title="Política de Tratamiento y Protección de Datos Personales"
            subtitle="Fandi Holding S.A.S. · NIT 902.070.820-4"
            version="Versión 1.0 · Vigente desde el 1 de agosto de 2026"
            blocks={blocks as LegalBlock[]}
            related={[
                { href: '/privacidad', label: 'Política de Privacidad' },
                { href: '/terminos', label: 'Términos y Condiciones' },
            ]}
        />
    );
}
