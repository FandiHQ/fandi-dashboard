'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, Trash2, Save, Loader2, Shield, Building2, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { profileApi } from '@/lib/api-hooks';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function SettingsPage() {
    const { user, organization, memberRole, refreshUser } = useAuth();
    const t = useTranslations('settings');

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

    // ── Role badge color ──
    const roleBadgeColor: Record<string, string> = {
        owner: 'border-[var(--color-tactical-magenta)] text-[var(--color-tactical-magenta)]',
        admin: 'border-[#6C63FF] text-[#6C63FF]',
        staff: 'border-[var(--color-tactical-acid)] text-[var(--color-tactical-acid)]',
        viewer: 'border-[#737373] text-[#737373]',
    };

    // Initials fallback
    const initials = (displayName || user?.email || '?')
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <div className="flex flex-col gap-12">
            {/* ── Page Header ── */}
            <div className="flex flex-col gap-2">
                <h1 className="animate-glitch font-sora text-[64px] font-black leading-none tracking-[-3px] text-white">
                    {t('title')}
                </h1>
                <p className="font-space-mono text-sm uppercase tracking-[2px] text-[#737373]">
                    {t('subtitle')}
                </p>
            </div>

            {/* ── Profile Section ── */}
            <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
                {/* Left Column: Avatar Card */}
                <div className="hud-card hud-brackets flex flex-col items-center gap-6 rounded-none p-8">
                    {/* Avatar */}
                    <div className="group relative">
                        <div className="hud-brackets hud-brackets-hover relative h-32 w-32 overflow-hidden bg-[#1A1A1A]">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <span className="font-sora text-4xl font-black text-white">
                                        {initials}
                                    </span>
                                </div>
                            )}

                            {/* Upload overlay */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
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
                    <div className="flex gap-3">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="cursor-pointer rounded-none border border-[#2A2A2A] bg-transparent px-4 py-2 font-space-mono text-xs uppercase tracking-[1px] text-white transition-colors duration-150 hover:bg-[#1A1A1A] disabled:opacity-50"
                        >
                            {t('changeAvatar')}
                        </button>
                        {avatarUrl && (
                            <button
                                onClick={handleRemoveAvatar}
                                className="cursor-pointer rounded-none border border-[#2A2A2A] bg-transparent px-3 py-2 text-[#FF3366] transition-colors duration-150 hover:bg-[#1A1A1A]"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                    <p className="font-space-mono text-[11px] text-[#4A4A4A]">
                        {t('uploadHint')}
                    </p>

                    {/* Metadata under avatar */}
                    <div className="flex w-full flex-col gap-3 border-t border-[#1E1E1E] pt-6">
                        <div className="flex items-center gap-3">
                            <Shield size={14} className="text-[#4A4A4A]" />
                            <span className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#4A4A4A]">
                                {t('role')}
                            </span>
                            <span
                                className={`ml-auto rounded-none border px-3 py-0.5 font-space-mono text-[11px] uppercase tracking-[1px] ${roleBadgeColor[memberRole || ''] || roleBadgeColor.viewer}`}
                            >
                                {memberRole || '—'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Building2 size={14} className="text-[#4A4A4A]" />
                            <span className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#4A4A4A]">
                                {t('organization')}
                            </span>
                            <span className="ml-auto font-sora text-xs font-semibold text-white">
                                {organization?.name || '—'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock size={14} className="text-[#4A4A4A]" />
                            <span className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#4A4A4A]">
                                {t('memberSince')}
                            </span>
                            <span className="ml-auto font-space-mono text-xs text-[#737373]">
                                {memberSince}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Profile Form */}
                <div className="hud-card hud-brackets flex flex-col gap-8 rounded-none p-8">
                    <h2 className="font-space-mono text-[16px] uppercase tracking-[2px] text-[#737373]">
                        {t('profile')}
                    </h2>

                    <div className="flex flex-col gap-6">
                        {/* Display Name */}
                        <div className="flex flex-col gap-2">
                            <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                {t('displayName')}
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder={t('displayNamePlaceholder')}
                                className="rounded-none border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 font-sora text-sm text-white outline-none transition-colors duration-150 placeholder:text-[#4A4A4A] focus:border-[var(--color-tactical-acid)] focus:ring-1 focus:ring-[var(--color-tactical-acid)]"
                            />
                        </div>

                        {/* Email (read-only) */}
                        <div className="flex flex-col gap-2">
                            <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                {t('email')}
                            </label>
                            <div className="flex items-center rounded-none border border-[#1E1E1E] bg-[#0A0A0A] px-4 py-3">
                                <span className="font-sora text-sm text-[#4A4A4A]">
                                    {user?.email || '—'}
                                </span>
                                <span className="ml-auto rounded-none border border-[#2A2A2A] px-2 py-0.5 font-space-mono text-[9px] uppercase tracking-[1px] text-[#4A4A4A]">
                                    read-only
                                </span>
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="flex flex-col gap-2">
                            <label className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#737373]">
                                {t('phone')}
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder={t('phonePlaceholder')}
                                className="rounded-none border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 font-sora text-sm text-white outline-none transition-colors duration-150 placeholder:text-[#4A4A4A] focus:border-[var(--color-tactical-acid)] focus:ring-1 focus:ring-[var(--color-tactical-acid)]"
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end border-t border-[#1E1E1E] pt-6">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-tactical flex cursor-pointer items-center gap-2 rounded-none px-8 py-3 font-space-mono text-xs font-bold uppercase tracking-[2px] disabled:opacity-50"
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
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
