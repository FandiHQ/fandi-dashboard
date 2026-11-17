import { downloadTarget } from '@/lib/app-links';

/**
 * `/descargar` — one link for every place a fan meets Fandi (the nav, the
 * QR code, bios, printed material): the phone goes straight to its own
 * store, anything else lands on the landing's download section.
 *
 * 302, never 301: the answer depends on who asks, so no browser or CDN may
 * remember it. `private, no-store` + `Vary: User-Agent` keep a shared
 * cache from handing an iPhone's redirect to an Android phone.
 *
 * The Location is written by hand rather than through
 * NextResponse.redirect, which needs an absolute URL: behind the
 * container's proxy `request.url` can carry the internal host, while a
 * relative `/#descargar` always resolves against the address the visitor
 * actually typed.
 *
 * Public by construction: src/proxy.ts only matches /dashboard and /staff.
 */
export function GET(request: Request) {
    return new Response(null, {
        status: 302,
        headers: {
            Location: downloadTarget(request.headers.get('user-agent')),
            'Cache-Control': 'private, no-store',
            Vary: 'User-Agent',
        },
    });
}
