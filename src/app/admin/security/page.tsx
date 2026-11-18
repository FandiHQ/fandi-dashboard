'use client';

/**
 * Fandi Admin → Seguridad: the admin's own authenticator (two-step
 * verification is always required here; removing it sends the person back
 * to /verificacion to turn it on again).
 */
import { useTranslations } from 'next-intl';
import { TwoStepCard } from '@/components/security/two-step-card';

export default function AdminSecurityPage() {
    const t = useTranslations('adminNav');
    return (
        <div className="flex max-w-[860px] flex-col gap-8">
            <div className="flex flex-col gap-2">
                <h1 className="font-hero text-[40px] leading-none text-white lg:text-[48px]">{t('securityTitle')}</h1>
                <p className="label-mono text-[11px] text-lilac">{t('securitySubtitle')}</p>
            </div>
            <TwoStepCard sectionId="admin-verificacion" />
        </div>
    );
}
