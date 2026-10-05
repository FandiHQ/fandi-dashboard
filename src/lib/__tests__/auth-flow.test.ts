import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    PASSWORD_MIN_LENGTH,
    DashboardAccessError,
    SyncFailedError,
    authLinkProblem,
    currentPasswordErrorKey,
    dashboardAccessOf,
    loginErrorKey,
    newPasswordChecks,
    parseAuthLink,
    passwordUpdateErrorKey,
    resetPasswordRedirectUrl,
    resetRequestOutcome,
    sessionSyncFailure,
    validateNewPassword,
    validatePasswordChange,
    withOneRetry,
} from '../auth-flow.ts';

const org = { id: 'o1', name: 'Karol G', logoUrl: null, memberRole: 'owner' };

describe('validateNewPassword', () => {
    test('needs the minimum length first, then a matching confirmation', () => {
        const short = 'a'.repeat(PASSWORD_MIN_LENGTH - 1);
        const ok = 'a'.repeat(PASSWORD_MIN_LENGTH);
        assert.equal(validateNewPassword(short, short), 'tooShort');
        assert.equal(validateNewPassword('', ''), 'tooShort');
        assert.equal(validateNewPassword(ok, `${ok}x`), 'mismatch');
        assert.equal(validateNewPassword(ok, ok), null);
    });
});

describe('newPasswordChecks (live checklist)', () => {
    test('length ticks at the minimum; match only once something is typed twice', () => {
        const ok = 'b'.repeat(PASSWORD_MIN_LENGTH);
        assert.deepEqual(newPasswordChecks('', ''), { length: false, match: false });
        assert.deepEqual(newPasswordChecks(ok, ''), { length: true, match: false });
        assert.deepEqual(newPasswordChecks('abc', 'abc'), { length: false, match: true });
        assert.deepEqual(newPasswordChecks(ok, ok), { length: true, match: true });
    });
});

describe('validatePasswordChange (settings)', () => {
    const next = 'n'.repeat(PASSWORD_MIN_LENGTH);

    test('asks for the current password first', () => {
        assert.equal(validatePasswordChange('', next, next), 'currentRequired');
    });

    test('then the new-password rules, then "different from the current one"', () => {
        assert.equal(validatePasswordChange('old-pass', 'short', 'short'), 'tooShort');
        assert.equal(validatePasswordChange('old-pass', next, `${next}x`), 'mismatch');
        assert.equal(validatePasswordChange(next, next, next), 'sameAsCurrent');
        assert.equal(validatePasswordChange('old-pass', next, next), null);
    });
});

describe('resetPasswordRedirectUrl', () => {
    test('always lands on /reset-password of this origin', () => {
        assert.equal(resetPasswordRedirectUrl('http://localhost:3000'), 'http://localhost:3000/reset-password');
        assert.equal(resetPasswordRedirectUrl('https://fandi.app/'), 'https://fandi.app/reset-password');
    });
});

describe('resetRequestOutcome (forgot password, no enumeration)', () => {
    test('success and every account-related failure look the same', () => {
        assert.equal(resetRequestOutcome(null), 'sent');
        assert.equal(resetRequestOutcome({ code: 'user_not_found', status: 400 }), 'sent');
        assert.equal(resetRequestOutcome({ code: 'email_address_invalid', status: 400 }), 'sent');
        assert.equal(resetRequestOutcome(new Error('anything')), 'sent');
    });

    test('only rate limits and dead connections get their own message', () => {
        assert.equal(resetRequestOutcome({ code: 'over_email_send_rate_limit', status: 429 }), 'tooManyAttempts');
        assert.equal(resetRequestOutcome({ name: 'AuthRetryableFetchError', status: 0 }), 'networkError');
    });
});

describe('currentPasswordErrorKey (settings)', () => {
    test('a failed check of the current password', () => {
        assert.equal(currentPasswordErrorKey({ code: 'invalid_credentials', status: 400 }), 'currentWrong');
        assert.equal(currentPasswordErrorKey({ status: 429 }), 'tooManyAttempts');
        assert.equal(currentPasswordErrorKey(new TypeError('Failed to fetch')), 'networkError');
    });
});

describe('authLinkProblem', () => {
    test('expired links get their own copy; the rest are "invalid"', () => {
        assert.equal(authLinkProblem('otp_expired'), 'expired');
        assert.equal(authLinkProblem('bad_jwt'), 'invalid');
        assert.equal(authLinkProblem(null), 'invalid');
    });
});

describe('dashboardAccessOf', () => {
    test('fans never get the panel, even with a membership', () => {
        assert.equal(dashboardAccessOf({ role: 'fan', organization: null }), 'fan');
        assert.equal(dashboardAccessOf({ role: 'fan', organization: org }), 'fan');
    });

    test('team accounts need an organization', () => {
        assert.equal(dashboardAccessOf({ role: 'organizer', organization: null }), 'noOrg');
        assert.equal(dashboardAccessOf({ role: 'staff', organization: null }), 'noOrg');
        assert.equal(dashboardAccessOf({ role: 'organizer', organization: org }), 'ok');
        assert.equal(dashboardAccessOf({ role: 'admin', organization: org }), 'ok');
    });
});

describe('loginErrorKey', () => {
    test('says why only after a correct password', () => {
        assert.equal(loginErrorKey(new DashboardAccessError('fan')), 'noAccessFan');
        assert.equal(loginErrorKey(new DashboardAccessError('noOrg')), 'noAccessNoOrg');
        assert.equal(loginErrorKey({ code: 'email_not_confirmed', status: 400 }), 'emailNotConfirmed');
    });

    test('keeps every real auth failure neutral (no account enumeration)', () => {
        assert.equal(loginErrorKey({ code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' }), 'invalidCredentials');
        assert.equal(loginErrorKey({ code: 'user_not_found', status: 400 }), 'invalidCredentials');
        assert.equal(loginErrorKey(new Error('weird')), 'invalidCredentials');
        assert.equal(loginErrorKey(null), 'invalidCredentials');
        assert.equal(loginErrorKey('string'), 'invalidCredentials');
    });

    test('tells rate limits and connection problems apart', () => {
        assert.equal(loginErrorKey({ code: 'over_request_rate_limit', status: 429 }), 'tooManyAttempts');
        assert.equal(loginErrorKey({ status: 429 }), 'tooManyAttempts');
        assert.equal(loginErrorKey({ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }), 'networkError');
        assert.equal(loginErrorKey({ name: 'ApiError', code: 'NETWORK_ERROR', status: 0 }), 'networkError');
        assert.equal(loginErrorKey(new TypeError('Failed to fetch')), 'networkError');
    });

    test('password right but the API did not answer', () => {
        assert.equal(loginErrorKey(new SyncFailedError({ name: 'ApiError', code: 'NETWORK_ERROR', status: 0 })), 'apiUnavailable');
        assert.equal(loginErrorKey(new SyncFailedError({ name: 'ApiError', code: 'ERROR', status: 503 })), 'apiUnavailable');
        assert.equal(loginErrorKey(new SyncFailedError({ name: 'ApiError', code: 'ERROR', status: 400 })), 'loginFailed');
    });

    test('the access error keeps the legacy message', () => {
        const err = new DashboardAccessError('noOrg');
        assert.equal(err.message, 'NO_DASHBOARD_ACCESS');
        assert.ok(err instanceof Error);
    });
});

describe('passwordUpdateErrorKey', () => {
    test('maps the Supabase codes a person can act on', () => {
        assert.equal(passwordUpdateErrorKey({ code: 'same_password', status: 422 }), 'samePassword');
        assert.equal(passwordUpdateErrorKey({ code: 'weak_password', status: 422 }), 'weakPassword');
        assert.equal(passwordUpdateErrorKey({ name: 'AuthWeakPasswordError' }), 'weakPassword');
        assert.equal(passwordUpdateErrorKey({ code: 'reauthentication_needed', status: 400 }), 'reauthNeeded');
        assert.equal(passwordUpdateErrorKey({ name: 'AuthSessionMissingError', status: 400 }), 'linkExpired');
        assert.equal(passwordUpdateErrorKey({ code: 'session_not_found', status: 403 }), 'linkExpired');
        assert.equal(passwordUpdateErrorKey({ status: 401 }), 'linkExpired');
        assert.equal(passwordUpdateErrorKey({ code: 'over_email_send_rate_limit', status: 429 }), 'tooManyAttempts');
        assert.equal(passwordUpdateErrorKey({ name: 'AuthRetryableFetchError', status: 0 }), 'networkError');
        assert.equal(passwordUpdateErrorKey(new Error('boom')), 'updateFailed');
    });
});

describe('parseAuthLink', () => {
    const base = 'http://localhost:3000/reset-password';

    test('implicit flow: tokens in the hash', () => {
        assert.deepEqual(
            parseAuthLink(`${base}#access_token=at&expires_in=3600&refresh_token=rt&token_type=bearer&type=recovery`),
            { kind: 'tokens', accessToken: 'at', refreshToken: 'rt', type: 'recovery' },
        );
        assert.deepEqual(
            parseAuthLink('http://localhost:3000/invite/accept#access_token=at&refresh_token=rt&type=invite'),
            { kind: 'tokens', accessToken: 'at', refreshToken: 'rt', type: 'invite' },
        );
    });

    test('custom email template: token_hash in the query', () => {
        assert.deepEqual(parseAuthLink(`${base}?token_hash=th&type=recovery`), {
            kind: 'tokenHash', tokenHash: 'th', type: 'recovery',
        });
        assert.deepEqual(parseAuthLink(`${base}?token_hash=th`), {
            kind: 'tokenHash', tokenHash: 'th', type: 'recovery',
        });
    });

    test('PKCE flow: code in the query', () => {
        assert.deepEqual(parseAuthLink(`${base}?code=abc`), { kind: 'code', code: 'abc' });
    });

    test('expired or used links, in the hash or the query', () => {
        assert.deepEqual(
            parseAuthLink(`${base}#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`),
            { kind: 'error', errorCode: 'otp_expired' },
        );
        assert.deepEqual(parseAuthLink(`${base}?error=access_denied&error_description=x`), { kind: 'error', errorCode: null });
        // An error wins over tokens that may also be present.
        assert.equal(parseAuthLink(`${base}#access_token=at&refresh_token=rt&error=server_error`).kind, 'error');
    });

    test('a bare visit or half a token pair is no link', () => {
        assert.deepEqual(parseAuthLink(base), { kind: 'none' });
        assert.deepEqual(parseAuthLink(`${base}#access_token=at`), { kind: 'none' });
        assert.deepEqual(parseAuthLink('not a url'), { kind: 'none' });
    });
});

describe('withOneRetry (sync after sign-in)', () => {
    const noWait = async () => {};

    test('a transient failure gets exactly one more try', async () => {
        let calls = 0;
        const result = await withOneRetry(async () => {
            calls += 1;
            if (calls === 1) throw { name: 'ApiError', code: 'NETWORK_ERROR', status: 0 };
            return 'ok';
        }, 0, noWait);
        assert.equal(result, 'ok');
        assert.equal(calls, 2);
    });

    test('gives up after the second transient failure', async () => {
        let calls = 0;
        await assert.rejects(withOneRetry(async () => {
            calls += 1;
            throw { status: 502 };
        }, 0, noWait));
        assert.equal(calls, 2);
    });

    test('a non-transient failure is not retried', async () => {
        let calls = 0;
        await assert.rejects(withOneRetry(async () => {
            calls += 1;
            throw { status: 403, code: 'FORBIDDEN' };
        }, 0, noWait));
        assert.equal(calls, 1);
    });
});

describe('sessionSyncFailure (page load with a session)', () => {
    test('API down, restarting or timing out keeps the session', () => {
        assert.equal(sessionSyncFailure({ name: 'ApiError', code: 'NETWORK_ERROR', status: 0 }), 'keepAndRetry');
        assert.equal(sessionSyncFailure({ status: 502 }), 'keepAndRetry');
        assert.equal(sessionSyncFailure({ status: 503 }), 'keepAndRetry');
        assert.equal(sessionSyncFailure(new TypeError('Failed to fetch')), 'keepAndRetry');
    });

    test('an actual rejection closes it', () => {
        assert.equal(sessionSyncFailure({ status: 401, code: 'UNAUTHORIZED' }), 'signOut');
        assert.equal(sessionSyncFailure({ status: 403, code: 'FORBIDDEN' }), 'signOut');
        assert.equal(sessionSyncFailure({ status: 404 }), 'signOut');
    });
});
