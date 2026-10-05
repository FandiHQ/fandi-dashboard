/**
 * Stable URL for the vertical Stories card: /r/<token>/story
 *
 * Separate from /image (1200x630) because Stories is a 9:16 canvas where
 * the OG render letterboxes. One signed payload, two sizes.
 */
import { renderStoryCard } from '../story-card';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token } = await params;
    return renderStoryCard(token);
}
