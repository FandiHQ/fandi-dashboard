'use client';

/**
 * The basics of an idol (side panel): name and whether fans see it. Only
 * what changed is sent (PATCH /admin/organizations/:id); the profile
 * texts and images stay with the idol's team in its Configuración.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { adminApi, adminKeys, type AdminOrganization, type UpdateIdolDto } from '@/lib/admin-api';
import { IDOL_NAME_MAX } from '@/lib/admin';
import { AdminSwitch, ERROR_TEXT_CLASS, FIELD_LABEL_CLASS, useAdminErrorText } from './admin-ui';

export function EditIdolSheet({ org, onClose }: { org: AdminOrganization | null; onClose: () => void }) {
    const t = useTranslations('fandiAdmin.editIdol');
    return (
        <Sheet open={org !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
            <SheetContent side="right" className="gap-0" data-testid="edit-idol-sheet">
                <SheetHeader className="border-b-2 border-ink px-6 pb-4 pt-6 pr-16">
                    <SheetTitle>{t('title')}</SheetTitle>
                </SheetHeader>
                {org && <EditIdolForm key={org.id} org={org} onDone={onClose} />}
            </SheetContent>
        </Sheet>
    );
}

function EditIdolForm({ org, onDone }: { org: AdminOrganization; onDone: () => void }) {
    const t = useTranslations('fandiAdmin.editIdol');
    const tFields = useTranslations('fandiAdmin.fields');
    const tErrors = useTranslations('fandiAdmin.errors');
    const tCommon = useTranslations('fandiAdmin.common');
    const queryClient = useQueryClient();
    const errorText = useAdminErrorText();
    const [name, setName] = useState(org.name);
    const [isPublic, setIsPublic] = useState(org.isPublic);
    const [problem, setProblem] = useState<'required' | 'nothing' | null>(null);

    const changes: UpdateIdolDto = {
        ...(name.trim() !== org.name ? { name: name.trim() } : {}),
        ...(isPublic !== org.isPublic ? { isPublic } : {}),
    };

    const save = useMutation({
        mutationFn: () => adminApi.updateIdol(org.id, changes),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: adminKeys.organizationsRoot });
            toast.success(t('saved'));
            onDone();
        },
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setProblem('required'); return; }
        if (Object.keys(changes).length === 0) { setProblem('nothing'); return; }
        setProblem(null);
        save.mutate();
    };

    return (
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
                <div className="flex flex-col gap-2">
                    <label htmlFor="edit-idol-name" className={FIELD_LABEL_CLASS}>{t('name')}</label>
                    <Input
                        id="edit-idol-name"
                        value={name}
                        maxLength={IDOL_NAME_MAX}
                        onChange={(e) => { setName(e.target.value); setProblem(null); }}
                        aria-invalid={problem === 'required' ? true : undefined}
                        className="h-12"
                        autoComplete="off"
                    />
                    {problem === 'required' && <p role="alert" className={ERROR_TEXT_CLASS}>{tFields('required')}</p>}
                </div>
                <AdminSwitch
                    id="edit-idol-public"
                    checked={isPublic}
                    onChange={(next) => { setIsPublic(next); setProblem(null); }}
                    label={t('isPublic')}
                    hint={t('isPublicHint')}
                />
                {problem === 'nothing' && <p role="alert" className={ERROR_TEXT_CLASS}>{tErrors('nothingToUpdate')}</p>}
                {save.isError && <p role="alert" className={ERROR_TEXT_CLASS}>{errorText(save.error)}</p>}
            </div>
            <SheetFooter className="border-t-2 border-ink px-6 py-4">
                <Button type="submit" size="lg" disabled={save.isPending} className="w-full">
                    {save.isPending ? (
                        <>
                            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                            {tCommon('saving')}
                        </>
                    ) : tCommon('save')}
                </Button>
            </SheetFooter>
        </form>
    );
}
