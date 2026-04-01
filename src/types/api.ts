// ── Re-export ApiError so components import from one place ──
export { ApiError } from '@/lib/api';

// ── Auth ──
export interface UserSyncResponse {
    id: string;
    supabaseId: string;
    role: 'fan' | 'organizer' | 'sponsor' | 'staff';
    phone: string | null;
    email: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string;
    walletBalance: number;
    organization: {
        id: string;
        name: string;
        logoUrl: string | null;
        memberRole: string; // "owner" | "admin" | "viewer" | "staff"
    } | null;
}

// ── Organization ──
export interface Organization {
    id: string;
    name: string;
    logoUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

// ── Events ──
export type EventStatus = 'draft' | 'published' | 'live' | 'ended';
export type EventType = 'football' | 'concert' | 'other';

export interface Event {
    id: string;
    organizationId: string;
    name: string;
    eventType: EventType | null;
    venue: string | null;
    city: string | null;
    description: string | null;
    eventDate: string;
    eventEndDate: string | null;
    fandiOpensAt: string | null;
    fandiClosesAt: string | null;
    status: EventStatus;
    coverImageUrl: string | null;
    publishedAt: string | null;
    liveAt: string | null;
    endedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateEventDto {
    name: string;
    eventType?: EventType;
    venue?: string;
    city?: string;
    description?: string;
    eventDate: string;
    eventEndDate?: string;
    fandiOpensAt?: string;
    fandiClosesAt?: string;
    coverImageUrl?: string;
}

export interface UpdateEventDto extends Partial<CreateEventDto> {}

export interface PaginatedEventsResponse {
    items: Event[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

export interface PreLiveStatsResponse {
    experienceCount: number;
    experiencesReady: boolean;
    auctionCount: number;
    isPublished: boolean;
}

// ── Experiences ──
export type ExperienceStatus = 'pending' | 'active' | 'closed';

export interface EscuadraInfo {
    level: number;
    name: string;
    minAmount: number;
    userCount: number;
}

export interface Experience {
    id: string;
    eventId: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    winnersPerEscuadra: number;
    escuadraNames: Record<string, string> | null;
    surpriseReveal: string | null;
    surpriseRevealedAt: string | null;
    redemptionInstructions: string | null;
    opensAt: string | null;
    closesAt: string | null;
    status: ExperienceStatus;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
    escuadras?: EscuadraInfo[];
    contributorCount?: number;
}

export interface EscuadraThresholds {
    escuadra1Min: number;
    escuadra2Min: number;
    escuadra3Min: number;
    escuadra4Min: number;
}

export interface CreateExperienceDto {
    name: string;
    description?: string;
    winnersPerEscuadra: number;
    escuadraNames?: Record<string, string>;
    surpriseReveal?: string;
    redemptionInstructions?: string;
}

export interface UserPosition {
    escuadraLevel: number;
    escuadraName: string;
    totalContribution: number;
    amountToNextLevel: number | null;
    nextLevelName: string | null;
    percentile: number;
}

// ── Auctions ──
export type AuctionStatus = 'pending' | 'active' | 'paused' | 'ended' | 'cancelled';
export type BidStatus = 'active' | 'outbid' | 'won' | 'released';

export interface Auction {
    id: string;
    eventId: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    startingPrice: number;
    currentPrice: number;
    currentBidderId: string | null;
    status: AuctionStatus;
    durationMinutes: number;
    softCloseSeconds: number;
    extensionSeconds: number;
    scheduledStart: string | null;
    startedAt: string | null;
    endsAt: string | null;
    endedAt: string | null;
    pausedAt: string | null;
    bidCount: number;
    redemptionInstructions: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAuctionDto {
    name: string;
    description?: string;
    imageUrl?: string;
    startingPrice: number;
    durationMinutes?: number;
    scheduledStart?: string;
    redemptionInstructions?: string;
}

export interface UpdateAuctionDto extends Partial<CreateAuctionDto> {
    softCloseSeconds?: number;
    extensionSeconds?: number;
}

export interface BidListItem {
    id: string;
    userId: string;
    userName: string;
    amount: number;
    status: BidStatus;
    createdAt: string;
}

export interface BidStatusResponse {
    isCurrentWinner: boolean;
    userBidAmount: number | null;
    currentPrice: number;
    status: BidStatus | null;
}

// ── Organization Members ──
export type OrgRole = 'owner' | 'admin' | 'viewer' | 'staff';

export interface OrganizationMember {
    organizationId: string;
    userId: string;
    role: OrgRole;
    status: 'pending' | 'active';
    email: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    eventIds: string[] | null;
    eventNames: string[] | null;
    invitedAt: string;
    invitedBy: string | null;
}

export interface InviteMemberDto {
    email: string;
    role: OrgRole;
    displayName?: string;
    eventIds?: string[];
}

export interface UpdateMemberRoleDto {
    role: OrgRole;
    eventIds?: string[];
}

// ── Analytics ──
export interface EventSummaryResponse {
    eventId: string;
    eventName: string;
    status: EventStatus;
    totalRaisedContributions: number;
    totalRaisedAuctions: number;
    totalRaised: number;
    uniqueParticipants: number;
    experienceCount: number;
    auctionCount: number;
    winnersCount: number;
    redemptionRate: number;
    createdAt: string;
}

export interface ExperienceBreakdownItem {
    experienceId: string;
    experienceName: string;
    status: ExperienceStatus;
    totalRaised: number;
    contributorCount: number;
    winnersCount: number;
    escuadraDistribution: {
        level: number;
        count: number;
        minAmount: number;
    }[];
}

export interface LivePulseResponse {
    eventId: string;
    totalRaised: number;
    uniqueParticipants: number;
    activeExperiences: number;
    activeAuctions: number;
    contributionsCount: number;
    bidsCount: number;
    latestContributions: {
        userName: string;
        amount: number;
        experienceName: string;
        createdAt: string;
    }[];
    latestBids: {
        userName: string;
        amount: number;
        auctionName: string;
        createdAt: string;
    }[];
}

export interface WinnersListItem {
    winnerId: string;
    fanName: string;
    fanPhone: string | null;
    fanEmail: string | null;
    prizeType: 'experience' | 'auction';
    prizeName: string;
    escuadraLevel: number | null;
    finalAmount: number;
    qrCode: string;
    redemptionStatus: 'pending' | 'redeemed' | 'expired' | 'cancelled';
    redeemedAt: string | null;
    createdAt: string;
}

export interface WinnersListQuery {
    status?: string;
    prizeType?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}

// ── Redemptions ──
export interface ScanResultResponse {
    winnerId: string;
    fanName: string;
    fanPhone: string | null;
    fanEmail: string | null;
    prizeType: 'experience' | 'auction';
    prizeName: string;
    escuadraLevel: number | null;
    finalAmount: number;
    redemptionStatus: string;
    qrCode: string;
    createdAt: string;
    eventId: string;
    eventName: string;
}

export interface RedemptionStats {
    total: number;
    pending: number;
    redeemed: number;
    expired: number;
}

// ── Notifications ──
export interface NotificationSendResult {
    sent: number;
    skipped: number;
}

// ── WebSocket Messages ──

export type WsConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'disabled';

export interface WsMessage {
    type: string;
    [key: string]: unknown;
}

export interface WsEventPulse extends WsMessage {
    type: 'event_pulse';
    eventId: string;
    totalRaised: number;
    uniqueParticipants: number;
    contributionsCount: number;
    bidsCount: number;
}

export interface WsEscuadraUpdate extends WsMessage {
    type: 'escuadra_update';
    experienceId: string;
    thresholds: {
        escuadra1Min: number;
        escuadra2Min: number;
        escuadra3Min: number;
        escuadra4Min: number;
    };
    userCount: number;
}

export interface WsAuctionUpdate extends WsMessage {
    type: 'auction_update';
    auctionId: string;
    currentPrice: number;
    currentBidderId: string | null;
    bidCount: number;
    endsAt: string;
}

export interface WsOutbid extends WsMessage {
    type: 'outbid';
    auctionId: string;
    auctionName: string;
    newPrice: number;
    yourBid: number;
}

export interface WsExperienceClosed extends WsMessage {
    type: 'experience_closed';
    experienceId: string;
    experienceName: string;
}

export interface WsWinnersAnnounced extends WsMessage {
    type: 'winners_announced';
    experienceId: string;
    experienceName: string;
    winnerCount: number;
}

export interface WsEventLive extends WsMessage {
    type: 'event_live';
    eventId: string;
}

export interface WsExperienceOpened extends WsMessage {
    type: 'experience_opened';
    experienceId: string;
    experienceName: string;
    eventId: string;
}
