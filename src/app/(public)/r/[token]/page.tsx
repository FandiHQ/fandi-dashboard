/**
 * Public landing for a shared ranking card.
 *
 * Two audiences arrive here and only one is human: the crawlers behind
 * WhatsApp, X, Telegram and Facebook come for the OpenGraph tags and the
 * generated image, and never render the page. The person who taps the
 * preview lands on this, so it exists to (a) confirm the claim is real
 * and (b) hand them a way into Fandi — every share is an invitation.
 *
 * Phase 5: the hero IS the card PNG for the same token (one renderer,
 * one truth — no HTML re-implementation to drift), then the CTA.
 *
 * Renders nothing from an unverified token: a bad signature is a 404.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
    decodeShareCard,
    fansCompeting,
    impactoresLine,
    isImpactoCard,
    rankOfFans,
    showsTopPercent,
    topPercent,
} from '@/lib/share-card';
import { CARD_SIZE } from './card';

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

    // Phase 6 — the Impacto card unfurls as "apoyó {cause}", never a rank.
    if (isImpactoCard(payload)) {
        const whoImpacto = payload.n ? `${payload.n} apoyó` : 'Apoyé';
        const title = `${whoImpacto} ${payload.ev ?? 'una causa'} con ${payload.a} en Fandi`;
        const description = `${impactoresLine(payload.t)} ya dejaron su huella. Súmate a la causa de tu ídolo.`;
        return {
            title,
            description,
            openGraph: { title, description, type: 'profile' },
            twitter: { card: 'summary_large_image', title, description },
            robots: { index: false, follow: false },
        };
    }

    const who = payload.n ? `${payload.n} es` : 'Soy';
    const where = payload.ev ? ` en ${payload.ev}` : '';
    const title = `${who} #${payload.r} de ${payload.a}${where} en Fandi`;
    const standing = showsTopPercent(payload.t)
        ? `Top ${topPercent(payload.r, payload.t)}% de ${payload.t} fans.`
        : `${rankOfFans(payload.r, payload.t)}.`;
    const description = `${standing} Compite en vivo por experiencias con tu ídolo.`;

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

    const impacto = isImpactoCard(payload);
    const heroAlt = impacto
        ? `Apoyé ${payload.ev ?? ''} con ${payload.a} en Fandi`
        : `#${payload.r} de ${payload.a} en Fandi`;

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-black px-6 py-16 text-white">
            {/* The PNG for THIS token — the same image the share unfurls. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={`/r/${encodeURIComponent(token)}/image`}
                alt={heroAlt}
                width={CARD_SIZE.width}
                height={CARD_SIZE.height}
                className="h-auto w-full max-w-2xl border border-white/10"
                data-testid="share-hero"
            />

            <p className="text-sm text-neutral-400">
                {impacto ? impactoresLine(payload.t) : fansCompeting(payload.t)}
            </p>

            <Link
                href={WEB_APP_URL}
                className="bg-[#2D00F7] px-8 py-4 text-lg font-semibold text-white"
            >
                Entrar a Fandi
            </Link>
        </main>
    );
}
