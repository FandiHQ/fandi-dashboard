import { adminTitle } from '@/components/admin/admin-title';

export function generateMetadata() {
    return adminTitle('fan');
}

export default function AdminFanLayout({ children }: { children: React.ReactNode }) {
    return children;
}
