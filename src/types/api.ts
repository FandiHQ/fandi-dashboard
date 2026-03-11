// ── Re-export ApiError so components import from one place ──
export { ApiError } from '@/lib/api';

// ── Auth ──
export interface AuthMeResponse {
    userId: string;
    email: string;
    displayName: string;
    role: 'organizer' | 'staff';
    organization: {
        id: string;
        name: string;
        logoUrl: string | null;
        myRole: 'owner' | 'admin' | 'viewer' | 'staff';
    };
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
export type EventType = 'match' | 'concert';

export interface Event {
    id: string;
    organizationId: string;
    name: string;
    eventType: EventType;
    venue: string;
    city: string;
    description: string | null;
    scheduledStart: string;
    status: EventStatus;
    imageUrl: string | null;
    publishedAt: string | null;
    liveAt: string | null;
    endedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateEventDto {
    name: string;
    eventType: EventType;
    venue: string;
    city: string;
    description?: string;
    scheduledStart: string;
    imageUrl?: string;
}

export interface UpdateEventDto extends Partial<CreateEventDto> {}

export interface PreLiveStatsResponse {
    experienceCount: number;
    experiencesReady: boolean;
    auctionCount: number;
    isPublished: boolean;
}

// ── Experiences ──
export type ExperienceStatus = 'pending' | 'active' | 'closed';

export interface Experience {
    id: string;
    eventId: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    winnersPerEscuadra: number;
    escuadraNames: Record<string, string> | null;
    surpriseReveal: string | null;
    opensAt: string | null;
    closesAt: string | null;
    status: ExperienceStatus;
    redemptionInstructions: string | null;
    createdAt: string;
    updatedAt: string;
    totalRaised?: number;
    contributorCount?: number;
    thresholds?: EscuadraThresholds;
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
    imageUrl?: string;
    winnersPerEscuadra: number;
    escuadraNames?: Record<string, string>;
    surpriseReveal?: string;
    opensAt?: string;
    closesAt?: string;
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
    id: string;
    organizationId: string;
    userId: string;
    role: OrgRole;
    eventIds: string[] | null;
    user: { displayName: string; email: string };
    joinedAt: string;
}

export interface InviteMemberDto {
    email: string;
    role: OrgRole;
    eventIds?: string[];
}

export interface UpdateMemberRoleDto {
    role: OrgRole;
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
