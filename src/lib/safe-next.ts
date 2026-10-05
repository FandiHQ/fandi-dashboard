/**
 * The `next` parameter after login must stay inside this app: a local path
 * ("/dashboard/..."), never another origin ("//evil.com", "https://…",
 * "/\\evil.com", "/..//evil.com"). Anything else falls back to the default.
 *
 * The final check resolves the path the way the browser will: dot segments
 * like "/..//evil.com" collapse to "//evil.com", which a redirect would read
 * as another host.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
    if (!next) return fallback;
    if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
    if (/[\u0000-\u001f]/.test(next)) return fallback;
    let u: URL;
    try {
        u = new URL(next, 'http://x');
    } catch {
        return fallback;
    }
    if (u.origin !== 'http://x' || u.pathname.startsWith('//')) return fallback;
    return u.pathname + u.search + u.hash;
}
