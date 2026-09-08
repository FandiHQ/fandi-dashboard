/**
 * Public landing for a shared ranking card.
 *
 * Two audiences arrive here and only one is human: the crawlers behind
 * WhatsApp, X, Telegram and Facebook come for the OpenGraph tags and the
 * generated image, and never render the page. The person who taps the
 * preview lands on this, so it exists to (a) confirm the claim is real
 * and (b) hand them a way into Fandi — every share is an invitation.
 *
 * Renders nothing from an unverified token: a bad signature is a 404.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { decodeShareCard, topPercent, TIER_LABEL } from '@/lib/share-card';

const WEB_APP_URL = process.env.NEXT_PUBLIC_WEB_APP_URL ?? 'https://app.fandi.app';

function read(token: string) {
    return decodeShareCard(
        decodeURIComponent(token),
        process.env.SHARE_CARD_SECRET ?? '',
    );
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ token: string }>;
}): Promise<Metadata> {
    const { token } = await params;
    const payload = read(token);
    if (!payload) return { title: 'Fandi' };

    const pct = topPercent(payload.r, payload.t);
    const who = payload.n ? `${payload.n} es` : 'Soy';
    const title = `${who} #${payload.r} de ${payload.a} en Fandi`;
    const description = `Top ${pct}% de ${payload.t} fans. Compite en vivo por experiencias con tu ídolo.`;

    return {
        title,
        description,
        // The image itself comes from the colocated opengraph-image.tsx;
        // Next wires it into both og: and twitter: automatically. Only
        // the text is overridden here.
        openGraph: { title, description, type: 'profile' },
        twitter: { card: 'summary_large_image', title, description },
        // A ranking link is personal and ephemeral; it has no business in
        // a search index.
        robots: { index: false, follow: false },
    };
}

export default async function ShareCardPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const payload = read(token);
    if (!payload) notFound();

    const pct = topPercent(payload.r, payload.t);
    const tier = payload.ti ? (TIER_LABEL[payload.ti] ?? null) : null;

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-black px-6 py-16 text-white">
            <section className="flex w-full max-w-md flex-col gap-6 border border-white/10 p-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {payload.av ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={payload.av}
                                alt=""
                                className="h-12 w-12 rounded-full object-cover"
                            />
                        ) : null}
                        {payload.n ? (
                            <span className="text-lg font-semibold uppercase tracking-wide">
                                {payload.n}
                            </span>
                        ) : null}
                    </div>
                    {tier ? (
                        <span className="bg-[#CCFF00] px-3 py-1 text-xs font-bold tracking-widest text-black">
                            {tier}
                        </span>
                    ) : null}
                </div>

                <div className="flex items-baseline gap-4">
                    <span className="text-7xl font-bold leading-none">
                        #{payload.r}
                    </span>
                    <span className="text-2xl font-bold text-[#CCFF00]">
                        TOP {pct}%
                    </span>
                </div>

                <p className="text-xl uppercase tracking-wide">
                    de {payload.a}
                </p>

                <p className="border-t-4 border-[#2D00F7] pt-4 text-sm text-neutral-400">
                    {payload.t} fans compitiendo
                </p>
            </section>

            <Link
                href={WEB_APP_URL}
                className="bg-[#2D00F7] px-8 py-4 text-lg font-semibold text-white"
            >
                Entrar a Fandi
            </Link>
        </main>
    );
}
