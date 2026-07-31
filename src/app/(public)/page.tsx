import LandingV2 from '@/components/landing-v2/LandingV2';

/**
 * `/` — the Fandi landing page.
 *
 * The implementation lives in components/landing-v2/LandingV2 so the route
 * file stays a thin entry point. The previous cinematic landing is still in
 * git history if any of it is ever needed again.
 */
export default function HomePage() {
    return <LandingV2 />;
}
