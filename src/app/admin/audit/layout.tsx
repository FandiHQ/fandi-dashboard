import { adminTitle } from '@/components/admin/admin-title';

export function generateMetadata() {
    return adminTitle('audit');
}

export default function AdminAuditLayout({ children }: { children: React.ReactNode }) {
    return children;
}
