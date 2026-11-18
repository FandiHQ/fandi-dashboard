import Image from 'next/image';

/**
 * A real app screen in an Azul Bloque phone: ink bezel, hard extrusion,
 * no blur, no gloss, standing in a white block.
 *
 * The screens in public/images/app are crops of the current store
 * screenshots (fictional idols only). Each crop is the top ~85% of the
 * screen, so the phone rises from the block's bottom edge and the block's
 * own ink border is where it is cut, the way the store composites bleed
 * off the frame. On flat blue a phone cut on nothing looked broken.
 *
 * Radii are shares of the width/height, so bezel and screen stay
 * concentric at any size.
 */
export default function PhoneFrame({
    src,
    alt,
    width,
    height,
    sizes,
    tilt = false,
    className = '',
}: {
    src: string;
    alt: string;
    /** Intrinsic pixel size of the WebP master. */
    width: number;
    height: number;
    /** `sizes` for next/image: the phone's rendered width per breakpoint. */
    sizes: string;
    /** The view's one protagonist may tilt (−1.5°), nothing else. */
    tilt?: boolean;
    className?: string;
}) {
    return (
        <div
            className={`block-white overflow-hidden px-[11%] pt-[9%] ${tilt ? 'tilt-hero' : ''} ${className}`}
        >
            <div className="relative aspect-[9/15] w-full overflow-hidden rounded-t-[14%_8.4%] bg-ink px-[3.4%] pt-[3.4%]">
                <div className="relative h-full w-full overflow-hidden rounded-t-[11%_6.8%] bg-blue">
                    <Image
                        src={src}
                        alt={alt}
                        width={width}
                        height={height}
                        sizes={sizes}
                        className="block h-auto w-full"
                    />
                </div>
            </div>
        </div>
    );
}
