import { adminTitle } from '@/components/admin/admin-title';

export function generateMetadata() {
    return adminTitle('organizations');
}

export default function AdminOrganizationsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
