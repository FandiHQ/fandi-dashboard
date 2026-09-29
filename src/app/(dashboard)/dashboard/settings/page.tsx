'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, Trash2, Save, Loader2, Shield, Building2, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { profileApi } from '@/lib/api-hooks';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArtistProfileCard } from '@/components/settings/artist-profile-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SettingsPage() {
    const { user, organization, memberRole, refreshUser } = useAuth();
    const t = useTranslations('settings');
    const tTeam = useTranslations('team');

    // ── Form state ──
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync form when user changes (e.g., after refreshUser)
    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || '');
            setPhone(user.phone || '');
            setAvatarUrl(user.avatarUrl || '');
        }
    }, [user]);

    // ── Avatar upload ──
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate client-side
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) {
            toast.error(t('errorUploading'));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error(t('uploadHint'));
            return;
        }

        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const filePath = `${user!.supabaseId}/avatar.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Append cache-buster so the browser fetches the new image
            const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
            setAvatarUrl(publicUrl);

            // Persist immediately
            await profileApi.update({ avatarUrl: publicUrl });
            await refreshUser();
            toast.success(t('profileUpdated'));
        } catch {
            toast.error(t('errorUploading'));
        } finally {
            setUploading(false);
            // Reset input so same file can be selected again
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAvatar = async () => {
        setAvatarUrl('');
        try {
            await profileApi.update({ avatarUrl: '' });
            await refreshUser();
        } catch {
            toast.error(t('errorUpdating'));
        }
    };

    // ── Save profile ──
    const handleSave = async () => {
        setSaving(true);
        try {
            await profileApi.update({
                displayName: displayName.trim(),
                phone: phone.trim(),
            });
            await refreshUser();
            toast.success(t('profileUpdated'));
        } catch {
            toast.error(t('errorUpdating'));
        } finally {
            setSaving(false);
        }
    };

    // ── Member since ──
    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString(undefined, {
              month: 'long',
              year: 'numeric',
          })
        : '—';

    // Initials fallback
    const initials = (displayName || user?.email || '?')
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const FIELD_LABEL = 'label-mono text-[11px] text-muted-white';

    return (
        <div className="flex flex-col gap-8">
            {/* ── Page Header ── */}
            <div className="flex flex-col gap-2">
                <h1 className="font-hero text-[44px] text-white lg:text-[48px]">
                    {t('title')}
                </h1>
                <p className="label-mono text-[11px] text-lilac">
                    {t('subtitle')}
                </p>
            </div>

            {/* ── Profile Section ── */}
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                {/* Left Column: Avatar Card */}
                <div className="block-white flex flex-col items-center gap-5 p-7">
                    {/* Avatar */}
                    <div className="group relative">
                        <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-ink bg-tier-vip shadow-ext-sm">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <span className="font-display text-4xl text-ink">
                                        {initials}
                                    </span>
                                </div>
                            )}

                            {/* Upload overlay */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                aria-label={t('changeAvatar')}
                                className="absolute inset-0 flex cursor-pointer items-center justify-center bg-ink/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100"
                            >
                                {uploading ? (
                                    <Loader2 size={24} className="animate-spin text-white" />
                                ) : (
                                    <Camera size={24} className="text-white" />
                                )}
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />
                    </div>

                    {/* Avatar actions */}
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {t('changeAvatar')}
                        </Button>
                        {avatarUrl && (
                            <Button
                                variant="destructive"
                                size="icon-sm"
                                onClick={handleRemoveAvatar}
                                aria-label={t('removeAvatar')}
                            >
                                <Trash2 size={14} />
                            </Button>
                        )}
                    </div>
                    <p className="font-space-mono text-[10px] text-muted-white">
                        {t('uploadHint')}
                    </p>

                    {/* Metadata under avatar */}
                    <div className="flex w-full flex-col gap-3 border-t-2 border-line-white pt-5">
                        <div className="flex items-center gap-3">
                            <Shield size={14} className="text-muted-white" />
                            <span className="label-mono text-muted-white">
                                {t('role')}
                            </span>
                            <span className="label-mono ml-auto rounded-full border-2 border-ink bg-lilac px-2.5 py-0.5 font-bold text-ink">
                                {memberRole ? tTeam(`roles.${memberRole}`) : '—'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Building2 size={14} className="text-muted-white" />
                            <span className="label-mono text-muted-white">
                                {t('organization')}
                            </span>
                            <span className="ml-auto text-right text-[13px] font-extrabold text-ink">
                                {organization?.name || '—'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock size={14} className="text-muted-white" />
                            <span className="label-mono text-muted-white">
                                {t('memberSince')}
                            </span>
                            <span className="ml-auto font-space-mono text-[11px] text-ink">
                                {memberSince}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Profile Form */}
                <div className="block-white flex flex-col overflow-hidden">
                    <div className="border-b-2 border-ink px-6 py-4">
                        <h2 className="font-display text-[17px]">
                            {t('profile')}
                        </h2>
                    </div>

                    <div className="flex flex-col gap-5 px-6 py-6">
                        {/* Display Name */}
                        <div className="flex flex-col gap-2">
                            <label className={FIELD_LABEL}>
                                {t('displayName')}
                            </label>
                            <Input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder={t('displayNamePlaceholder')}
                                className="h-12"
                            />
                        </div>

                        {/* Email (read-only) */}
                        <div className="flex flex-col gap-2">
                            <label className={FIELD_LABEL}>
                                {t('email')}
                            </label>
                            <div className="flex h-12 items-center gap-3 rounded-[10px] border-2 border-line-white bg-line-white px-3">
                                <span className="truncate text-sm font-semibold text-muted-white">
                                    {user?.email || '—'}
                                </span>
                                <span className="label-mono ml-auto shrink-0 rounded-full border-2 border-muted-white px-2 py-0.5 text-[9px] text-muted-white">
                                    {t('readOnly')}
                                </span>
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="flex flex-col gap-2">
                            <label className={FIELD_LABEL}>
                                {t('phone')}
                            </label>
                            <Input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder={t('phonePlaceholder')}
                                className="h-12"
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="mt-auto flex justify-end border-t-2 border-line-white px-6 py-4">
                        <Button
                            size="lg"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    {t('saving')}
                                </>
                            ) : (
                                <>
                                    <Save size={14} />
                                    {t('saveChanges')}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Artist Public Profile (Step 7.2, owner only) ── */}
            {memberRole === 'owner' && <ArtistProfileCard />}
        </div>
    );
}
