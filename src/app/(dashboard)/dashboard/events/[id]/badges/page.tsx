'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Plus, Loader2, Award, Pencil, Trash2, X,
    Eye, EyeOff, Sparkles, Shield, Info,
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { badgeTemplatesApi } from '@/lib/api-hooks';
import type { BadgeTemplate, BadgeCategory, BadgeApplicableTo } from '@/types/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageUpload } from '@/components/ui/image-upload';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
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
import { motion, AnimatePresence } from 'framer-motion';

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
    t,
}: {
    category: BadgeCategory | 'all';
    applicableTo: BadgeApplicableTo | 'all';
    onCategoryChange: (v: BadgeCategory | 'all') => void;
    onApplicableChange: (v: BadgeApplicableTo | 'all') => void;
    t: ReturnType<typeof useTranslations>;
}) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <Select value={category} onValueChange={(v) => onCategoryChange(v as BadgeCategory | 'all')}>
                <SelectTrigger className="w-[180px] rounded-none border-[#1E1E1E] bg-[#0A0A0A] font-space-mono text-xs uppercase tracking-[1px] text-white">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-[#1E1E1E] bg-[#0A0A0A]">
                    <SelectItem value="all" className="font-space-mono text-xs uppercase tracking-[1px]">
                        {t('allCategories')}
                    </SelectItem>
                    <SelectItem value="participation" className="font-space-mono text-xs uppercase tracking-[1px]">
                        {t('categories.participation')}
                    </SelectItem>
                    <SelectItem value="winner" className="font-space-mono text-xs uppercase tracking-[1px]">
                        {t('categories.winner')}
                    </SelectItem>
                </SelectContent>
            </Select>

            <Select value={applicableTo} onValueChange={(v) => onApplicableChange(v as BadgeApplicableTo | 'all')}>
                <SelectTrigger className="w-[180px] rounded-none border-[#1E1E1E] bg-[#0A0A0A] font-space-mono text-xs uppercase tracking-[1px] text-white">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-[#1E1E1E] bg-[#0A0A0A]">
                    <SelectItem value="all" className="font-space-mono text-xs uppercase tracking-[1px]">
                        {t('allTypes')}
                    </SelectItem>
                    <SelectItem value="experience" className="font-space-mono text-xs uppercase tracking-[1px]">
                        {t('applicableOptions.experience')}
                    </SelectItem>
                    <SelectItem value="auction" className="font-space-mono text-xs uppercase tracking-[1px]">
                        {t('applicableOptions.auction')}
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}

// ─── Badge Card ─────────────────────────────────────────────
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
    const [hovered, setHovered] = useState(false);

    const categoryColor = badge.category === 'winner' ? '#FFD700' : '#2D00F7';
    const categoryLabel = t(`categories.${badge.category}`);
    const applicableLabel = t(`applicableOptions.${badge.applicableTo}`);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`
                group relative flex flex-col overflow-hidden border transition-all duration-200
                ${badge.isActive
                    ? 'border-[#1E1E1E] bg-[#141414]'
                    : 'border-[#1E1E1E]/50 bg-[#0C0C0C] opacity-60'}
                ${hovered && badge.isActive
                    ? 'border-[#2D00F760] shadow-[0_0_30px_rgba(45,0,247,0.25)]'
                    : ''}
            `}
        >
            {/* Inactive overlay */}
            {!badge.isActive && (
                <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 bg-[#FF3366]/90 px-2 py-0.5">
                    <EyeOff size={10} className="text-white" />
                    <span className="font-space-mono text-[9px] font-medium uppercase tracking-[1px] text-white">
                        {t('inactive')}
                    </span>
                </div>
            )}

            {/* Image area */}
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#0A0A0A]">
                {badge.imageUrl ? (
                    <Image
                        src={badge.imageUrl}
                        alt={badge.name}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <Award
                            size={48}
                            className="text-[#2A2A2A] transition-colors duration-200 group-hover:text-[#2D00F7]"
                        />
                    </div>
                )}

                {/* Action overlay for write role */}
                {isWriteRole && (
                    <div className={`
                        absolute inset-0 flex items-end justify-end gap-2 p-3
                        bg-gradient-to-t from-black/80 via-transparent to-transparent
                        transition-opacity duration-200
                        ${hovered ? 'opacity-100' : 'opacity-0'}
                    `}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center border border-[#2A2A2A] bg-[#000000]/80 text-white transition-colors hover:border-[#2D00F7] hover:text-[#2D00F7]"
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center border border-[#2A2A2A] bg-[#000000]/80 text-white transition-colors hover:border-[#FF3366] hover:text-[#FF3366]"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Info section */}
            <div className="flex flex-1 flex-col gap-2 p-4">
                {/* Title with selective glitch on hover */}
                <h3
                    className={`
                        font-sora text-sm font-semibold text-white truncate
                        ${hovered && badge.isActive ? 'animate-glitch' : ''}
                    `}
                >
                    {badge.name}
                </h3>

                {badge.description && (
                    <p className="line-clamp-2 font-space-mono text-[11px] leading-relaxed text-[#6B6B6B]">
                        {badge.description}
                    </p>
                )}

                {/* Tags */}
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                    <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 font-space-mono text-[9px] font-medium uppercase tracking-[1px]"
                        style={{
                            backgroundColor: `${categoryColor}20`,
                            color: categoryColor,
                            border: `1px solid ${categoryColor}40`,
                        }}
                    >
                        {badge.category === 'winner' ? <Sparkles size={9} /> : <Shield size={9} />}
                        {categoryLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-0.5 font-space-mono text-[9px] font-medium uppercase tracking-[1px] text-[#737373]">
                        {applicableLabel}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Create New Placeholder Card ────────────────────────────
function CreatePlaceholderCard({ onClick, t }: { onClick: () => void; t: ReturnType<typeof useTranslations> }) {
    return (
        <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            onClick={onClick}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-[#1E1E1E] bg-[#0A0A0A] p-8 transition-all duration-200 hover:border-[#2D00F7] hover:bg-[#141414] aspect-[3/5]"
        >
            <Plus size={32} className="text-[#4A4A4A] transition-colors group-hover:text-[#2D00F7]" />
            <span className="font-space-mono text-xs uppercase tracking-[1px] text-[#4A4A4A]">
                {t('create')}
            </span>
        </motion.button>
    );
}

// ─── Badge Form Dialog ──────────────────────────────────────
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-[500px] rounded-none border border-[#1E1E1E] bg-[#0A0A0A] p-0 text-white [&>button]:text-white"
            >
                <div className="flex flex-col h-full max-h-[85vh]">
                    {/* Header */}
                    <DialogHeader className="shrink-0 border-b border-[#1E1E1E] px-6 py-5">
                        <DialogTitle className="font-sora text-lg font-bold text-white">
                            {editing ? t('edit') : t('create')}
                        </DialogTitle>
                        <DialogDescription className="font-space-mono text-xs text-[#6B6B6B]">
                            {t('subtitle')}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 fandi-scrollbar">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="font-space-mono text-[10px] font-medium uppercase tracking-[2px] text-[#A0A0A0]">
                                {t('name')} *
                            </label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Fan VIP Concierto"
                                className="rounded-none border-[#1E1E1E] bg-[#141414] text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7]"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <label className="font-space-mono text-[10px] font-medium uppercase tracking-[2px] text-[#A0A0A0]">
                                    {t('description')}
                                </label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button type="button" className="cursor-help text-[#2D00F7] transition-colors hover:text-white hover:drop-shadow-[0_0_8px_rgba(45,0,247,0.8)] focus:outline-none">
                                                <Info size={13} />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-[260px] rounded-none border-[#2D00F7] bg-[#020202] py-3 pl-3 pr-4 font-sora text-[12px] leading-relaxed text-[#A0A0A0] shadow-[0_0_20px_rgba(45,0,247,0.2)]">
                                            Esta descripción es lo que el <strong className="text-[#CCFF00]">fan verá</strong> al recibir su insignia en la app.
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <Textarea
                                value={form.description}
                                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Insignia para fans que participaron..."
                                rows={3}
                                className="rounded-none border-[#1E1E1E] bg-[#141414] text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] resize-none"
                            />
                        </div>

                        {/* Image */}
                        <div className="space-y-1.5">
                            <label className="font-space-mono text-[10px] font-medium uppercase tracking-[2px] text-[#A0A0A0]">
                                {t('image')}
                            </label>
                            <ImageUpload
                                value={form.imageUrl}
                                onChange={(url) => setForm(prev => ({ ...prev, imageUrl: url }))}
                                folder={`badges/${eventId}`}
                                aspect="portrait"
                                enableCrop
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                            <label className="font-space-mono text-[10px] font-medium uppercase tracking-[2px] text-[#A0A0A0]">
                                {t('category')} *
                            </label>
                            <Select
                                value={form.category}
                                onValueChange={(v) => setForm(prev => ({ ...prev, category: v as BadgeCategory }))}
                            >
                                <SelectTrigger className="rounded-none border-[#1E1E1E] bg-[#141414] font-space-mono text-xs text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-none border-[#1E1E1E] bg-[#0A0A0A]">
                                    <SelectItem value="participation" className="font-space-mono text-xs">
                                        {t('categories.participation')}
                                    </SelectItem>
                                    <SelectItem value="winner" className="font-space-mono text-xs">
                                        {t('categories.winner')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Applicable To */}
                        <div className="space-y-1.5">
                            <label className="font-space-mono text-[10px] font-medium uppercase tracking-[2px] text-[#A0A0A0]">
                                {t('applicableTo')} *
                            </label>
                            <Select
                                value={form.applicableTo}
                                onValueChange={(v) => setForm(prev => ({ ...prev, applicableTo: v as BadgeApplicableTo }))}
                            >
                                <SelectTrigger className="rounded-none border-[#1E1E1E] bg-[#141414] font-space-mono text-xs text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-none border-[#1E1E1E] bg-[#0A0A0A]">
                                    <SelectItem value="experience" className="font-space-mono text-xs">
                                        {t('applicableOptions.experience')}
                                    </SelectItem>
                                    <SelectItem value="auction" className="font-space-mono text-xs">
                                        {t('applicableOptions.auction')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Sticky footer */}
                    <div className="shrink-0 flex items-center justify-between gap-3 border-t border-[#1E1E1E] px-6 py-4">
                        <div className="flex items-center gap-2">
                            {editing && (
                                <button
                                    type="button"
                                    onClick={onToggleActive}
                                    disabled={submitting}
                                    className={`flex cursor-pointer items-center gap-1.5 border px-3 py-2 font-space-mono text-[10px] font-medium uppercase tracking-[1px] transition-colors ${
                                        editing.isActive
                                            ? 'border-[#FF3366]/40 text-[#FF3366] hover:bg-[#FF3366]/10'
                                            : 'border-[#CCFF00]/40 text-[#CCFF00] hover:bg-[#CCFF00]/10'
                                    }`}
                                >
                                    {editing.isActive ? <EyeOff size={12} /> : <Eye size={12} />}
                                    {editing.isActive ? t('deactivate') : t('activate')}
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className="cursor-pointer border border-[#2A2A2A] px-4 py-2 font-space-mono text-[10px] font-medium uppercase tracking-[1px] text-white transition-colors hover:bg-[#141414]"
                            >
                                {tCommon('cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={onSubmit}
                                disabled={!isValid || submitting}
                                className="flex cursor-pointer items-center gap-2 bg-[#2D00F7] px-4 py-2 font-space-mono text-[10px] font-medium uppercase tracking-[1px] text-white transition-colors hover:bg-[#2400CC] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {submitting && <Loader2 size={12} className="animate-spin" />}
                                {t('save')}
                            </button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
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
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="font-sora text-2xl font-bold text-white tracking-[-0.5px]">
                        {t('title')}
                    </h2>
                    <p className="font-space-mono text-xs text-[#4A4A4A] tracking-[1px]">
                        {t('subtitle')}
                    </p>
                </div>

                {isWriteRole && (
                    <button
                        onClick={openCreate}
                        className="flex cursor-pointer items-center gap-2 bg-[#2D00F7] px-5 py-2.5 font-space-mono text-[10px] font-medium uppercase tracking-[1px] text-white transition-all duration-200 hover:bg-[#2400CC] hover:shadow-[0_0_20px_rgba(45,0,247,0.50)]"
                    >
                        <Plus size={14} />
                        {t('create')}
                    </button>
                )}
            </div>

            {/* Filters */}
            <FilterBar
                category={filterCategory}
                applicableTo={filterApplicable}
                onCategoryChange={setFilterCategory}
                onApplicableChange={setFilterApplicable}
                t={t}
            />

            {/* Loading */}
            {isLoading && (
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-3 border border-[#1E1E1E] bg-[#141414] p-4">
                            <Skeleton className="aspect-[3/4] w-full rounded-none" />
                            <Skeleton className="h-4 w-3/4 rounded-none" />
                            <Skeleton className="h-3 w-1/2 rounded-none" />
                        </div>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex flex-col items-center gap-4 py-20">
                    <p className="font-space-mono text-sm text-[#FF3366]">{tCommon('error')}</p>
                    <button
                        onClick={() => qc.invalidateQueries({ queryKey: ['badge-templates', eventId] })}
                        className="cursor-pointer border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2 font-space-mono text-[10px] uppercase tracking-[1px] text-white hover:bg-[#141414]"
                    >
                        {tCommon('retry')}
                    </button>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && filtered.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center gap-4 py-20"
                >
                    <Award size={48} className="text-[#2A2A2A]" />
                    <p className="font-sora text-base text-[#4A4A4A]">{t('empty')}</p>
                    {isWriteRole && (
                        <button
                            onClick={openCreate}
                            className="flex cursor-pointer items-center gap-2 border border-dashed border-[#2D00F7]/40 bg-[#2D00F7]/5 px-5 py-2.5 font-space-mono text-[10px] font-medium uppercase tracking-[1px] text-[#2D00F7] transition-all hover:bg-[#2D00F7]/10"
                        >
                            <Plus size={14} />
                            {t('create')}
                        </button>
                    )}
                </motion.div>
            )}

            {/* Grid */}
            {!isLoading && !error && filtered.length > 0 && (
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                    <AnimatePresence mode="popLayout">
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
                    </AnimatePresence>

                    {/* Create placeholder */}
                    {isWriteRole && (
                        <CreatePlaceholderCard onClick={openCreate} t={t} />
                    )}
                </div>
            )}

            {/* Create/Edit Dialog */}
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
                <AlertDialogContent className="rounded-none border border-[#1E1E1E] bg-[#0A0A0A] text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-sora text-lg font-bold text-white">
                            {t('confirmDelete')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="font-space-mono text-xs text-[#6B6B6B]">
                            {t('confirmDeleteDesc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-none border-[#2A2A2A] bg-transparent font-space-mono text-[10px] uppercase tracking-[1px] text-white hover:bg-[#141414]">
                            {tCommon('cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                            disabled={deleteMutation.isPending}
                            className="rounded-none bg-[#FF3366] font-space-mono text-[10px] uppercase tracking-[1px] text-white hover:bg-[#FF3366]/80"
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
