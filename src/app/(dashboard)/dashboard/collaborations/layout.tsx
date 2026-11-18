import { dashboardTitle } from '@/lib/page-title';

export function generateMetadata() {
    return dashboardTitle('dashboardNav', 'collaborations');
}

export default function CollaborationsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
