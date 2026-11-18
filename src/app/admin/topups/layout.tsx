import { adminTitle } from '@/components/admin/admin-title';

export function generateMetadata() {
    return adminTitle('topups');
}

export default function AdminTopupsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
