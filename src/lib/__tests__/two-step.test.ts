import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
    VERIFICATION_PATH,
    factorFriendlyName,
    groupSecret,
    isCompleteTotpCode,
    normalizeTotpCode,
    qrImageSrc,
    twoStepErrorKey,
    twoStepGate,
    twoStepRequiredNow,
    twoStepRequirementLabel,
    verificationStep,
    verificationUrl,
} from '../two-step.ts';
import { dashboardAccessOf, hasPanelAccess, postLoginPath } from '../auth-flow.ts';

const NOW = new Date('2026-11-17T15:00:00.000Z');
const FUTURE = '2026-12-01T15:00:00.000Z';
const PAST = '2026-11-01T15:00:00.000Z';

const owner = (requiredAfter: string | null) => ({
    role: 'organizer',
    mfa: requiredAfter ? { required: true, requiredAfter } : { required: false, requiredAfter: null },
});

describe('twoStepGate', () => {
    test('a verified authenticator: the code first, then nothing', () => {
        for (const facts of [owner(PAST), owner(null), { role: 'admin', mfa: null }]) {
            assert.deepEqual(
                twoStepGate({ ...facts, currentLevel: 'aal1', hasVerifiedFactor: true }, NOW),
                { kind: 'verify' },
            );
            assert.deepEqual(
                twoStepGate({ ...facts, currentLevel: 'aal2', hasVerifiedFactor: true }, NOW),
                { kind: 'ok' },
            );
        }
    });

    test('owner/admin: reminder banner with the date, then enrol after it', () => {
        assert.deepEqual(
            twoStepGate({ ...owner(FUTURE), currentLevel: 'aal1', hasVerifiedFactor: false }, NOW),
            { kind: 'remind', deadline: FUTURE },
        );
        assert.deepEqual(
            twoStepGate({ ...owner(PAST), currentLevel: 'aal1', hasVerifiedFactor: false }, NOW),
            { kind: 'enrol' },
        );
        // The deadline instant itself is enforced, like the API.
        assert.deepEqual(
            twoStepGate({ ...owner(NOW.toISOString()), currentLevel: 'aal1', hasVerifiedFactor: false }, NOW),
            { kind: 'enrol' },
        );
    });

    test('viewer/staff (no requirement) and older APIs (no mfa block) are left alone', () => {
        assert.deepEqual(twoStepGate({ ...owner(null), currentLevel: 'aal1', hasVerifiedFactor: false }, NOW), { kind: 'ok' });
        assert.deepEqual(twoStepGate({ role: 'organizer', currentLevel: null, hasVerifiedFactor: false }, NOW), { kind: 'ok' });
        assert.deepEqual(
            twoStepGate({ role: 'organizer', mfa: { required: true, requiredAfter: 'nope' }, currentLevel: null, hasVerifiedFactor: false }, NOW),
            { kind: 'ok' },
        );
    });

    test('Fandi admin: always, no reminder period', () => {
        assert.deepEqual(
            twoStepGate({ role: 'admin', mfa: { required: true, requiredAfter: null }, currentLevel: 'aal1', hasVerifiedFactor: false }, NOW),
            { kind: 'enrol' },
        );
        assert.equal(twoStepRequiredNow({ role: 'admin', mfa: null }, NOW), true);
    });
});

describe('verificationStep', () => {
    test('never bounces back while the API would still refuse', () => {
        // A clock behind the server's: the API said MFA_REQUIRED during "our" grace period.
        assert.equal(verificationStep({ ...owner(FUTURE), currentLevel: 'aal1', hasVerifiedFactor: false }), 'enrol');
        assert.equal(verificationStep({ ...owner(PAST), currentLevel: 'aal1', hasVerifiedFactor: true }), 'verify');
        assert.equal(verificationStep({ ...owner(PAST), currentLevel: 'aal2', hasVerifiedFactor: true }), 'done');
        assert.equal(verificationStep({ ...owner(null), currentLevel: 'aal1', hasVerifiedFactor: false }), 'done');
        assert.equal(verificationStep({ role: 'admin', currentLevel: 'aal1', hasVerifiedFactor: false }), 'enrol');
    });
});

describe('twoStepRequirementLabel', () => {
    test('what Configuración says per role', () => {
        assert.equal(twoStepRequirementLabel({ role: 'admin', mfa: null }, NOW), 'admin');
        assert.equal(twoStepRequirementLabel(owner(FUTURE), NOW), 'requiredFrom');
        assert.equal(twoStepRequirementLabel(owner(PAST), NOW), 'required');
        assert.equal(twoStepRequirementLabel(owner(null), NOW), 'optional');
    });
});

describe('code, secret and QR helpers', () => {
    test('the code: digits only, six of them', () => {
        assert.equal(normalizeTotpCode(' 123 456 '), '123456');
        assert.equal(normalizeTotpCode('12a3-4567'), '123456');
        assert.equal(isCompleteTotpCode('123456'), true);
        assert.equal(isCompleteTotpCode('12345'), false);
        assert.equal(isCompleteTotpCode('1234567'), false);
    });

    test('the secret in groups of four', () => {
        assert.equal(groupSecret('ABCDEFGHIJKLMNOP'), 'ABCD EFGH IJKL MNOP');
        assert.equal(groupSecret('ABCDEF'), 'ABCD EF');
    });

    test('the QR data URL is encoded (a # in the SVG cannot cut it)', () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path fill="#000"/></svg>';
        const src = qrImageSrc(`data:image/svg+xml;utf-8,${svg}`);
        assert.ok(src.startsWith('data:image/svg+xml;charset=utf-8,'));
        assert.ok(!src.includes('#'));
        assert.equal(decodeURIComponent(src.split(',').slice(1).join(',')), svg);
        assert.equal(qrImageSrc(svg), src);
        assert.equal(qrImageSrc('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
    });

    test('a unique factor name per enrolment', () => {
        assert.equal(factorFriendlyName(NOW), 'Fandi 2026-11-17 15:00');
    });
});

describe('verificationUrl', () => {
    test('keeps where the person was going, inside the app', () => {
        assert.equal(verificationUrl('/admin/fans?q=ana'), `${VERIFICATION_PATH}?next=%2Fadmin%2Ffans%3Fq%3Dana`);
        assert.equal(verificationUrl('//evil.com'), VERIFICATION_PATH);
        assert.equal(verificationUrl('https://evil.com'), VERIFICATION_PATH);
        assert.equal(verificationUrl(`${VERIFICATION_PATH}?next=/x`), VERIFICATION_PATH);
        assert.equal(verificationUrl(null), VERIFICATION_PATH);
    });
});

describe('twoStepErrorKey', () => {
    test('TOTP disabled in the Supabase project is told apart', () => {
        assert.equal(twoStepErrorKey({ code: 'mfa_totp_enroll_not_enabled', status: 422 }), 'disabled');
        assert.equal(twoStepErrorKey({ code: 'mfa_totp_verify_not_enabled', status: 422 }), 'disabled');
        assert.equal(twoStepErrorKey({ status: 422, message: 'MFA enroll is disabled for TOTP' }), 'disabled');
    });

    test('wrong / expired code, too many factors, needs aal2', () => {
        assert.equal(twoStepErrorKey({ code: 'mfa_verification_failed', status: 422 }), 'wrongCode');
        assert.equal(twoStepErrorKey({ status: 422, message: 'Invalid TOTP code entered' }), 'wrongCode');
        assert.equal(twoStepErrorKey({ code: 'mfa_challenge_expired' }), 'codeExpired');
        assert.equal(twoStepErrorKey({ code: 'too_many_enrolled_mfa_factors' }), 'tooManyFactors');
        assert.equal(twoStepErrorKey({ code: 'insufficient_aal', status: 403 }), 'needsCode');
    });

    test('session, rate limit, network, anything else', () => {
        assert.equal(twoStepErrorKey({ name: 'AuthSessionMissingError' }), 'sessionExpired');
        assert.equal(twoStepErrorKey({ status: 401 }), 'sessionExpired');
        assert.equal(twoStepErrorKey({ status: 429 }), 'tooManyAttempts');
        assert.equal(twoStepErrorKey({ code: 'over_request_rate_limit' }), 'tooManyAttempts');
        assert.equal(twoStepErrorKey({ name: 'AuthRetryableFetchError' }), 'networkError');
        assert.equal(twoStepErrorKey(new Error('boom')), 'failed');
        assert.equal(twoStepErrorKey(null), 'failed');
    });
});

describe('Fandi Admin access', () => {
    const org = { id: 'o1', name: 'Yalí', logoUrl: null, memberRole: 'owner' };

    test('an admin without an org gets the /admin area; with one, both', () => {
        assert.equal(dashboardAccessOf({ role: 'admin', organization: null }), 'admin');
        assert.equal(dashboardAccessOf({ role: 'admin', organization: org }), 'ok');
        assert.equal(hasPanelAccess('admin'), true);
        assert.equal(hasPanelAccess('noOrg'), false);
        assert.equal(hasPanelAccess('fan'), false);
    });

    test('where sign-in lands', () => {
        assert.equal(postLoginPath({ role: 'admin', organization: null }, '/dashboard'), '/admin');
        assert.equal(postLoginPath({ role: 'admin', organization: null }, '/admin/fans'), '/admin/fans');
        assert.equal(postLoginPath({ role: 'admin', organization: org }, '/dashboard/events'), '/dashboard/events');
        assert.equal(postLoginPath({ role: 'organizer', organization: org }, '/admin'), '/admin');
        assert.equal(postLoginPath({ role: 'organizer', organization: { ...org, memberRole: 'staff' } }, '/dashboard'), '/staff');
        assert.equal(postLoginPath({ role: 'organizer', organization: org }, '/dashboard/team'), '/dashboard/team');
    });
});
