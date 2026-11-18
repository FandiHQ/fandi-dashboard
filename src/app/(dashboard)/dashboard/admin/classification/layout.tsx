import { dashboardTitle } from '@/lib/page-title';

export function generateMetadata() {
    return dashboardTitle('dashboardNav', 'classification');
}

export default function ClassificationLayout({ children }: { children: React.ReactNode }) {
    return children;
}
