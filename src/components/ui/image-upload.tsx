'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { uploadImage } from '@/lib/supabase-storage';
import { ImageCropModal } from './image-crop-modal';

interface ImageUploadProps {
    value: string | null;
    onChange: (url: string | null) => void;
    folder: string;
    disabled?: boolean;
    className?: string;
    /** 'landscape' = 16:9, 'portrait' = 3:4, 'square' = 1:1.  Default: landscape */
    aspect?: 'landscape' | 'portrait' | 'square';
    /** If true, shows intermediate crop modal before uploading. Default: false */
    enableCrop?: boolean;
}

const aspectClasses = {
    landscape: 'aspect-[16/9]',
    portrait: 'aspect-[3/4]',
    square: 'aspect-square',
};

const aspectRatios: Record<string, number> = {
    landscape: 16 / 9,
    portrait: 3 / 4,
    square: 1,
};

export function ImageUpload({
    value,
    onChange,
    folder,
    disabled,
    className,
    aspect = 'landscape',
    enableCrop = false,
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    // Crop state
    const [pendingSrc, setPendingSrc] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Upload a final Blob (post-crop) or a raw File (no crop)
    const uploadBlob = useCallback(async (blob: Blob, ext: string) => {
        setUploading(true);
        try {
            const file = new File([blob], `upload.${ext}`, { type: blob.type });
            const url = await uploadImage(file, folder);
            onChange(url);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al subir imagen';
            toast.error(message);
        } finally {
            setUploading(false);
        }
    }, [folder, onChange]);

    const handleFile = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Solo se permiten imágenes');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Máximo 5MB');
            return;
        }

        if (enableCrop) {
            // Show crop modal with object URL
            const objectUrl = URL.createObjectURL(file);
            setPendingSrc(objectUrl);
        } else {
            uploadBlob(file, file.name.split('.').pop() || 'jpg');
        }
    }, [enableCrop, uploadBlob]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled || uploading) return;
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [disabled, uploading, handleFile]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
    }, [handleFile]);

    const handleCropDone = useCallback(async (blob: Blob) => {
        if (pendingSrc) URL.revokeObjectURL(pendingSrc);
        setPendingSrc(null);
        await uploadBlob(blob, 'webp');
    }, [pendingSrc, uploadBlob]);

    const handleCropCancel = useCallback(() => {
        if (pendingSrc) URL.revokeObjectURL(pendingSrc);
        setPendingSrc(null);
    }, [pendingSrc]);

    if (value) {
        return (
            <>
                <div className={`relative overflow-hidden rounded-[12px] border-2 border-ink bg-white ${aspectClasses[aspect]} ${className || ''}`}>
                    <Image
                        src={value}
                        alt="Preview"
                        fill
                        unoptimized
                        className="object-cover"
                    />
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        disabled={disabled}
                        aria-label="Quitar imagen"
                        className="absolute right-2 top-2 flex size-9 cursor-pointer items-center justify-center rounded-[10px] border-2 border-ink bg-white text-ink shadow-ext-sm transition-transform duration-75 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-45"
                    >
                        <X size={16} />
                    </button>
                </div>
                {enableCrop && (
                    <ImageCropModal
                        imageSrc={pendingSrc}
                        aspect={aspectRatios[aspect]}
                        onCancel={handleCropCancel}
                        onCropDone={handleCropDone}
                    />
                )}
            </>
        );
    }

    return (
        <>
            <div
                onDragOver={(e) => { e.preventDefault(); if (!disabled && !uploading) setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !disabled && !uploading && inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[12px] border-2 border-dashed px-4 text-center transition-colors duration-150 ${aspectClasses[aspect]} ${
                    dragOver
                        ? 'border-blue bg-line-white'
                        : 'border-ink bg-white hover:border-blue hover:bg-line-white'
                } ${disabled ? 'pointer-events-none opacity-50' : ''} ${className || ''}`}
            >
                <span className="flex size-12 items-center justify-center rounded-full border-2 border-ink bg-white text-ink shadow-ext-sm">
                    {uploading ? (
                        <Loader2 size={22} className="animate-spin text-blue" />
                    ) : (
                        <Upload size={22} />
                    )}
                </span>
                <span className="text-[13px] font-extrabold uppercase text-ink">
                    {uploading ? 'Subiendo...' : 'Arrastra o haz clic'}
                </span>
                <span className="font-space-mono text-[10px] uppercase text-muted-white">
                    JPG, PNG, WebP · máx. 5MB
                </span>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleChange}
                    className="hidden"
                />
            </div>

            {/* Crop modal shown before uploading */}
            {enableCrop && (
                <ImageCropModal
                    imageSrc={pendingSrc}
                    aspect={aspectRatios[aspect]}
                    onCancel={handleCropCancel}
                    onCropDone={handleCropDone}
                />
            )}
        </>
    );
}
