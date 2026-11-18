import { adminTitle } from '@/components/admin/admin-title';

export function generateMetadata() {
    return adminTitle('fans');
}

export default function AdminFansLayout({ children }: { children: React.ReactNode }) {
    return children;
}
