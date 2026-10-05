/**
 * Stable URL for the card PNG: /r/<token>/image
 *
 * The colocated opengraph-image route is content-hashed by Next, so it
 * cannot be constructed by the API or the app. This one can, and it is
 * what the share sheet fetches as a blob for Instagram Stories.
 *
 * Same renderer as the OpenGraph route — verified payload or nothing.
 */
import { renderShareCard } from '../card';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token } = await params;
    return renderShareCard(token);
}
