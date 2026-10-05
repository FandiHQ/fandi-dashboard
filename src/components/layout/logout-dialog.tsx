'use client';

/**
 * Shared logout confirmation (sidebar rail + mobile sheet). White dialog
 * on the ink scrim; "CERRAR SESIÓN" is the destructive outline, cancel
 * is the white secondary.
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function LogoutDialog({ children, onLoggedOut }: { children: ReactNode; onLoggedOut?: () => void }) {
    const { logout } = useAuth();
    const tAuth = useTranslations('auth');

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-2xl">{tAuth('logoutConfirm')}</AlertDialogTitle>
                    <AlertDialogDescription>{tAuth('logoutWarning')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel variant="secondary">{tAuth('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        onClick={() => {
                            logout();
                            onLoggedOut?.();
                        }}
                    >
                        {tAuth('logout')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
