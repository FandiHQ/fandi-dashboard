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

export default function LegalDoc({
    title,
    subtitle,
    version,
    blocks,
    related,
}: LegalDocProps) {
    const grouped = group(blocks);

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Slim header — a way back to the landing, nothing more. */}
            <header className="border-b border-white/10">
                <div className="mx-auto flex h-[72px] max-w-4xl items-center justify-between px-6">
                    <Link href="/" aria-label="Fandi">
                        <Image
                            src="/fandi-logo.png"
                            alt="Fandi"
                            width={967}
                            height={747}
                            className="h-9 w-auto"
                        />
                    </Link>
                    <Link
                        href="/"
                        className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] transition-colors hover:text-white"
                    >
                        ← Inicio
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
                <p className="font-space-mono text-[11px] uppercase tracking-[4px] text-[#CCFF00]">
                    {subtitle}
                </p>
                <h1 className="mt-4 font-sora text-3xl font-extrabold uppercase leading-tight tracking-tight text-white md:text-5xl">
                    {title}
                </h1>
                <p className="mt-4 font-space-mono text-[11px] uppercase tracking-[2px] text-[#6B6B74]">
                    {version}
                </p>

                <div className="mt-12 flex flex-col gap-5">
                    {grouped.map((b, i) => {
                        if ('items' in b) {
                            return (
                                <ul key={i} className="flex list-none flex-col gap-2 pl-1">
                                    {b.items.map((it, j) => (
                                        <li
                                            key={j}
                                            className="flex gap-3 text-[15px] leading-relaxed text-[#C4C4CE]"
                                        >
                                            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#CCFF00]" />
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
                                    <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                                        <thead>
                                            <tr>
                                                {head.map((c, j) => (
                                                    <th
                                                        key={j}
                                                        className="border-b border-white/20 py-3 pr-5 font-space-mono text-[10px] font-bold uppercase tracking-[2px] text-[#CCFF00]"
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
                                                            className="border-b border-white/8 py-3 pr-5 align-top leading-relaxed text-[#C4C4CE]"
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
                                    ? 'mt-10 font-sora text-2xl font-extrabold uppercase tracking-tight text-white md:text-3xl'
                                    : lvl === 2
                                      ? 'mt-8 font-sora text-xl font-extrabold text-white md:text-2xl'
                                      : 'mt-6 font-sora text-lg font-bold text-white';
                            return (
                                <h2 key={i} className={cls}>
                                    {b.text}
                                </h2>
                            );
                        }

                        return (
                            <p key={i} className="text-[15px] leading-relaxed text-[#C4C4CE]">
                                {b.text}
                            </p>
                        );
                    })}
                </div>

                <nav className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-8">
                    <span className="font-space-mono text-[10px] uppercase tracking-[3px] text-[#6B6B74]">
                        Documentos relacionados
                    </span>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {related.map((r) => (
                            <Link
                                key={r.href}
                                href={r.href}
                                className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] transition-colors hover:text-[#CCFF00]"
                            >
                                {r.label}
                            </Link>
                        ))}
                        <a
                            href="mailto:hola@fandi.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] transition-colors hover:text-[#CCFF00]"
                        >
                            hola@fandi.app
                        </a>
                    </div>
                </nav>
            </main>
        </div>
    );
}
