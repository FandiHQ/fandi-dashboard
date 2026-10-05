import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Oportunidades are a knowledge contest, not a game of chance: no dashboard
 * or landing copy may describe winners as drawn, or talk luck or odds, in
 * either language. Also: es/en carry the same keys.
 */
const load = (name: string) =>
    JSON.parse(readFileSync(new URL(`../../../messages/${name}.json`, import.meta.url), 'utf8')) as Record<string, unknown>;

function strings(node: unknown, prefix = ''): [string, string][] {
    if (typeof node === 'string') return [[prefix, node]];
    if (node === null || typeof node !== 'object') return [];
    return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => strings(v, prefix ? `${prefix}.${k}` : k));
}

const BANNED_ES = /\b(sorte\w*|suerte|azar|apuesta\w*|chances?|probabilidad\w*|rifa\w*|rifan)\b/i;
const BANNED_EN = /\b(draw(n|s|ing)?|luck\w*|odds|chances?|lottery|raffle\w*|bet(s|ting)?|gambl\w*)\b/i;

describe('dashboard + landing copy', () => {
    const es = load('es');
    const en = load('en');

    test('Spanish never talks draw, luck or odds', () => {
        assert.deepEqual(strings(es).filter(([, text]) => BANNED_ES.test(text)), []);
    });

    test('English never talks draw, luck or odds', () => {
        assert.deepEqual(strings(en).filter(([, text]) => BANNED_EN.test(text)), []);
    });

    test('the patterns catch what they ban', () => {
        assert.equal(BANNED_ES.test('cada categoría sortea sus ganadores'), true);
        assert.equal(BANNED_ES.test('Fandea más'), false);
        assert.equal(BANNED_EN.test('winners are drawn'), true);
        assert.equal(BANNED_EN.test('a better withdrawal'), false);
    });

    test('categories share the number of winners, never "the same winners"', () => {
        assert.deepEqual(strings(es).filter(([, text]) => /\blos mismos ganadores\b/i.test(text)), []);
        assert.deepEqual(strings(en).filter(([, text]) => /\bthe same winners\b/i.test(text)), []);
        const landing = (o: Record<string, unknown>) => o.landingV2 as Record<string, Record<string, string>>;
        assert.match(landing(es).categorias.payoffB, /el mismo número de ganadores/);
        assert.match(landing(en).categorias.payoffB, /the same number of winners/);
    });

    test('the bank minimum in copy matches the editor (20)', () => {
        const es20 = strings(es).filter(([k]) => k.endsWith('CONTEST_BANK_INCOMPLETE'));
        assert.ok(es20.length > 0);
        for (const [, text] of [...es20, ...strings(en).filter(([k]) => k.endsWith('CONTEST_BANK_INCOMPLETE'))]) {
            assert.match(text, /\b20\b/);
        }
    });

    test('es and en have the same keys', () => {
        const keys = (o: Record<string, unknown>) => new Set(strings(o).map(([k]) => k));
        const a = keys(es);
        const b = keys(en);
        assert.deepEqual([...a].filter((k) => !b.has(k)), []);
        assert.deepEqual([...b].filter((k) => !a.has(k)), []);
    });

    test('the banner, the winners stepper and the bank note say what the brief requires', () => {
        const experiences = es.experiences as Record<string, Record<string, unknown>>;
        assert.match(String(experiences.list.howItWorks), /ganan quienes aciertan más rápido/);
        assert.equal(experiences.panel.sameWinners, 'El mismo número de ganadores en cada categoría');
        assert.equal(
            String((experiences.questions as Record<string, unknown>).blindNote).toUpperCase(),
            'LOS FANS NO SABEN SI ACERTARON HASTA EL CIERRE',
        );
    });
});
