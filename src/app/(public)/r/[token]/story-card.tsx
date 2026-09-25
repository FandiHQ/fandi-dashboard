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
import { ArtistBadge, loadAnton } from './card';

export const STORY_SIZE = { width: 1080, height: 1920 };

const BLACK = '#000000';
const ACID = '#CCFF00';
const BLUE = '#2D00F7';
const WHITE = '#FFFFFF';
const MUTED = '#A0A0A0';

/**
 * Instagram draws its own controls over the top and bottom of the canvas
 * — the close button, the reply bar. Anything under those gets covered,
 * so all content lives in the middle ~80%: 190px of clearance top and
 * bottom on a 1920 canvas.
 */
const SAFE_AREA_Y = 190;
const GUTTER_X = 72;

/**
 * The rank is the hero and should fill the frame, but "#7" and "#1247"
 * are wildly different widths. Anton is condensed — a digit runs roughly
 * 0.52em — so this scales by character count to stay inside the gutters
 * instead of letting a four-digit rank run off the canvas.
 */
function rankFontSize(rankText: string): number {
    switch (rankText.length) {
        case 2:
            return 560; // #7
        case 3:
            return 470; // #42
        case 4:
            return 370; // #428
        case 5:
            return 300; // #4281
        default:
            return 240;
    }
}

/**
 * Artist names run from "Feid" to "Conexión Summit Medellín". Shrinking
 * by length keeps a long one to two lines at most, without reaching for
 * the text-overflow properties Satori handles poorly.
 */
function artistFontSize(name: string): number {
    if (name.length <= 14) return 72;
    if (name.length <= 24) return 56;
    if (name.length <= 36) return 44;
    return 36;
}

/**
 * One corner of the HUD frame, drawn with borders on a flex box.
 *
 * Deliberately not absolutely positioned: these sit in the flex row
 * beside the rank, so they frame it at any font size instead of needing
 * coordinates recalculated per rank width.
 */
function Bracket({ side }: { side: 'tl' | 'tr' | 'bl' | 'br' }) {
    const edge = `8px solid ${ACID}`;
    return (
        <div
            style={{
                display: 'flex',
                width: 64,
                // No height: the parent row stretches these to the full
                // height of the rank, so they read as a frame around it
                // rather than as two marks floating at its midline.
                alignSelf: 'stretch',
                borderTop: side === 'tl' || side === 'tr' ? edge : 'none',
                borderBottom: side === 'bl' || side === 'br' ? edge : 'none',
                borderLeft: side === 'tl' || side === 'bl' ? edge : 'none',
                borderRight: side === 'tr' || side === 'br' ? edge : 'none',
            }}
        />
    );
}

export async function renderStoryCard(token: string): Promise<ImageResponse> {
    const payload = decodeShareCard(
        decodeURIComponent(token),
        process.env.SHARE_CARD_SECRET ?? '',
    );

    const [anton, artistImage] = await Promise.all([
        loadAnton(),
        // v2 only; best-effort — a failure keeps the pre-Phase-5 layout.
        payload ? fetchArtistImage(payload.o ?? null) : Promise.resolve(null),
    ]);
    const antonFont = anton
        ? [
              {
                  name: 'Anton',
                  data: anton,
                  style: 'normal' as const,
                  weight: 400 as const,
              },
          ]
        : undefined;

    // A forged or expired token gets the wordmark and no claim on it.
    // Rendering "#1" from an unverified payload is the one outcome worth
    // guarding against.
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
                        color: ACID,
                        fontSize: 96,
                        letterSpacing: 12,
                        fontFamily: anton ? 'Anton' : 'sans-serif',
                    }}
                >
                    FANDI
                </div>
            ),
            { ...STORY_SIZE, fonts: antonFont },
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
                    // A vertical lift so an all-black 9:16 frame has some
                    // depth. Satori renders linear-gradient reliably;
                    // blur, blend modes and box-shadow it does not, so the
                    // depth comes from the gradient alone.
                    backgroundImage: `linear-gradient(180deg, ${BLACK} 0%, #0B0B0B 45%, ${BLACK} 100%)`,
                    backgroundColor: BLACK,
                    padding: `${SAFE_AREA_Y}px ${GUTTER_X}px`,
                    fontFamily: anton ? 'Anton' : 'sans-serif',
                }}
            >
                {/* ── Top: wordmark, plus identity when permitted ── */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 26,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 34,
                            color: ACID,
                            letterSpacing: 14,
                        }}
                    >
                        FANDI
                    </div>
                    {/* Phase 5 — artist image above the rank, the fan's
                        avatar overlapping it; name + handle under. */}
                    {artistImage ? (
                        <ArtistBadge
                            artistImage={artistImage}
                            fanAvatar={payload.av}
                            size={260}
                        />
                    ) : null}
                    {hasIdentity ? (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 18,
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
                                        border: `4px solid ${WHITE}`,
                                    }}
                                />
                            ) : null}
                            {payload.n ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        fontSize: 52,
                                        color: WHITE,
                                        letterSpacing: 3,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {payload.n}
                                </div>
                            ) : null}
                            {handle ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        fontSize: 32,
                                        color: MUTED,
                                        letterSpacing: 2,
                                    }}
                                >
                                    {handle}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                {/* ── Middle: the rank is the hero, framed by the HUD ── */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 30,
                    }}
                >
                    {impacto ? (
                        <>
                            <div style={{ display: 'flex', background: BLUE, color: WHITE, fontSize: 34, letterSpacing: 6, padding: '10px 28px' }}>
                                IMPACTO
                            </div>
                            <div style={{ display: 'flex', fontSize: 48, color: MUTED, letterSpacing: 6 }}>APOYÉ</div>
                            <div
                                style={{
                                    display: 'flex',
                                    textAlign: 'center',
                                    fontSize: artistFontSize(payload.ev ?? '') + 40,
                                    color: WHITE,
                                    lineHeight: 1.05,
                                    letterSpacing: 2,
                                    textTransform: 'uppercase',
                                    maxWidth: STORY_SIZE.width - GUTTER_X * 2,
                                }}
                            >
                                {payload.ev}
                            </div>
                            <div style={{ display: 'flex', fontSize: 56, color: ACID, letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center', maxWidth: STORY_SIZE.width - GUTTER_X * 2 }}>
                                CON {payload.a}
                            </div>
                            {payload.n ? (
                                <div style={{ display: 'flex', fontSize: 40, color: MUTED, letterSpacing: 4 }}>
                                    IMPACTOR #{payload.r} · {impactoresLine(payload.t).toUpperCase()}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', fontSize: 40, color: MUTED, letterSpacing: 4 }}>
                                    {impactoresLine(payload.t).toUpperCase()}
                                </div>
                            )}
                        </>
                    ) : null}
                    {!impacto && tier ? (
                        <div
                            style={{
                                display: 'flex',
                                background: ACID,
                                color: BLACK,
                                fontSize: 34,
                                letterSpacing: 6,
                                padding: '10px 28px',
                            }}
                        >
                            {tier}
                        </div>
                    ) : null}

                    {!impacto ? (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'stretch',
                            justifyContent: 'center',
                            gap: 30,
                        }}
                    >
                        <Bracket side="tl" />
                        <div
                            style={{
                                display: 'flex',
                                fontSize: rankFontSize(rankText),
                                color: ACID,
                                lineHeight: 1,
                                letterSpacing: -8,
                            }}
                        >
                            {rankText}
                        </div>
                        <Bracket side="br" />
                    </div>
                    ) : null}

                    {!impacto ? (
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 88,
                            color: WHITE,
                            letterSpacing: 4,
                        }}
                    >
                        {accent}
                    </div>
                    ) : null}

                    {!impacto ? (
                    <div
                        style={{
                            display: 'flex',
                            textAlign: 'center',
                            fontSize: artistFontSize(payload.a),
                            color: MUTED,
                            letterSpacing: 4,
                            textTransform: 'uppercase',
                            maxWidth: STORY_SIZE.width - GUTTER_X * 2,
                        }}
                    >
                        DE {payload.a}
                    </div>
                    ) : null}
                    {!impacto && payload.ev ? (
                        <div
                            style={{
                                display: 'flex',
                                textAlign: 'center',
                                fontSize: 34,
                                color: MUTED,
                                letterSpacing: 3,
                                textTransform: 'uppercase',
                                maxWidth: STORY_SIZE.width - GUTTER_X * 2,
                            }}
                        >
                            EN {payload.ev}
                        </div>
                    ) : null}
                </div>

                {/* ── Foot: the growth loop. Legible, never competing. ── */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 20,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            width: 220,
                            height: 6,
                            background: BLUE,
                        }}
                    />
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 44,
                            color: WHITE,
                            letterSpacing: 6,
                        }}
                    >
                        fandi.app
                    </div>
                </div>
            </div>
        ),
        { ...STORY_SIZE, fonts: antonFont },
    );
}
