// fandi-dashboard\src\middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSession } from '@/lib/supabase-middleware';

const protectedPrefixes = ['/dashboard', '/staff'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only check protected routes (matcher already filters, but
    // double-check for safety)
    const isProtected = protectedPrefixes.some(p => pathname.startsWith(p));
    if (!isProtected) return NextResponse.next();

    // Validate session server-side (calls getUser(), not getSession())
    // Returns the response with any refreshed session cookies
    const { user, error, response } = await validateSession(request);

    if (error || !user) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Valid session → allow through with fresh cookies.
    // Role-based access (staff vs organizer) is handled by:
    // - Client auth gate (checks myRole from /auth/me response)
    // - API JwtAuthGuard + RolesGuard (checks on every API call)
    // Middleware does NOT check roles — it only validates identity.
    return response;
}

export const config = {
    // SCOPED to protected routes only.
    // Do NOT run middleware on public pages (/, /login, landing assets).
    matcher: ['/dashboard/:path*', '/staff/:path*'],
};
