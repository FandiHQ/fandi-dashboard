import { dashboardTitle } from '@/lib/page-title';

export function generateMetadata() {
    return dashboardTitle('dashboardNav', 'withdrawals');
}

export default function WithdrawalsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
