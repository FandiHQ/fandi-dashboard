import { dashboardTitle } from '@/lib/page-title';

export function generateMetadata() {
    return dashboardTitle('dashboardNav', 'events');
}

export default function EventsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
