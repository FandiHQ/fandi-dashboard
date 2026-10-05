/**
 * The Stories card — 1080x1920, the vertical sibling of card.tsx.
 *
 * Instagram and TikTok Stories never unfurl links, so a shared link is
 * invisible there; they take an image or nothing. And the 1200x630 OG
 * render letterboxes badly on a 9:16 canvas — roughly two thirds of the
 * frame would be empty — so Stories needs its own composition rather
 * than a resize.
 *
 * Same signed payload, same verification, same rule: position only,
 * never spend. Privacy is already decided server-side by buildShareCard,
 * which nulls `n` and `av` for a private fan, so this file never makes
 * that call itself — it renders exactly what the token permits.
 *
 * Azul Bloque: flat blue canvas (no gradient), the rank as the ONE
 * tilted white block with a hard ink extrusion, lime only for the fan's
 * standing.
 */
import { ImageResponse } from 'next/og';
import {
    decodeShareCard,
    impactoresLine,
    isImpactoCard,
    ofFansLine,
    showsTopPercent,
    topPercent,
    TIER_LABEL,
} from '@/lib/share-card';
import { fetchArtistImage } from '@/lib/artist-image';
import {
    ArtistBadge,
    BLUE,
    fitFontSize,
    INK,
    InkStrip,
    LILAC,
    LIME,
    loadCardFonts,
    loadTileLogo,
    Logo,
    MUTED_ON_WHITE,
    rankSize,
    TiltedBlock,
    WHITE,
    WordmarkCanvas,
} from './card';

export const STORY_SIZE = { width: 1080, height: 1920 };

/**
 * Instagram draws its own controls over the top and bottom of the canvas
 * — the close button, the reply bar. Anything under those gets covered,
 * so all content lives in the middle ~80%: 190px of clearance top and
 * bottom on a 1920 canvas.
 */
const SAFE_AREA_Y = 190;
const GUTTER_X = 72;

const BLOCK_WIDTH = STORY_SIZE.width - GUTTER_X * 2;
const BLOCK_PAD_X = 60;
const BLOCK_INNER = BLOCK_WIDTH - BLOCK_PAD_X * 2 - 10;

export async function renderStoryCard(token: string): Promise<ImageResponse> {
    const payload = decodeShareCard(
        decodeURIComponent(token),
        process.env.SHARE_CARD_SECRET ?? '',
    );

    const [f, tile, artistImage] = await Promise.all([
        loadCardFonts(),
        loadTileLogo(),
        // v2 only; best-effort — a failure keeps the pre-Phase-5 layout.
        payload ? fetchArtistImage(payload.o ?? null) : Promise.resolve(null),
    ]);

    // A forged or expired token gets the wordmark and no claim on it.
    // Rendering "#1" from an unverified payload is the one outcome worth
    // guarding against.
    if (!payload) {
        return new ImageResponse(
            <WordmarkCanvas tile={tile} display={f.display} size={150} />,
            { ...STORY_SIZE, fonts: f.fonts },
        );
    }

    const pct = topPercent(payload.r, payload.t);
    const tier = payload.ti ? (TIER_LABEL[payload.ti] ?? null) : null;
    // Phase 6 — the Impacto story: the cause is the hero, no rank; the
    // wall position only rides along for a public fan.
    const impacto = isImpactoCard(payload);
    const rankText = impacto ? '' : `#${payload.r}`;
    // Whatever the token permits. A private fan carries neither field, so
    // this renders anonymous without deciding anything here.
    const hasIdentity = Boolean(payload.n || payload.av);
    const accent = showsTopPercent(payload.t)
        ? `TOP ${pct}%`
        : ofFansLine(payload.t);
    const handle = payload.ig ? `@${payload.ig}` : null;
    const artistLine = impacto ? `CON ${payload.a}` : `DE ${payload.a}`;

    const monoLabel = (text: string, size: number, color: string, upper = true) => (
        <div
            style={{
                display: 'flex',
                fontFamily: f.mono,
                fontWeight: 700,
                fontSize: size,
                color,
                letterSpacing: 4,
                textTransform: upper ? 'uppercase' : 'none',
                textAlign: 'center',
            }}
        >
            {text}
        </div>
    );

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: BLUE,
                    padding: `${SAFE_AREA_Y}px ${GUTTER_X}px`,
                    fontFamily: f.display,
                }}
            >
                {/* ── Top: logo, plus identity when permitted ── */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 30,
                    }}
                >
                    <Logo tile={tile} size={84} display={f.display} />
                    {/* Phase 5 — artist image above the rank, the fan's
                        avatar overlapping it; name + handle under. */}
                    {artistImage ? (
                        <ArtistBadge
                            artistImage={artistImage}
                            fanAvatar={payload.av}
                            size={220}
                        />
                    ) : null}
                    {hasIdentity ? (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 14,
                            }}
                        >
                            {payload.av && !artistImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={payload.av}
                                    alt=""
                                    width={144}
                                    height={144}
                                    style={{
                                        width: 144,
                                        height: 144,
                                        borderRadius: 72,
                                        objectFit: 'cover',
                                        border: `5px solid ${INK}`,
                                        boxShadow: `5px 5px 0 ${INK}`,
                                    }}
                                />
                            ) : null}
                            {payload.n ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        fontFamily: f.display,
                                        fontWeight: 900,
                                        fontSize: fitFontSize(payload.n, BLOCK_WIDTH, 60),
                                        color: WHITE,
                                        textTransform: 'uppercase',
                                        lineHeight: 0.95,
                                    }}
                                >
                                    {payload.n}
                                </div>
                            ) : null}
                            {handle ? monoLabel(handle, 30, LILAC, false) : null}
                        </div>
                    ) : null}
                </div>

                {/* ── Middle: the claim is the hero, the ONE tilted block ── */}
                <TiltedBlock
                    width={BLOCK_WIDTH}
                    extrusion={14}
                    radius={30}
                    border={5}
                    padding={`52px ${BLOCK_PAD_X}px`}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        {monoLabel(impacto ? 'Apoyé' : 'Ranking de fans', 28, MUTED_ON_WHITE)}
                        {impacto || tier ? (
                            <InkStrip
                                text={impacto ? 'IMPACTO' : (tier ?? '')}
                                color={WHITE}
                                fontFamily={f.display}
                                fontSize={30}
                                padding="14px 24px"
                                radius={999}
                            />
                        ) : null}
                    </div>

                    {impacto ? (
                        <div
                            style={{
                                display: 'flex',
                                marginTop: 28,
                                fontFamily: f.display,
                                fontWeight: 900,
                                fontSize: fitFontSize(payload.ev ?? '', BLOCK_INNER, 116, {
                                    lines: 3,
                                    min: 44,
                                }),
                                color: BLUE,
                                lineHeight: 0.95,
                                textTransform: 'uppercase',
                            }}
                        >
                            {payload.ev}
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                marginTop: 16,
                                fontFamily: f.display,
                                fontWeight: 900,
                                fontSize: rankSize(rankText, BLOCK_INNER, 380),
                                color: BLUE,
                                lineHeight: 0.9,
                                letterSpacing: -4,
                            }}
                        >
                            {rankText}
                        </div>
                    )}

                    {!impacto ? (
                        <div style={{ display: 'flex', marginTop: 28 }}>
                            <InkStrip
                                text={accent}
                                color={LIME}
                                fontFamily={f.display}
                                fontSize={68}
                                padding="18px 28px"
                                radius={16}
                            />
                        </div>
                    ) : null}

                    <div
                        style={{
                            display: 'flex',
                            marginTop: 32,
                            fontFamily: f.display,
                            fontWeight: 900,
                            fontSize: fitFontSize(artistLine, BLOCK_INNER, 64, { lines: 2 }),
                            color: INK,
                            lineHeight: 0.95,
                            textTransform: 'uppercase',
                        }}
                    >
                        {artistLine}
                    </div>

                    {!impacto && payload.ev ? (
                        <div style={{ display: 'flex', marginTop: 18 }}>
                            {monoLabel(`EN ${payload.ev}`, 28, MUTED_ON_WHITE)}
                        </div>
                    ) : null}

                    {impacto && payload.n ? (
                        <div style={{ display: 'flex', marginTop: 32 }}>
                            <InkStrip
                                text={`IMPACTOR #${payload.r}`}
                                color={LIME}
                                fontFamily={f.display}
                                fontSize={52}
                                padding="16px 26px"
                                radius={16}
                            />
                        </div>
                    ) : null}
                    {impacto ? (
                        <div style={{ display: 'flex', marginTop: 20 }}>
                            {monoLabel(impactoresLine(payload.t), 28, MUTED_ON_WHITE)}
                        </div>
                    ) : null}
                </TiltedBlock>

                {/* ── Foot: the growth loop. Legible, never competing. ── */}
                {monoLabel('fandi.app', 40, WHITE, false)}
            </div>
        ),
        { ...STORY_SIZE, fonts: f.fonts },
    );
}
