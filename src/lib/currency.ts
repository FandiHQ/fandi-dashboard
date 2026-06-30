// IMMUTABLE — platform business rule (ARCHITECTURE.md Section 4.1)
export const COP_PER_FANDI = 5_000;

// MARKET RATE — as of Mar 2026. Update periodically or replace
// with cached API rate later. For MVP a constant is fine.
export const COP_PER_USD = 3_715;

// Derived
export const USD_PER_FANDI = COP_PER_FANDI / COP_PER_USD; // ~1.35

// Helpers
export const copToFandis = (cop: number) => cop / COP_PER_FANDI;
export const copToUsd = (cop: number) => cop / COP_PER_USD;
export const fandisToUsd = (fandis: number) => fandis * USD_PER_FANDI;

export const formatFandis = (cop: number) =>
    new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
        .format(copToFandis(cop));

export const formatUsd = (cop: number) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD', maximumFractionDigits: 0,
    }).format(copToUsd(cop));

export const formatCop = (cop: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(cop);
