import { dashboardTitle } from '@/lib/page-title';

export function generateMetadata() {
    return dashboardTitle('dashboardNav', 'team');
}

export default function TeamLayout({ children }: { children: React.ReactNode }) {
    return children;
}
