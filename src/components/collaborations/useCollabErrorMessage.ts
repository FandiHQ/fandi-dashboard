'use client';

/**
 * Our own copy for a failed collaboration action (invite, resend, answer,
 * end): every API code maps to a message, never the API's own text.
 */
import { useLocale, useTranslations } from 'next-intl';
import { collabErrorCopy } from '@/lib/collaborations';
import { colombiaDateTime } from '@/lib/colombia-time';

export function useCollabErrorMessage(): (err: unknown) => string {
    const t = useTranslations('collaborations');
    const locale = useLocale();
    return (err: unknown) => {
        const copy = collabErrorCopy(err);
        if (copy.key === 'cooldown') {
            const when = colombiaDateTime(copy.retryAt, locale);
            return when ? t('errors.cooldown', { date: when.date, time: when.time }) : t('errors.cooldownSoon');
        }
        if (copy.key === 'inviteLimit') return t('errors.inviteLimit', { limit: copy.limit ?? 5 });
        return t(`errors.${copy.key}`);
    };
}
