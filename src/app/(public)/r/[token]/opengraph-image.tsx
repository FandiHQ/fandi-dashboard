/**
 * The ranking card itself — a real PNG, generated per link.
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
import { decodeShareCard, topPercent, TIER_LABEL } from '@/lib/share-card';

export const alt = 'Mi ranking en Fandi';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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
async function loadAnton(): Promise<ArrayBuffer | null> {
    try {
        const file = await readFile(
            join(process.cwd(), 'assets', 'Anton-Regular.ttf'),
        );
        return Uint8Array.from(file).buffer;
    } catch {
        return null;
    }
}

export default async function Image({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
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
            size,
        );
    }

    const anton = await loadAnton();
    const pct = topPercent(payload.r, payload.t);
    const tier = payload.ti ? TIER_LABEL[payload.ti] ?? null : null;
    const issued = new Date(payload.iat * 1000).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

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
                }}
            >
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
                        {payload.av ? (
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
                                    fontSize: 44,
                                    color: WHITE,
                                    letterSpacing: 2,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {payload.n}
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

                <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                            TOP {pct}%
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
                        {payload.t} FANS · {issued}
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
            ...size,
            fonts: anton
                ? [{ name: 'Anton', data: anton, style: 'normal', weight: 400 }]
                : undefined,
        },
    );
}
