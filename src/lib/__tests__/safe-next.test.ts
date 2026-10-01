import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { safeNextPath } from '../safe-next.ts';

describe('safeNextPath (post-login redirect)', () => {
    test('keeps local paths with their query (the collaboration token survives login)', () => {
        assert.equal(safeNextPath('/dashboard/collaborations?token=abc'), '/dashboard/collaborations?token=abc');
        assert.equal(safeNextPath('/dashboard/events/1#live'), '/dashboard/events/1#live');
    });

    test('refuses other origins and oddities', () => {
        for (const bad of [
            'https://evil.com',
            '//evil.com',
            '/\\evil.com',
            '\\\\evil.com',
            '/\t/evil.com',
            'evil.com',
            '%2F%2Fevil.com',
            'javascript:alert(1)',
            'javascript:',
            '/dash\u0000board',
        ]) {
            assert.equal(safeNextPath(bad), '/dashboard', bad);
        }
        assert.equal(safeNextPath(null), '/dashboard');
        assert.equal(safeNextPath(''), '/dashboard');
    });

    test('refuses dot segments that collapse into another host', () => {
        for (const bad of ['/..//evil.com', '/.//evil.com', '/a/..//evil.com', '/./..//evil.com/x?y=1']) {
            assert.equal(safeNextPath(bad), '/dashboard', bad);
        }
    });

    test('normalises harmless dot segments instead of passing them through', () => {
        assert.equal(safeNextPath('/dashboard/../dashboard/team'), '/dashboard/team');
    });
});
