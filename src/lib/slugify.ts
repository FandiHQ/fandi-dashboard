/**
 * Normalize an arbitrary string (event name, org name) into a
 * filename-safe slug. Strips accents, lowercases, replaces
 * non-alphanumeric runs with a single hyphen, trims hyphens at
 * the edges, and caps the length so it doesn't blow up filesystem
 * limits when concatenated with a date suffix.
 *
 * Falls back to `'evento'` when the input has no usable characters.
 */

// Combining diacritical marks block. Defined as a constructed
// RegExp (rather than a regex literal with raw combining chars)
// so the source file stays ASCII-safe across editors / patches.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

export function slugifyForFilename(input: string): string {
    return (
        input
            .normalize('NFD')
            .replace(COMBINING_MARKS, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'evento'
    );
}
