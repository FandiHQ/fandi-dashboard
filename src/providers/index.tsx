// src\providers
'use client';

import { QueryProvider } from './query-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/auth-context';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <QueryProvider>
            <AuthProvider>
                <TooltipProvider>
                    {children}
                </TooltipProvider>
            </AuthProvider>
        </QueryProvider>
    );
}
