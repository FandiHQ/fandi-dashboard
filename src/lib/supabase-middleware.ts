// fandi-dashboard\src\lib\supabase-middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

// This function does THREE things in one scope:
// 1. Creates a Supabase client that reads cookies from the request
// 2. Calls getUser() to validate the JWT server-side
// 3. Returns the response WITH any refreshed session cookies
//
// WHY it must be one function:
// getUser() may trigger a token refresh. The refresh calls setAll()
// which reassigns the response variable. If getUser() ran outside
// this function, the caller would hold a stale reference to the
// OLD response (before refresh), and the new session cookie would
// never reach the browser. This causes random logouts.

interface SessionResult {
    user: User | null;
    error: Error | null;
    response: NextResponse;
}

export async function validateSession(
    request: NextRequest
): Promise<SessionResult> {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // Update request cookies (for downstream middleware)
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value);
                    });
                    // Create NEW response with updated request
                    response = NextResponse.next({ request });
                    // Copy refreshed cookies to response
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // CRITICAL: getUser() validates JWT by calling Supabase auth server.
    // Do NOT use getSession() — it only reads local cookie data and
    // can be spoofed with a forged cookie.
    // getUser() may also trigger token refresh, which calls setAll()
    // above, updating the response variable IN THIS SCOPE.
    const { data: { user }, error } = await supabase.auth.getUser();

    return { user, error: error ?? null, response };
}
