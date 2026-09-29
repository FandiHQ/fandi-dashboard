/**
 * Chart + status colours on the Azul Bloque palette (globals.css @theme,
 * design-handoff/design-tokens.css). Charts are flat fills inside WHITE
 * blocks: Aportes blue, Subastas lilac, categories their own colours
 * (equal visual weight, never ranked). No pink/red slices, no orange.
 */

import type { ExperienceStatus } from '@/types/api';

/** CSS tokens — referenced via `var(...)` at call sites. The legacy
 *  names are kept so older call sites resolve to the new palette. */
export const cssTokens = {
    blue: 'var(--color-blue)',            // #2D00F7
    ink: 'var(--color-ink)',              // #0B0B0F
    lime: 'var(--color-lime)',            // #C6FF3D
    lilac: 'var(--color-tier-vip)',       // #B7A8FF
    alert: 'var(--color-alert)',          // #FF4FA3
    fandiBlue: 'var(--color-blue)',
    fandiRed: 'var(--color-alert)',
    tacticalMagenta: 'var(--color-alert)',
    tacticalAcid: 'var(--color-lime)',
    tacticalCyan: 'var(--color-tier-alta)',
} as const;

/** Revenue split (section 7): Aportes blue, Subastas lilac. */
export const chartColors = {
    contribution: '#2D00F7',
    auction: '#B7A8FF',
} as const;

/**
 * Category colours — equal weight on purpose so no category looks
 * "better". BASE is white: on white surfaces give it a 2px ink outline.
 */
export const escuadraColors: Record<1 | 2 | 3 | 4, string> = {
    4: '#B7A8FF', // VIP
    3: '#5CE1FF', // ALTA
    2: '#C6FF3D', // MEDIA
    1: '#FFFFFF', // BASE
};

/**
 * Default category names. Override with `experience.escuadraNames` when
 * the organizer customized them.
 */
export const escuadraDefaultNames: Record<1 | 2 | 3 | 4, string> = {
    4: 'VIP',
    3: 'Alta',
    2: 'Media',
    1: 'Base',
};

/** Redemption status. The word always carries the state (section 8). */
export type RedemptionStatus = 'pending' | 'redeemed' | 'expired' | 'cancelled';

export const statusColors: Record<RedemptionStatus, string> = {
    pending: '#D9D3FF',   // lilac — waiting, no urgency
    redeemed: '#C6FF3D',  // lime — done
    expired: '#9A9AA8',   // muted — neutral
    cancelled: '#FF4FA3', // alert
};

/** Text on INK surfaces. */
export const textColors = {
    primary: '#FFFFFF',
    secondary: '#9A9AA8',
    muted: '#9A9AA8',
    dim: '#6E6E7A',
} as const;

/**
 * Experience-status colours for the analytics breakdown table.
 * 'active' is the live state; 'pending' = upcoming; 'closed' = ended.
 */
export const experienceStatusColors: Record<ExperienceStatus, string> = {
    pending: '#9A9AA8',
    active: '#C6FF3D',
    closed: '#6E6E7A',
};
