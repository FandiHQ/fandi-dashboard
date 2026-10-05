'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Plus, Minus, Loader2, Eye, EyeOff,
    Lock, ChevronDown, ChevronUp,
    Trash2, X, Clock, HeartHandshake,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { contestApi, experiencesApi, eventsApi, slotsApi } from '@/lib/api-hooks';
import {
    BANK_MIN_QUESTIONS,
    bankPanelState,
    bankSaveAction,
    canSaveBank,
    type BankQuestionDraft,
} from '@/lib/contest-bank';
import { QuestionBankEditor } from '@/components/contest/QuestionBankEditor';
import { IdolCollaborationsSection } from '@/components/collaborations/IdolCollaborationsSection';
import { useQueuedInvites } from '@/components/collaborations/useQueuedInvites';
import { filterByKind, goalReached, impactoPercent, isImpacto } from '@/lib/impacto';
import { escuadraColors, escuadraDefaultNames } from '@/lib/chart-colors';
import { formatCop } from '@/lib/currency';
import { FranjasSection } from './FranjasSection';
import type { Experience, CreateExperienceDto, EscuadraInfo, ExperienceKind, ExperienceStatus, LineupEntry } from '@/types/api';
import { ArtistMultiSelect } from '@/components/events/ArtistMultiSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge as EventStatusBadge } from '@/components/ui/status-badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { motion } from 'framer-motion';

// ── Category levels, VIP (4) first. Colours come from chart-colors
// (equal visual weight on purpose; BASE is white with an ink outline). ──
const CATEGORY_LEVELS = [4, 3, 2, 1] as const;
type CategoryLevel = (typeof CATEGORY_LEVELS)[number];

function categoryColor(level: number): string {
    return escuadraColors[level as CategoryLevel] ?? escuadraColors[1];
}

function categoryDefaultName(level: number): string {
    return escuadraDefaultNames[level as CategoryLevel] ?? `E${level}`;
}

const FANDI_RATE = 5_000;

function formatFandis(cop: number): string {
    const fandis = cop / FANDI_RATE;
    return new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: Number.isInteger(fandis) ? 0 : 1,
    }).format(fandis);
}

const FIELD_LABEL = 'label-mono text-muted-white';
const PILL = 'inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 font-space-mono text-[10px] font-bold uppercase tracking-[0.12em]';

// ── Status pill (word always carries the state) ──
function StatusBadge({ status }: { status: ExperienceStatus }) {
    const t = useTranslations('experiences');
    if (status === 'active') {
        return (
            <span className={`${PILL} border-ink bg-lime text-ink`}>
                <span className="live-dot text-ink" aria-hidden="true" />
                {t('statusActive')}
            </span>
        );
    }
    if (status === 'closed') {
        return <span className={`${PILL} border-transparent bg-muted-ink text-ink`}>{t('statusClosed')}</span>;
    }
    return <span className={`${PILL} border-ink bg-white text-ink`}>{t('statusPending')}</span>;
}

// ── Category swatch: BASE (white) keeps its ink outline on white ──
function CategorySwatch({ level, className = 'size-2.5' }: { level: number; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={`block shrink-0 rounded-[3px] border border-ink ${className}`}
            style={{ background: categoryColor(level) }}
        />
    );
}

// ── Category distribution bar ──
function EscuadraBar({ escuadras }: { escuadras: EscuadraInfo[] }) {
    const t = useTranslations('experiences');
    const total = escuadras.reduce((s, e) => s + e.userCount, 0);
    // Sort by level descending: VIP (4) first, Base (1) last
    const sorted = [...escuadras].sort((a, b) => b.level - a.level);

    return (
        <div className="flex flex-col gap-3">
            {/* Distribution */}
            <div className="flex h-3.5 w-full overflow-hidden rounded-full border-2 border-ink bg-line-white">
                {[...sorted].reverse().map((esc) => {
                    const widthPct = total > 0 ? (esc.userCount / total) * 100 : 25;

                    return (
                        <div
                            key={esc.level}
                            className="h-full border-r-2 border-ink transition-[width] duration-500 last:border-r-0"
                            style={{
                                width: `${widthPct}%`,
                                backgroundColor: categoryColor(esc.level),
                                opacity: esc.userCount > 0 ? 1 : 0.2,
                            }}
                        />
                    );
                })}
            </div>

            {/* Labels - always evenly distributed */}
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sorted.length}, minmax(0, 1fr))` }}>
                {[...sorted].reverse().map((esc) => {
                    const name = esc.name || categoryDefaultName(esc.level);
                    return (
                        <div key={esc.level} className="flex min-w-0 flex-col gap-1">
                            <span className="flex items-center gap-1.5">
                                <CategorySwatch level={esc.level} />
                                <span className="truncate font-display text-[13px]">{name}</span>
                            </span>
                            <span className="font-display text-[22px] tabular text-ink">{esc.userCount}</span>
                            <span className="font-space-mono text-[10px] uppercase text-muted-white">
                                {t('list.fansCount', { count: esc.userCount })}
                            </span>
                            <span className="font-space-mono text-[10px] text-muted-white">
                                {esc.minAmount > 0 ? t('list.minAmount', { amount: formatFandis(esc.minAmount) }) : '-'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Opportunity card ──
function OpportunityCard({
    exp, isWrite, onReveal, onClose, onEdit, onDelete, index,
}: {
    exp: Experience;
    isWrite: boolean;
    onReveal: (id: string) => void;
    onClose: (id: string) => void;
    onEdit: (exp: Experience) => void;
    onDelete: (id: string) => void;
    index?: number;
}) {
    const t = useTranslations('experiences');
    const [expanded, setExpanded] = useState(false);
    // Private organizer peek at the surprise text — local-only, does NOT
    // trigger the public reveal (`onReveal`/`surpriseRevealedAt`).
    const [showSurprise, setShowSurprise] = useState(false);
    const escuadras = exp.escuadras || [];
    // Phase 6 — Impacto: progress instead of winners, Impactores wall
    // (positions only) instead of prizes.
    const impacto = isImpacto(exp);
    const raisedCop = exp.progress?.raisedCop ?? 0;
    const goalCop = exp.progress?.goalCop ?? null;
    const percent = impactoPercent(raisedCop, goalCop);
    const reached = goalReached(raisedCop, goalCop);
    const impactoresQuery = useQuery({
        queryKey: ['experiences', exp.id, 'impactores'],
        queryFn: () => experiencesApi.impactores(exp.id),
        enabled: impacto && expanded,
    });
    // Knowledge contest: authors can read the (locked) bank once live.
    const bankQuery = useQuery({
        queryKey: ['experiences', exp.id, 'questions'],
        queryFn: () => contestApi.getBank(exp.id),
        enabled: !impacto && isWrite && expanded && exp.status !== 'pending',
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index ?? 0) * 0.1, duration: 0.3 }}
            className="block-white flex flex-col overflow-hidden text-ink"
        >
            {/* Header row: status + name | franja */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[18px] gap-y-2.5 px-[18px] pt-3.5 pb-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                    <StatusBadge status={exp.status} />
                    {impacto && (
                        <span
                            className={`${PILL} border-ink bg-tier-vip text-ink`}
                            data-testid="impacto-tag">
                            <HeartHandshake size={11} />
                            {t('impactoTag')}
                        </span>
                    )}
                    {impacto && reached && (
                        <span className={`${PILL} border-ink bg-lime text-ink`}>
                            {t('goalReached')}
                        </span>
                    )}
                    {!impacto && exp.status === 'pending' && exp.contestReady === false && (
                        <span
                            className={`${PILL} border-alert-white bg-white text-alert-white`}
                            data-testid="bank-missing">
                            {t('questions.cardMissing', {
                                count: exp.contestQuestionCount ?? 0,
                                min: BANK_MIN_QUESTIONS,
                            })}
                        </span>
                    )}
                    <h3 className="min-w-0 truncate font-display text-[18px]">{exp.name}</h3>
                </div>
                {exp.slot ? (
                    <span className="flex items-center gap-1.5 font-space-mono text-[11px] text-muted-white">
                        <Clock size={12} />
                        {exp.slot.label}
                    </span>
                ) : <span />}

                {/* Category chips (oportunidad) / artist tags */}
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {!impacto && CATEGORY_LEVELS.map((level) => (
                        <span
                            key={level}
                            className="flex items-center gap-1.5 rounded-[8px] border-2 border-line-white px-2 py-0.5 font-space-mono text-[10px] uppercase"
                        >
                            <CategorySwatch level={level} className="size-2" />
                            {exp.escuadraNames?.[String(level)] || categoryDefaultName(level)}
                        </span>
                    ))}
                    {exp.tags?.map((tag) => (
                        <span
                            key={tag.id}
                            className="rounded-full border-2 border-ink bg-lilac px-2.5 py-0.5 text-[12px] font-bold text-ink"
                        >
                            {tag.name}
                        </span>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                    {/* Edit — only pending */}
                    {isWrite && exp.status === 'pending' && (
                        <button
                            onClick={() => onEdit(exp)}
                            className="cursor-pointer rounded-[8px] px-1.5 py-1 text-[13px] font-extrabold text-blue hover:underline"
                        >
                            {t('list.edit')} ›
                        </button>
                    )}

                    {/* Delete — only pending with no contributions */}
                    {isWrite && exp.status === 'pending' && (exp.contributorCount || 0) === 0 && (
                        <Button
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => onDelete(exp.id)}
                            aria-label={t('list.delete')}
                        >
                            <Trash2 size={14} />
                        </Button>
                    )}

                    {/* Reveal — active + has surprise + not revealed */}
                    {isWrite && exp.surpriseReveal && !exp.surpriseRevealedAt && exp.status === 'active' && (
                        <button
                            onClick={() => onReveal(exp.id)}
                            className="press flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border-2 border-ink bg-tier-vip px-3 text-[12px] font-extrabold uppercase text-ink shadow-ext-sm"
                        >
                            <Eye size={14} />
                            {t('reveal')}
                        </button>
                    )}
                    {exp.surpriseRevealedAt && (
                        <span className={`${PILL} border-ink bg-lilac text-ink`}>
                            <EyeOff size={11} /> {t('list.revealedTag')}
                        </span>
                    )}

                    {/* Close — active only (confirmation in handleClose) */}
                    {isWrite && exp.status === 'active' && (
                        <Button variant="destructive" size="sm" onClick={() => onClose(exp.id)}>
                            <Lock size={14} />
                            {t('close')}
                        </Button>
                    )}

                    {/* Expand toggle */}
                    <button
                        onClick={() => setExpanded(!expanded)}
                        aria-label={expanded ? t('list.hideDetails') : t('list.showDetails')}
                        aria-expanded={expanded}
                        className="flex size-9 cursor-pointer items-center justify-center rounded-[10px] text-muted-white hover:bg-line-white hover:text-ink"
                    >
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>
            </div>

            {/* Key numbers */}
            <div className="flex flex-wrap items-stretch gap-x-8 gap-y-3 border-t-2 border-line-white px-[18px] py-3">
                <div className="flex flex-col">
                    <span className="label-mono text-muted-white">{t('list.statFans')}</span>
                    <span className="font-display text-[22px] tabular">{exp.contributorCount || 0}</span>
                </div>
                {impacto ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5" data-testid="impacto-progress">
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="label-mono text-muted-white">{t('list.statRaised')}</span>
                            {percent !== null && <span className="font-display text-[15px] text-blue">{percent}%</span>}
                        </div>
                        <span className="font-space-mono text-[11px] text-ink">
                            {goalCop
                                ? t('raisedOf', { raised: formatFandis(raisedCop), goal: formatFandis(goalCop) })
                                : t('raised', { raised: formatFandis(raisedCop) })}
                            {' · '}
                            {formatCop(raisedCop)}
                        </span>
                        {percent !== null && (
                            <div className="h-2.5 w-full overflow-hidden rounded-full border-2 border-ink bg-line-white">
                                <div
                                    className="h-full bg-blue transition-[width]"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <span className="label-mono text-muted-white">{t('list.statWinners')}</span>
                        <span className="font-display text-[22px] tabular">
                            {t('list.winnersPerCategory', { count: exp.winnersPerEscuadra })}
                        </span>
                    </div>
                )}
            </div>

            {/* Category bar — only once there are participants; an empty
                0/0/0/0 bar is just noise pre-event. */}
            {(exp.contributorCount || 0) > 0 ? (
                <div className="border-t-2 border-line-white px-[18px] py-4">
                    <EscuadraBar escuadras={escuadras} />
                </div>
            ) : (
                <div className="border-t-2 border-line-white px-[18px] py-2.5">
                    <span className="label-mono text-muted-white">
                        {t('noParticipantsYet')}
                    </span>
                </div>
            )}

            {/* Expanded details */}
            {expanded && (
                <div className="flex flex-col gap-3 border-t-2 border-line-white px-[18px] py-4">
                    {impacto && (
                        <div className="flex flex-col gap-1" data-testid="impacto-cause">
                            <span className="label-mono text-muted-white">
                                {t('causeTitle')}
                            </span>
                            <p className="text-base font-extrabold text-ink">{exp.causeTitle}</p>
                            {exp.causeDescription && (
                                <p className="text-sm leading-relaxed text-body-white">{exp.causeDescription}</p>
                            )}
                            {exp.beneficiaryName && (
                                <p className="font-space-mono text-[11px] text-muted-white">
                                    {t('beneficiary')}: {exp.beneficiaryName}
                                </p>
                            )}
                        </div>
                    )}
                    {exp.description && (
                        <p className="text-sm leading-relaxed text-body-white">{exp.description}</p>
                    )}
                    {impacto && (
                        <div className="flex flex-col gap-2" data-testid="impactores-list">
                            <span className="label-mono text-muted-white">
                                {t('impactores')}
                            </span>
                            {impactoresQuery.isLoading && (
                                <Loader2 size={14} className="animate-spin text-muted-white" />
                            )}
                            {impactoresQuery.data && impactoresQuery.data.length === 0 && (
                                <span className="font-space-mono text-[11px] text-muted-white">{t('noImpactores')}</span>
                            )}
                            {impactoresQuery.data && impactoresQuery.data.length > 0 && (
                                <ol className="flex flex-col divide-y-2 divide-line-white rounded-[12px] border-2 border-line-white">
                                    {/* Positions and names only — never a per-fan amount. */}
                                    {impactoresQuery.data.map((row) => (
                                        <li
                                            key={row.userId}
                                            className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-ink">
                                            <span className="w-8 font-space-mono text-[11px] text-blue">#{row.position}</span>
                                            {/* The idol sees private fans too (hidden from other fans only). */}
                                            <span>{row.firstName ?? '—'}</span>
                                            {row.isPrivate && (
                                                <span className="flex items-center gap-1 font-space-mono text-[10px] font-normal uppercase text-muted-white">
                                                    <Lock size={10} /> {t('privateMark')}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    )}
                    {exp.surpriseReveal && (
                        <div className="flex items-center gap-2">
                            <span className="label-mono text-muted-white">
                                {t('list.surpriseLabel')}
                            </span>
                            <span className="rounded-[8px] bg-lilac px-2 py-0.5 text-sm font-bold text-ink">
                                {showSurprise || exp.surpriseRevealedAt ? exp.surpriseReveal : '••••••••'}
                            </span>
                            {isWrite && !exp.surpriseRevealedAt && (
                                <button
                                    type="button"
                                    onClick={() => setShowSurprise((v) => !v)}
                                    aria-label={showSurprise ? t('hideSurprise') : t('showSurprise')}
                                    className="cursor-pointer text-muted-white transition-colors hover:text-ink"
                                >
                                    {showSurprise ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            )}
                        </div>
                    )}
                    {exp.redemptionInstructions && (
                        <div className="flex flex-col gap-1">
                            <span className="label-mono text-muted-white">
                                {t('redemptionInstructions')}
                            </span>
                            <p className="text-sm text-body-white">{exp.redemptionInstructions}</p>
                        </div>
                    )}
                    {bankQuery.data && (
                        <QuestionBankEditor
                            questions={bankQuery.data.questions}
                            onChange={() => {}}
                            locked
                        />
                    )}
                </div>
            )}
        </motion.div>
    );
}

// ── Stepper: − [value] + (hit areas ≥ 36px) ──
function Stepper({
    onDecrement, onIncrement, decrementLabel, incrementLabel, children,
}: {
    onDecrement: () => void;
    onIncrement: () => void;
    decrementLabel: string;
    incrementLabel: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={onDecrement}
                aria-label={decrementLabel}
                className="press flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[8px] bg-line-white text-ink"
            >
                <Minus size={16} strokeWidth={3} />
            </button>
            <div className="w-20">{children}</div>
            <button
                type="button"
                onClick={onIncrement}
                aria-label={incrementLabel}
                className="press flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[8px] bg-ink text-white"
            >
                <Plus size={16} strokeWidth={3} />
            </button>
        </div>
    );
}

// ── Create / Edit side panel (§7: always a right side panel) ──
function OpportunityFormDialog({
    eventId,
    existing,
    lineup,
    kind,
    onClose,
}: {
    eventId: string;
    existing?: Experience | null;
    lineup: LineupEntry[];
    /** Phase 6 — immutable after creation; the form shape follows it. */
    kind: ExperienceKind;
    onClose: () => void;
}) {
    const t = useTranslations('experiences');
    const tCommon = useTranslations('common');
    const queryClient = useQueryClient();
    const { confirm, dialog: confirmDialog } = useConfirmDialog();
    // The oportunidad's id once it exists: the one being edited, or the one
    // this panel just created when its bank save failed (M2) — the panel
    // then stays open in edit mode so a retry only PUTs the bank.
    const [savedId, setSavedId] = useState<string | null>(existing?.id ?? null);
    const isEditing = savedId !== null;
    const impacto = kind === 'impacto';
    // Idols picked before the first save, invited once it exists (RFC §3).
    const queuedInvites = useQueuedInvites(eventId, 'experience');

    // Phase 6 — cause fields (impactos only). Goal is typed in Fandis and
    // sent as COP (FANDI_RATE); formatFandis everywhere on the way back.
    const [goalFandis, setGoalFandis] = useState<string>(
        existing?.progress?.goalCop ? String(existing.progress.goalCop / FANDI_RATE) : '',
    );
    const [beneficiaryName, setBeneficiaryName] = useState(existing?.beneficiaryName ?? '');

    const [name, setName] = useState(existing?.name || '');
    const [description, setDescription] = useState(existing?.description || '');
    const [winnersPerEscuadra, setWinnersPerEscuadra] = useState(existing?.winnersPerEscuadra || 1);
    const [surpriseReveal, setSurpriseReveal] = useState(existing?.surpriseReveal || '');
    const [redemptionInstructions, setRedemptionInstructions] = useState(existing?.redemptionInstructions || '');
    const [escuadraNames, setEscuadraNames] = useState<Record<string, string>>({
        '4': existing?.escuadraNames?.['4'] || '',
        '3': existing?.escuadraNames?.['3'] || '',
        '2': existing?.escuadraNames?.['2'] || '',
        '1': existing?.escuadraNames?.['1'] || '',
    });
    // Franja (slot) assignment — Step 6.2. '' = global Fandi window.
    const [slotId, setSlotId] = useState<string>(existing?.slotId ?? '');
    // Artistas (lineup tags) — Step 6.4.
    const [tagIds, setTagIds] = useState<string[]>(existing?.tagIds ?? []);
    const { data: slots = [] } = useQuery({
        queryKey: ['events', eventId, 'slots'],
        queryFn: () => slotsApi.list(eventId),
    });

    // Knowledge contest bank (oportunidades only). null = untouched, so an
    // edit that never opens the questions never rewrites them.
    // Only a pre-existing oportunidad has a bank to load: until it has
    // loaded, the editor is not shown and nothing can be saved over it (an
    // empty draft saved on top of an unloaded bank would wipe it). Always a
    // fresh read when the panel opens (never a cached copy), and no
    // background refetch after that while the panel is open.
    const existingId = existing?.id ?? null;
    const bankEnabled = !impacto && existingId !== null;
    const bankQuery = useQuery({
        queryKey: ['experiences', existingId, 'questions'],
        queryFn: () => contestApi.getBank(existingId!),
        enabled: bankEnabled,
        refetchOnMount: 'always',
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
    const [bankDraft, setBankDraft] = useState<BankQuestionDraft[] | null>(null);
    const {
        loaded: bankLoaded,
        loading: bankLoading,
        failed: bankFailed,
    } = bankPanelState({
        enabled: bankEnabled,
        hasDraft: bankDraft !== null,
        isSuccess: bankQuery.isSuccess,
        isFetching: bankQuery.isFetching,
        isError: bankQuery.isError,
    });
    const questions: BankQuestionDraft[] = bankDraft ?? bankQuery.data?.questions ?? [];
    const bankLocked = bankQuery.data?.locked ?? false;
    const bankValid = impacto || bankDraft === null || canSaveBank(bankDraft);

    const goalFandisNumber = goalFandis.trim() === '' ? null : Number(goalFandis);
    const goalValid =
        goalFandisNumber === null ||
        (Number.isInteger(goalFandisNumber) && goalFandisNumber > 0);
    const impactoValid = !impacto || goalValid;

    /** The body the panel would send now (also the dirty-check snapshot). */
    const buildDto = (): CreateExperienceDto => {
        // Phase 6 — an Impacto never sends prize/slot fields.
        if (impacto) {
            return {
                name: name.trim(),
                ...(description && { description }),
                kind: 'impacto',
                // One title for the whole Impacto: the API still stores a
                // separate cause title, so it mirrors the name.
                causeTitle: name.trim(),
                goalCop: goalFandisNumber === null ? null : goalFandisNumber * FANDI_RATE,
                ...(beneficiaryName.trim() && { beneficiaryName: beneficiaryName.trim() }),
                tagIds,
            };
        }

        // Only include escuadra names that have values
        const names: Record<string, string> = {};
        for (const [level, val] of Object.entries(escuadraNames)) {
            if (val.trim()) names[level] = val.trim();
        }

        return {
            name: name.trim(),
            ...(description && { description }),
            winnersPerEscuadra,
            ...(Object.keys(names).length > 0 && { escuadraNames: names }),
            ...(surpriseReveal && { surpriseReveal }),
            ...(redemptionInstructions && { redemptionInstructions }),
            // '' → null unassigns (global window); an id assigns + mirrors the slot window.
            slotId: slotId || null,
            tagIds,
        };
    };
    // What the server holds for the form fields: the opening values, then
    // whatever this panel last saved.
    const [baselineJson, setBaselineJson] = useState(() => JSON.stringify(buildDto()));
    const dirty =
        bankDraft !== null ||
        queuedInvites.queue.items.length > 0 ||
        JSON.stringify(buildDto()) !== baselineJson;

    /** Saves the bank after the oportunidad exists (a new one has no id before). */
    const saveBank = async (experienceId: string) => {
        if (impacto || bankDraft === null) return;
        // Never send a bank the panel has not loaded: it would replace
        // the saved questions with whatever the draft holds.
        const action = bankSaveAction({
            enabled: bankEnabled,
            hasDraft: true,
            isSuccess: bankQuery.isSuccess,
            locked: bankLocked,
        });
        if (action === 'refuse') throw new Error(t('questions.loadError'));
        if (action === 'skip') return;
        await contestApi.replaceBank(experienceId, bankDraft);
        queryClient.invalidateQueries({ queryKey: ['experiences', experienceId, 'questions'] });
    };

    const onSaveError = (err: unknown) => { toast.error(err instanceof Error ? err.message : tCommon('error')); };

    const { mutate: create, isPending: isCreating } = useMutation({
        mutationFn: async (dto: CreateExperienceDto) => {
            const created = await experiencesApi.create(eventId, dto);
            // It exists now: the picked idols are invited to it, one call
            // each. Never throws — a failed invitation is only reported.
            const invites = await queuedInvites.sendFor(created.id);
            // The oportunidad now exists: a failed bank save must not leave
            // the panel in "create" mode (a retry would duplicate it).
            try {
                await saveBank(created.id);
                return { created, dto, invites, bankError: null as string | null };
            } catch (err) {
                return { created, dto, invites, bankError: err instanceof Error ? err.message : tCommon('error') };
            }
        },
        onSuccess: ({ created, dto, invites, bankError }) => {
            queryClient.invalidateQueries({ queryKey: ['experiences', eventId] });
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'slots'] });
            if (bankError) {
                // M2: stay open, now editing the created one; bankDraft is
                // kept, so saving again only PUTs the bank.
                setSavedId(created.id);
                setBaselineJson(JSON.stringify(dto));
                toast.error(t('questions.saveFailedAfterCreate', { message: bankError }));
                queuedInvites.announce(invites);
                return;
            }
            queuedInvites.announce(invites, impacto ? t('impactoCreated') : t('created'));
            onClose();
        },
        onError: onSaveError,
    });

    const { mutate: update, isPending: isUpdating } = useMutation({
        mutationFn: async (dto: CreateExperienceDto) => {
            const id = savedId!;
            // Unchanged fields are not re-sent (after M2 this is bank only).
            if (JSON.stringify(dto) !== baselineJson) {
                await experiencesApi.update(id, dto);
                setBaselineJson(JSON.stringify(dto));
            }
            await saveBank(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experiences', eventId] });
            queryClient.invalidateQueries({ queryKey: ['events', eventId, 'slots'] });
            toast.success(impacto ? t('impactoUpdated') : t('updated'));
            onClose();
        },
        onError: onSaveError,
    });

    const isPending = isCreating || isUpdating;

    // Leaving the page with unsaved work asks the browser to confirm.
    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirty]);

    /** Close, asking first when there is unsaved work (M1). */
    const requestClose = async () => {
        if (isPending) return;
        if (dirty) {
            const discard = await confirm({
                title: t('panel.discardTitle'),
                description: t('panel.discardBody'),
                confirmLabel: t('panel.discard'),
                cancelLabel: t('panel.keepEditing'),
            });
            if (!discard) return;
        }
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || isPending) return;
        if (impacto && !impactoValid) return;
        if (!impacto && (bankLoading || !bankValid)) return;
        const dto = buildDto();
        if (isEditing) {
            update(dto);
        } else {
            create(dto);
        }
    };

    return (
        <Sheet open onOpenChange={(open) => { if (!open) void requestClose(); }}>
            <SheetContent side="right" className="gap-0 p-0" aria-describedby={undefined}>
                <SheetHeader className="shrink-0 border-b-2 border-ink px-7 py-[22px] pr-16">
                    <SheetTitle className="text-[24px]">
                        {impacto
                            ? (isEditing ? t('editImpacto') : t('addImpacto'))
                            : (isEditing ? t('panel.editTitle') : t('add'))}
                    </SheetTitle>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    {/* Scrollable form content */}
                    <div className="flex-1 overflow-y-auto px-7 py-5">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className={FIELD_LABEL}>
                                    {impacto ? t('impactos.form.title') : t('name')} *
                                </label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={impacto ? 120 : undefined}
                                    placeholder={impacto ? t('impactos.form.titlePlaceholder') : t('name')}
                                    className="h-12 border-[3px] border-blue px-3.5 text-base font-bold md:text-base"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className={FIELD_LABEL}>
                                    {impacto ? t('impactos.form.story') : t('description')}
                                </label>
                                <Textarea
                                    value={description}
                                    placeholder={impacto ? t('impactos.form.storyPlaceholder') : undefined}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="px-3.5 py-2.5 text-sm text-body-white"
                                />
                            </div>

                            {/* Phase 6 — Impacto: cause, goal, beneficiary */}
                            {impacto && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1.5">
                                            <label className={FIELD_LABEL}>
                                                {t('goal')}
                                            </label>
                                            <Input
                                                type="number"
                                                min={1}
                                                step={1}
                                                value={goalFandis}
                                                onChange={(e) => setGoalFandis(e.target.value)}
                                                placeholder="1000"
                                                className="h-12 px-3.5 text-base font-extrabold md:text-base"
                                                data-testid="impacto-goal"
                                            />
                                            <p className="font-space-mono text-[10px] leading-snug text-muted-white">{t('goalHelp')}</p>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className={FIELD_LABEL}>
                                                {t('beneficiary')}
                                            </label>
                                            <Input
                                                value={beneficiaryName}
                                                onChange={(e) => setBeneficiaryName(e.target.value)}
                                                maxLength={120}
                                                placeholder={t('beneficiaryPlaceholder')}
                                                className="h-12 px-3.5 text-base md:text-base"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Winners per category + category rules — Oportunidades only */}
                            {!impacto && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-baseline justify-between gap-3">
                                    <label className={FIELD_LABEL}>
                                        {t('winnersPerEscuadra')}
                                    </label>
                                    <span className="text-sm font-black">
                                        {t('panel.totalWinners', { count: winnersPerEscuadra * CATEGORY_LEVELS.length })}
                                    </span>
                                </div>
                                <p className="font-space-mono text-[10px] font-bold uppercase text-ink" data-testid="same-winners-help">
                                    {t('panel.sameWinners')}
                                </p>
                                <Stepper
                                    onDecrement={() => setWinnersPerEscuadra((v) => Math.max(1, v - 1))}
                                    onIncrement={() => setWinnersPerEscuadra((v) => Math.min(100, v + 1))}
                                    decrementLabel={t('panel.decrease')}
                                    incrementLabel={t('panel.increase')}
                                >
                                    <Input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={winnersPerEscuadra}
                                        onChange={(e) => setWinnersPerEscuadra(Number(e.target.value))}
                                        className="h-10 px-2 text-center text-base font-black md:text-base"
                                    />
                                </Stepper>

                                {/* Category rows: colour, optional custom name, rule, winners */}
                                <div className="mt-1 flex flex-col gap-1.5">
                                    {CATEGORY_LEVELS.map((level) => (
                                        <div
                                            key={level}
                                            className="flex items-center gap-3 overflow-hidden rounded-[10px] border-2 border-ink pr-3"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="block w-2 self-stretch border-r-2 border-ink"
                                                style={{ background: categoryColor(level) }}
                                            />
                                            <Input
                                                value={escuadraNames[String(level)]}
                                                onChange={(e) => setEscuadraNames(prev => ({ ...prev, [String(level)]: e.target.value }))}
                                                placeholder={categoryDefaultName(level)}
                                                aria-label={t('panel.categoryName', { name: categoryDefaultName(level) })}
                                                className="h-10 min-w-0 flex-1 border-0 bg-transparent px-1 font-display text-[15px] placeholder:text-ink focus-visible:bg-line-white focus-visible:shadow-none md:text-[15px]"
                                            />
                                            <span className="shrink-0 font-space-mono text-[10px] uppercase text-muted-white">
                                                {t(`panel.rule.${level}`)}
                                            </span>
                                            <span className="w-10 shrink-0 text-right font-display text-[15px] tabular">
                                                ×{winnersPerEscuadra}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <p className="font-space-mono text-[10px] leading-relaxed text-muted-white">
                                    {t('panel.namesOptional')}
                                </p>
                                <div className="rounded-[10px] bg-line-white px-3 py-2.5">
                                    <p className="label-mono font-bold text-ink">
                                        {t('panel.fanNeverSees')}
                                    </p>
                                    <p className="mt-1 font-space-mono text-[10px] leading-relaxed text-muted-white">
                                        {t('distribution')} · {t('panel.autoAssigned')}
                                    </p>
                                </div>
                            </div>
                            )}

                            {/* Knowledge contest bank — Oportunidades only. When
                                editing, the editor (and its Add button) appears
                                only once the saved bank has loaded. */}
                            {!impacto && bankLoaded && (
                                <QuestionBankEditor
                                    questions={questions}
                                    onChange={setBankDraft}
                                    locked={bankLocked}
                                />
                            )}
                            {!impacto && bankLoading && (
                                <p className="font-space-mono text-[11px] text-muted-white" data-testid="question-bank-loading">
                                    {t('questions.loading')}
                                </p>
                            )}
                            {!impacto && bankFailed && (
                                <div
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border-2 border-alert-white px-3 py-2.5"
                                    role="alert"
                                    data-testid="question-bank-error"
                                >
                                    <p className="min-w-0 flex-1 text-[12px] font-bold text-alert-white">
                                        {t('questions.loadError')}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => void bankQuery.refetch()}
                                        disabled={bankQuery.isFetching}
                                    >
                                        {bankQuery.isFetching && <Loader2 size={14} className="animate-spin" />}
                                        {t('questions.retry')}
                                    </Button>
                                </div>
                            )}

                            {/* Franja (slot) — Step 6.2. Impactos open with the
                                event's Fandi window: no franja. */}
                            {!impacto && (
                            <div className="flex flex-col gap-1.5">
                                <label className={FIELD_LABEL}>
                                    {t('franja')}
                                </label>
                                <select
                                    value={slotId}
                                    onChange={(e) => setSlotId(e.target.value)}
                                    className="h-12 cursor-pointer rounded-[10px] border-2 border-ink bg-white px-3.5 text-base font-bold text-ink outline-none focus-visible:shadow-ext-sm"
                                >
                                    <option value="">{t('noFranja')}</option>
                                    {slots.map((slot) => (
                                        <option key={slot.id} value={slot.id}>
                                            {slot.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            )}

                            {/* Idol collaborations (RFC §3): real idol accounts,
                                by invitation — pickable before the first save.
                                They replace the text tags. */}
                            <IdolCollaborationsSection
                                eventId={eventId}
                                dynamicType="experience"
                                dynamicId={savedId}
                                queue={queuedInvites.queue}
                            />

                            {/* Legacy lineup text tags (Step 6.4): kept so old
                                ones can be seen and removed. */}
                            {tagIds.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                    <label className={FIELD_LABEL}>
                                        {t('legacyTags')}
                                    </label>
                                    <ArtistMultiSelect
                                        lineup={lineup}
                                        value={tagIds}
                                        onChange={setTagIds}
                                        emptyHint={t('artistsEmpty')}
                                    />
                                </div>
                            )}

                            {/* Surprise + redemption — Oportunidades only */}
                            {!impacto && (
                            <>
                            <div className="flex flex-col gap-1.5">
                                <label className={FIELD_LABEL}>
                                    {t('surpriseReveal')}
                                </label>
                                <Input
                                    value={surpriseReveal}
                                    onChange={(e) => setSurpriseReveal(e.target.value)}
                                    placeholder={t('panel.surprisePlaceholder')}
                                    className="h-12 px-3.5 text-base md:text-base"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className={FIELD_LABEL}>
                                    {t('redemptionInstructions')}
                                </label>
                                <Textarea
                                    value={redemptionInstructions}
                                    onChange={(e) => setRedemptionInstructions(e.target.value)}
                                    rows={2}
                                    placeholder={t('panel.redemptionPlaceholder')}
                                    className="px-3.5 py-2.5 text-sm text-body-white"
                                />
                            </div>
                            </>
                            )}
                        </div>
                    </div>

                    {/* Sticky footer — always visible. No fan preview exists
                        yet, so "VISTA DEL FAN" is omitted. */}
                    <div className="flex shrink-0 gap-3 border-t-2 border-ink px-7 py-[18px]">
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={() => void requestClose()}
                            className="flex-1"
                        >
                            {t('panel.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            size="lg"
                            disabled={!name.trim() || !impactoValid || !bankValid || bankLoading || isPending}
                            className="flex-[2] font-black [font-stretch:112%]"
                        >
                            {isPending && <Loader2 size={14} className="animate-spin" />}
                            {isEditing ? t('panel.save') : impacto ? t('addImpacto') : t('add')}
                        </Button>
                    </div>
                </form>
                {confirmDialog}
            </SheetContent>
        </Sheet>
    );
}

// ── Section header on blue ──
function SectionHeader({ live, children }: { live?: boolean; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2.5">
            {live && <span className="live-dot text-lime" aria-hidden="true" />}
            <h2 className={`label-mono text-[11px] font-bold ${live ? 'text-lime' : 'text-lilac'}`}>
                {children}
            </h2>
        </div>
    );
}

// ── Main page ──
/**
 * Oportunidades and Impactos are separate sections (separate tabs, separate
 * create panels): an Oportunidad is a knowledge contest by categories (the
 * fastest right answer wins in each), an Impacto is a cause with a goal and
 * no prize. Same data (experiences), split by `kind`.
 */
export function DynamicsView({ kind }: { kind: ExperienceKind }) {
    const impactoMode = kind === 'impacto';
    const params = useParams();
    const eventId = params.id as string;
    const t = useTranslations('experiences');
    const tCommon = useTranslations('common');
    const queryClient = useQueryClient();
    const { memberRole } = useAuth();
    const isWrite = memberRole === 'owner' || memberRole === 'admin';

    const [showForm, setShowForm] = useState(false);
    const [editingExp, setEditingExp] = useState<Experience | null>(null);
    const [showBanner, setShowBanner] = useState(true);

    const { data: experiences, isLoading } = useQuery({
        queryKey: ['experiences', eventId],
        queryFn: () => experiencesApi.list(eventId),
    });

    const { data: event } = useQuery({
        queryKey: ['events', eventId],
        queryFn: () => eventsApi.get(eventId),
    });

    const revealMutation = useMutation({
        mutationFn: (id: string) => experiencesApi.reveal(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experiences', eventId] });
            toast.success(t('revealed'));
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : tCommon('error')),
    });

    const closeMutation = useMutation({
        mutationFn: (id: string) => experiencesApi.close(id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['experiences', eventId] });
            const closedExp = experiences?.find((e) => e.id === id);
            toast.success(closedExp && isImpacto(closedExp) ? t('impactoClosed') : t('closed'));
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : tCommon('error')),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => experiencesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experiences', eventId] });
            toast.success(t('deleted'));
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : tCommon('error')),
    });

    const handleReveal = (id: string) => {
        if (confirm(t('revealConfirm'))) revealMutation.mutate(id);
    };
    const handleClose = (id: string) => {
        const target = experiences?.find((e) => e.id === id);
        const message = target && isImpacto(target) ? t('closeImpactoConfirm') : t('closeConfirm');
        if (confirm(message)) closeMutation.mutate(id);
    };
    const handleEdit = (exp: Experience) => {
        setEditingExp(exp);
        setShowForm(true);
    };
    const handleDelete = (id: string) => {
        if (confirm(t('list.deleteConfirm'))) {
            deleteMutation.mutate(id);
        }
    };
    const handleCloseForm = () => {
        setShowForm(false);
        setEditingExp(null);
    };

    const visible = filterByKind(experiences ?? [], kind);
    const pending = visible.filter((e) => e.status === 'pending');
    const active = visible.filter((e) => e.status === 'active');
    const closed = visible.filter((e) => e.status === 'closed');

    const renderCards = (list: Experience[]) => list.map((exp, idx) => (
        <OpportunityCard
            key={exp.id}
            exp={exp}
            isWrite={isWrite}
            onReveal={handleReveal}
            onClose={handleClose}
            onEdit={handleEdit}
            onDelete={handleDelete}
            index={idx}
        />
    ));

    return (
        <div className="flex flex-col gap-[18px]">
            {/* ── Header ── */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="font-display text-[32px] text-white">
                        {impactoMode ? t('impactos.title') : t('title')}
                    </h1>
                    {event && (
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="label-mono text-[11px] text-lilac">{event.name}</span>
                            <EventStatusBadge status={event.status} />
                        </div>
                    )}
                </div>

                {isWrite && (
                    <Button
                        size="lg"
                        onClick={() => { setEditingExp(null); setShowForm(true); }}
                        data-testid={impactoMode ? 'add-impacto' : 'add-oportunidad'}
                    >
                        {impactoMode ? <HeartHandshake size={16} /> : <Plus size={16} strokeWidth={3} />}
                        {impactoMode ? t('addImpacto') : t('add')}
                    </Button>
                )}
            </div>

            {/* ── How it works ── */}
            {showBanner && (
                <div className="flex items-start gap-3.5 rounded-[14px] bg-ink px-[18px] py-3.5 text-white">
                    <span
                        aria-hidden="true"
                        className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-lime text-sm font-black text-ink"
                    >
                        i
                    </span>
                    <p className="max-w-[640px] flex-1 text-sm leading-relaxed text-lilac">
                        {t.rich(impactoMode ? 'impactos.howItWorks' : 'list.howItWorks', {
                            b: (chunks) => <b className="text-white">{chunks}</b>,
                            hl: (chunks) => <b className="text-lime">{chunks}</b>,
                        })}
                    </p>
                    <button
                        onClick={() => setShowBanner(false)}
                        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-muted-ink transition-colors hover:bg-chip-ink hover:text-white"
                        aria-label={t('list.closeBanner')}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ── Franjas (slots) — Step 6.2 ── */}
            {/* Impactos never belong to a franja (API rule), so slots live here only. */}
            {isWrite && !impactoMode && <FranjasSection eventId={eventId} />}

            {/* ── Loading ── */}
            {isLoading && (
                <div className="flex max-w-[900px] flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                    ))}
                </div>
            )}

            {/* ── Empty ── */}
            {!isLoading && visible.length === 0 && (
                <div className="flex max-w-[900px] flex-col items-center justify-center gap-2 rounded-[18px] border-[3px] border-dashed border-white/60 px-6 py-16 text-center">
                    <p className="font-display text-[24px] text-white">
                        {impactoMode ? t('impactos.emptyTitle') : t('list.emptyTitle')}
                    </p>
                    <p className="text-sm text-lilac">
                        {impactoMode ? t('impactos.emptyBody') : t('list.emptyBody')}
                    </p>
                </div>
            )}

            {/* ── Active section ── */}
            {active.length > 0 && (
                <section className="flex max-w-[900px] flex-col gap-3">
                    <SectionHeader live>{t('list.sectionActive', { count: active.length })}</SectionHeader>
                    {renderCards(active)}
                </section>
            )}

            {/* ── Pending section ── */}
            {pending.length > 0 && (
                <section className="flex max-w-[900px] flex-col gap-3">
                    <SectionHeader>{t('list.sectionPending', { count: pending.length })}</SectionHeader>
                    {renderCards(pending)}
                </section>
            )}

            {/* ── Closed section ── */}
            {closed.length > 0 && (
                <section className="flex max-w-[900px] flex-col gap-3">
                    <SectionHeader>{t('list.sectionClosed', { count: closed.length })}</SectionHeader>
                    {renderCards(closed)}
                </section>
            )}

            {/* ── Create / Edit side panel ── */}
            {showForm && (
                <OpportunityFormDialog
                    eventId={eventId}
                    existing={editingExp}
                    lineup={event?.lineup ?? []}
                    kind={kind}
                    onClose={handleCloseForm}
                />
            )}
        </div>
    );
}
