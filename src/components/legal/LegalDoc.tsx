import Image from 'next/image';
import Link from 'next/link';

/**
 * Renders a legal document extracted from the source .docx.
 *
 * Content lives as structured JSON (headings / paragraphs / list items /
 * tables) rather than hand-written JSX so the wording stays byte-for-byte
 * what Legal signed off on — nobody edits the law by touching a component.
 * Re-run the extractor when a document is revised.
 *
 * Deliberately quiet typography: these pages are read by fans looking for a
 * specific clause, and by Google Play and payment-gateway reviewers. Long
 * measure, high contrast, real tables. None of the landing's motion.
 *
 * Azul Bloque: blue canvas header, the document body in one wide white
 * block (ink text, 16–17px, ~760px measure) so the clauses read like
 * paper, not like a screen.
 */

export interface LegalBlock {
    t: 'h' | 'p' | 'li' | 'table';
    level?: number;
    text?: string;
    rows?: string[][];
}

export interface LegalDocProps {
    title: string;
    subtitle: string;
    version: string;
    blocks: LegalBlock[];
    /** Sibling documents, linked at the foot of every page. */
    related: { href: string; label: string }[];
}

/** Groups consecutive `li` blocks so they render as one <ul>. */
function group(blocks: LegalBlock[]): (LegalBlock | { t: 'ul'; items: string[] })[] {
    const out: (LegalBlock | { t: 'ul'; items: string[] })[] = [];
    for (const b of blocks) {
        if (b.t === 'li') {
            const last = out[out.length - 1];
            if (last && 'items' in last) last.items.push(b.text ?? '');
            else out.push({ t: 'ul', items: [b.text ?? ''] });
        } else {
            out.push(b);
        }
    }
    return out;
}

/** Underlined mono link on the blue canvas (related docs, contact). */
export const LEGAL_NAV_LINK =
    'font-space-mono text-[12px] uppercase tracking-[0.1em] text-white underline decoration-2 underline-offset-4 transition-colors hover:decoration-lime';

/** Slim header shared by every legal page — a way back to the landing. */
export function LegalHeader() {
    return (
        <header className="border-b-2 border-ink">
            <div className="mx-auto flex h-[76px] max-w-[860px] items-center justify-between px-4 sm:px-6">
                <Link href="/" aria-label="Fandi" className="flex items-center gap-3 rounded-[12px]">
                    <Image
                        src="/fandi-tile.png"
                        alt="Fandi"
                        width={40}
                        height={40}
                        unoptimized
                        className="size-10 rounded-[11px] border-2 border-ink shadow-ext-sm"
                    />
                    <span aria-hidden="true" className="font-display text-[20px] text-white">
                        Fandi
                    </span>
                </Link>
                <Link
                    href="/"
                    className="label-mono text-[11px] text-lilac underline decoration-2 underline-offset-4 transition-colors hover:text-white"
                >
                    ← Inicio
                </Link>
            </div>
        </header>
    );
}

/** Blue-canvas title block: mono eyebrow, hero title, optional mono/lead line. */
export function LegalTitle({
    eyebrow,
    title,
    children,
}: {
    eyebrow: string;
    title: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="max-w-[760px]">
            <p className="label-mono text-[11px] text-lilac">{eyebrow}</p>
            <h1 className="mt-4 break-words font-hero text-[32px] text-white sm:text-[44px] md:text-[48px]">
                {title}
            </h1>
            {children}
        </div>
    );
}

export default function LegalDoc({
    title,
    subtitle,
    version,
    blocks,
    related,
}: LegalDocProps) {
    const grouped = group(blocks);

    return (
        <div className="min-h-screen bg-blue text-white">
            <LegalHeader />

            <main className="mx-auto max-w-[860px] px-4 pb-20 pt-10 sm:px-6 md:pt-16">
                <LegalTitle eyebrow={subtitle} title={title}>
                    <p className="label-mono mt-4 text-[11px] text-lilac">{version}</p>
                </LegalTitle>

                <article className="block-white mt-10 max-w-[760px] px-5 py-8 text-ink sm:px-10 sm:py-12">
                    <div className="flex flex-col gap-5">
                        {grouped.map((b, i) => {
                            if ('items' in b) {
                                return (
                                    <ul key={i} className="flex list-none flex-col gap-2.5 pl-1">
                                        {b.items.map((it, j) => (
                                            <li
                                                key={j}
                                                className="flex gap-3 text-[16px] leading-[1.65] text-ink md:text-[17px]"
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className="mt-[11px] size-1.5 shrink-0 rounded-[2px] bg-blue"
                                                />
                                                <span>{it}</span>
                                            </li>
                                        ))}
                                    </ul>
                                );
                            }

                            if (b.t === 'table' && b.rows?.length) {
                                const [head, ...body] = b.rows;
                                return (
                                    <div key={i} className="my-2 overflow-x-auto">
                                        <table className="w-full min-w-[420px] border-collapse text-left text-[15px]">
                                            <thead>
                                                <tr>
                                                    {head.map((c, j) => (
                                                        <th
                                                            key={j}
                                                            className="label-mono border-b-2 border-ink py-3 pr-5 font-bold text-muted-white"
                                                        >
                                                            {c}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {body.map((r, j) => (
                                                    <tr key={j}>
                                                        {r.map((c, k) => (
                                                            <td
                                                                key={k}
                                                                className="border-b border-line-white py-3 pr-5 align-top leading-relaxed text-ink"
                                                            >
                                                                {c}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            }

                            if (b.t === 'h') {
                                const lvl = b.level ?? 2;
                                const cls =
                                    lvl <= 1
                                        ? 'mt-10 font-display text-[24px] text-ink first:mt-0 md:text-[30px]'
                                        : lvl === 2
                                          ? 'mt-8 font-display text-[19px] text-ink first:mt-0 md:text-[22px]'
                                          : 'mt-6 font-display text-[16px] text-ink first:mt-0 md:text-[17px]';
                                return (
                                    <h2 key={i} className={cls}>
                                        {b.text}
                                    </h2>
                                );
                            }

                            return (
                                <p key={i} className="text-[16px] leading-[1.65] text-ink md:text-[17px]">
                                    {b.text}
                                </p>
                            );
                        })}
                    </div>
                </article>

                <nav className="mt-12 flex max-w-[760px] flex-col gap-3">
                    <span className="label-mono text-lilac">
                        Documentos relacionados
                    </span>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {related.map((r) => (
                            <Link key={r.href} href={r.href} className={LEGAL_NAV_LINK}>
                                {r.label}
                            </Link>
                        ))}
                        <a href="mailto:hola@fandi.app" className={LEGAL_NAV_LINK}>
                            hola@fandi.app
                        </a>
                    </div>
                </nav>
            </main>
        </div>
    );
}
