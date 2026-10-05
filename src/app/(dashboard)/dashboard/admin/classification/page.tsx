'use client';

/**
 * Idol classification (fandi-api RFC §4) — platform admins only. The tree
 * (domain › genre/sport › sub-genre/league › club) on the left, idols on
 * the right: file each one in up to 5 categories with an optional ISO
 * region, plus short tags. Feeds the Descubre/Home ranking. The API checks
 * the persisted admin role; this page only mirrors it.
 *
 * Create/edit always opens the right side panel (§7); deleting a category
 * asks first.
 */
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { classificationApi } from '@/lib/api-hooks';
import {
    canAddChild,
    canDeleteCategory,
    categoryPath,
    categoryRows,
    isValidRegion,
    MAX_PLACEMENTS,
    MAX_TAGS,
    parseTags,
    UNCLASSIFIED_SLUG,
} from '@/lib/classification';
import { ApiError } from '@/types/api';
import type { CategoryNode, ClassifiedIdol } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const TREE_KEY = ['admin', 'classification', 'tree'] as const;
const FIELD_LABEL = 'label-mono text-muted-white';

export default function ClassificationPage() {
    const t = useTranslations('classification');
    const { user } = useAuth();
    if (user?.role !== 'admin') {
        return <p className="text-sm text-lilac">{t('noAccess')}</p>;
    }
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="font-hero text-4xl text-white">{t('title')}</h1>
                <p className="mt-2 max-w-3xl text-sm text-lilac">{t('lead')}</p>
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <CategoryTree />
                <IdolList />
            </div>
        </div>
    );
}

function useErrorToast() {
    const t = useTranslations('classification');
    const tCommon = useTranslations('common');
    return (err: unknown) => {
        const code = err instanceof ApiError ? err.code : null;
        toast.error(
            code === 'CATEGORY_NOT_EMPTY' || code === 'CATEGORY_TOO_DEEP'
                ? t(`errors.${code}`)
                : err instanceof Error
                  ? err.message
                  : tCommon('error'),
        );
    };
}

/** A failed load says so and offers a retry, instead of an endless skeleton. */
function LoadError({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
    const t = useTranslations('classification');
    const tCommon = useTranslations('common');
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border-2 border-alert-white px-4 py-3" role="alert">
            <p className="text-sm font-bold text-alert-white">{t('loadError')}</p>
            <Button size="sm" variant="secondary" onClick={onRetry} disabled={busy}>
                {tCommon('retry')}
            </Button>
        </div>
    );
}

// ─── Tree ────────────────────────────────────────────────────

/** What the category side panel is doing. */
type CategoryPanel =
    | { mode: 'create'; parent: CategoryNode | null }
    | { mode: 'rename'; node: CategoryNode };

function CategoryTree() {
    const t = useTranslations('classification');
    const tCommon = useTranslations('common');
    const locale = useLocale();
    const queryClient = useQueryClient();
    const onError = useErrorToast();
    const { confirm, dialog } = useConfirmDialog();
    const tree = useQuery({ queryKey: TREE_KEY, queryFn: () => classificationApi.tree() });
    const [panel, setPanel] = useState<CategoryPanel | null>(null);
    const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'classification'] });
    const nameOf = (node: CategoryNode) => (locale.startsWith('en') ? node.nameEn : node.nameEs);

    const create = useMutation({
        mutationFn: (dto: { parentId?: string; nameEs: string; nameEn: string }) =>
            classificationApi.createCategory(dto),
        onSuccess: () => {
            setPanel(null);
            refresh();
            toast.success(t('created'));
        },
        onError,
    });
    const rename = useMutation({
        mutationFn: (v: { id: string; nameEs: string; nameEn: string }) =>
            classificationApi.renameCategory(v.id, { nameEs: v.nameEs, nameEn: v.nameEn }),
        onSuccess: () => {
            setPanel(null);
            refresh();
            toast.success(t('renamed'));
        },
        onError,
    });
    const remove = useMutation({
        mutationFn: (id: string) => classificationApi.deleteCategory(id),
        onSuccess: () => {
            refresh();
            toast.success(t('deleted'));
        },
        onError,
    });

    const askDelete = async (node: CategoryNode) => {
        const ok = await confirm({
            title: t('deleteConfirm', { name: nameOf(node) }),
            description: t('deleteBody'),
            confirmLabel: t('delete'),
            cancelLabel: tCommon('cancel'),
        });
        if (ok) remove.mutate(node.id);
    };

    if (tree.isError && !tree.data) {
        return (
            <section className="block-white flex flex-col gap-4 px-5 py-4 text-ink" data-testid="category-tree">
                <h2 className="font-display text-[20px]">{t('tree')}</h2>
                <LoadError onRetry={() => void tree.refetch()} busy={tree.isFetching} />
            </section>
        );
    }
    if (!tree.data) return <Skeleton className="h-96 w-full rounded-2xl" />;
    const rows = categoryRows(tree.data);

    return (
        <section className="block-white flex flex-col gap-4 px-5 py-4 text-ink" data-testid="category-tree">
            <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-[20px]">{t('tree')}</h2>
                <Button size="sm" variant="secondary" onClick={() => setPanel({ mode: 'create', parent: null })}>
                    <Plus /> {t('newDomain')}
                </Button>
            </div>
            <ul className="flex flex-col divide-y-2 divide-line-white">
                {rows.map((row) => (
                    <li key={row.node.id} className="flex flex-col gap-2 py-2">
                        <div
                            className="flex items-center gap-2"
                            style={{ paddingLeft: `${row.depth * 18}px` }}
                        >
                            <span className="min-w-0 flex-1 truncate text-sm font-bold">{nameOf(row.node)}</span>
                            <span className="font-space-mono text-[10px] uppercase text-muted-white">
                                {t('idolCount', { count: row.node.idolCount })}
                            </span>
                            {canAddChild(row.node) && (
                                <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label={t('addChild')}
                                    title={t('addChild')}
                                    onClick={() => setPanel({ mode: 'create', parent: row.node })}
                                >
                                    <Plus />
                                </Button>
                            )}
                            <Button
                                size="icon-xs"
                                variant="ghost"
                                aria-label={t('rename')}
                                title={t('rename')}
                                onClick={() => setPanel({ mode: 'rename', node: row.node })}
                            >
                                <Pencil />
                            </Button>
                            {canDeleteCategory(row) && (
                                <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label={t('delete')}
                                    title={t('delete')}
                                    disabled={remove.isPending}
                                    onClick={() => void askDelete(row.node)}
                                >
                                    <Trash2 />
                                </Button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            {panel && (
                <SidePanel
                    title={
                        panel.mode === 'rename'
                            ? t('renameTitle')
                            : panel.parent
                              ? t('newChildTitle', { parent: categoryPath(panel.parent.id, tree.data, locale) })
                              : t('newDomainTitle')
                    }
                    onClose={() => setPanel(null)}
                >
                    <NamesForm
                        key={panel.mode === 'rename' ? `rename-${panel.node.id}` : `create-${panel.parent?.id ?? 'root'}`}
                        initial={panel.mode === 'rename' ? { nameEs: panel.node.nameEs, nameEn: panel.node.nameEn } : undefined}
                        busy={panel.mode === 'rename' ? rename.isPending : create.isPending}
                        onCancel={() => setPanel(null)}
                        onSubmit={(names) => {
                            if (panel.mode === 'rename') rename.mutate({ id: panel.node.id, ...names });
                            else create.mutate(panel.parent ? { parentId: panel.parent.id, ...names } : names);
                        }}
                    />
                </SidePanel>
            )}
            {dialog}
        </section>
    );
}

/** §7 right side panel: white, ink left border, footer actions. */
function SidePanel({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
            <SheetContent side="right" className="gap-0 p-0" aria-describedby={undefined}>
                <SheetHeader className="shrink-0 border-b-2 border-ink px-7 py-[22px] pr-16">
                    <SheetTitle className="text-[24px]">{title}</SheetTitle>
                </SheetHeader>
                {children}
            </SheetContent>
        </Sheet>
    );
}

/** Scrollable body + sticky footer (cancel · lime save), as in the dynamics panel. */
function PanelForm({
    onSubmit,
    onCancel,
    canSave,
    busy,
    children,
}: {
    onSubmit: () => void;
    onCancel: () => void;
    canSave: boolean;
    busy: boolean;
    children: React.ReactNode;
}) {
    const tCommon = useTranslations('common');
    return (
        <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
                e.preventDefault();
                if (canSave && !busy) onSubmit();
            }}
        >
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-7 py-5">{children}</div>
            <div className="flex shrink-0 gap-3 border-t-2 border-ink px-7 py-[18px]">
                <Button type="button" variant="outline" size="lg" onClick={onCancel} className="flex-1">
                    {tCommon('cancel')}
                </Button>
                <Button type="submit" size="lg" disabled={!canSave || busy} className="flex-[2]">
                    {tCommon('save')}
                </Button>
            </div>
        </form>
    );
}

function NamesForm({
    initial,
    busy,
    onSubmit,
    onCancel,
}: {
    initial?: { nameEs: string; nameEn: string };
    busy: boolean;
    onSubmit: (names: { nameEs: string; nameEn: string }) => void;
    onCancel: () => void;
}) {
    const t = useTranslations('classification');
    const [nameEs, setNameEs] = useState(initial?.nameEs ?? '');
    const [nameEn, setNameEn] = useState(initial?.nameEn ?? '');
    const valid = nameEs.trim().length >= 2 && nameEn.trim().length >= 2;
    return (
        <PanelForm
            canSave={valid}
            busy={busy}
            onCancel={onCancel}
            onSubmit={() => onSubmit({ nameEs: nameEs.trim(), nameEn: nameEn.trim() })}
        >
            <div className="flex flex-col gap-1.5">
                <label className={FIELD_LABEL} htmlFor="category-name-es">{t('nameEs')}</label>
                <Input
                    id="category-name-es"
                    className="h-12"
                    value={nameEs}
                    maxLength={80}
                    autoFocus
                    onChange={(e) => setNameEs(e.target.value)}
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <label className={FIELD_LABEL} htmlFor="category-name-en">{t('nameEn')}</label>
                <Input
                    id="category-name-en"
                    className="h-12"
                    value={nameEn}
                    maxLength={80}
                    onChange={(e) => setNameEn(e.target.value)}
                />
            </div>
        </PanelForm>
    );
}

// ─── Idols ───────────────────────────────────────────────────

function IdolList() {
    const t = useTranslations('classification');
    const [filter, setFilter] = useState<'unclassified' | 'all'>('unclassified');
    const [q, setQ] = useState('');
    // One request per pause in typing, not per keystroke.
    const [debouncedQ, setDebouncedQ] = useState('');
    useEffect(() => {
        const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
        return () => clearTimeout(id);
    }, [q]);
    const [editing, setEditing] = useState<ClassifiedIdol | null>(null);
    const tree = useQuery({ queryKey: TREE_KEY, queryFn: () => classificationApi.tree() });
    const idols = useQuery({
        queryKey: ['admin', 'classification', 'idols', filter, debouncedQ],
        queryFn: () => classificationApi.idols({ filter, q: debouncedQ || undefined }),
    });

    return (
        <section className="block-white flex flex-col gap-4 px-5 py-4 text-ink" data-testid="idol-list">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-[20px]">{t('idols')}</h2>
                <div className="flex gap-2">
                    {(['unclassified', 'all'] as const).map((f) => (
                        <Button
                            key={f}
                            size="sm"
                            variant={filter === f ? 'default' : 'secondary'}
                            onClick={() => setFilter(f)}
                        >
                            {t(f === 'unclassified' ? 'filterUnclassified' : 'filterAll')}
                        </Button>
                    ))}
                </div>
            </div>
            <Input
                placeholder={t('search')}
                aria-label={t('search')}
                value={q}
                maxLength={80}
                onChange={(e) => setQ(e.target.value)}
            />
            {idols.isError && !idols.data ? (
                <LoadError onRetry={() => void idols.refetch()} busy={idols.isFetching} />
            ) : !idols.data ? (
                <Skeleton className="h-40 w-full rounded-xl" />
            ) : idols.data.length === 0 ? (
                <p className="text-sm text-muted-white">{t('empty')}</p>
            ) : (
                <ul className="flex flex-col divide-y-2 divide-line-white">
                    {idols.data.map((idol) => (
                        <li key={idol.id} className="flex flex-col gap-2 py-3">
                            <div className="flex items-center gap-2">
                                <span className="min-w-0 flex-1 truncate font-bold">{idol.name}</span>
                                {!idol.isPublic && (
                                    <span className="font-space-mono text-[10px] uppercase text-muted-white">
                                        {t('private')}
                                    </span>
                                )}
                                {idol.unclassified && (
                                    <span className="rounded-full bg-lilac px-2 py-0.5 font-space-mono text-[10px] uppercase text-ink">
                                        {t('filterUnclassified')}
                                    </span>
                                )}
                                <Button
                                    size="xs"
                                    variant="secondary"
                                    onClick={() => setEditing(idol)}
                                    disabled={!tree.data}
                                >
                                    {t('edit')}
                                </Button>
                            </div>
                            {!idol.unclassified && tree.data && (
                                <p className="font-space-mono text-[10px] text-muted-white">
                                    {idol.placements
                                        .map((p) => categoryPath(p.categoryId, tree.data) + (p.region ? ` (${p.region})` : ''))
                                        .join(' · ')}
                                    {idol.tags.length > 0 && ` · #${idol.tags.join(' #')}`}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {editing && tree.data && (
                <SidePanel title={t('editIdolTitle', { name: editing.name })} onClose={() => setEditing(null)}>
                    <IdolEditor key={editing.id} idol={editing} nodes={tree.data} onDone={() => setEditing(null)} />
                </SidePanel>
            )}
        </section>
    );
}

function IdolEditor({
    idol,
    nodes,
    onDone,
}: {
    idol: ClassifiedIdol;
    nodes: CategoryNode[];
    onDone: () => void;
}) {
    const t = useTranslations('classification');
    const locale = useLocale();
    const queryClient = useQueryClient();
    const onError = useErrorToast();
    const [placements, setPlacements] = useState(
        idol.placements.map((p) => ({ categoryId: p.categoryId, region: p.region ?? '' })),
    );
    const [tags, setTags] = useState(idol.tags.join(', '));
    const options = categoryRows(nodes).filter((r) => r.node.slug !== UNCLASSIFIED_SLUG);
    const regionsOk = placements.every((p) => p.region === '' || isValidRegion(p.region));
    const { tags: tagList, over: tagsOver } = parseTags(tags);

    const save = useMutation({
        mutationFn: () =>
            classificationApi.setIdol(idol.id, {
                placements: placements
                    .filter((p) => p.categoryId)
                    .map((p) => (p.region ? { categoryId: p.categoryId, region: p.region } : { categoryId: p.categoryId })),
                tags: tagList,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'classification'] });
            toast.success(t('saved'));
            onDone();
        },
        onError,
    });

    return (
        <PanelForm
            canSave={regionsOk && tagsOver === 0}
            busy={save.isPending}
            onCancel={onDone}
            onSubmit={() => save.mutate()}
        >
            <div className="flex flex-col gap-3" data-testid={`idol-editor-${idol.id}`}>
                <div>
                    <p className={FIELD_LABEL}>{t('placements')}</p>
                    <p className="text-xs text-muted-white">{t('placementHint')}</p>
                </div>
                {placements.map((p, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                        <Select
                            value={p.categoryId}
                            onValueChange={(categoryId) =>
                                setPlacements(placements.map((x, i) => (i === index ? { ...x, categoryId } : x)))
                            }
                        >
                            <SelectTrigger className="h-10 min-w-56 flex-1">
                                <SelectValue placeholder={t('chooseCategory')} />
                            </SelectTrigger>
                            <SelectContent>
                                {options.map((r) => (
                                    <SelectItem key={r.node.id} value={r.node.id}>
                                        {categoryPath(r.node.id, nodes, locale)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            className="h-10 w-32"
                            placeholder={t('region')}
                            aria-label={t('region')}
                            aria-invalid={p.region !== '' && !isValidRegion(p.region)}
                            value={p.region}
                            maxLength={10}
                            onChange={(e) =>
                                setPlacements(
                                    placements.map((x, i) => (i === index ? { ...x, region: e.target.value.toUpperCase() } : x)),
                                )
                            }
                        />
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t('remove')}
                            title={t('remove')}
                            onClick={() => setPlacements(placements.filter((_, i) => i !== index))}
                        >
                            <X />
                        </Button>
                    </div>
                ))}
                {!regionsOk && <p className="text-xs font-bold text-alert-white">{t('regionInvalid')}</p>}
                {placements.length < MAX_PLACEMENTS && (
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="self-start"
                        onClick={() => setPlacements([...placements, { categoryId: '', region: '' }])}
                    >
                        <Plus /> {t('addPlacement')}
                    </Button>
                )}
            </div>
            <div className="flex flex-col gap-1.5">
                <label className={FIELD_LABEL} htmlFor={`idol-tags-${idol.id}`}>{t('tags')}</label>
                <Input
                    id={`idol-tags-${idol.id}`}
                    className="h-12"
                    value={tags}
                    aria-invalid={tagsOver > 0}
                    onChange={(e) => setTags(e.target.value)}
                />
                <p className="text-xs text-muted-white">{t('tagsHint')}</p>
                {tagsOver > 0 && (
                    <p className="text-xs font-bold text-alert-white" role="alert" data-testid="tags-over">
                        {t('tagsOver', { count: tagList.length, max: MAX_TAGS, over: tagsOver })}
                    </p>
                )}
            </div>
        </PanelForm>
    );
}
