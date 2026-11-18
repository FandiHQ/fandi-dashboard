/**
 * The Supabase `auth.mfa` calls behind the two-step screens (enrol a TOTP
 * authenticator, verify a code, remove it). Every function returns the
 * Supabase error instead of throwing, so the screens map it with
 * `twoStepErrorKey` (lib/two-step.ts).
 */
import { supabase } from './supabase';
import { factorFriendlyName, qrImageSrc } from './two-step';

export interface TotpFactorInfo {
    id: string;
    friendlyName: string | null;
    createdAt: string;
}

export interface TotpEnrollment {
    factorId: string;
    /** <img src> for the QR (already URL-encoded). */
    qrSrc: string;
    /** For typing it into the app by hand. */
    secret: string;
}

type Result<T> = { data: T; error: null } | { data: null; error: unknown };

/** The app's client, or the one-off client of an email-link page. */
type AuthClient = Pick<typeof supabase, 'auth'>;

/** The account's verified TOTP factors (a fresh read from Supabase). */
export async function listVerifiedTotp(client: AuthClient = supabase): Promise<Result<TotpFactorInfo[]>> {
    const { data, error } = await client.auth.mfa.listFactors();
    if (error || !data) return { data: null, error: error ?? new Error('NO_DATA') };
    return {
        data: data.totp.map((f) => ({ id: f.id, friendlyName: f.friendly_name ?? null, createdAt: f.created_at })),
        error: null,
    };
}

/**
 * Starts a TOTP enrolment: drops any half-done (unverified) authenticator
 * left by an abandoned attempt, then asks Supabase for a new secret + QR.
 */
export async function startTotpEnrollment(): Promise<Result<TotpEnrollment>> {
    const listed = await supabase.auth.mfa.listFactors();
    if (!listed.error && listed.data) {
        const stale = listed.data.all.filter((f) => f.factor_type === 'totp' && f.status !== 'verified');
        for (const factor of stale) {
            await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
    }
    const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: factorFriendlyName(),
        issuer: 'Fandi',
    });
    if (error || !data) return { data: null, error: error ?? new Error('NO_DATA') };
    return { data: { factorId: data.id, qrSrc: qrImageSrc(data.totp.qr_code), secret: data.totp.secret }, error: null };
}

/** Confirms a code for `factorId`; on success the session becomes aal2. */
export async function verifyTotp(
    factorId: string,
    code: string,
    client: AuthClient = supabase,
): Promise<{ error: unknown | null }> {
    const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code });
    return { error: error ?? null };
}

/** The sign-in step: the code of the account's (first) verified authenticator. */
export async function verifyAccountCode(
    code: string,
    client: AuthClient = supabase,
): Promise<{ error: unknown | null }> {
    const listed = await listVerifiedTotp(client);
    if (listed.error || !listed.data) return { error: listed.error };
    const factor = listed.data[0];
    if (!factor) return { error: { code: 'mfa_factor_not_found' } };
    return verifyTotp(factor.id, code, client);
}

/**
 * The account has an authenticator this session has not used (a fresh
 * password sign-in, or a recovery link): Supabase refuses a password
 * change until the code is verified.
 */
export async function sessionNeedsCode(client: AuthClient = supabase): Promise<boolean> {
    try {
        const { data } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
        return data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
    } catch {
        return false;
    }
}

/**
 * Removes an authenticator (Supabase requires an aal2 session for a
 * verified one) and refreshes the session so its level matches the
 * account again.
 */
export async function removeTotp(factorId: string): Promise<{ error: unknown | null }> {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return { error };
    await supabase.auth.refreshSession();
    return { error: null };
}
