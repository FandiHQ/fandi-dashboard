'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { FanDetailScreen } from '@/components/admin/fan-detail-screen';

export default function AdminFanPage() {
    const params = useParams();
    const id = params.id as string;
    // FanDetailScreen reads ?q= (back to the search) with useSearchParams.
    return (
        <Suspense fallback={null}>
            <FanDetailScreen key={id} userId={id} />
        </Suspense>
    );
}
