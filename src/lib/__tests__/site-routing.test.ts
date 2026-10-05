import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isDashboardHost } from '../site-routing.ts';

describe('landing and dashboard host separation', () => {
    test('both dashboard hosts select staff login, including case and port', () => {
        for (const host of ['staging.dashboard.fandi.app', 'dashboard.fandi.app',
            'DASHBOARD.FANDI.APP:443', 'staging.dashboard.fandi.app:3000']) {
            assert.equal(isDashboardHost(host), true, host);
        }
    });
    test('public landing hosts and local previews remain landing pages', () => {
        for (const host of ['fandi.app', 'staging.fandi.app', 'localhost:3000', null]) {
            assert.equal(isDashboardHost(host), false, String(host));
        }
    });
    test('does not use substring or suffix matching', () => {
        for (const host of ['dashboard.fandi.app.attacker.test',
            'other-dashboard.fandi.app', 'attacker.test,dashboard.fandi.app']) {
            assert.equal(isDashboardHost(host), false, host);
        }
    });
});
