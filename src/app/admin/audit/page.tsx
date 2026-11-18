'use client';

import { Suspense } from 'react';
import { AuditScreen } from '@/components/admin/audit-screen';

export default function AdminAuditPage() {
    // The filters and the page live in the URL (useSearchParams).
    return (
        <Suspense fallback={null}>
            <AuditScreen />
        </Suspense>
    );
}
