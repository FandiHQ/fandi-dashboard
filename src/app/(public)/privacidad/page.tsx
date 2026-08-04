import type { Metadata } from 'next';
import LegalDoc, { type LegalBlock } from '@/components/legal/LegalDoc';
import blocks from '@/content/legal/privacidad.json';

/**
 * The URL Google Play and the payment gateway are given as the "Privacy
 * Policy". This is the plain-language document; the full compliance text
 * (Ley 1581 de 2012) lives at /datos-personales and is linked from here.
 */
export const metadata: Metadata = {
    title: 'Política de Privacidad · Fandi',
    description:
        'Política de Privacidad de Fandi: qué datos tratamos, para qué, con quién los compartimos y cómo eliminar tu cuenta.',
    alternates: { canonical: '/privacidad' },
};

export default function PrivacidadPage() {
    return (
        <LegalDoc
            title="Política de Privacidad"
            subtitle="Fandi Holding S.A.S. · NIT 902.070.820-4"
            version="Versión 1.0 · Vigente desde el 1 de agosto de 2026"
            blocks={blocks as LegalBlock[]}
            related={[
                { href: '/datos-personales', label: 'Tratamiento de Datos' },
                { href: '/terminos', label: 'Términos y Condiciones' },
            ]}
        />
    );
}
