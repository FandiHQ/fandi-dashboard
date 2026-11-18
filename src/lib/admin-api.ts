/**
 * Fandi Admin API (fandi-api src/admin, admin/kyc, wallet reconcile):
 * response types and fetchers for the Ídolos, Recargas, Fans and Auditoría
 * screens. Every route needs a persisted platform admin on an aal2 session;
 * 403 MFA_REQUIRED is routed globally by lib/api.ts.
 */
import api from './api';
import { cleanParams, type AuditFilters, auditQueryParams } from './admin';

const unwrap = <T>(promise: Promise<{ data: T }>): Promise<T> => promise.then((res) => res.data);

export interface Paged<T> {
    page: number;
    pageSize: number;
    total: number;
    items: T[];
}

// ── Ídolos ──

export interface AdminOwner {
    userId: string;
    displayName: string | null;
    email: string | null;
}

export interface AdminOwnerInvitation {
    id: string;
    email: string;
    status: 'pending' | 'expired';
    expiresAt: string;
    lastSentAt: string | null;
    needsResend: boolean;
}

export interface AdminOrganization {
    id: string;
    name: string;
    isPublic: boolean;
    avatarUrl: string | null;
    createdAt: string;
    memberCount: number;
    eventCount: number;
    owners: AdminOwner[];
    ownerInvitation: AdminOwnerInvitation | null;
}

export interface CreateIdolResponse {
    organization: AdminOrganization;
    invitationId: string;
    emailed: boolean;
}

export interface UpdateIdolDto {
    name?: string;
    isPublic?: boolean;
    description?: string;
    avatarUrl?: string;
    coverUrl?: string;
    logoUrl?: string;
}

// ── Recargas ──

export interface StuckTopup {
    id: string;
    userId: string;
    fanName: string | null;
    amount: number;
    reference: string;
    status: string;
    providerPaymentId: string | null;
    reportedByProvider: boolean;
    failureReason: string | null;
    createdAt: string;
    minutesWaiting: number;
    reconcileAttempts: number;
    nextAutoReconcileAt: string | null;
}

export interface ReconcileTopupResponse {
    id: string;
    status: string;
}

// ── Fans ──

export interface AdminUserRow {
    id: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
    role: string;
    createdAt: string;
    deletedAt: string | null;
}

export interface AdminKycLevel {
    status: string | null;
    approved: boolean;
}

/** One Didit session (no document data): what a manual decision needs. */
export interface AdminKycVerification {
    id: string;
    level: 'prize' | 'stepup' | string;
    reason: string;
    status: string;
    adult: boolean | null;
    createdAt: string;
    decidedAt: string | null;
}

export interface AdminUserDetail {
    profile: {
        id: string;
        displayName: string | null;
        email: string | null;
        phone: string | null;
        role: string;
        instagramHandle: string | null;
        birthDate: string | null;
        city: string | null;
        isPublicProfile: boolean;
        termsAcceptedAt: string | null;
        termsVersion: string | null;
        createdAt: string;
        deletedAt: string | null;
    };
    organization: { id: string; name: string; role: string } | null;
    balance: number;
    ledger: {
        id: string;
        type: string;
        amount: number;
        balanceAfter: number;
        status: string;
        referenceType: string | null;
        referenceId: string | null;
        providerRef: string | null;
        createdAt: string;
    }[];
    kyc: {
        prize: AdminKycLevel;
        stepup: AdminKycLevel;
        flagged: boolean;
        stepupThresholdCop: number;
        flagReason: string | null;
        flaggedAt: string | null;
        /** Latest 10; older APIs may not send it. */
        verifications?: AdminKycVerification[];
    };
    withdrawals: {
        id: string;
        grossCop: number;
        feeCop: number;
        netCop: number;
        status: string;
        reviewReason: string | null;
        failureReason: string | null;
        createdAt: string;
        decidedAt: string | null;
        paidAt: string | null;
    }[];
    topups: {
        id: string;
        amount: number;
        reference: string;
        status: string;
        failureReason: string | null;
        createdAt: string;
        completedAt: string | null;
    }[];
}

// ── Auditoría ──

export interface AuditRow {
    id: string;
    createdAt: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    details: Record<string, unknown>;
    ip: string | null;
    actor: { userId: string; displayName: string | null; email: string | null } | null;
}

export const adminApi = {
    organizations: (params: { q?: string; page?: number }) =>
        unwrap(api.get<Paged<AdminOrganization>>('/admin/organizations', { params: cleanParams(params) })),
    createIdol: (dto: {
        name: string;
        categoryId?: string;
        isPublic: boolean;
        ownerEmail: string;
        ownerName?: string;
    }) => unwrap(api.post<CreateIdolResponse>('/admin/organizations', dto)),
    updateIdol: (id: string, dto: UpdateIdolDto) =>
        unwrap(api.patch<AdminOrganization>(`/admin/organizations/${id}`, dto)),
    ownerInvitation: (id: string, dto: { email?: string; name?: string }) =>
        unwrap(api.post<AdminOrganization & { emailed?: boolean }>(`/admin/organizations/${id}/owner-invitation`, dto)),

    stuckTopups: (page: number) =>
        unwrap(api.get<Paged<StuckTopup>>('/admin/topups', { params: cleanParams({ state: 'stuck', page }) })),
    reconcileTopup: (id: string) =>
        unwrap(api.post<ReconcileTopupResponse>(`/wallet/topups/${id}/reconcile`)),

    searchUsers: (q: string) =>
        unwrap(api.get<AdminUserRow[]>('/admin/users', { params: { q: q.trim() } })),
    user: (id: string) => unwrap(api.get<AdminUserDetail>(`/admin/users/${id}`)),
    flagKyc: (userId: string, reason: string) =>
        unwrap(api.post<void>(`/admin/kyc/flags/${userId}`, { reason: reason.trim() })),
    unflagKyc: (userId: string) => unwrap(api.delete<void>(`/admin/kyc/flags/${userId}`)),
    decideKyc: (verificationId: string, approved: boolean, notes: string) =>
        unwrap(api.post<void>(`/admin/kyc/verifications/${verificationId}/decision`, { approved, notes: notes.trim() })),

    audit: (page: number, filters: AuditFilters) =>
        unwrap(api.get<Paged<AuditRow>>('/admin/audit', { params: auditQueryParams(page, filters) })),
};

/** TanStack Query keys (one root, so a write can refresh a whole screen). */
export const adminKeys = {
    organizations: (q: string, page: number) => ['fandiAdmin', 'organizations', q, page] as const,
    organizationsRoot: ['fandiAdmin', 'organizations'] as const,
    topups: (page: number) => ['fandiAdmin', 'topups', page] as const,
    topupsRoot: ['fandiAdmin', 'topups'] as const,
    users: (q: string) => ['fandiAdmin', 'users', q] as const,
    user: (id: string) => ['fandiAdmin', 'user', id] as const,
    audit: (page: number, filters: AuditFilters) =>
        ['fandiAdmin', 'audit', page, filters.action, filters.targetType, filters.targetId] as const,
};
