'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Save, Loader2, Eye, EyeOff, Image as ImageIcon } from 'lucide-react';
import { orgApi } from '@/lib/api-hooks';
import { uploadImage } from '@/lib/supabase-storage';
import { toast } from 'sonner';

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
    const [description, setDescription] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (org) {
            setDescription(org.description || '');
            setAvatarUrl(org.avatarUrl || '');
            setCoverUrl(org.coverUrl || '');
            setIsPublic(org.isPublic);
        }
    }, [org]);

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

    return (
        <div className="hud-card hud-brackets flex flex-col gap-8 rounded-none p-8">
            <div className="flex items-center justify-between">
                <h2 className="font-space-mono text-[16px] uppercase tracking-[2px] text-[#737373]">
                    {t('title')}
                </h2>
                {/* Visibility toggle */}
                <button
                    onClick={() => setIsPublic(!isPublic)}
                    className={`flex cursor-pointer items-center gap-2 rounded-none border px-4 py-2 font-space-mono text-[11px] uppercase tracking-[1px] transition-colors duration-150 ${
                        isPublic
                            ? 'border-[var(--color-tactical-acid)] text-[var(--color-tactical-acid)]'
                            : 'border-[#737373] text-[#737373]'
                    }`}
                >
                    {isPublic ? <Eye size={13} /> : <EyeOff size={13} />}
                    {isPublic ? t('publicOn') : t('publicOff')}
                </button>
            </div>

            <p className="font-space-mono text-[11px] text-[#4A4A4A]">
                {t('subtitle')}
            </p>

            {/* ── Cover ── */}
            <div className="flex flex-col gap-2">
                <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                    {t('cover')}
                </label>
                <div className="group relative h-40 w-full overflow-hidden border border-[#2A2A2A] bg-[#0A0A0A]">
                    {coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={coverUrl} alt={t('cover')} className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon size={24} className="text-[#2A2A2A]" />
                        </div>
                    )}
                    <button
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploading !== null}
                        className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
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
            <div className="flex items-end gap-6">
                <div className="flex flex-col gap-2">
                    <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                        {t('avatar')}
                    </label>
                    <div className="group relative h-24 w-24 overflow-hidden border border-[#2A2A2A] bg-[#0A0A0A]">
                        {avatarUrl || org.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={avatarUrl || org.logoUrl || ''}
                                alt={t('avatar')}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="font-sora text-2xl font-black text-white">
                                    {org.name[0]?.toUpperCase() ?? '?'}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={uploading !== null}
                            className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
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
                    <p className="pb-2 font-space-mono text-[11px] text-[#4A4A4A]">
                        {t('avatarFallbackHint')}
                    </p>
                )}
            </div>

            {/* ── Description ── */}
            <div className="flex flex-col gap-2">
                <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                    {t('description')}
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('descriptionPlaceholder')}
                    maxLength={2000}
                    rows={4}
                    className="resize-none rounded-none border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 font-sora text-sm text-white outline-none transition-colors duration-150 placeholder:text-[#4A4A4A] focus:border-[var(--color-tactical-acid)] focus:ring-1 focus:ring-[var(--color-tactical-acid)]"
                />
                <span className="self-end font-space-mono text-[10px] text-[#4A4A4A]">
                    {description.length}/2000
                </span>
            </div>

            {/* ── Save ── */}
            <div className="flex justify-end border-t border-[#1E1E1E] pt-6">
                <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || uploading !== null}
                    className="btn-tactical flex cursor-pointer items-center gap-2 rounded-none px-8 py-3 font-space-mono text-xs font-bold uppercase tracking-[2px] disabled:opacity-50"
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
                </button>
            </div>
        </div>
    );
}
