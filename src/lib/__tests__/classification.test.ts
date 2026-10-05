import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    canAddChild,
    canDeleteCategory,
    categoryPath,
    categoryRows,
    isValidRegion,
    MAX_TAGS,
    parseTags,
    toTag,
} from '../classification.ts';
import type { CategoryNode } from '../../types/api.ts';

const node = (
    id: string,
    parentId: string | null,
    level: number,
    nameEs: string,
    extra: Partial<CategoryNode> = {},
): CategoryNode => ({
    id,
    parentId,
    slug: id,
    nameEs,
    nameEn: `${nameEs} (en)`,
    level,
    position: 0,
    idolCount: 0,
    ...extra,
});

const tree = [
    node('urbano', 'musica', 1, 'Urbano'),
    node('musica', null, 0, 'Música'),
    node('reggaeton', 'urbano', 2, 'Reguetón', { idolCount: 3 }),
    node('trap', 'urbano', 2, 'Trap', { position: 1 }),
    node('sin-clasificar', null, 0, 'Sin clasificar', { position: 9 }),
];

describe('classification tree (admin)', () => {
    test('depth-first rows, parents before children', () => {
        assert.deepEqual(
            categoryRows(tree).map((r) => `${'  '.repeat(r.depth)}${r.node.id}`),
            ['musica', '  urbano', '    reggaeton', '    trap', 'sin-clasificar'],
        );
    });

    test('readable paths in either language', () => {
        assert.equal(categoryPath('reggaeton', tree), 'Música › Urbano › Reguetón');
        assert.equal(categoryPath('trap', tree, 'en'), 'Música (en) › Urbano (en) › Trap (en)');
    });

    test('only an empty leaf can be deleted; never "Sin clasificar"; 4 levels at most', () => {
        const rows = new Map(categoryRows(tree).map((r) => [r.node.id, r]));
        assert.equal(canDeleteCategory(rows.get('trap')!), true);
        assert.equal(canDeleteCategory(rows.get('reggaeton')!), false); // has idols
        assert.equal(canDeleteCategory(rows.get('urbano')!), false); // has children
        assert.equal(canDeleteCategory(rows.get('sin-clasificar')!), false);
        assert.equal(canAddChild(node('club', 'liga', 3, 'Club')), false);
        assert.equal(canAddChild(tree[4]), false);
        assert.equal(canAddChild(tree[0]), true);
    });

    test('regions and tags match what the API validates', () => {
        assert.equal(isValidRegion('CO'), true);
        assert.equal(isValidRegion('CO-ANT'), true);
        assert.equal(isValidRegion('Colombia'), false);
        assert.equal(toTag('  Música Popular! '), 'musica-popular');
    });

    test('tags: distinct slugs, and how many are over the cap of 10', () => {
        assert.deepEqual(parseTags('Reguetón, reggaeton , reguetón,, '), { tags: ['regueton', 'reggaeton'], over: 0 });
        const eleven = Array.from({ length: 11 }, (_, i) => `tag${i}`).join(',');
        assert.equal(parseTags(eleven).tags.length, 11);
        assert.equal(parseTags(eleven).over, 1);
        assert.equal(MAX_TAGS, 10);
    });
});
