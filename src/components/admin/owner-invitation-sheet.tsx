'use client';

/**
 * Owner invitation of an idol (side panel). Same email (or none) resends
 * the current invitation with a new link; another email cancels it and
 * invites that one; an idol with no invitation needs an email. The API
 * caps it at 3 sends a day per invitation (429 RESEND_LIMIT).
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, MailPlus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { adminApi, adminKeys, type AdminOrganization } from '@/lib/admin-api';
import {
    EMAIL_MAX, OWNER_NAME_MAX, ownerInvitationPayload, validateOwnerInvitation,
    type FieldProblem,
} from '@/lib/admin';
import { ERROR_TEXT_CLASS, FIELD_LABEL_CLASS, HINT_CLASS, useAdminErrorText } from './admin-ui';

export function OwnerInvitationSheet({ org, onClose }: { org: AdminOrganization | null; onClose: () => void }) {
    const t = useTranslations('fandiAdmin.ownerInvite');
    const current = org?.ownerInvitation?.email ?? null;
    return (
        <Sheet open={org !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
            <SheetContent side="right" className="gap-0" data-testid="owner-invitation-sheet">
                <SheetHeader className="border-b-2 border-ink px-6 pb-4 pt-6 pr-16">
                    <SheetTitle>{t('title')}</SheetTitle>
                    <SheetDescription>
                        {org ? `${org.name}. ` : ''}
                        {current ? t('hintResend', { email: current }) : t('hintNew')}
                    </SheetDescription>
                </SheetHeader>
                {org && <OwnerInvitationForm key={org.id} org={org} onDone={onClose} />}
            </SheetContent>
        </Sheet>
    );
}

function OwnerInvitationForm({ org, onDone }: { org: AdminOrganization; onDone: () => void }) {
    const t = useTranslations('fandiAdmin.ownerInvite');
    const tFields = useTranslations('fandiAdmin.fields');
    const queryClient = useQueryClient();
    const errorText = useAdminErrorText();
    const current = org.ownerInvitation?.email ?? null;
    const [email, setEmail] = useState(current ?? '');
    const [name, setName] = useState('');
    const [problems, setProblems] = useState<{ email?: FieldProblem; name?: FieldProblem } | null>(null);

    const payload = ownerInvitationPayload({ email, name }, current);
    const isResend = !payload.email;

    const send = useMutation({
        mutationFn: () => adminApi.ownerInvitation(org.id, payload),
        onSuccess: (updated) => {
            void queryClient.invalidateQueries({ queryKey: adminKeys.organizationsRoot });
            const sentTo = updated.ownerInvitation?.email ?? payload.email ?? current ?? '';
            // emailed false: the invitation exists, the email did not go out.
            if (updated.emailed === false) toast.warning(t('notEmailed', { email: sentTo }));
            else toast.success(t('done', { email: sentTo }));
            onDone();
        },
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const found = validateOwnerInvitation({ email, name }, current);
        setProblems(found);
        if (!found) send.mutate();
    };

    return (
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
                <div className="flex flex-col gap-2">
                    <label htmlFor="owner-email" className={FIELD_LABEL_CLASS}>{t('email')}</label>
                    <Input
                        id="owner-email"
                        type="email"
                        inputMode="email"
                        value={email}
                        maxLength={EMAIL_MAX}
                        onChange={(e) => { setEmail(e.target.value); setProblems(null); if (send.isError) send.reset(); }}
                        placeholder="manager@ejemplo.com"
                        aria-invalid={problems?.email ? true : undefined}
                        aria-describedby={problems?.email ? 'owner-email-error' : 'owner-email-hint'}
                        className="h-12"
                        autoComplete="off"
                        autoFocus
                    />
                    {problems?.email ? (
                        <p id="owner-email-error" role="alert" className={ERROR_TEXT_CLASS}>{tFields(problems.email)}</p>
                    ) : (
                        <p id="owner-email-hint" className={HINT_CLASS}>{current ? t('emailHint') : t('limit')}</p>
                    )}
                </div>

                {!isResend && (
                    <div className="flex flex-col gap-2">
                        <label htmlFor="owner-name" className={FIELD_LABEL_CLASS}>{t('name')}</label>
                        <Input
                            id="owner-name"
                            value={name}
                            maxLength={OWNER_NAME_MAX}
                            onChange={(e) => { setName(e.target.value); setProblems(null); }}
                            placeholder="María García"
                            aria-invalid={problems?.name ? true : undefined}
                            className="h-12"
                            autoComplete="off"
                        />
                        {problems?.name && <p role="alert" className={ERROR_TEXT_CLASS}>{tFields(problems.name)}</p>}
                    </div>
                )}

                {current && <p className={HINT_CLASS}>{t('limit')}</p>}

                {send.isError && (
                    <p role="alert" className={`rounded-[12px] border-2 border-alert-white px-4 py-3 ${ERROR_TEXT_CLASS}`}>
                        {errorText(send.error)}
                    </p>
                )}
            </div>
            <SheetFooter className="border-t-2 border-ink px-6 py-4">
                <Button type="submit" size="lg" disabled={send.isPending} className="w-full" data-testid="owner-invitation-submit">
                    {send.isPending ? (
                        <>
                            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                            {t('sending')}
                        </>
                    ) : isResend ? (
                        <>
                            <Send size={16} aria-hidden="true" />
                            {t('resend')}
                        </>
                    ) : (
                        <>
                            <MailPlus size={16} aria-hidden="true" />
                            {t('invite')}
                        </>
                    )}
                </Button>
            </SheetFooter>
        </form>
    );
}
