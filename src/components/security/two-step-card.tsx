'use client';

/**
 * Configuración (and /admin/security) → Verificación en dos pasos.
 *
 * Shows whether an authenticator is on, what the role requires (Fandi
 * Admin: always; owner/admin: from a date; viewer/staff: optional), turns
 * it on (QR + secret + first code) and removes it (Supabase needs the
 * session to have verified the code, which every layout already asks for
 * when a factor exists).
 */
import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormAlert } from '@/components/auth/password-fields';
import { useAuth } from '@/contexts/auth-context';
import { colombiaDateTime } from '@/lib/colombia-time';
import {
    twoStepErrorKey, twoStepRequiredForRole, twoStepRequirementLabel, type TwoStepErrorKey,
} from '@/lib/two-step';
import { listVerifiedTotp, removeTotp, type TotpFactorInfo } from '@/lib/two-step-client';
import { TotpEnrollForm } from './two-step-forms';

export function TwoStepCard({ sectionId = 'verificacion' }: { sectionId?: string }) {
    const t = useTranslations('twoStep');
    const tErrors = useTranslations('twoStep.errors');
    const locale = useLocale();
    const { user, refreshAssurance } = useAuth();
    const [factors, setFactors] = useState<TotpFactorInfo[] | null>(null);
    const [loadError, setLoadError] = useState<TwoStepErrorKey | null>(null);
    const [enrolling, setEnrolling] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [removeError, setRemoveError] = useState<TwoStepErrorKey | null>(null);
    const { confirm, dialog } = useConfirmDialog();

    const load = useCallback(async () => {
        const { data, error } = await listVerifiedTotp();
        if (error || !data) {
            setLoadError(twoStepErrorKey(error));
            return;
        }
        setLoadError(null);
        setFactors(data);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => { void load(); }, 0);
        return () => clearTimeout(timer);
    }, [load]);

    // The reminder banner links here (#verificacion): the page renders
    // after the session loads, so scroll once the card exists.
    useEffect(() => {
        if (typeof window === 'undefined' || window.location.hash !== `#${sectionId}`) return;
        document.getElementById(sectionId)?.scrollIntoView({ block: 'start' });
    }, [sectionId]);

    if (!user) return null;
    const facts = { role: user.role, mfa: user.mfa ?? null };
    const requirement = twoStepRequirementLabel(facts);
    const deadline = colombiaDateTime(user.mfa?.requiredAfter ?? null, locale);
    const active = (factors?.length ?? 0) > 0;
    const added = colombiaDateTime(factors?.[0]?.createdAt ?? null, locale);

    async function onEnrolled() {
        await refreshAssurance();
        setEnrolling(false);
        await load();
        toast.success(t('enabledToast'));
    }

    async function onRemove() {
        const factor = factors?.[0];
        if (!factor) return;
        const ok = await confirm({
            title: t('removeConfirmTitle'),
            description: twoStepRequiredForRole(facts) ? t('removeConfirmRequired') : t('removeConfirmOptional'),
            confirmLabel: t('removeConfirm'),
            cancelLabel: t('cancel'),
        });
        if (!ok) return;
        setRemoving(true);
        setRemoveError(null);
        const { error } = await removeTotp(factor.id);
        setRemoving(false);
        if (error) {
            setRemoveError(twoStepErrorKey(error));
            return;
        }
        await refreshAssurance();
        await load();
        toast.success(t('removedToast'));
    }

    return (
        <section
            id={sectionId}
            className="block-white flex scroll-mt-24 flex-col overflow-hidden"
            aria-labelledby={`${sectionId}-title`}
            data-testid="two-step-card"
        >
            <div className="flex flex-wrap items-center gap-2.5 border-b-2 border-ink px-6 py-4">
                {active
                    ? <ShieldCheck size={16} className="text-ink" aria-hidden="true" />
                    : <ShieldOff size={16} className="text-ink" aria-hidden="true" />}
                <h2 id={`${sectionId}-title`} className="font-display text-[17px]">{t('title')}</h2>
                {factors !== null && (
                    <span
                        className={`label-mono ml-auto rounded-full border-2 border-ink px-2.5 py-0.5 text-[10px] font-bold ${
                            active ? 'bg-lime text-ink' : 'bg-white text-ink'
                        }`}
                        data-testid="two-step-status"
                    >
                        {active ? t('statusOn') : t('statusOff')}
                    </span>
                )}
            </div>

            <div className="flex max-w-[640px] flex-col gap-5 px-6 py-6">
                <div className="flex flex-col gap-1.5">
                    <p className="text-sm leading-relaxed text-body-white">{user.role === 'admin' ? t('whyAdmin') : t('why')}</p>
                    <p className="text-sm font-bold leading-relaxed text-ink" data-testid="two-step-requirement">
                        {requirement === 'admin' && t('requirement.admin')}
                        {requirement === 'required' && t('requirement.required')}
                        {requirement === 'requiredFrom' && deadline && t('requirement.requiredFrom', { date: deadline.date })}
                        {requirement === 'optional' && t('requirement.optional')}
                    </p>
                </div>

                {loadError && <FormAlert>{tErrors(loadError)}</FormAlert>}

                {factors === null && !loadError && (
                    <div className="flex items-center gap-3" role="status">
                        <span className="live-dot size-3 text-blue" aria-hidden="true" />
                        <span className="text-sm font-semibold text-body-white">{t('loading')}</span>
                    </div>
                )}

                {active && added && (
                    <p className="text-sm leading-relaxed text-body-white">
                        {t('activeSince', { date: added.date })}
                    </p>
                )}

                {enrolling && (
                    <TotpEnrollForm
                        idPrefix={`${sectionId}-enrol`}
                        onEnrolled={onEnrolled}
                        onCancel={() => setEnrolling(false)}
                    />
                )}

                <FormAlert>{removeError ? tErrors(removeError) : null}</FormAlert>
            </div>

            {factors !== null && !enrolling && (
                <div className="mt-auto flex justify-end border-t-2 border-line-white px-6 py-4">
                    {active ? (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => void onRemove()}
                            disabled={removing}
                            data-testid="two-step-remove"
                        >
                            {removing && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                            {t('remove')}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            size="lg"
                            onClick={() => setEnrolling(true)}
                            data-testid="two-step-enable"
                        >
                            {t('enable')}
                        </Button>
                    )}
                </div>
            )}

            {dialog}
        </section>
    );
}
