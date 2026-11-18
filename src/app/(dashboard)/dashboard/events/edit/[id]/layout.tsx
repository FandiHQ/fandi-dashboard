import { dashboardTitle } from '@/lib/page-title';

export function generateMetadata() {
    return dashboardTitle('pageTitles', 'editEvent');
}

export default function EditEventLayout({ children }: { children: React.ReactNode }) {
    return children;
}
