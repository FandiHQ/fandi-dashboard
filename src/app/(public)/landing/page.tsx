import { permanentRedirect } from 'next/navigation';

/**
 * `/landing` was the sandbox URL while this design was being built. It is
 * now the real landing at `/`, so this route 308s across rather than
 * serving a duplicate page (any link shared during review keeps working,
 * and search engines see a single canonical URL).
 */
export default function LandingRedirect() {
    permanentRedirect('/');
}
