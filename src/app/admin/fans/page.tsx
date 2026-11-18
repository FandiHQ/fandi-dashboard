'use client';

import { Suspense } from 'react';
import { FansScreen } from '@/components/admin/fans-screen';

export default function AdminFansPage() {
    // useSearchParams (?q=) needs a Suspense boundary.
    return (
        <Suspense fallback={null}>
            <FansScreen />
        </Suspense>
    );
}
