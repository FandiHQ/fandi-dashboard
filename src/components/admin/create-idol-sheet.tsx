'use client';

/**
 * Crear ídolo (side panel): name, category, visibility and the owner's
 * email + name. The API creates the org and the owner invitation in one
 * transaction and sends the email after commit; the panel then says
 * plainly whether the email went out, with a resend when it did not.
 */
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { classificationApi } from '@/lib/api-hooks';
import { categoryPath, categoryRows, UNCLASSIFIED_SLUG } from '@/lib/classification';
import { adminApi, adminKeys, type CreateIdolResponse } from '@/lib/admin-api';
import {
    EMAIL_MAX, IDOL_NAME_MAX, OWNER_NAME_MAX, createIdolPayload, createdOutcome, validateCreateIdol,
    type CreateIdolInput, type CreateIdolProblems,
} from '@/lib/admin';
import {
    AdminSwitch, ERROR_TEXT_CLASS, FIELD_LABEL_CLASS, HINT_CLASS, SELECT_CLASS, useAdminErrorText,
} from './admin-ui';

const EMPTY: CreateIdolInput = { name: '', categoryId: '', isPublic: false, ownerEmail: '', ownerName: '' };

export function CreateIdolSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const t = useTranslations('fandiAdmin.createIdol');
    const [created, setCreated] = useState<{ result: CreateIdolResponse; email: string } | null>(null);
    // A new form each time the panel opens (the key resets its state).
    const [formKey, setFormKey] = useState(0);

    const close = (next: boolean) => {
        onOpenChange(next);
        if (!next) {
            setCreated(null);
            setFormKey((k) => k + 1);
        }
    };

    return (
        <Sheet open={open} onOpenChange={close}>
            <SheetContent side="right" className="gap-0" data-testid="create-idol-sheet">
                <SheetHeader className="border-b-2 border-ink px-6 pb-4 pt-6 pr-16">
                    <SheetTitle>{t('title')}</SheetTitle>
                    <SheetDescription>{t('hint')}</SheetDescription>
                </SheetHeader>
                {created ? (
                    <CreatedState
                        result={created.result}
                        email={created.email}
                        onAnother={() => { setCreated(null); setFormKey((k) => k + 1); }}
                        onDone={() => close(false)}
                    />
                ) : (
                    <CreateIdolForm key={formKey} onCreated={(result, email) => setCreated({ result, email })} />
                )}
            </SheetContent>
        </Sheet>
    );
}

function CreateIdolForm({ onCreated }: { onCreated: (result: CreateIdolResponse, email: string) => void }) {
    const t = useTranslations('fandiAdmin.createIdol');
    const tFields = useTranslations('fandiAdmin.fields');
    const locale = useLocale();
    const queryClient = useQueryClient();
    const errorText = useAdminErrorText();
    const [form, setForm] = useState<CreateIdolInput>(EMPTY);
    const [problems, setProblems] = useState<CreateIdolProblems | null>(null);

    const categories = useQuery({
        queryKey: ['fandiAdmin', 'categories'],
        queryFn: () => classificationApi.tree(),
        staleTime: 5 * 60_000,
    });
    const options = useMemo(() => {
        const nodes = categories.data ?? [];
        return categoryRows(nodes)
            .filter((row) => row.node.slug !== UNCLASSIFIED_SLUG)
            .map((row) => ({ id: row.node.id, label: categoryPath(row.node.id, nodes, locale) }));
    }, [categories.data, locale]);

    const create = useMutation({
        mutationFn: () => adminApi.createIdol(createIdolPayload(form)),
        onSuccess: (result) => {
            void queryClient.invalidateQueries({ queryKey: adminKeys.organizationsRoot });
            onCreated(result, result.organization.ownerInvitation?.email ?? createIdolPayload(form).ownerEmail);
        },
    });

    const set = <K extends keyof CreateIdolInput>(key: K, value: CreateIdolInput[K]) => {
        setForm((f) => ({ ...f, [key]: value }));
        if (problems) setProblems(null);
        if (create.isError) create.reset();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const found = validateCreateIdol(form);
        setProblems(found);
        if (!found) create.mutate();
    };

    const problemText = (problem: string | undefined) => (problem ? tFields(problem) : null);

    return (
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
                <Field id="idol-name" label={t('name')} error={problemText(problems?.name)}>
                    <Input
                        id="idol-name"
                        value={form.name}
                        maxLength={IDOL_NAME_MAX}
                        onChange={(e) => set('name', e.target.value)}
                        placeholder={t('namePlaceholder')}
                        aria-invalid={problems?.name ? true : undefined}
                        aria-describedby={problems?.name ? 'idol-name-error' : undefined}
                        className="h-12"
                        autoComplete="off"
                        autoFocus
                    />
                </Field>

                <Field id="idol-category" label={t('category')} hint={categories.isError ? t('categoriesUnavailable') : t('categoryHint')}>
                    <select
                        id="idol-category"
                        value={form.categoryId}
                        onChange={(e) => set('categoryId', e.target.value)}
                        aria-describedby="idol-category-hint"
                        className={SELECT_CLASS}
                        disabled={categories.isLoading}
                    >
                        <option value="">{t('categoryNone')}</option>
                        {options.map((o) => (
                            <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                    </select>
                </Field>

                <AdminSwitch
                    id="idol-public"
                    checked={form.isPublic}
                    onChange={(next) => set('isPublic', next)}
                    label={t('isPublic')}
                    hint={t('isPublicHint')}
                />

                <div className="h-0.5 bg-line-white" aria-hidden="true" />

                <Field id="idol-owner-email" label={t('ownerEmail')} hint={t('ownerHint')} error={problemText(problems?.ownerEmail)}>
                    <Input
                        id="idol-owner-email"
                        type="email"
                        inputMode="email"
                        value={form.ownerEmail}
                        maxLength={EMAIL_MAX}
                        onChange={(e) => set('ownerEmail', e.target.value)}
                        placeholder={t('ownerEmailPlaceholder')}
                        aria-invalid={problems?.ownerEmail ? true : undefined}
                        aria-describedby={problems?.ownerEmail ? 'idol-owner-email-error' : 'idol-owner-email-hint'}
                        className="h-12"
                        autoComplete="off"
                    />
                </Field>

                <Field id="idol-owner-name" label={t('ownerName')} error={problemText(problems?.ownerName)}>
                    <Input
                        id="idol-owner-name"
                        value={form.ownerName}
                        maxLength={OWNER_NAME_MAX}
                        onChange={(e) => set('ownerName', e.target.value)}
                        placeholder={t('ownerNamePlaceholder')}
                        aria-invalid={problems?.ownerName ? true : undefined}
                        className="h-12"
                        autoComplete="off"
                    />
                </Field>

                {create.isError && (
                    <p role="alert" className={`rounded-[12px] border-2 border-alert-white px-4 py-3 ${ERROR_TEXT_CLASS}`}>
                        {errorText(create.error)}
                    </p>
                )}
            </div>

            <SheetFooter className="border-t-2 border-ink px-6 py-4">
                <Button type="submit" size="lg" disabled={create.isPending} className="w-full" data-testid="create-idol-submit">
                    {create.isPending ? (
                        <>
                            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                            {t('submitting')}
                        </>
                    ) : t('submit')}
                </Button>
            </SheetFooter>
        </form>
    );
}

function CreatedState({
    result, email, onAnother, onDone,
}: { result: CreateIdolResponse; email: string; onAnother: () => void; onDone: () => void }) {
    const t = useTranslations('fandiAdmin.createIdol');
    const queryClient = useQueryClient();
    const errorText = useAdminErrorText();
    const [outcome, setOutcome] = useState(createdOutcome(result));

    const resend = useMutation({
        mutationFn: () => adminApi.ownerInvitation(result.organization.id, {}),
        onSuccess: (org) => {
            void queryClient.invalidateQueries({ queryKey: adminKeys.organizationsRoot });
            setOutcome('sent');
            toast.success(t('resent', { email: org.ownerInvitation?.email ?? email }));
        },
    });

    const sent = outcome === 'sent';
    return (
        <div className="flex min-h-0 flex-1 flex-col" data-testid="create-idol-result">
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
                <div
                    role="status"
                    className={`flex gap-3 rounded-[14px] border-2 border-ink p-4 ${sent ? 'bg-lime' : 'bg-white shadow-ext-sm'}`}
                >
                    {sent ? (
                        <CircleCheck size={22} className="mt-0.5 shrink-0 text-ink" aria-hidden="true" />
                    ) : (
                        <CircleAlert size={22} className="mt-0.5 shrink-0 text-alert-white" aria-hidden="true" />
                    )}
                    <div className="flex flex-col gap-1">
                        <p className="font-display text-[20px] text-ink">{sent ? t('sentTitle') : t('notSentTitle')}</p>
                        <p className="text-sm text-ink">
                            <span className="font-bold">{result.organization.name}</span>
                            {'. '}
                            {sent ? t('sentBody', { email }) : t('notSentBody', { email })}
                        </p>
                    </div>
                </div>

                {!sent && (
                    <Button variant="default" size="lg" onClick={() => resend.mutate()} disabled={resend.isPending}>
                        {resend.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                        {t('resendNow')}
                    </Button>
                )}
                {resend.isError && (
                    <p role="alert" className={ERROR_TEXT_CLASS}>{errorText(resend.error)}</p>
                )}
            </div>
            <SheetFooter className="flex-row gap-3 border-t-2 border-ink px-6 py-4">
                <Button variant="secondary" size="lg" className="flex-1" onClick={onAnother}>{t('createAnother')}</Button>
                <Button variant={sent ? 'default' : 'secondary'} size="lg" className="flex-1" onClick={onDone}>{t('done')}</Button>
            </SheetFooter>
        </div>
    );
}

function Field({
    id, label, hint, error, children,
}: { id: string; label: string; hint?: string; error?: string | null; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={id} className={FIELD_LABEL_CLASS}>{label}</label>
            {children}
            {error ? (
                <p id={`${id}-error`} role="alert" className={ERROR_TEXT_CLASS}>{error}</p>
            ) : hint ? (
                <p id={`${id}-hint`} className={HINT_CLASS}>{hint}</p>
            ) : null}
        </div>
    );
}
