import { dashboardTitle } from '@/lib/page-title';

export function generateMetadata() {
    return dashboardTitle('pageTitles', 'newEvent');
}

export default function NewEventLayout({ children }: { children: React.ReactNode }) {
    return children;
}
