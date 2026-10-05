'use client';

/**
 * The app's confirmation dialog (white block on the ink scrim), as a hook so
 * a native `confirm()` can be swapped in place:
 *
 *   const { confirm, dialog } = useConfirmDialog();
 *   if (await confirm({ title, confirmLabel, cancelLabel })) end.mutate(id);
 *   return <>{…}{dialog}</>;
 *
 * The confirm action is the destructive outline by default (§7 "CERRAR
 * AHORA" pattern); cancel is the white secondary.
 */
import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface ConfirmOptions {
    title: string;
    description?: ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    /** 'destructive' (default) for end/delete/discard; 'default' for a neutral yes. */
    tone?: 'destructive' | 'default';
}

export function useConfirmDialog() {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolver = useRef<((value: boolean) => void) | null>(null);

    const settle = useCallback((value: boolean) => {
        resolver.current?.(value);
        resolver.current = null;
        setOptions(null);
    }, []);

    const confirm = useCallback((next: ConfirmOptions) => {
        // A second ask while one is open answers the first with "no".
        resolver.current?.(false);
        setOptions(next);
        return new Promise<boolean>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const dialog = (
        <AlertDialog open={options !== null} onOpenChange={(open) => { if (!open) settle(false); }}>
            {options && (
                <AlertDialogContent data-testid="confirm-dialog">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-display text-2xl">{options.title}</AlertDialogTitle>
                        {options.description && (
                            <AlertDialogDescription>{options.description}</AlertDialogDescription>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="secondary" data-testid="confirm-dialog-cancel">
                            {options.cancelLabel}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant={options.tone === 'default' ? 'default' : 'destructive'}
                            onClick={() => settle(true)}
                            data-testid="confirm-dialog-confirm"
                        >
                            {options.confirmLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            )}
        </AlertDialog>
    );

    return { confirm, dialog };
}
