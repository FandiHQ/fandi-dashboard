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
 */
import { readFile } from 'fs/promises';
import { join } from 'path';
import { ImageResponse } from 'next/og';
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

const BLACK = '#000000';
const ACID = '#CCFF00';
const BLUE = '#2D00F7';
const WHITE = '#FFFFFF';
const MUTED = '#A0A0A0';

/**
 * Anton is the display face across the app. Loading it is best-effort:
 * a card in the fallback sans is worlds better than a broken image in a
 * WhatsApp thread, so a missing font must never fail the response.
 */
export async function loadAnton(): Promise<ArrayBuffer | null> {
    try {
        const file = await readFile(
            join(process.cwd(), 'assets', 'Anton-Regular.ttf'),
        );
        return Uint8Array.from(file).buffer;
    } catch {
        return null;
    }
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
                    border: `6px solid ${ACID}`,
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
                        border: `4px solid ${BLACK}`,
                    }}
                />
            ) : null}
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
    anton: ArrayBuffer | null,
    artistImage: string | null,
    issued: string,
): ImageResponse {
    const cause = payload.ev ?? '';
    const handle = payload.ig ? `@${payload.ig}` : null;
    const causeSize = cause.length <= 24 ? 96 : cause.length <= 40 ? 72 : 56;
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: BLACK,
                    padding: 72,
                    fontFamily: anton ? 'Anton' : 'sans-serif',
                    position: 'relative',
                }}
            >
                <div style={{ position: 'absolute', top: 32, right: 32, width: 96, height: 96, borderTop: `6px solid ${BLUE}`, borderRight: `6px solid ${BLUE}` }} />
                <div style={{ position: 'absolute', bottom: 32, left: 32, width: 96, height: 96, borderBottom: `6px solid ${BLUE}`, borderLeft: `6px solid ${BLUE}` }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        {payload.av && !artistImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={payload.av} alt="" width={96} height={96} style={{ width: 96, height: 96, borderRadius: 48, objectFit: 'cover' }} />
                        ) : null}
                        {payload.n ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', fontSize: 44, color: WHITE, letterSpacing: 2, textTransform: 'uppercase' }}>{payload.n}</div>
                                {handle ? <div style={{ display: 'flex', fontSize: 26, color: MUTED, letterSpacing: 1 }}>{handle}</div> : null}
                            </div>
                        ) : null}
                    </div>
                    <div style={{ display: 'flex', fontSize: 32, color: BLUE, letterSpacing: 6 }}>FANDI</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 40 }}>
                    {artistImage ? (
                        <ArtistBadge artistImage={artistImage} fanAvatar={payload.av} size={176} />
                    ) : null}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignSelf: 'flex-start', background: BLUE, color: WHITE, fontSize: 28, letterSpacing: 4, padding: '8px 20px', marginBottom: 20 }}>
                            IMPACTO
                        </div>
                        <div style={{ display: 'flex', fontSize: 40, color: MUTED, letterSpacing: 4 }}>APOYÉ</div>
                        <div style={{ display: 'flex', fontSize: causeSize, color: WHITE, lineHeight: 1.05, letterSpacing: 1, textTransform: 'uppercase', maxWidth: 900 }}>
                            {cause}
                        </div>
                        <div style={{ display: 'flex', fontSize: 40, color: ACID, letterSpacing: 2, textTransform: 'uppercase', marginTop: 12 }}>
                            CON {payload.a}
                        </div>
                        {payload.n ? (
                            <div style={{ display: 'flex', fontSize: 28, color: MUTED, letterSpacing: 2, marginTop: 8 }}>
                                IMPACTOR #{payload.r}
                            </div>
                        ) : null}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `4px solid ${BLUE}`, paddingTop: 24 }}>
                    <div style={{ display: 'flex', fontSize: 28, color: MUTED, letterSpacing: 2, textTransform: 'uppercase' }}>
                        {impactoresLine(payload.t)} · {issued}
                    </div>
                    <div style={{ display: 'flex', fontSize: 28, color: WHITE, letterSpacing: 2 }}>fandi.app</div>
                </div>
            </div>
        ),
        {
            ...CARD_SIZE,
            fonts: anton ? [{ name: 'Anton', data: anton, style: 'normal', weight: 400 }] : undefined,
        },
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
        return new ImageResponse(
            (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: BLACK,
                        color: WHITE,
                        fontSize: 64,
                        letterSpacing: 4,
                    }}
                >
                    FANDI
                </div>
            ),
            CARD_SIZE,
        );
    }

    // Best-effort, v2 only (v1 tokens carry no org id): failure → the
    // pre-Phase-5 layout, never a failed image.
    const [anton, artistImage] = await Promise.all([
        loadAnton(),
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
        return renderImpactoCard(payload, anton, artistImage, issued);
    }
    const accent = showsTopPercent(payload.t)
        ? `TOP ${pct}%`
        : ofFansLine(payload.t);
    const handle = payload.ig ? `@${payload.ig}` : null;

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: BLACK,
                    padding: 72,
                    fontFamily: anton ? 'Anton' : 'sans-serif',
                    position: 'relative',
                }}
            >
                {/* HudBrackets, the same frame the app draws around a
                    live card. Also stops the right half of a 1200x630
                    canvas reading as dead space. */}
                <div
                    style={{
                        position: 'absolute',
                        top: 32,
                        right: 32,
                        width: 96,
                        height: 96,
                        borderTop: `6px solid ${ACID}`,
                        borderRight: `6px solid ${ACID}`,
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: 32,
                        left: 32,
                        width: 96,
                        height: 96,
                        borderBottom: `6px solid ${ACID}`,
                        borderLeft: `6px solid ${ACID}`,
                    }}
                />
                {/* Acid rule, echoing the HUD brackets in the app. */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 20,
                        }}
                    >
                        {payload.av && !artistImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={payload.av}
                                alt=""
                                width={96}
                                height={96}
                                style={{
                                    width: 96,
                                    height: 96,
                                    borderRadius: 48,
                                    objectFit: 'cover',
                                }}
                            />
                        ) : null}
                        {payload.n ? (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        fontSize: 44,
                                        color: WHITE,
                                        letterSpacing: 2,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {payload.n}
                                </div>
                                {handle ? (
                                    <div
                                        style={{
                                            display: 'flex',
                                            fontSize: 26,
                                            color: MUTED,
                                            letterSpacing: 1,
                                        }}
                                    >
                                        {handle}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 32,
                            color: ACID,
                            letterSpacing: 6,
                        }}
                    >
                        FANDI
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 40,
                    }}
                >
                    {/* Phase 5 — artist image; the landscape canvas puts
                        it beside the rank (the Story puts it above). */}
                    {artistImage ? (
                        <ArtistBadge
                            artistImage={artistImage}
                            fanAvatar={payload.av}
                            size={176}
                        />
                    ) : null}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {tier ? (
                        <div
                            style={{
                                display: 'flex',
                                alignSelf: 'flex-start',
                                background: ACID,
                                color: BLACK,
                                fontSize: 28,
                                letterSpacing: 4,
                                padding: '8px 20px',
                                marginBottom: 20,
                            }}
                        >
                            {tier}
                        </div>
                    ) : null}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 24,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                fontSize: 200,
                                color: WHITE,
                                lineHeight: 1,
                                letterSpacing: -4,
                            }}
                        >
                            #{payload.r}
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                fontSize: 56,
                                color: ACID,
                                letterSpacing: 2,
                            }}
                        >
                            {accent}
                        </div>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 48,
                            color: WHITE,
                            letterSpacing: 2,
                            textTransform: 'uppercase',
                            marginTop: 12,
                        }}
                    >
                        DE {payload.a}
                    </div>
                    {payload.ev ? (
                        <div
                            style={{
                                display: 'flex',
                                fontSize: 28,
                                color: MUTED,
                                letterSpacing: 2,
                                textTransform: 'uppercase',
                                marginTop: 8,
                            }}
                        >
                            EN {payload.ev}
                        </div>
                    ) : null}
                </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: `4px solid ${BLUE}`,
                        paddingTop: 24,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 28,
                            color: MUTED,
                            letterSpacing: 2,
                        }}
                    >
                        {payload.t} {pluralFans(payload.t, true)} · {issued}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 28,
                            color: WHITE,
                            letterSpacing: 2,
                        }}
                    >
                        fandi.app
                    </div>
                </div>
            </div>
        ),
        {
            ...CARD_SIZE,
            fonts: anton
                ? [{ name: 'Anton', data: anton, style: 'normal', weight: 400 }]
                : undefined,
        },
    );
}
