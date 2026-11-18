/**
 * Loading skeletons shaped like the real dashboard screens, so a slow
 * session check or first fetch shows the page coming in instead of a blank
 * blue screen. Bars on the blue page are white/15; inside white blocks
 * they are line-white (Azul Bloque). Skeleton already stops pulsing for
 * prefers-reduced-motion.
 */
import { Skeleton } from '@/components/ui/skeleton';

/** Page header: hero title, mono subtitle, optional action on the right. */
export function PageHeaderSkeleton({ action = true }: { action?: boolean }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
                <Skeleton className="h-10 w-72 max-w-[60vw] bg-white/15 md:h-12" />
                <Skeleton className="mt-2 h-3 w-48 rounded-full bg-white/15" />
            </div>
            {action && <Skeleton className="h-12 w-44 max-w-[35vw] rounded-[14px] bg-white/15" />}
        </div>
    );
}

/** The three Inicio stat tiles (label, big number, sub line). */
export function StatTilesSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="block-white flex flex-col gap-3 px-5 py-4">
                    <Skeleton className="h-3 w-24 bg-line-white" />
                    <Skeleton className="h-10 w-16 bg-line-white" />
                    <Skeleton className="h-3 w-28 bg-line-white" />
                </div>
            ))}
        </div>
    );
}

/** Table rows inside a white block (status, name, place, date). */
export function TableRowsSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="flex flex-col">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-6 border-b border-line-white px-5 py-3 last:border-b-0">
                    <Skeleton className="h-5 w-16 bg-line-white" />
                    <Skeleton className="h-4 w-40 bg-line-white" />
                    <Skeleton className="ml-auto hidden h-4 w-24 bg-line-white md:block" />
                    <Skeleton className="h-4 w-20 bg-line-white" />
                </div>
            ))}
        </div>
    );
}

/** A white block with a title bar and table rows. */
export function TableBlockSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="block-white min-w-0 overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3.5">
                <Skeleton className="h-4 w-24 bg-line-white" />
                <Skeleton className="h-3 w-16 bg-line-white" />
            </div>
            <TableRowsSkeleton rows={rows} />
        </div>
    );
}

/** Inicio's ink team panel: title, a few members, the invite button. */
export function TeamPanelSkeleton() {
    return (
        <div className="block-ink flex flex-col gap-3 self-start px-[18px] py-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20 bg-chip-ink" />
                <Skeleton className="h-3 w-16 bg-chip-ink" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5">
                    <Skeleton className="size-8 flex-none rounded-full bg-chip-ink" />
                    <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-3.5 w-32 bg-chip-ink" />
                        <Skeleton className="h-2.5 w-16 bg-chip-ink" />
                    </div>
                </div>
            ))}
            <Skeleton className="h-[42px] rounded-[10px] bg-chip-ink" />
        </div>
    );
}

/** Inicio: header, stat tiles, events table and the team panel. */
export function HomeSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <PageHeaderSkeleton />
            <StatTilesSkeleton />
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <TableBlockSkeleton />
                <TeamPanelSkeleton />
            </div>
        </div>
    );
}

/** Any other top-level page: header and its main table/list block. */
export function ListPageSkeleton() {
    return (
        <div className="flex flex-col gap-7">
            <PageHeaderSkeleton />
            <TableBlockSkeleton rows={6} />
        </div>
    );
}

/** Content skeleton for a dashboard path (the shell has no data yet). */
export function RouteSkeleton({ pathname }: { pathname: string }) {
    return pathname === '/dashboard' ? <HomeSkeleton /> : <ListPageSkeleton />;
}
