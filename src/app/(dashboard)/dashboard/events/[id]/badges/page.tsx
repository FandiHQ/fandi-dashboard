'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Plus, Loader2, Award, Pencil, Trash2,
    Eye, EyeOff,
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { badgeTemplatesApi } from '@/lib/api-hooks';
import type { BadgeTemplate, BadgeCategory, BadgeApplicableTo } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageUpload } from '@/components/ui/image-upload';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from '@/components/ui/tooltip';

// ─── Types ──────────────────────────────────────────────────
interface FormState {
    name: string;
    description: string;
    imageUrl: string | null;
    category: BadgeCategory;
    applicableTo: BadgeApplicableTo;
}

const emptyForm: FormState = {
    name: '',
    description: '',
    imageUrl: null,
    category: 'participation',
    applicableTo: 'experience',
};

// ─── Filter Bar ─────────────────────────────────────────────
function FilterBar({
    category,
    applicableTo,
    onCategoryChange,
    onApplicableChange,
    counts,
    t,
}: {
    category: BadgeCategory | 'all';
    applicableTo: BadgeApplicableTo | 'all';
    onCategoryChange: (v: BadgeCategory | 'all') => void;
    onApplicableChange: (v: BadgeApplicableTo | 'all') => void;
    counts: Record<BadgeCategory | 'all', number>;
    t: ReturnType<typeof useTranslations>;
}) {
    const pills: { value: BadgeCategory | 'all'; label: string }[] = [
        { value: 'all', label: t('filterAll') },
        { value: 'participation', label: t('categories.participation') },
        { value: 'winner', label: t('categories.winner') },
    ];

    return (
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('category')}>
                {pills.map((pill) => {
                    const active = category === pill.value;
                    return (
                        <button
                            key={pill.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onCategoryChange(pill.value)}
                            className={`cursor-pointer rounded-full border-2 px-3 py-1.5 text-[13px] transition-colors ${active
                                ? 'border-ink bg-white font-extrabold text-ink'
                                : 'border-white/40 font-bold text-white hover:border-white'
                            }`}
                        >
                            {pill.label} · {counts[pill.value]}
                        </button>
                    );
                })}
            </div>

            <Select value={applicableTo} onValueChange={(v) => onApplicableChange(v as BadgeApplicableTo | 'all')}>
                <SelectTrigger className="w-[190px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">
                        {t('allTypes')}
                    </SelectItem>
                    <SelectItem value="experience">
                        {t('applicableOptions.experience')}
                    </SelectItem>
                    <SelectItem value="auction">
                        {t('applicableOptions.auction')}
                    </SelectItem>
                </SelectContent>
            </Select>

            <span className="label-mono text-lilac">{t('subtitle')}</span>
        </div>
    );
}

// ─── Badge Tile ─────────────────────────────────────────────
function BadgeCard({
    badge,
    onEdit,
    onDelete,
    isWriteRole,
    t,
}: {
    badge: BadgeTemplate;
    onEdit: () => void;
    onDelete: () => void;
    isWriteRole: boolean;
    t: ReturnType<typeof useTranslations>;
}) {
    const categoryLabel = t(`categories.${badge.category}`);
    const applicableLabel = t(`applicableOptions.${badge.applicableTo}`);

    return (
        <div
            className={`relative flex flex-col overflow-hidden rounded-2xl border-2 border-ink bg-white text-ink shadow-ext-sm ${badge.isActive ? '' : 'opacity-60'}`}
        >
            {/* Inactive pill */}
            {!badge.isActive && (
                <span className="label-mono absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-2 py-0.5 font-bold text-ink">
                    <EyeOff size={10} />
                    {t('inactive')}
                </span>
            )}

            {/* Art 3:4 */}
            <div className="relative aspect-[3/4] w-full overflow-hidden border-b-2 border-ink bg-ink">
                {badge.imageUrl ? (
                    <Image
                        src={badge.imageUrl}
                        alt={badge.name}
                        fill
                        unoptimized
                        className="object-cover object-top"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <Award size={48} className="text-dash-ink" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col gap-2 px-3.5 py-3">
                <h3 className="truncate text-[16px] font-black leading-tight">
                    {badge.name}
                </h3>

                {badge.description && (
                    <p className="line-clamp-2 text-[12.5px] leading-snug text-muted-white">
                        {badge.description}
                    </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <span
                        className={`label-mono rounded-full border-2 border-ink px-2 py-0.5 text-[9px] font-bold ${badge.category === 'winner' ? 'bg-lime' : 'bg-tier-vip'}`}
                    >
                        {categoryLabel}
                    </span>
                    <span className="font-space-mono text-[10px] uppercase text-muted-white">
                        {applicableLabel}
                    </span>
                </div>

                {isWriteRole && (
                    <div className="flex items-center justify-end gap-2 border-t-2 border-line-white pt-2.5">
                        <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={t('edit')}
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        >
                            <Pencil size={14} />
                        </Button>
                        <Button
                            variant="destructive"
                            size="icon-sm"
                            aria-label={t('deleteLabel')}
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        >
                            <Trash2 size={14} />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Create New Placeholder Tile ────────────────────────────
function CreatePlaceholderCard({ onClick, t }: { onClick: () => void; t: ReturnType<typeof useTranslations> }) {
    return (
        <button
            onClick={onClick}
            className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/40 p-8 text-white transition-colors hover:border-white"
        >
            <Plus size={32} />
            <span className="label-mono text-[11px] font-bold">
                {t('create')}
            </span>
        </button>
    );
}

// ─── Badge Form (right side panel) ──────────────────────────
function BadgeFormDialog({
    open,
    onOpenChange,
    editing,
    form,
    setForm,
    onSubmit,
    onToggleActive,
    submitting,
    t,
    tCommon,
    eventId,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    editing: BadgeTemplate | null;
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
    onSubmit: () => void;
    onToggleActive: () => void;
    submitting: boolean;
    t: ReturnType<typeof useTranslations>;
    tCommon: ReturnType<typeof useTranslations>;
    eventId: string;
}) {
    const isValid = form.name.trim().length > 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="gap-0 p-0">
                {/* Header */}
                <SheetHeader className="shrink-0 border-b-2 border-line-white px-6 py-5 pr-16">
                    <SheetTitle className="text-[26px]">
                        {editing ? t('edit') : t('create')}
                    </SheetTitle>
                    <SheetDescription className="label-mono text-muted-white">
                        {t('subtitle')}
                    </SheetDescription>
                </SheetHeader>

                {/* Scrollable content */}
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <label className="label-mono font-bold text-muted-white">
                            {t('name')} *
                        </label>
                        <Input
                            value={form.name}
                            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={t('form.namePlaceholder')}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label className="label-mono font-bold text-muted-white">
                            {t('description')}
                        </label>
                        <Textarea
                            value={form.description}
                            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder={t('form.descriptionPlaceholder')}
                            rows={3}
                            className="resize-none"
                        />
                    </div>

                    {/* Image */}
                    <div className="space-y-1.5">
                        <label className="label-mono font-bold text-muted-white">
                            {t('image')}
                        </label>
                        <ImageUpload
                            value={form.imageUrl}
                            onChange={(url) => setForm(prev => ({ ...prev, imageUrl: url }))}
                            folder={`badges/${eventId}`}
                            aspect="portrait"
                            enableCrop
                        />
                        <p className="font-space-mono text-[10px] text-muted-white">
                            {t('form.imageHint')}
                        </p>
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                        <label className="label-mono font-bold text-muted-white">
                            {t('category')} *
                        </label>
                        <Select
                            value={form.category}
                            onValueChange={(v) => setForm(prev => ({ ...prev, category: v as BadgeCategory }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="participation">
                                    {t('categories.participation')}
                                </SelectItem>
                                <SelectItem value="winner">
                                    {t('categories.winner')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Applicable To */}
                    <div className="space-y-1.5">
                        <label className="label-mono font-bold text-muted-white">
                            {t('applicableTo')} *
                        </label>
                        <Select
                            value={form.applicableTo}
                            onValueChange={(v) => setForm(prev => ({ ...prev, applicableTo: v as BadgeApplicableTo }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="experience">
                                    {t('applicableOptions.experience')}
                                </SelectItem>
                                <SelectItem value="auction">
                                    {t('applicableOptions.auction')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Sticky footer */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-t-2 border-ink px-6 py-4">
                    <div className="flex items-center gap-2">
                        {editing && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant={editing.isActive ? 'destructive' : 'outline'}
                                            size="sm"
                                            onClick={onToggleActive}
                                            disabled={submitting}
                                        >
                                            {editing.isActive ? <EyeOff size={12} /> : <Eye size={12} />}
                                            {editing.isActive ? t('deactivate') : t('activate')}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[240px] py-3 pl-3 pr-4 font-sans text-[12px] leading-relaxed text-muted-ink">
                                        {editing.isActive
                                            ? t.rich('form.deactivateHint', { b: (chunks) => <strong className="text-alert">{chunks}</strong> })
                                            : t.rich('form.activateHint', { b: (chunks) => <strong className="text-lime">{chunks}</strong> })}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            {tCommon('cancel')}
                        </Button>
                        <Button
                            type="button"
                            onClick={onSubmit}
                            disabled={!isValid || submitting}
                        >
                            {submitting && <Loader2 size={12} className="animate-spin" />}
                            {t('save')}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

// ─── Main Page ──────────────────────────────────────────────
export default function BadgesPage() {
    const { id: eventId } = useParams<{ id: string }>();
    const { memberRole } = useAuth();
    const t = useTranslations('badges');
    const tCommon = useTranslations('common');
    const qc = useQueryClient();
    const isWriteRole = memberRole === 'owner' || memberRole === 'admin';

    // ── State ──
    const [filterCategory, setFilterCategory] = useState<BadgeCategory | 'all'>('all');
    const [filterApplicable, setFilterApplicable] = useState<BadgeApplicableTo | 'all'>('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<BadgeTemplate | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [deleteTarget, setDeleteTarget] = useState<BadgeTemplate | null>(null);

    // ── Query ──
    const { data: badges, isLoading, error } = useQuery({
        queryKey: ['badge-templates', eventId],
        queryFn: () => badgeTemplatesApi.list(eventId),
        enabled: !!eventId,
    });

    // ── Mutations ──
    const createMutation = useMutation({
        mutationFn: (dto: Parameters<typeof badgeTemplatesApi.create>[1]) =>
            badgeTemplatesApi.create(eventId, dto),
        onSuccess: () => {
            toast.success(t('created'));
            qc.invalidateQueries({ queryKey: ['badge-templates', eventId] });
            closeDialog();
        },
        onError: () => toast.error(tCommon('error')),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof badgeTemplatesApi.update>[1] }) =>
            badgeTemplatesApi.update(id, dto),
        onSuccess: () => {
            toast.success(t('updated'));
            qc.invalidateQueries({ queryKey: ['badge-templates', eventId] });
            closeDialog();
        },
        onError: () => toast.error(tCommon('error')),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => badgeTemplatesApi.delete(id),
        onSuccess: () => {
            toast.success(t('deleted'));
            qc.invalidateQueries({ queryKey: ['badge-templates', eventId] });
            setDeleteTarget(null);
        },
        onError: (err: Error) => {
            // If the error is about awarded badges, show that message
            const msg = err.message?.includes('Cannot delete') || err.message?.includes('No se puede')
                ? t('cannotDelete')
                : tCommon('error');
            toast.error(msg);
            setDeleteTarget(null);
        },
    });

    // ── Handlers ──
    const openCreate = useCallback(() => {
        setEditing(null);
        setForm(emptyForm);
        setDialogOpen(true);
    }, []);

    const openEdit = useCallback((badge: BadgeTemplate) => {
        setEditing(badge);
        setForm({
            name: badge.name,
            description: badge.description ?? '',
            imageUrl: badge.imageUrl,
            category: badge.category,
            applicableTo: badge.applicableTo,
        });
        setDialogOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setDialogOpen(false);
        setEditing(null);
        setForm(emptyForm);
    }, []);

    const handleSubmit = useCallback(() => {
        const dto = {
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            imageUrl: form.imageUrl ?? undefined,
            category: form.category,
            applicableTo: form.applicableTo,
        };

        if (editing) {
            updateMutation.mutate({ id: editing.id, dto });
        } else {
            createMutation.mutate(dto);
        }
    }, [form, editing, createMutation, updateMutation]);

    const handleToggleActive = useCallback(() => {
        if (!editing) return;
        updateMutation.mutate({
            id: editing.id,
            dto: { isActive: !editing.isActive },
        });
    }, [editing, updateMutation]);

    // ── Filtering ──
    const filtered = (badges ?? []).filter((b) => {
        if (filterCategory !== 'all' && b.category !== filterCategory) return false;
        if (filterApplicable !== 'all' && b.applicableTo !== filterApplicable) return false;
        return true;
    });

    const submitting = createMutation.isPending || updateMutation.isPending;

    // ── Render ──
    // Display only: pill counts respect the "se otorga en" filter.
    const byApplicable = (badges ?? []).filter((b) => filterApplicable === 'all' || b.applicableTo === filterApplicable);
    const categoryCounts: Record<BadgeCategory | 'all', number> = {
        all: byApplicable.length,
        participation: byApplicable.filter((b) => b.category === 'participation').length,
        winner: byApplicable.filter((b) => b.category === 'winner').length,
    };

    return (
        <div className="flex flex-col gap-[18px]">
            {/* Filters + primary action */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <FilterBar
                    category={filterCategory}
                    applicableTo={filterApplicable}
                    onCategoryChange={setFilterCategory}
                    onApplicableChange={setFilterApplicable}
                    counts={categoryCounts}
                    t={t}
                />

                {isWriteRole && (
                    <Button onClick={openCreate} size="lg">
                        <Plus size={16} />
                        {t('create')}
                    </Button>
                )}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="grid grid-cols-2 gap-[22px] sm:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-3 rounded-2xl border-2 border-ink bg-white p-3.5 shadow-ext-sm">
                            <Skeleton className="aspect-[3/4] w-full bg-line-white" />
                            <Skeleton className="h-4 w-3/4 bg-line-white" />
                            <Skeleton className="h-3 w-1/2 bg-line-white" />
                        </div>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="block-white mx-auto flex max-w-md flex-col items-center gap-4 px-8 py-10 text-center">
                    <p className="label-mono text-[12px] font-bold text-alert-white">{tCommon('error')}</p>
                    <Button
                        variant="secondary"
                        onClick={() => qc.invalidateQueries({ queryKey: ['badge-templates', eventId] })}
                    >
                        {tCommon('retry')}
                    </Button>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && filtered.length === 0 && (
                <div className="block-quiet flex flex-col items-center gap-4 px-6 py-16 text-center">
                    <Award size={40} className="text-lilac" />
                    <p className="text-[15px] font-semibold text-white">{t('empty')}</p>
                    {isWriteRole && (
                        <Button variant="secondary" onClick={openCreate}>
                            <Plus size={14} />
                            {t('create')}
                        </Button>
                    )}
                </div>
            )}

            {/* Grid */}
            {!isLoading && !error && filtered.length > 0 && (
                <div className="grid grid-cols-2 gap-[22px] sm:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((badge) => (
                        <BadgeCard
                            key={badge.id}
                            badge={badge}
                            onEdit={() => openEdit(badge)}
                            onDelete={() => setDeleteTarget(badge)}
                            isWriteRole={isWriteRole}
                            t={t}
                        />
                    ))}

                    {/* Create placeholder */}
                    {isWriteRole && (
                        <CreatePlaceholderCard onClick={openCreate} t={t} />
                    )}
                </div>
            )}

            {/* Create/Edit side panel */}
            <BadgeFormDialog
                open={dialogOpen}
                onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}
                editing={editing}
                form={form}
                setForm={setForm}
                onSubmit={handleSubmit}
                onToggleActive={handleToggleActive}
                submitting={submitting}
                t={t}
                tCommon={tCommon}
                eventId={eventId}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('confirmDelete')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('confirmDeleteDesc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {tCommon('cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : (
                                tCommon('delete')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
