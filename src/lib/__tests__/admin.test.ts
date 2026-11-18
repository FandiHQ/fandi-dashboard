import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    ADMIN_ERROR_KEYS, AUDIT_ACTIONS, AUDIT_TARGET_TYPES, KYC_STATUSES,
    adminErrorKey, auditActionKey, auditDetailsSummary, auditQueryParams, auditTargetHref, canSearchUsers,
    cleanParams, createIdolPayload, createdOutcome, formatDateOnly, formatWaiting, ownerInvitationPayload,
    ownerInvitationState, pageCount, pageRange, reconcileOutcome, resendRetryAt, validKycReason,
    validateCreateIdol, validateOwnerInvitation,
} from '../admin.ts';

const apiError = (code: string, status: number, details: Record<string, unknown> = {}) => ({ code, status, details });

describe('adminErrorKey', () => {
    test('maps every typed code of the admin API to its own copy', () => {
        const cases: [string, number, string][] = [
            ['ADMIN_REQUIRED', 403, 'adminRequired'],
            ['MFA_REQUIRED', 403, 'mfaRequired'],
            ['UNKNOWN_CATEGORY', 400, 'unknownCategory'],
            ['NOTHING_TO_UPDATE', 400, 'nothingToUpdate'],
            ['ORGANIZATION_NOT_FOUND', 404, 'organizationNotFound'],
            ['EMAIL_REQUIRED', 400, 'emailRequired'],
            ['RESEND_LIMIT', 429, 'resendLimit'],
            ['INVITATION_PENDING', 409, 'invitationPending'],
            ['INVITATION_NOT_PENDING', 409, 'invitationNotPending'],
            ['QUERY_TOO_SHORT', 400, 'queryTooShort'],
            ['USER_NOT_FOUND', 404, 'userNotFound'],
            ['VERIFICATION_NOT_FOUND', 404, 'verificationNotFound'],
        ];
        for (const [code, status, key] of cases) assert.equal(adminErrorKey(apiError(code, status)), key, code);
    });

    test('falls back on the status when there is no code', () => {
        assert.equal(adminErrorKey(apiError('ERROR', 404)), 'notFound'); // reconcile: "Top-up not found"
        assert.equal(adminErrorKey(apiError('ERROR', 429)), 'tooManyRequests');
        assert.equal(adminErrorKey(apiError('ERROR', 400)), 'invalid');
        assert.equal(adminErrorKey(apiError('ERROR', 403)), 'adminRequired');
        assert.equal(adminErrorKey(apiError('ERROR', 502)), 'server');
        assert.equal(adminErrorKey(apiError('NETWORK_ERROR', 0)), 'network');
        assert.equal(adminErrorKey(null), 'generic');
        assert.equal(adminErrorKey(new Error('boom')), 'generic');
    });

    test('reads retryAt from a RESEND_LIMIT body', () => {
        assert.equal(resendRetryAt(apiError('RESEND_LIMIT', 429, { retryAt: '2026-11-18T15:00:00.000Z' })), '2026-11-18T15:00:00.000Z');
        assert.equal(resendRetryAt(apiError('RESEND_LIMIT', 429, { retryAt: 'nope' })), null);
        assert.equal(resendRetryAt(apiError('RESEND_LIMIT', 429)), null);
    });
});

describe('Crear ídolo', () => {
    const base = { name: ' Yalí ', categoryId: '', isPublic: false, ownerEmail: ' Manager@Yali.co ', ownerName: '' };

    test('validates the required fields and the limits', () => {
        assert.equal(validateCreateIdol(base), null);
        assert.deepEqual(validateCreateIdol({ ...base, name: '  ', ownerEmail: '' }), { name: 'required', ownerEmail: 'required' });
        assert.deepEqual(validateCreateIdol({ ...base, ownerEmail: 'manager@yali' }), { ownerEmail: 'invalid' });
        assert.deepEqual(validateCreateIdol({ ...base, name: 'x'.repeat(256) }), { name: 'tooLong' });
        assert.deepEqual(validateCreateIdol({ ...base, ownerName: 'x'.repeat(101) }), { ownerName: 'tooLong' });
    });

    test('the payload is trimmed and leaves out empty optional fields', () => {
        assert.deepEqual(createIdolPayload(base), { name: 'Yalí', isPublic: false, ownerEmail: 'manager@yali.co' });
        assert.deepEqual(
            createIdolPayload({ ...base, categoryId: 'c1', isPublic: true, ownerName: ' Ana ' }),
            { name: 'Yalí', categoryId: 'c1', isPublic: true, ownerEmail: 'manager@yali.co', ownerName: 'Ana' },
        );
    });

    test('says when the email could not be sent (false or 0)', () => {
        assert.equal(createdOutcome({ emailed: true }), 'sent');
        assert.equal(createdOutcome({ emailed: 1 }), 'sent');
        assert.equal(createdOutcome({ emailed: false }), 'notSent');
        assert.equal(createdOutcome({ emailed: 0 }), 'notSent');
        assert.equal(createdOutcome({ emailed: undefined }), 'notSent');
    });
});

describe('owner invitation', () => {
    const now = new Date('2026-11-17T12:00:00Z');
    const inv = { status: 'pending', expiresAt: '2026-11-24T12:00:00Z', needsResend: false };

    test('state: none, pending, needs resend, expired (also past expiry before the sweep)', () => {
        assert.equal(ownerInvitationState(null, now), 'none');
        assert.equal(ownerInvitationState(inv, now), 'pending');
        assert.equal(ownerInvitationState({ ...inv, needsResend: true }, now), 'needsResend');
        assert.equal(ownerInvitationState({ ...inv, status: 'expired' }, now), 'expired');
        assert.equal(ownerInvitationState({ ...inv, expiresAt: '2026-11-17T11:59:00Z' }, now), 'expired');
    });

    test('same email or none = plain resend; another email replaces it', () => {
        assert.deepEqual(ownerInvitationPayload({ email: '', name: '' }, 'a@b.co'), {});
        assert.deepEqual(ownerInvitationPayload({ email: ' A@B.co ', name: 'Ana' }, 'a@b.co'), {});
        assert.deepEqual(ownerInvitationPayload({ email: 'new@b.co', name: ' Ana ' }, 'a@b.co'), { email: 'new@b.co', name: 'Ana' });
        assert.deepEqual(ownerInvitationPayload({ email: 'new@b.co', name: '' }, null), { email: 'new@b.co' });
    });

    test('an org without an invitation needs an email', () => {
        assert.deepEqual(validateOwnerInvitation({ email: '', name: '' }, null), { email: 'required' });
        assert.equal(validateOwnerInvitation({ email: '', name: '' }, 'a@b.co'), null);
        assert.deepEqual(validateOwnerInvitation({ email: 'nope', name: '' }, 'a@b.co'), { email: 'invalid' });
    });
});

describe('paging and queries', () => {
    test('pages and the visible range', () => {
        assert.equal(pageCount(0, 25), 1);
        assert.equal(pageCount(25, 25), 1);
        assert.equal(pageCount(26, 25), 2);
        assert.deepEqual(pageRange(2, 25, 60), { from: 26, to: 50 });
        assert.deepEqual(pageRange(3, 25, 60), { from: 51, to: 60 });
        assert.equal(pageRange(1, 25, 0), null);
        assert.equal(pageRange(4, 25, 60), null);
    });

    test('only filters in use reach the query string; page 1 is implicit', () => {
        assert.deepEqual(cleanParams({ q: '  ', page: 1, state: 'stuck' }), { state: 'stuck' });
        assert.deepEqual(cleanParams({ q: ' ana ', page: 3, x: null, y: undefined }), { q: 'ana', page: '3' });
        assert.deepEqual(
            auditQueryParams(2, { action: 'user.view', targetType: '', targetId: ' 42 ' }),
            { page: '2', action: 'user.view', targetId: '42' },
        );
    });

    test('Fans search needs 3 characters', () => {
        assert.equal(canSearchUsers('an'), false);
        assert.equal(canSearchUsers('  an  '), false);
        assert.equal(canSearchUsers('ana'), true);
    });
});

describe('formatting', () => {
    test('waiting time', () => {
        assert.equal(formatWaiting(0), '0 min');
        assert.equal(formatWaiting(12), '12 min');
        assert.equal(formatWaiting(125), '2 h 05 min');
        assert.equal(formatWaiting(1440), '1 d');
        assert.equal(formatWaiting(3 * 1440 + 4 * 60 + 7), '3 d 4 h');
        assert.equal(formatWaiting(-5), '0 min');
        assert.equal(formatWaiting(Number.NaN), '0 min');
    });

    test('a birth date stays the same day in any zone', () => {
        assert.match(formatDateOnly('1990-01-01', 'es') ?? '', /1 de enero de 1990/);
        assert.match(formatDateOnly('1990-01-01', 'en') ?? '', /January 1, 1990/);
        assert.equal(formatDateOnly('1990-1-1', 'es'), null);
        assert.equal(formatDateOnly(null, 'es'), null);
    });

    test('audit details in one short line', () => {
        assert.equal(auditDetailsSummary({ query: 'ana', results: 3 }), 'query: ana · results: 3');
        assert.equal(auditDetailsSummary({ a: 1, b: 2, c: 3, d: 4, e: 5 }), 'a: 1 · b: 2 · c: 3 · +2');
        assert.equal(auditDetailsSummary({ nested: { x: 1 }, none: null }), 'nested: {"x":1} · none: null');
        assert.equal(auditDetailsSummary({ long: 'x'.repeat(60) }, 3, 10), `long: ${'x'.repeat(9)}…`);
        assert.equal(auditDetailsSummary({}), '');
        assert.equal(auditDetailsSummary(null), '');
    });

    test('audit actions and targets', () => {
        assert.equal(auditActionKey('org.create'), 'org_create');
        assert.equal(auditActionKey('classification.idol_set'), 'classification_idol_set');
        assert.equal(auditActionKey('something.new'), null);
        assert.equal(auditTargetHref('user', 'u-1'), '/admin/fans/u-1');
        assert.equal(auditTargetHref('organization', 'o-1'), null);
        assert.equal(auditTargetHref('user', null), null);
    });

    test('KYC reasons and reconcile outcomes', () => {
        assert.equal(validKycReason('  ab '), false);
        assert.equal(validKycReason('Pago con tarjeta robada'), true);
        assert.equal(validKycReason('x'.repeat(501)), false);
        assert.equal(reconcileOutcome('completed'), 'completed');
        assert.equal(reconcileOutcome('failed'), 'failed');
        assert.equal(reconcileOutcome('expired'), 'expired');
        assert.equal(reconcileOutcome('pending'), 'pending');
        assert.equal(reconcileOutcome(undefined), 'pending');
    });
});

describe('Fandi Admin copy (es and en)', () => {
    const load = (lang: string) =>
        JSON.parse(readFileSync(new URL(`../../../messages/${lang}.json`, import.meta.url), 'utf8')).fandiAdmin;

    /** Every leaf path of a nested object ("a.b.c"). */
    const leaves = (value: unknown, prefix = ''): string[] =>
        value && typeof value === 'object'
            ? Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k))
            : [prefix];

    test('both languages have the same keys', () => {
        assert.deepEqual(leaves(load('en')).sort(), leaves(load('es')).sort());
    });

    test('every error, action, target and KYC state has copy', () => {
        for (const lang of ['es', 'en']) {
            const copy = load(lang);
            for (const key of ADMIN_ERROR_KEYS) assert.equal(typeof copy.errors[key], 'string', `${lang} errors.${key}`);
            for (const action of AUDIT_ACTIONS) {
                const key = auditActionKey(action)!;
                assert.equal(typeof copy.audit.actions[key], 'string', `${lang} audit.actions.${key}`);
            }
            for (const target of AUDIT_TARGET_TYPES) {
                assert.equal(typeof copy.audit.targets[target], 'string', `${lang} audit.targets.${target}`);
            }
            for (const status of [...KYC_STATUSES, 'none']) {
                assert.equal(typeof copy.fanDetail.kycStatus[status], 'string', `${lang} kycStatus.${status}`);
            }
            for (const outcome of ['completed', 'failed', 'expired', 'pending']) {
                assert.equal(typeof copy.topups.outcome[outcome], 'string', `${lang} topups.outcome.${outcome}`);
            }
        }
    });

    test('no long dashes anywhere (owner rule)', () => {
        for (const lang of ['es', 'en']) {
            assert.doesNotMatch(JSON.stringify(load(lang)), /[–—]/, lang);
        }
    });
});
