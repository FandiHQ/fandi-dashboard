/**
 * The ranking card renderer — a real PNG, generated per link.
 *
 * This one file feeds both share channels: WhatsApp/X/Facebook/Telegram
 * fetch it through the page's OpenGraph tags, and the app fetches it
 * directly as a blob to hand to `navigator.share({ files })` for
 * Instagram Stories, which never unfurls links.
 *
 * Renders ONLY from a verified payload, and never renders money — the
 * ranking surfaces expose position, never spend, and a public image is
 * the last place to break that.
 *
 * Azul Bloque: flat blue canvas, the claim as the ONE tilted white block
 * (2px ink border + hard ink extrusion, drawn as an offset ink slab since
 * the extrusion must never blur), lime only for the fan's standing, and
 * Space Mono for labels.
 */
import { readFile } from 'fs/promises';
import { join } from 'path';
import { ImageResponse } from 'next/og';
import type { ReactNode } from 'react';
import {
    decodeShareCard,
    impactoresLine,
    isImpactoCard,
    ofFansLine,
    pluralFans,
    showsTopPercent,
    topPercent,
    TIER_LABEL,
    type ShareCardPayload,
} from '@/lib/share-card';
import { fetchArtistImage } from '@/lib/artist-image';

export const CARD_SIZE = { width: 1200, height: 630 };

// Azul Bloque tokens (design-tokens.css). Satori takes inline styles
// only, so the palette is repeated here as plain strings.
export const BLUE = '#2D00F7';
export const INK = '#0B0B0F';
export const WHITE = '#FFFFFF';
export const LIME = '#C6FF3D';
export const LILAC = '#D9D3FF';
export const MUTED_ON_WHITE = '#55555E';

/** Average advance of an Archivo SemiExpanded Black digit, in em. */
const DIGIT_EM = 0.74;
/** Average advance of an uppercase Archivo SemiExpanded Black letter. */
const CAPS_EM = 0.78;

/**
 * Largest size at which `text` fits `width` in at most `lines` lines,
 * capped at `max`. Satori handles text-overflow poorly, so the display
 * lines shrink by length instead of running off the canvas.
 */
export function fitFontSize(
    text: string,
    width: number,
    max: number,
    { em = CAPS_EM, lines = 1, min = 24 }: { em?: number; lines?: number; min?: number } = {},
): number {
    const len = Math.max(1, text.length);
    return Math.max(min, Math.min(max, Math.floor((width * lines) / (len * em))));
}

/** Rank "#7" … "#1247" sized to fill the block without overflowing it. */
export function rankSize(rankText: string, width: number, max: number): number {
    return fitFontSize(rankText, width, max, { em: DIGIT_EM, min: 60 });
}

// ── Assets ───────────────────────────────────────────────────────

async function readAsset(path: Promise<Buffer>): Promise<ArrayBuffer | null> {
    try {
        return Uint8Array.from(await path).buffer;
    } catch {
        return null;
    }
}

type CardFont = {
    name: string;
    data: ArrayBuffer;
    style: 'normal';
    weight: 700 | 900;
};

export interface CardFonts {
    /** Undefined when nothing loaded — Satori then uses its own default. */
    fonts: CardFont[] | undefined;
    display: string;
    mono: string;
}

/**
 * Archivo (static SemiExpanded Black ≈ the 112% stretch of the display
 * face) and Space Mono Bold for labels. Loading is best-effort: a card
 * in a fallback face is worlds better than a broken image in a WhatsApp
 * thread, so a missing font must never fail the response.
 *
 * Literal paths on purpose — the standalone build traces them.
 */
export async function loadCardFonts(): Promise<CardFonts> {
    const [archivo, mono] = await Promise.all([
        readAsset(
            readFile(join(process.cwd(), 'assets', 'Archivo-SemiExpandedBlack.ttf')),
        ),
        readAsset(readFile(join(process.cwd(), 'assets', 'SpaceMono-Bold.ttf'))),
    ]);
    const fonts: CardFont[] = [];
    if (archivo) {
        fonts.push({ name: 'Archivo', data: archivo, style: 'normal', weight: 900 });
    }
    if (mono) {
        fonts.push({ name: 'Space Mono', data: mono, style: 'normal', weight: 700 });
    }
    const display = archivo ? 'Archivo' : mono ? 'Space Mono' : 'sans-serif';
    return {
        fonts: fonts.length ? fonts : undefined,
        display,
        mono: mono ? 'Space Mono' : display,
    };
}

/** The FANDI tile (public/fandi-tile.png) as a data URI, best-effort. */
export async function loadTileLogo(): Promise<string | null> {
    const data = await readAsset(
        readFile(join(process.cwd(), 'public', 'fandi-tile.png')),
    );
    return data ? `data:image/png;base64,${Buffer.from(data).toString('base64')}` : null;
}

// ── Shared pieces (also used by the Stories card) ────────────────

/** FANDI tile + wordmark, sitting on the blue canvas. */
export function Logo({
    tile,
    size,
    display,
}: {
    tile: string | null;
    size: number;
    display: string;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.3) }}>
            {tile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={tile}
                    alt=""
                    width={size}
                    height={size}
                    style={{
                        width: size,
                        height: size,
                        borderRadius: Math.round(size * 0.24),
                        border: `3px solid ${INK}`,
                        boxShadow: `3px 3px 0 ${INK}`,
                    }}
                />
            ) : null}
            <div
                style={{
                    display: 'flex',
                    fontFamily: display,
                    fontWeight: 900,
                    fontSize: Math.round(size * 0.52),
                    color: WHITE,
                    letterSpacing: 1,
                }}
            >
                FANDI
            </div>
        </div>
    );
}

/**
 * The ONE tilted white block: 2px-scale ink border and a hard ink
 * extrusion drawn as an offset slab behind it (no blur, ever).
 */
export function TiltedBlock({
    children,
    width,
    extrusion,
    radius,
    border,
    padding,
}: {
    children: ReactNode;
    width: number;
    extrusion: number;
    radius: number;
    border: number;
    padding: string;
}) {
    return (
        <div
            style={{
                display: 'flex',
                position: 'relative',
                width,
                transform: 'rotate(-1.5deg)',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: extrusion,
                    left: extrusion,
                    right: -extrusion,
                    bottom: -extrusion,
                    background: INK,
                    borderRadius: radius,
                }}
            />
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    background: WHITE,
                    border: `${border}px solid ${INK}`,
                    borderRadius: radius,
                    padding,
                }}
            >
                {children}
            </div>
        </div>
    );
}

/** Ink pill/strip on white. Lime text = the fan's standing only. */
export function InkStrip({
    text,
    color,
    fontFamily,
    fontSize,
    padding,
    radius,
}: {
    text: string;
    color: string;
    fontFamily: string;
    fontSize: number;
    padding: string;
    radius: number;
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignSelf: 'flex-start',
                background: INK,
                color,
                fontFamily,
                fontWeight: 900,
                fontSize,
                letterSpacing: 1,
                textTransform: 'uppercase',
                padding,
                borderRadius: radius,
                lineHeight: 1,
            }}
        >
            {text}
        </div>
    );
}

/**
 * Phase 5 — the artist's circular image with the fan's avatar (when the
 * token carries one) overlapping its corner. Shared by both canvases.
 */
export function ArtistBadge({
    artistImage,
    fanAvatar,
    size,
}: {
    artistImage: string;
    fanAvatar: string | null;
    size: number;
}) {
    const fanSize = Math.round(size * 0.42);
    const edge = Math.max(4, Math.round(size / 40));
    return (
        <div
            style={{
                display: 'flex',
                position: 'relative',
                width: size,
                height: size,
            }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={artistImage}
                alt=""
                width={size}
                height={size}
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    objectFit: 'cover',
                    border: `${edge}px solid ${INK}`,
                    boxShadow: `${edge}px ${edge}px 0 ${INK}`,
                }}
            />
            {fanAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={fanAvatar}
                    alt=""
                    width={fanSize}
                    height={fanSize}
                    style={{
                        position: 'absolute',
                        right: -Math.round(fanSize * 0.15),
                        bottom: -Math.round(fanSize * 0.15),
                        width: fanSize,
                        height: fanSize,
                        borderRadius: fanSize / 2,
                        objectFit: 'cover',
                        border: `${edge}px solid ${WHITE}`,
                    }}
                />
            ) : null}
        </div>
    );
}

/** A plain branded canvas — the answer to a forged or expired token. */
export function WordmarkCanvas({
    tile,
    display,
    size,
}: {
    tile: string | null;
    display: string;
    size: number;
}) {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: BLUE,
            }}
        >
            <Logo tile={tile} size={size} display={display} />
        </div>
    );
}

// ── The landscape card ───────────────────────────────────────────

const PAD = 60;
const BLOCK_WIDTH = 580;
const BLOCK_PAD_X = 40;
const BLOCK_INNER = BLOCK_WIDTH - BLOCK_PAD_X * 2 - 8;
const LEFT_WIDTH = CARD_SIZE.width - PAD * 2 - BLOCK_WIDTH - 40;

/** The left column: logo on top, identity in the middle, meta at the foot. */
function LeftColumn({
    payload,
    artistImage,
    tile,
    f,
    foot,
}: {
    payload: ShareCardPayload;
    artistImage: string | null;
    tile: string | null;
    f: CardFonts;
    foot: string;
}) {
    const handle = payload.ig ? `@${payload.ig}` : null;
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                width: LEFT_WIDTH,
                height: '100%',
            }}
        >
            <Logo tile={tile} size={60} display={f.display} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {artistImage ? (
                    <ArtistBadge artistImage={artistImage} fanAvatar={payload.av} size={150} />
                ) : payload.av ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={payload.av}
                        alt=""
                        width={110}
                        height={110}
                        style={{
                            width: 110,
                            height: 110,
                            borderRadius: 55,
                            objectFit: 'cover',
                            border: `4px solid ${INK}`,
                        }}
                    />
                ) : null}
                {payload.n ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div
                            style={{
                                display: 'flex',
                                fontFamily: f.display,
                                fontWeight: 900,
                                fontSize: fitFontSize(payload.n, LEFT_WIDTH, 48),
                                color: WHITE,
                                textTransform: 'uppercase',
                                lineHeight: 0.95,
                            }}
                        >
                            {payload.n}
                        </div>
                        {handle ? (
                            <div
                                style={{
                                    display: 'flex',
                                    fontFamily: f.mono,
                                    fontWeight: 700,
                                    fontSize: 22,
                                    color: LILAC,
                                    letterSpacing: 1,
                                }}
                            >
                                {handle}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                    style={{
                        display: 'flex',
                        fontFamily: f.mono,
                        fontWeight: 700,
                        fontSize: 16,
                        color: LILAC,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                    }}
                >
                    {foot}
                </div>
                <div
                    style={{
                        display: 'flex',
                        fontFamily: f.mono,
                        fontWeight: 700,
                        fontSize: 22,
                        color: WHITE,
                        letterSpacing: 2,
                    }}
                >
                    fandi.app
                </div>
            </div>
        </div>
    );
}

function Canvas({ children, f }: { children: ReactNode; f: CardFonts }) {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: BLUE,
                padding: PAD,
                fontFamily: f.display,
            }}
        >
            {children}
        </div>
    );
}

function MonoLabel({ text, f, size = 16 }: { text: string; f: CardFonts; size?: number }) {
    return (
        <div
            style={{
                display: 'flex',
                fontFamily: f.mono,
                fontWeight: 700,
                fontSize: size,
                color: MUTED_ON_WHITE,
                letterSpacing: 3,
                textTransform: 'uppercase',
            }}
        >
            {text}
        </div>
    );
}

/**
 * Phase 6 — the Impacto share card (1200×630). Hero = the cause; the
 * fan's position on the wall appears ONLY when the token carries their
 * identity (public profile). Never money.
 */
function renderImpactoCard(
    payload: ShareCardPayload,
    f: CardFonts,
    tile: string | null,
    artistImage: string | null,
    issued: string,
): ImageResponse {
    const cause = payload.ev ?? '';
    return new ImageResponse(
        (
            <Canvas f={f}>
                <LeftColumn
                    payload={payload}
                    artistImage={artistImage}
                    tile={tile}
                    f={f}
                    foot={`${impactoresLine(payload.t)} · ${issued}`}
                />
                <TiltedBlock
                    width={BLOCK_WIDTH}
                    extrusion={10}
                    radius={22}
                    border={4}
                    padding={`36px ${BLOCK_PAD_X}px`}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <MonoLabel text="Apoyé" f={f} size={18} />
                        <InkStrip
                            text="IMPACTO"
                            color={WHITE}
                            fontFamily={f.display}
                            fontSize={20}
                            padding="10px 16px"
                            radius={999}
                        />
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            marginTop: 18,
                            fontFamily: f.display,
                            fontWeight: 900,
                            fontSize: fitFontSize(cause, BLOCK_INNER, 64, { lines: 3, min: 28 }),
                            color: BLUE,
                            lineHeight: 0.95,
                            textTransform: 'uppercase',
                        }}
                    >
                        {cause}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            marginTop: 18,
                            fontFamily: f.display,
                            fontWeight: 900,
                            fontSize: fitFontSize(`CON ${payload.a}`, BLOCK_INNER, 36, { lines: 2 }),
                            color: INK,
                            lineHeight: 0.95,
                            textTransform: 'uppercase',
                        }}
                    >
                        CON {payload.a}
                    </div>
                    {payload.n ? (
                        <div style={{ display: 'flex', marginTop: 22 }}>
                            <InkStrip
                                text={`IMPACTOR #${payload.r}`}
                                color={LIME}
                                fontFamily={f.display}
                                fontSize={30}
                                padding="12px 18px"
                                radius={12}
                            />
                        </div>
                    ) : null}
                </TiltedBlock>
            </Canvas>
        ),
        { ...CARD_SIZE, fonts: f.fonts },
    );
}

export async function renderShareCard(token: string): Promise<ImageResponse> {
    const payload = decodeShareCard(
        decodeURIComponent(token),
        process.env.SHARE_CARD_SECRET ?? '',
    );

    // An unverified link gets a plain branded card with no claim on it.
    // Silently rendering "#1" from a forged payload is the one outcome
    // worth guarding against.
    if (!payload) {
        const [f, tile] = await Promise.all([loadCardFonts(), loadTileLogo()]);
        return new ImageResponse(
            <WordmarkCanvas tile={tile} display={f.display} size={120} />,
            { ...CARD_SIZE, fonts: f.fonts },
        );
    }

    // Best-effort, v2 only (v1 tokens carry no org id): failure → the
    // pre-Phase-5 layout, never a failed image.
    const [f, tile, artistImage] = await Promise.all([
        loadCardFonts(),
        loadTileLogo(),
        fetchArtistImage(payload.o ?? null),
    ]);
    const pct = topPercent(payload.r, payload.t);
    const tier = payload.ti ? TIER_LABEL[payload.ti] ?? null : null;
    const issued = new Date(payload.iat * 1000).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    // Phase 6 — the Impacto card: "Apoyé {cause} con {ídolo}". No rank.
    if (isImpactoCard(payload)) {
        return renderImpactoCard(payload, f, tile, artistImage, issued);
    }
    const accent = showsTopPercent(payload.t)
        ? `TOP ${pct}%`
        : ofFansLine(payload.t);
    const rankText = `#${payload.r}`;
    const artistLine = `DE ${payload.a}`;

    return new ImageResponse(
        (
            <Canvas f={f}>
                <LeftColumn
                    payload={payload}
                    artistImage={artistImage}
                    tile={tile}
                    f={f}
                    foot={`${payload.t} ${pluralFans(payload.t, true)} · ${issued}`}
                />
                <TiltedBlock
                    width={BLOCK_WIDTH}
                    extrusion={10}
                    radius={22}
                    border={4}
                    padding={`34px ${BLOCK_PAD_X}px`}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <MonoLabel text="Ranking de fans" f={f} size={18} />
                        {tier ? (
                            <InkStrip
                                text={tier}
                                color={WHITE}
                                fontFamily={f.display}
                                fontSize={20}
                                padding="10px 16px"
                                radius={999}
                            />
                        ) : null}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            marginTop: 10,
                            fontFamily: f.display,
                            fontWeight: 900,
                            fontSize: rankSize(rankText, BLOCK_INNER, 176),
                            color: BLUE,
                            lineHeight: 0.9,
                            letterSpacing: -2,
                        }}
                    >
                        {rankText}
                    </div>
                    <div style={{ display: 'flex', marginTop: 16 }}>
                        <InkStrip
                            text={accent}
                            color={LIME}
                            fontFamily={f.display}
                            fontSize={38}
                            padding="12px 18px"
                            radius={12}
                        />
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            marginTop: 20,
                            fontFamily: f.display,
                            fontWeight: 900,
                            fontSize: fitFontSize(artistLine, BLOCK_INNER, 40, { lines: 2 }),
                            color: INK,
                            lineHeight: 0.95,
                            textTransform: 'uppercase',
                        }}
                    >
                        {artistLine}
                    </div>
                    {payload.ev ? (
                        <div style={{ display: 'flex', marginTop: 10 }}>
                            <MonoLabel text={`EN ${payload.ev}`} f={f} size={18} />
                        </div>
                    ) : null}
                </TiltedBlock>
            </Canvas>
        ),
        { ...CARD_SIZE, fonts: f.fonts },
    );
}
