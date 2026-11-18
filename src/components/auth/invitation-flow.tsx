'use client';

/**
 * /invitacion: where a team invitation email lands (fandi-api RFC
 * invitations-and-admin). The link is {DASHBOARD_URL}/invitacion#t=<token>.
 *
 * 1. The token is read from the fragment once and dropped from the address
 *    bar (history, screenshots, Referer); it stays in memory only.
 * 2. POST /invitations/preview says what the invitation is (always 200).
 * 3. Exactly one view, one primary action (lib/invitations.ts decides):
 *    create a password (claim-account, sign in, accept) / sign in and
 *    accept / accept (signed in already) / signed in as someone else /
 *    expired / revoked / already accepted / another team / fan account /
 *    invalid. Terms and Privacy are accepted with the join.
 * 4. Joined: the session is reloaded (org context) and the person lands on
 *    /dashboard (staff: /staff).
 *
 * Sign-in uses the app's Supabase client directly (not AuthProvider.login,
 * which signs out accounts without a team: this person has none yet).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
    Ban, CheckCircle, Clock, Link2Off, Loader2, LogIn, LogOut, ShieldAlert, Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { invitationsApi } from '@/lib/api-hooks';
import { useAuth } from '@/contexts/auth-context';
import {
    PASSWORD_MIN_LENGTH, loginErrorKey, looksLikeEmail, validateNewPassword,
} from '@/lib/auth-flow';
import {
    emailMatchesHint, invitationOutcome, landingPathFor, passwordTooLong, readInvitationToken, viewForPreview,
    type InvitationView,
} from '@/lib/invitations';
import { colombiaDateTime } from '@/lib/colombia-time';
import type { AcceptInvitationResult, InvitationPreview } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { IdolAvatar } from '@/components/collaborations/IdolAvatar';
import { AuthShellChecking, AuthShellHeader } from './auth-shell';
import { AUTH_FIELD_CLASS, AUTH_LABEL_CLASS, FormAlert, NewPasswordFields, PasswordInput } from './password-fields';
import { ForgotPasswordForm } from './forgot-password-form';

type Loaded = { token: string; preview: InvitationPreview } | { token: string; failed: true };

const SUBMIT_CLASS =
    'mt-1 h-auto min-h-[58px] w-full whitespace-normal rounded-[14px] py-3 text-[16px] font-black leading-tight [font-stretch:115%] shadow-ext-block sm:text-[18px]';

const noSubscribe = () => () => {};

/** Same path, no fragment: the token never stays in the address bar or history. */
function dropFragment() {
    if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
}

export function InvitationFlow() {
    const t = useTranslations('invitation');
    const tAuth = useTranslations('auth');
    const router = useRouter();
    const { isLoading: authLoading, refreshUser, retrySession } = useAuth();

    // The token is read on the client's first render, before the effect
    // below drops it from the URL. That render is the hydration one, so it
    // shows "checking" like the server did (hydrated is false there).
    const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
    const [token, setToken] = useState<string | null | undefined>(() =>
        typeof window === 'undefined' ? undefined : readInvitationToken(window.location.hash),
    );
    const [loaded, setLoaded] = useState<Loaded | null>(null);
    const [attempt, setAttempt] = useState(0);
    /** The email signed in on this browser; undefined until checked. */
    const [sessionEmail, setSessionEmail] = useState<string | null | undefined>(undefined);
    /** A view forced by an answer of the API (the invitation changed, or the account cannot join). */
    const [override, setOverride] = useState<{ token: string; view: InvitationView; accountExists?: boolean } | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [knownEmail, setKnownEmail] = useState('');
    const [joining, setJoining] = useState(false);
    /** Bumped when another invitation link opens in this tab: who is signed in is read again. */
    const [sessionCheck, setSessionCheck] = useState(0);
    /** The email this page signed in with (a session it may close again); null when none. */
    const signedInHere = useRef<string | null>(null);

    // Drop the fragment at once; a second invitation link opened in this
    // same tab (only the fragment changes) starts over, session included
    // (another tab may have signed in or out meanwhile).
    useEffect(() => {
        dropFragment();
        const onHashChange = () => {
            const next = readInvitationToken(window.location.hash);
            if (!next) return;
            dropFragment();
            setOverride(null);
            setFormError(null);
            // Another invitation: consent is asked again.
            setTermsAccepted(false);
            setSessionEmail(undefined);
            setSessionCheck((n) => n + 1);
            setToken(next);
        };
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    useEffect(() => {
        if (!token) return;
        let active = true;
        invitationsApi.preview(token).then(
            (preview) => { if (active) setLoaded({ token, preview }); },
            () => { if (active) setLoaded({ token, failed: true }); },
        );
        return () => { active = false; };
    }, [token, attempt]);

    // Who is signed in here, once the AuthProvider settled (it closes
    // sessions that have no panel, so what is left is a team account).
    useEffect(() => {
        if (authLoading) return;
        let active = true;
        supabase.auth.getSession().then(
            ({ data }) => { if (active) setSessionEmail(data.session?.user?.email ?? null); },
            () => { if (active) setSessionEmail(null); },
        );
        return () => { active = false; };
    }, [authLoading, sessionCheck]);

    const current = loaded && loaded.token === token ? loaded : null;
    const preview = current && !('failed' in current) ? current.preview : null;
    const forced = override && override.token === token ? override : null;

    if (joining) return <AuthShellChecking label={t('joining')} />;
    if (!hydrated || token === undefined || (token && !current) || (preview && sessionEmail === undefined)) {
        return <AuthShellChecking label={t('checking')} />;
    }
    if (current && 'failed' in current) {
        return (
            <>
                <AuthShellHeader tone="alert" icon={<ShieldAlert size={22} />} title={t('loadError.title')}>
                    <p className="text-[15px] leading-relaxed text-body-white">{t('loadError.body')}</p>
                </AuthShellHeader>
                <Button size="lg" className={SUBMIT_CLASS} onClick={() => { setLoaded(null); setAttempt((n) => n + 1); }}>
                    {t('retry')}
                </Button>
            </>
        );
    }

    const view: InvitationView = !token || !preview
        ? 'invalid'
        : forced?.view ?? viewForPreview(preview, sessionEmail ?? null);

    // ── Shared steps ──

    /** Joined: reload the session (now with its team) and enter. */
    const finish = async (result: AcceptInvitationResult) => {
        setJoining(true);
        await retrySession();
        toast.success(t('joinedToast', { org: result.organizationName }));
        router.replace(landingPathFor(result.role));
    };

    /**
     * A failed claim/accept: another view, or a message on the current form.
     * A session this page opened is closed again when it leads nowhere; a
     * team account that was already signed in is never touched.
     */
    const fail = async (err: unknown) => {
        if (!token) return;
        const mine = signedInHere.current;
        const outcome = invitationOutcome(err);
        if (outcome.kind === 'message') {
            setFormError(t(`errors.${outcome.key}`));
            if (mine) setSessionEmail(mine);
            return;
        }
        setFormError(null);
        if (outcome.view === 'otherAccount') {
            setSessionEmail(mine ?? sessionEmail ?? null);
        } else if (outcome.view === 'alreadyMember' || outcome.view === 'otherTeam') {
            // Already in a team: keep the session, it opens that panel.
            if (mine) setSessionEmail(mine);
            await refreshUser();
        } else if (mine) {
            // Nothing to enter with this account here: close it on this browser only.
            await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
            signedInHere.current = null;
            setSessionEmail(null);
        }
        setOverride({ token, view: outcome.view, accountExists: outcome.note === 'accountExists' });
    };

    const accept = async () => {
        if (!token) return;
        try {
            const result = await invitationsApi.accept(token);
            await finish(result);
        } catch (err) {
            await fail(err);
        }
    };

    /** Signs in on the app client (kept: it becomes the panel session once joined). */
    const signIn = async (email: string, password: string): Promise<boolean> => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setFormError(tAuth(loginErrorKey(error)));
            return false;
        }
        signedInHere.current = email;
        return true;
    };

    const signOutAndContinue = async () => {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        signedInHere.current = null;
        setOverride(null);
        setFormError(null);
        setSessionEmail(null);
    };

    const terms = (
        <TermsCheckbox
            checked={termsAccepted}
            onChange={(v) => { setTermsAccepted(v); setFormError(null); }}
        />
    );

    // ── Views ──

    if (view === 'createPassword' && preview && token) {
        return (
            <>
                <InvitationSummary preview={preview} live />
                <CreatePasswordForm
                    terms={terms}
                    termsAccepted={termsAccepted}
                    error={formError}
                    setError={setFormError}
                    onSubmit={async (password) => {
                        let email: string;
                        try {
                            ({ email } = await invitationsApi.claimAccount(token, password));
                        } catch (err) {
                            await fail(err);
                            return;
                        }
                        setKnownEmail(email);
                        // The login exists from now on (the preview said it did not).
                        setLoaded({ token, preview: { ...preview, accountExists: true } });
                        if (!(await signIn(email, password))) {
                            // The login exists now: ask for it like any account.
                            setOverride({ token, view: 'signIn' });
                            return;
                        }
                        await accept();
                    }}
                />
            </>
        );
    }

    if (view === 'signIn' && preview && token) {
        return (
            <>
                <InvitationSummary preview={preview} live />
                <SignInForm
                    hint={preview.emailHint}
                    accountExistsNote={!!forced?.accountExists}
                    initialEmail={knownEmail}
                    terms={terms}
                    termsAccepted={termsAccepted}
                    error={formError}
                    setError={setFormError}
                    onSubmit={async (email, password) => {
                        setKnownEmail(email);
                        if (await signIn(email, password)) await accept();
                    }}
                />
            </>
        );
    }

    if (view === 'accept' && preview && token) {
        return (
            <>
                <InvitationSummary preview={preview} live />
                <AcceptForm
                    email={sessionEmail ?? null}
                    terms={terms}
                    termsAccepted={termsAccepted}
                    error={formError}
                    setError={setFormError}
                    onSubmit={accept}
                    onNotYou={signOutAndContinue}
                />
            </>
        );
    }

    if (view === 'otherAccount' && preview) {
        const hint = preview.emailHint ?? '';
        return (
            <>
                <InvitationSummary preview={preview} live />
                <StepTitle title={t('otherAccount.title')}>
                    {sessionEmail
                        ? t('otherAccount.body', { email: sessionEmail, hint })
                        : t('otherAccount.bodyUnknown', { hint })}
                </StepTitle>
                <SignOutButton label={t('otherAccount.action')} onClick={signOutAndContinue} />
            </>
        );
    }

    return <DeadEnd view={view} preview={preview} />;
}

// ── Pieces ──

/** Who invites, to which team, as what (and what it allows), until when. */
function InvitationSummary({ preview, live = false }: { preview: InvitationPreview; live?: boolean }) {
    const t = useTranslations('invitation');
    const tTeam = useTranslations('team');
    const locale = useLocale();
    if (!preview.orgName) return null;
    const inviterLine = !live
        ? t('invitationTo')
        : preview.inviterName
            ? t('invitedBy', { inviter: preview.inviterName })
            : t('invitedByUnknown');
    const expires = live ? colombiaDateTime(preview.expiresAt, locale) : null;
    return (
        <section
            className="mb-6 flex flex-col gap-3 rounded-[14px] border-2 border-ink bg-white p-4 shadow-ext-sm"
            data-testid="invitation-summary"
        >
            <div className="flex items-center gap-3.5">
                <IdolAvatar name={preview.orgName} src={preview.orgAvatarUrl} size={52} />
                <div className="min-w-0">
                    <p className="label-mono text-[10px] text-muted-white">{inviterLine}</p>
                    <p className="mt-1 break-words font-display text-[22px] leading-tight text-ink">{preview.orgName}</p>
                </div>
            </div>
            {preview.role && (
                <div className="flex flex-col items-start gap-1.5">
                    <span className="label-mono inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-lilac px-2.5 py-0.5 font-bold text-ink">
                        <span className="sr-only">{t('roleLabel')}: </span>
                        {tTeam(`roles.${preview.role}`)}
                    </span>
                    {live && <p className="text-[14px] leading-snug text-body-white">{t(`allows.${preview.role}`)}</p>}
                </div>
            )}
            {(expires || (live && preview.emailHint)) && (
                <p className="flex flex-col gap-0.5 font-space-mono text-[11px] leading-snug text-muted-white">
                    {live && preview.emailHint && <span className="break-all">{t('sentTo', { hint: preview.emailHint })}</span>}
                    {expires && <span>{t('expires', { date: expires.date, time: expires.time })}</span>}
                </p>
            )}
        </section>
    );
}

function StepTitle({ title, children }: { title: string; children?: React.ReactNode }) {
    return (
        <div className="mb-5 flex flex-col gap-2">
            <h1 className="font-display text-[28px] leading-none text-ink sm:text-[30px]">{title}</h1>
            {children && <p className="text-[15px] leading-relaxed text-body-white">{children}</p>}
        </div>
    );
}

function TermsCheckbox({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
    const t = useTranslations('invitation');
    const link = 'font-bold text-blue underline decoration-2 underline-offset-2 hover:decoration-ink';
    return (
        <div className="flex items-start gap-3">
            <Checkbox
                id="invitation-terms"
                checked={checked}
                onCheckedChange={(v) => onChange(v === true)}
                className="mt-0.5 size-6"
                data-testid="invitation-terms"
            />
            <label htmlFor="invitation-terms" className="cursor-pointer text-[14px] leading-snug text-body-white">
                {t.rich('terms', {
                    // New tab: the invitation lives in this tab's memory only.
                    terms: (chunks) => <Link href="/terminos" target="_blank" rel="noopener" className={link}>{chunks}</Link>,
                    privacy: (chunks) => <Link href="/privacidad" target="_blank" rel="noopener" className={link}>{chunks}</Link>,
                })}
            </label>
        </div>
    );
}

interface FormProps {
    terms: React.ReactNode;
    termsAccepted: boolean;
    error: string | null;
    setError: (message: string | null) => void;
}

function SubmitButton({ busy, label, busyLabel, testId }: { busy: boolean; label: string; busyLabel: string; testId: string }) {
    return (
        <Button type="submit" size="lg" disabled={busy} className={SUBMIT_CLASS} data-testid={testId}>
            {busy ? (
                <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    {busyLabel}
                </>
            ) : label}
        </Button>
    );
}

function CreatePasswordForm({ terms, termsAccepted, error, setError, onSubmit }: FormProps & {
    onSubmit: (password: string) => Promise<void>;
}) {
    const t = useTranslations('invitation');
    const tAuth = useTranslations('auth');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [tried, setTried] = useState(false);
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (busy) return;
        setTried(true);
        const problem = validateNewPassword(password, confirm);
        if (problem) { setError(tAuth(`newPassword.${problem}`, { min: PASSWORD_MIN_LENGTH })); return; }
        if (passwordTooLong(password)) { setError(t('errors.tooLong')); return; }
        if (!termsAccepted) { setError(t('errors.termsRequired')); return; }
        setError(null);
        setBusy(true);
        try {
            await onSubmit(password);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <StepTitle title={t('create.title')}>{t('create.body')}</StepTitle>
            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                <NewPasswordFields
                    idPrefix="invitation"
                    password={password}
                    confirm={confirm}
                    onPasswordChange={(v) => { setPassword(v); setError(null); }}
                    onConfirmChange={(v) => { setConfirm(v); setError(null); }}
                    disabled={busy}
                    autoFocus
                    invalid={tried}
                />
                {terms}
                <FormAlert>{error}</FormAlert>
                <SubmitButton busy={busy} label={t('create.submit')} busyLabel={t('create.saving')} testId="invitation-create" />
            </form>
        </>
    );
}

function SignInForm({ hint, accountExistsNote, initialEmail, terms, termsAccepted, error, setError, onSubmit }: FormProps & {
    hint: string | null;
    accountExistsNote: boolean;
    initialEmail: string;
    onSubmit: (email: string, password: string) => Promise<void>;
}) {
    const t = useTranslations('invitation');
    const tAuth = useTranslations('auth');
    const [mode, setMode] = useState<'signIn' | 'forgot'>('signIn');
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);

    if (mode === 'forgot') {
        return <ForgotPasswordForm initialEmail={email} onBack={() => setMode('signIn')} idPrefix="invitation-forgot" />;
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (busy) return;
        const value = email.trim();
        if (!looksLikeEmail(value)) { setError(tAuth('invalidEmail')); return; }
        if (!emailMatchesHint(value, hint)) { setError(t('signIn.emailMismatch', { hint: hint ?? '' })); return; }
        if (!password) { setError(tAuth('passwordRequired')); return; }
        if (!termsAccepted) { setError(t('errors.termsRequired')); return; }
        setError(null);
        setBusy(true);
        try {
            await onSubmit(value, password);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <StepTitle title={t('signIn.title')}>
                {accountExistsNote ? t('signIn.accountExistsNote') : t('signIn.body', { hint: hint ?? '' })}
            </StepTitle>
            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                    <label htmlFor="invitation-email" className={AUTH_LABEL_CLASS}>{tAuth('email')}</label>
                    <Input
                        id="invitation-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder={tAuth('emailPlaceholder')}
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                        disabled={busy}
                        autoFocus={!initialEmail}
                        className={AUTH_FIELD_CLASS}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label htmlFor="invitation-password" className={AUTH_LABEL_CLASS}>{tAuth('password')}</label>
                    <PasswordInput
                        id="invitation-password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        disabled={busy}
                        autoFocus={!!initialEmail}
                    />
                    <button
                        type="button"
                        onClick={() => { setError(null); setMode('forgot'); }}
                        className="mt-0.5 min-h-11 cursor-pointer self-end text-[13px] font-bold text-blue underline decoration-2 underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                    >
                        {tAuth('forgotPassword')}
                    </button>
                </div>
                {terms}
                <FormAlert>{error}</FormAlert>
                <SubmitButton busy={busy} label={t('signIn.submit')} busyLabel={t('signIn.saving')} testId="invitation-sign-in" />
            </form>
        </>
    );
}

function AcceptForm({ email, terms, termsAccepted, error, setError, onSubmit, onNotYou }: FormProps & {
    email: string | null;
    onSubmit: () => Promise<void>;
    onNotYou: () => Promise<void>;
}) {
    const t = useTranslations('invitation');
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (busy) return;
        if (!termsAccepted) { setError(t('errors.termsRequired')); return; }
        setError(null);
        setBusy(true);
        try {
            await onSubmit();
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <StepTitle title={t('accept.title')}>{email ? t('accept.signedInAs', { email }) : null}</StepTitle>
            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                {terms}
                <FormAlert>{error}</FormAlert>
                <SubmitButton busy={busy} label={t('accept.submit')} busyLabel={t('accept.saving')} testId="invitation-accept" />
                <button
                    type="button"
                    onClick={() => { void onNotYou(); }}
                    disabled={busy}
                    className="min-h-11 cursor-pointer self-center text-[13px] font-bold text-blue underline decoration-2 underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:opacity-45"
                >
                    {t('accept.notYou')}
                </button>
            </form>
        </>
    );
}

function SignOutButton({ label, onClick }: { label: string; onClick: () => Promise<void> }) {
    const [busy, setBusy] = useState(false);
    return (
        <Button
            size="lg"
            className={SUBMIT_CLASS}
            disabled={busy}
            data-testid="invitation-sign-out"
            onClick={async () => {
                setBusy(true);
                try { await onClick(); } finally { setBusy(false); }
            }}
        >
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <LogOut size={16} aria-hidden="true" />}
            {label}
        </Button>
    );
}

/** The invitation cannot be used (or was already): what happened, and the one way forward. */
function DeadEnd({ view, preview }: { view: InvitationView; preview: InvitationPreview | null }) {
    const t = useTranslations('invitation');
    const org = preview?.orgName ?? '';
    const toPanel = view === 'accepted' || view === 'alreadyMember' || view === 'otherTeam';
    const config: Record<string, { icon: React.ReactNode; tone: 'blue' | 'lime' | 'alert'; body: string }> = {
        expired: {
            icon: <Clock size={22} />,
            tone: 'alert',
            body: preview?.inviterName
                ? t('expired.body', { inviter: preview.inviterName })
                : t('expired.bodyUnknown'),
        },
        revoked: { icon: <Ban size={22} />, tone: 'alert', body: t('revoked.body') },
        accepted: { icon: <CheckCircle size={22} />, tone: 'lime', body: t('accepted.body') },
        alreadyMember: { icon: <CheckCircle size={22} />, tone: 'lime', body: t('alreadyMember.body', { org }) },
        otherTeam: { icon: <Users size={22} />, tone: 'alert', body: t('otherTeam.body', { org }) },
        fanAccount: { icon: <ShieldAlert size={22} />, tone: 'alert', body: t('fanAccount.body') },
        notEligible: { icon: <ShieldAlert size={22} />, tone: 'alert', body: t('notEligible.body') },
        invalid: { icon: <Link2Off size={22} />, tone: 'alert', body: t('invalid.body') },
    };
    const c = config[view] ?? config.invalid;
    const titleKey = config[view] ? view : 'invalid';
    return (
        <>
            <AuthShellHeader tone={c.tone} icon={c.icon} title={t(`${titleKey}.title`)}>
                <p className="text-[15px] leading-relaxed text-body-white" data-testid={`invitation-state-${titleKey}`}>
                    {c.body}
                </p>
            </AuthShellHeader>
            {preview?.orgName && view !== 'invalid' && <InvitationSummary preview={preview} />}
            <Button asChild size="lg" variant={toPanel ? 'default' : 'secondary'} className={SUBMIT_CLASS}>
                <Link href={toPanel ? '/dashboard' : '/'}>
                    {toPanel ? <LogIn size={16} aria-hidden="true" /> : null}
                    {toPanel ? t('goToPanel') : t('goHome')}
                </Link>
            </Button>
        </>
    );
}
