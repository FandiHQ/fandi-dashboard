import { dashboardTitle } from '@/lib/page-title';

export function generateMetadata() {
    return dashboardTitle('dashboardNav', 'fanbase');
}

export default function FanbaseLayout({ children }: { children: React.ReactNode }) {
    return children;
}
