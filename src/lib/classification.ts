/**
 * The idol classification tree (fandi-api RFC §4) for the admin page:
 * flat nodes from the API → depth-first rows, and a readable path per
 * category ("Música › Urbano › Reguetón").
 */
import type { CategoryNode } from '../types/api';

export const MAX_CATEGORY_LEVEL = 3;
export const UNCLASSIFIED_SLUG = 'sin-clasificar';

export interface CategoryRow {
    node: CategoryNode;
    depth: number;
    hasChildren: boolean;
}

function nameOf(node: CategoryNode, locale: string): string {
    return locale.startsWith('en') ? node.nameEn : node.nameEs;
}

/** Parents before children, siblings by position then name. */
export function categoryRows(nodes: readonly CategoryNode[]): CategoryRow[] {
    const children = new Map<string | null, CategoryNode[]>();
    for (const node of nodes) {
        const list = children.get(node.parentId) ?? [];
        list.push(node);
        children.set(node.parentId, list);
    }
    for (const list of children.values()) {
        list.sort((a, b) => a.position - b.position || a.nameEs.localeCompare(b.nameEs, 'es'));
    }
    const rows: CategoryRow[] = [];
    const visit = (parentId: string | null, depth: number) => {
        for (const node of children.get(parentId) ?? []) {
            rows.push({ node, depth, hasChildren: (children.get(node.id)?.length ?? 0) > 0 });
            visit(node.id, depth + 1);
        }
    };
    visit(null, 0);
    return rows;
}

export function categoryPath(
    id: string,
    nodes: readonly CategoryNode[],
    locale = 'es',
): string {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const names: string[] = [];
    let node = byId.get(id);
    while (node && names.length < 8) {
        names.unshift(nameOf(node, locale));
        node = node.parentId ? byId.get(node.parentId) : undefined;
    }
    return names.join(' › ');
}

/** Only an empty leaf can go (the API enforces the same). */
export function canDeleteCategory(row: CategoryRow): boolean {
    return !row.hasChildren && row.node.idolCount === 0 && row.node.slug !== UNCLASSIFIED_SLUG;
}

export function canAddChild(node: CategoryNode): boolean {
    return node.level < MAX_CATEGORY_LEVEL && node.slug !== UNCLASSIFIED_SLUG;
}

/** "CO", "CO-ANT" — ISO 3166, as the API validates it. */
export function isValidRegion(region: string): boolean {
    return /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/.test(region);
}

/** Lowercase slug tags: "Música Popular" → "musica-popular". */
export function toTag(input: string): string {
    return input
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30);
}

/** Same caps the API enforces on an idol's classification. */
export const MAX_PLACEMENTS = 5;
export const MAX_TAGS = 10;

/**
 * The comma-separated tags field → distinct slug tags, and how many are
 * over the cap. Over the cap the page says so and does not save (it never
 * drops tags silently).
 */
export function parseTags(input: string): { tags: string[]; over: number } {
    const tags = [...new Set(input.split(',').map(toTag).filter(Boolean))];
    return { tags, over: Math.max(0, tags.length - MAX_TAGS) };
}
