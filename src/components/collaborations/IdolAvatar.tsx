'use client';

import Image from 'next/image';

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '·';
    return (parts[0]!.charAt(0) + (parts[1]?.charAt(0) ?? '')).toUpperCase();
}

/**
 * An idol account's picture (artist avatar, else its logo), or its
 * initials on ink. Square with soft corners like the workspace tile; the
 * name is the alt text, so it is never the only label.
 */
export function IdolAvatar({
    name,
    src,
    size = 32,
    round = false,
}: {
    name: string;
    src?: string | null;
    size?: number;
    /** A circle (inside a pill chip) instead of the tile's soft square. */
    round?: boolean;
}) {
    const radius = round ? 'rounded-full' : size >= 40 ? 'rounded-[12px]' : 'rounded-[8px]';
    return (
        <span
            className={`flex flex-none items-center justify-center overflow-hidden border-2 border-ink bg-ink ${radius}`}
            style={{ width: size, height: size }}
        >
            {src ? (
                <Image src={src} alt={name} width={size} height={size} unoptimized className="h-full w-full object-cover" />
            ) : (
                <span
                    aria-hidden="true"
                    className="font-display leading-none text-white"
                    style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
                >
                    {initials(name)}
                </span>
            )}
        </span>
    );
}
