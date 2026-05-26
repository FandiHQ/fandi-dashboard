/**
 * Chart + status tokens that don't yet have CSS variable counterparts
 * in globals.css. The Fandi/tactical palette (acid, magenta, cyan,
 * blue, red) lives in `--color-tactical-*` and `--color-fandi-*` —
 * reference those directly via `var(...)` or Tailwind arbitrary
 * values. This module only fills the gaps: escuadra-level colors
 * (currently inlined across Step 4.13) and redemption-status colors
 * (new for Step 4.14).
 *
 * Keeping this small and named (NOT a full design-tokens module) so
 * future work has a clear place to migrate the existing hex
 * literals to without inventing a parallel design system.
 */

import type { ExperienceStatus } from '@/types/api';

/** Existing CSS tokens — referenced via `var(...)` at call sites. */
export const cssTokens = {
    fandiBlue: 'var(--color-fandi-blue)',          // #2D00F7
    fandiRed: 'var(--color-fandi-red)',            // #FF3366
    tacticalMagenta: 'var(--color-tactical-magenta)', // #FF0055
    tacticalAcid: 'var(--color-tactical-acid)',    // #CCFF00
    tacticalCyan: 'var(--color-tactical-cyan)',    // #00E5FF
} as const;

/**
 * Chart palette for revenue split. Electric Blue / Neon Red per
 * FANDI_DESIGN_WEB.md. Uses the Fandi tokens directly so swapping
 * the CSS var propagates everywhere.
 */
export const chartColors = {
    contribution: cssTokens.fandiBlue,
    auction: cssTokens.fandiRed,
} as const;

/**
 * Escuadra-level colors. Matches the inlined palette in Step 4.13
 * (`/events/[id]/live/page.tsx`). Migrate that file to this module
 * in a future cleanup PR.
 */
export const escuadraColors: Record<1 | 2 | 3 | 4, string> = {
    4: '#FFD700', // VIP — gold
    3: '#2D00F7', // Alta — Fandi blue
    2: '#22C55E', // Media — green
    1: '#737373', // Base — gray
};

/**
 * Default escuadra names (kept in sync with the live page). Override
 * with `experience.escuadraNames` when the organizer customized them.
 */
export const escuadraDefaultNames: Record<1 | 2 | 3 | 4, string> = {
    4: 'VIP',
    3: 'Alta',
    2: 'Media',
    1: 'Base',
};

/**
 * Redemption-status colors. The mobile/live surfaces don't use
 * these yet — these are introduced fresh in Step 4.14.
 */
export type RedemptionStatus = 'pending' | 'redeemed' | 'expired' | 'cancelled';

export const statusColors: Record<RedemptionStatus, string> = {
    pending: '#EAB308',   // amber — matches the live "connecting" indicator
    redeemed: '#22C55E',  // green — matches escuadra Media + live success
    expired: '#737373',   // gray — neutral, no urgency
    cancelled: '#FF3366', // Fandi red
};

/** Text muting colors (already in use across Step 4.13). */
export const textColors = {
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    muted: '#737373',
    dim: '#4A4A4A',
} as const;

/**
 * Experience-status colors for the analytics breakdown table.
 * 'active' is the live state; 'pending' = upcoming; 'closed' = ended.
 */
export const experienceStatusColors: Record<ExperienceStatus, string> = {
    pending: '#737373',
    active: '#22C55E',
    closed: '#4A4A4A',
};
