import api from './api';
import type {
    UserSyncResponse,
    Event, CreateEventDto, UpdateEventDto, EventStatus,
    PaginatedEventsResponse,
    PreLiveStatsResponse,
    Experience, CreateExperienceDto,
    ExperienceSlot, CreateSlotDto,
    Auction, CreateAuctionDto, UpdateAuctionDto, BidListItem,
    Organization, OrganizationMember, InviteMemberDto, UpdateMemberRoleDto,
    EventSummaryResponse, ExperienceBreakdownItem,
    LivePulseResponse, WinnersListItem, WinnersListQuery,
    PaginatedResponse, ScanResultResponse, RedemptionStats,
    NotificationSendResult,
    BadgeTemplate, CreateBadgeTemplateDto, UpdateBadgeTemplateDto,
    BadgeAwardResult,
    CitySearchResult,
} from '@/types/api';

// ── Helper: extract .data from AxiosResponse ──
const unwrap = <T>(promise: Promise<{ data: T }>): Promise<T> =>
    promise.then(res => res.data);

// ── Auth ──
export const authApi = {
    sync: () => unwrap(api.post<UserSyncResponse>('/users/sync', {})),
};

// ── Profile ──
export const profileApi = {
    update: (dto: { displayName?: string; phone?: string; avatarUrl?: string }) =>
        unwrap(api.put<UserSyncResponse>('/users/me/profile', dto)),
};

// ── Events ──
export const eventsApi = {
    list: (params?: { status?: string; eventType?: string; search?: string; page?: number; limit?: number }) =>
        unwrap(api.get<PaginatedEventsResponse>('/dashboard/events', { params })),
    get: (id: string) =>
        unwrap(api.get<Event>(`/dashboard/events/${id}`)),
    create: (dto: CreateEventDto) =>
        unwrap(api.post<Event>('/dashboard/events', dto)),
    update: (id: string, dto: UpdateEventDto) =>
        unwrap(api.put<Event>(`/dashboard/events/${id}`, dto)),
    updateStatus: (id: string, status: EventStatus) =>
        unwrap(api.put<Event>(`/dashboard/events/${id}/status`, { status })),
    duplicate: (id: string) =>
        unwrap(api.post<Event>(`/dashboard/events/${id}/duplicate`, {})),
    delete: (id: string) =>
        unwrap(api.delete(`/dashboard/events/${id}`)),
    getPreLiveStats: (id: string) =>
        unwrap(api.get<PreLiveStatsResponse>(`/dashboard/events/${id}/pre-live-stats`)),
};

// ── Places ──
export const placesApi = {
    searchCities: (
        q: string,
        opts?: { country?: string; limit?: number; signal?: AbortSignal },
    ) =>
        unwrap(api.get<CitySearchResult[]>('/places/search', {
            params: {
                q,
                country: opts?.country ?? 'CO',
                limit: opts?.limit ?? 10,
            },
            signal: opts?.signal,
        })),
    // Single-city lookup. Used by the event-edit form on mount so
    // the autocomplete chip renders the real city name instead of
    // falling back to the legacy free-text event.city field, which
    // is NULL for events created via the autocomplete-only flow.
    getCityById: (id: string, opts?: { signal?: AbortSignal }) =>
        unwrap(api.get<CitySearchResult>(`/places/cities/${id}`, {
            signal: opts?.signal,
        })),
};

// ── Experiences ──
export const experiencesApi = {
    list: (eventId: string) =>
        unwrap(api.get<Experience[]>(`/dashboard/events/${eventId}/experiences`)),
    get: (id: string) =>
        unwrap(api.get<Experience>(`/dashboard/experiences/${id}`)),
    create: (eventId: string, dto: CreateExperienceDto) =>
        unwrap(api.post<Experience>(`/dashboard/events/${eventId}/experiences`, dto)),
    update: (id: string, dto: Partial<CreateExperienceDto>) =>
        unwrap(api.put<Experience>(`/dashboard/experiences/${id}`, dto)),
    delete: (id: string) =>
        unwrap(api.delete(`/dashboard/experiences/${id}`)),
    close: (id: string) =>
        unwrap(api.post(`/dashboard/experiences/${id}/close`)),
    activate: (id: string) =>
        unwrap(api.post<Experience>(`/dashboard/experiences/${id}/activate`)),
    reveal: (id: string) =>
        unwrap(api.post<Experience>(`/dashboard/experiences/${id}/reveal`)),
    getWinners: (id: string) =>
        unwrap(api.get<WinnersListItem[]>(`/dashboard/experiences/${id}/winners`)),
};

// ── Opportunity slots (Franjas) — Step 6.2 ──
export const slotsApi = {
    list: (eventId: string) =>
        unwrap(api.get<ExperienceSlot[]>(`/dashboard/events/${eventId}/slots`)),
    create: (eventId: string, dto: CreateSlotDto) =>
        unwrap(api.post<ExperienceSlot>(`/dashboard/events/${eventId}/slots`, dto)),
    update: (id: string, dto: Partial<CreateSlotDto>) =>
        unwrap(api.put<ExperienceSlot>(`/dashboard/slots/${id}`, dto)),
    delete: (id: string) => unwrap(api.delete(`/dashboard/slots/${id}`)),
    assign: (id: string, experienceIds: string[]) =>
        unwrap(api.post<ExperienceSlot>(`/dashboard/slots/${id}/assign`, { experienceIds })),
};

// ── Auctions ──
export const auctionsApi = {
    list: (eventId: string) =>
        unwrap(api.get<Auction[]>(`/dashboard/events/${eventId}/auctions`)),
    get: (id: string) =>
        unwrap(api.get<Auction>(`/dashboard/auctions/${id}`)),
    create: (eventId: string, dto: CreateAuctionDto) =>
        unwrap(api.post<Auction>(`/dashboard/events/${eventId}/auctions`, dto)),
    update: (id: string, dto: UpdateAuctionDto) =>
        unwrap(api.put<Auction>(`/dashboard/auctions/${id}`, dto)),
    delete: (id: string) =>
        unwrap(api.delete(`/dashboard/auctions/${id}`)),
    activate: (id: string) =>
        unwrap(api.post<Auction>(`/dashboard/auctions/${id}/activate`)),
    pause: (id: string) =>
        unwrap(api.post<Auction>(`/dashboard/auctions/${id}/pause`)),
    resume: (id: string) =>
        unwrap(api.post<Auction>(`/dashboard/auctions/${id}/resume`)),
    end: (id: string) =>
        unwrap(api.post<Auction>(`/dashboard/auctions/${id}/end`)),
    getBids: (id: string) =>
        unwrap(api.get<BidListItem[]>(`/dashboard/auctions/${id}/bids`)),
};

// ── Organization ──
export const orgApi = {
    get: () =>
        unwrap(api.get<Organization>('/dashboard/organization')),
    getMembers: () =>
        unwrap(api.get<OrganizationMember[]>('/dashboard/organization/members')),
    inviteMember: (dto: InviteMemberDto) =>
        unwrap(api.post<OrganizationMember>('/dashboard/organization/members', dto)),
    updateMember: (id: string, dto: UpdateMemberRoleDto) =>
        unwrap(api.put(`/dashboard/organization/members/${id}`, dto)),
    removeMember: (id: string) =>
        unwrap(api.delete(`/dashboard/organization/members/${id}`)),
    resendInvite: (id: string) =>
        unwrap(api.post(`/dashboard/organization/members/${id}/resend-invite`, {})),
};

// ── Analytics ──
// IMPORTANT: Verify these paths match the backend exactly.
// experience breakdown = /experiences/analytics (NOT /analytics/experiences)
// CSV export = /export/winners (NOT /winners/export)
export const analyticsApi = {
    getEventSummary: (eventId: string) =>
        unwrap(api.get<EventSummaryResponse>(`/dashboard/events/${eventId}/analytics`)),
    getExperienceBreakdown: (eventId: string) =>
        unwrap(api.get<ExperienceBreakdownItem[]>(`/dashboard/events/${eventId}/experiences/analytics`)),
    getLivePulse: (eventId: string) =>
        unwrap(api.get<LivePulseResponse>(`/dashboard/events/${eventId}/live`)),
    getWinnersList: (eventId: string, params?: WinnersListQuery) =>
        unwrap(api.get<PaginatedResponse<WinnersListItem>>(`/dashboard/events/${eventId}/winners`, { params })),
    exportCSV: (eventId: string) =>
        api.get(`/dashboard/events/${eventId}/export/winners`, { responseType: 'blob' }).then(res => res.data as Blob),
};

// ── Redemptions (Staff) ──
export const redemptionsApi = {
    scan: (qrCode: string) =>
        unwrap(api.post<ScanResultResponse>('/staff/redemptions/scan', { qrCode })),
    confirm: (id: string, notes?: string) =>
        unwrap(api.post(`/staff/redemptions/${id}/confirm`, { notes })),
    getForEvent: (eventId: string, status?: string) =>
        unwrap(api.get<ScanResultResponse[]>(`/staff/events/${eventId}/redemptions`, { params: { status } })),
    getStats: (eventId: string) =>
        unwrap(api.get<RedemptionStats>(`/staff/events/${eventId}/redemptions/stats`)),
};

// ── Notifications ──
export const notificationsApi = {
    sendWalletReminder: (eventId: string) =>
        unwrap(api.post<NotificationSendResult>(`/dashboard/events/${eventId}/notify/wallet-reminder`)),
    sendEventReminder: (eventId: string) =>
        unwrap(api.post<NotificationSendResult>(`/dashboard/events/${eventId}/notify/event-reminder`)),
    sendNextEvent: (eventId: string) =>
        unwrap(api.post<NotificationSendResult>(`/dashboard/events/${eventId}/notify/next-event`)),
};

// ── Badge Templates ──
export const badgeTemplatesApi = {
    list: (eventId: string) =>
        unwrap(api.get<BadgeTemplate[]>(`/dashboard/events/${eventId}/badge-templates`)),
    get: (id: string) =>
        unwrap(api.get<BadgeTemplate>(`/dashboard/badge-templates/${id}`)),
    create: (eventId: string, dto: CreateBadgeTemplateDto) =>
        unwrap(api.post<BadgeTemplate>(`/dashboard/events/${eventId}/badge-templates`, dto)),
    update: (id: string, dto: UpdateBadgeTemplateDto) =>
        unwrap(api.put<BadgeTemplate>(`/dashboard/badge-templates/${id}`, dto)),
    delete: (id: string) =>
        unwrap(api.delete(`/dashboard/badge-templates/${id}`)),
};

// ── Badge Awarding ──
export const badgeAwardingApi = {
    awardBadges: (eventId: string) =>
        unwrap(api.post<BadgeAwardResult>(`/dashboard/events/${eventId}/award-badges`)),
};
