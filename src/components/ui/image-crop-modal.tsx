'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Loader2, Crop, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';

// ─── Utility: convert crop area to canvas blob ────────────────────────────────
async function getCroppedBlob(
    imageSrc: string,
    croppedAreaPixels: Area,
    mimeType = 'image/webp',
    quality = 0.9,
): Promise<Blob> {
    const image = await createImageBitmap(await (await fetch(imageSrc)).blob());

    const canvas = document.createElement('canvas');
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
            mimeType,
            quality,
        );
    });
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ImageCropModalProps {
    /** Raw image src to crop (data URL or object URL) */
    imageSrc: string | null;
    /** aspect ratio for the crop box: 3/4 for portrait badge, 1 for square */
    aspect?: number;
    onCancel: () => void;
    /** Called with the final cropped Blob (caller uploads it) */
    onCropDone: (blob: Blob) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ImageCropModal({
    imageSrc,
    aspect = 3 / 4,
    onCancel,
    onCropDone,
}: ImageCropModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [processing, setProcessing] = useState(false);

    const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
        setCroppedAreaPixels(areaPixels);
    }, []);

    const handleConfirm = useCallback(async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setProcessing(true);
        try {
            const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
            onCropDone(blob);
        } finally {
            setProcessing(false);
        }
    }, [imageSrc, croppedAreaPixels, onCropDone]);

    return (
        <Dialog open={!!imageSrc} onOpenChange={(v) => { if (!v) onCancel(); }}>
            <DialogContent className="max-w-[520px] rounded-none border border-[#1E1E1E] bg-[#0A0A0A] p-0 text-white [&>button]:text-white">
                <DialogHeader className="shrink-0 border-b border-[#1E1E1E] px-6 py-4">
                    <DialogTitle className="flex items-center gap-2 font-sora text-base font-bold text-white">
                        <Crop size={16} className="text-[#2D00F7]" />
                        Ajustar imagen
                    </DialogTitle>
                </DialogHeader>

                {/* Crop area */}
                <div className="relative h-[380px] w-full bg-[#050505]">
                    {imageSrc && (
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={aspect}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                            style={{
                                containerStyle: { background: '#050505' },
                                cropAreaStyle: {
                                    border: '2px solid #2D00F7',
                                    boxShadow: '0 0 0 9999em rgba(0,0,0,0.7)',
                                },
                            }}
                        />
                    )}
                </div>

                {/* Zoom slider */}
                <div className="flex items-center gap-3 border-t border-[#1E1E1E] px-6 py-3">
                    <ZoomOut size={14} className="shrink-0 text-[#737373]" />
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.05}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="h-1 w-full cursor-pointer appearance-none rounded-none bg-[#1E1E1E] accent-[#2D00F7]"
                    />
                    <ZoomIn size={14} className="shrink-0 text-[#737373]" />
                    <span className="shrink-0 font-space-mono text-[10px] text-[#4A4A4A]">
                        {zoom.toFixed(1)}×
                    </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-[#1E1E1E] px-6 py-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={processing}
                        className="cursor-pointer border border-[#2A2A2A] px-4 py-2 font-space-mono text-[10px] font-medium uppercase tracking-[1px] text-white transition-colors hover:bg-[#141414] disabled:opacity-40"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={processing}
                        className="flex cursor-pointer items-center gap-2 bg-[#2D00F7] px-4 py-2 font-space-mono text-[10px] font-medium uppercase tracking-[1px] text-white transition-colors hover:bg-[#2400CC] disabled:opacity-40"
                    >
                        {processing && <Loader2 size={12} className="animate-spin" />}
                        Aplicar recorte
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
