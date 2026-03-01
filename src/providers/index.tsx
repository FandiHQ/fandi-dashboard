'use client';

import { QueryProvider } from './query-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <QueryProvider>
            <TooltipProvider>
                {children}
            </TooltipProvider>
        </QueryProvider>
    );
}
