import { redirect } from 'next/navigation';

/**
 * "Top Fans" is now the Top fans tab of Fanbase (fandi-api RFC §8). Old
 * links and bookmarks land on it.
 */
export default function TopFansRedirect() {
    redirect('/dashboard/fanbase?tab=top');
}
