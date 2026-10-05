'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Loader2, Crop, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';

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
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[520px]">
                <DialogHeader className="shrink-0 border-b-2 border-ink px-6 py-4">
                    <DialogTitle className="flex items-center gap-2.5 text-xl">
                        <Crop size={18} className="text-blue" />
                        Ajustar imagen
                    </DialogTitle>
                </DialogHeader>

                {/* Crop area */}
                <div className="relative h-[380px] w-full bg-ink">
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
                                containerStyle: { background: 'var(--color-ink)' },
                                cropAreaStyle: {
                                    border: '3px solid var(--color-white)',
                                    boxShadow: '0 0 0 9999em rgba(11,11,15,0.7)',
                                },
                            }}
                        />
                    )}
                </div>

                {/* Zoom slider */}
                <div className="flex items-center gap-3 border-t-2 border-ink px-6 py-3.5">
                    <ZoomOut size={16} className="shrink-0 text-muted-white" />
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.05}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        aria-label="Zoom"
                        className="h-2 w-full cursor-pointer rounded-full accent-blue"
                    />
                    <ZoomIn size={16} className="shrink-0 text-muted-white" />
                    <span className="w-9 shrink-0 text-right font-space-mono text-[11px] text-ink tabular">
                        {zoom.toFixed(1)}×
                    </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t-2 border-line-white px-6 py-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={processing}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={processing}
                    >
                        {processing && <Loader2 size={14} className="animate-spin" />}
                        Aplicar recorte
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
