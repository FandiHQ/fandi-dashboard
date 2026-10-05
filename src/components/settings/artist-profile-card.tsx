'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Save, Loader2, Eye, EyeOff, Image as ImageIcon } from 'lucide-react';
import { orgApi } from '@/lib/api-hooks';
import { uploadImage } from '@/lib/supabase-storage';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * Step 7.2 — Artist public profile editor (owner only).
 * Edits the fan-facing content: description, avatar, cover, is_public.
 * Persists via PUT /dashboard/organization.
 */
export function ArtistProfileCard() {
    const t = useTranslations('artistProfile');
    const queryClient = useQueryClient();

    const { data: org, isLoading } = useQuery({
        queryKey: ['organization'],
        queryFn: orgApi.get,
    });

    // ── Form state ──
    const [description, setDescription] = useState(org?.description || '');
    const [avatarUrl, setAvatarUrl] = useState(org?.avatarUrl || '');
    const [coverUrl, setCoverUrl] = useState(org?.coverUrl || '');
    const [isPublic, setIsPublic] = useState(org?.isPublic ?? true);
    const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Refresh drafts only when the query publishes a new organization object.
    const [syncedOrg, setSyncedOrg] = useState(org);
    if (org !== syncedOrg) {
        setSyncedOrg(org);
        if (org) {
            setDescription(org.description || '');
            setAvatarUrl(org.avatarUrl || '');
            setCoverUrl(org.coverUrl || '');
            setIsPublic(org.isPublic);
        }
    }

    const saveMutation = useMutation({
        mutationFn: () =>
            orgApi.update({
                description: description.trim(),
                ...(avatarUrl ? { avatarUrl } : {}),
                ...(coverUrl ? { coverUrl } : {}),
                isPublic,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['organization'] });
            toast.success(t('saved'));
        },
        onError: () => toast.error(t('errorSaving')),
    });

    const handleUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        kind: 'avatar' | 'cover',
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
            toast.error(t('uploadHint'));
            return;
        }
        setUploading(kind);
        try {
            const url = await uploadImage(file, 'artist-profile');
            if (kind === 'avatar') setAvatarUrl(url);
            else setCoverUrl(url);
        } catch {
            toast.error(t('errorUploading'));
        } finally {
            setUploading(null);
            e.target.value = '';
        }
    };

    if (isLoading || !org) return null;

    const FIELD_LABEL = 'label-mono text-[11px] text-muted-white';

    return (
        <div className="block-white flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-6 py-4">
                <div className="flex flex-col gap-1">
                    <h2 className="font-display text-[17px]">
                        {t('title')}
                    </h2>
                    <p className="text-[13px] text-muted-white">
                        {t('subtitle')}
                    </p>
                </div>
                {/* Visibility toggle */}
                <button
                    type="button"
                    onClick={() => setIsPublic(!isPublic)}
                    aria-pressed={isPublic}
                    className={`label-mono flex min-h-9 cursor-pointer items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-[11px] font-bold transition-colors duration-150 ${
                        isPublic
                            ? 'border-ink bg-ink text-white'
                            : 'border-dashed border-muted-white bg-white text-muted-white'
                    }`}
                >
                    {isPublic ? <Eye size={13} /> : <EyeOff size={13} />}
                    {isPublic ? t('publicOn') : t('publicOff')}
                </button>
            </div>

            <div className="flex flex-col gap-6 px-6 py-6">
                {/* ── Cover ── */}
                <div className="flex flex-col gap-2">
                    <label className={FIELD_LABEL}>
                        {t('cover')}
                    </label>
                    <div className="group relative h-40 w-full overflow-hidden rounded-[12px] border-2 border-ink bg-line-white">
                        {coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={coverUrl} alt={t('cover')} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <ImageIcon size={24} className="text-muted-white" />
                            </div>
                        )}
                        <button
                            onClick={() => coverInputRef.current?.click()}
                            disabled={uploading !== null}
                            aria-label={t('cover')}
                            className="absolute inset-0 flex cursor-pointer items-center justify-center bg-ink/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100"
                        >
                            {uploading === 'cover' ? (
                                <Loader2 size={20} className="animate-spin text-white" />
                            ) : (
                                <Camera size={20} className="text-white" />
                            )}
                        </button>
                    </div>
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => void handleUpload(e, 'cover')}
                    />
                </div>

                {/* ── Avatar ── */}
                <div className="flex items-end gap-5">
                    <div className="flex flex-col gap-2">
                        <label className={FIELD_LABEL}>
                            {t('avatar')}
                        </label>
                        <div className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-ink bg-tier-vip shadow-ext-sm">
                            {avatarUrl || org.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={avatarUrl || org.logoUrl || ''}
                                    alt={t('avatar')}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <span className="font-display text-2xl text-ink">
                                        {org.name[0]?.toUpperCase() ?? '?'}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={uploading !== null}
                                aria-label={t('avatar')}
                                className="absolute inset-0 flex cursor-pointer items-center justify-center bg-ink/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100"
                            >
                                {uploading === 'avatar' ? (
                                    <Loader2 size={18} className="animate-spin text-white" />
                                ) : (
                                    <Camera size={18} className="text-white" />
                                )}
                            </button>
                        </div>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => void handleUpload(e, 'avatar')}
                        />
                    </div>
                    {!avatarUrl && (
                        <p className="pb-2 text-[13px] text-muted-white">
                            {t('avatarFallbackHint')}
                        </p>
                    )}
                </div>

                {/* ── Description ── */}
                <div className="flex flex-col gap-2">
                    <label className={FIELD_LABEL}>
                        {t('description')}
                    </label>
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('descriptionPlaceholder')}
                        maxLength={2000}
                        rows={4}
                        className="resize-none"
                    />
                    <span className="self-end font-space-mono text-[10px] text-muted-white tabular">
                        {description.length}/2000
                    </span>
                </div>
            </div>

            {/* ── Save ── */}
            <div className="flex justify-end border-t-2 border-line-white px-6 py-4">
                <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || uploading !== null}
                >
                    {saveMutation.isPending ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            {t('saving')}
                        </>
                    ) : (
                        <>
                            <Save size={14} />
                            {t('save')}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
