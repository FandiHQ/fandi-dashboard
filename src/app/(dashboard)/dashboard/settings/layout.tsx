import { dashboardTitle } from '@/lib/page-title';

export function generateMetadata() {
    return dashboardTitle('dashboardNav', 'settings');
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
