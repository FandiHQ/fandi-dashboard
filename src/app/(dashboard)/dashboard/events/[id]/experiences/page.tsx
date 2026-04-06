'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Plus, Loader2, Users, Trophy, Eye, EyeOff,
    Zap, Lock, ChevronDown, ChevronUp, Gift,
    Pencil, Trash2, Info, X,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { experiencesApi, eventsApi } from '@/lib/api-hooks';
import type { Experience, CreateExperienceDto, EscuadraInfo, ExperienceStatus } from '@/types/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

// ── Escuadra tier colors (from FANDI_DESIGN_WEB.md) ──
const ESCUADRA_COLORS: Record<number, { bar: string; glow: string; text: string }> = {
    1: { bar: '#737373', glow: 'rgba(115,115,115,0.3)', text: '#A0A0A0' },
    2: { bar: '#2D00F7', glow: 'rgba(45,0,247,0.4)',     text: '#7B61FF' },
    3: { bar: '#FF3366', glow: 'rgba(255,51,102,0.4)',   text: '#FF3366' },
    4: { bar: '#FFD700', glow: 'rgba(255,215,0,0.4)',    text: '#FFD700' },
};

const DEFAULT_ESCUADRA_NAMES: Record<number, string> = {
    4: 'VIP', 3: 'Alta', 2: 'Media', 1: 'Base',
};

// ── Status badge ──
function StatusBadge({ status }: { status: ExperienceStatus }) {
    const t = useTranslations('experiences');
    const cfg = {
        pending: { label: t('statusPending'), bg: '#73737320', color: '#737373', border: '#737373' },
        active:  { label: t('statusActive'),  bg: '#00FF8820', color: '#00FF88', border: '#00FF88' },
        closed:  { label: t('statusClosed'),  bg: '#FF336620', color: '#FF3366', border: '#FF3366' },
    }[status];

    return (
        <span
            className="inline-flex items-center gap-1.5 px-3 py-1 font-space-mono text-[11px] uppercase tracking-[1px]"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
        >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />
            {cfg.label}
        </span>
    );
}

// ── Escuadra distribution bar ──
function EscuadraBar({ escuadras }: { escuadras: EscuadraInfo[] }) {
    const total = escuadras.reduce((s, e) => s + e.userCount, 0);
    // Sort by level descending: VIP (4) first, Base (1) last
    const sorted = [...escuadras].sort((a, b) => b.level - a.level);
    const allEmpty = total === 0;

    return (
        <div className="flex flex-col gap-2">
            {/* Progress bars */}
            <div className="flex h-3 w-full overflow-hidden border border-[#2A2A2A] bg-[#121212]">
                {[...sorted].reverse().map((esc) => {
                    const widthPct = total > 0 ? (esc.userCount / total) * 100 : 25;
                    const color = ESCUADRA_COLORS[esc.level] || ESCUADRA_COLORS[1];

                    return (
                        <div
                            key={esc.level}
                            className="h-full transition-all duration-500"
                            style={{
                                width: `${widthPct}%`,
                                backgroundColor: esc.userCount > 0 ? color.bar : color.bar,
                                borderRight: '1px solid #141414',
                                opacity: esc.userCount > 0 ? 1 : 0.15,
                                boxShadow: esc.userCount > 0 ? `0 0 8px ${color.glow}` : 'none',
                            }}
                        />
                    );
                })}
            </div>

            {/* Labels - always evenly distributed */}
            <div className="grid" style={{ gridTemplateColumns: `repeat(${sorted.length}, 1fr)` }}>
                {[...sorted].reverse().map((esc) => {
                    const color = ESCUADRA_COLORS[esc.level] || ESCUADRA_COLORS[1];
                    const name = esc.name || DEFAULT_ESCUADRA_NAMES[esc.level] || `E${esc.level}`;
                    const tierLabels: Record<number, string> = {
                        4: "Top 5%",
                        3: "Sig. 15%",
                        2: "Sig. 30%",
                        1: "Bot. 50%"
                    };
                    return (
                        <div key={esc.level} className="flex flex-col items-center gap-0.5">
                            <span className="font-space-mono text-[10px] uppercase tracking-[1px] text-center" style={{ color: color.text }}>
                                {name} <span className="block opacity-70">({tierLabels[esc.level] || ''})</span>
                            </span>
                            <span className="font-sora text-[13px] font-bold" style={{ color: color.text }}>
                                {esc.userCount}
                            </span>
                            <span className="font-space-mono text-[8px] uppercase tracking-[1px] opacity-50" style={{ color: color.text }}>
                                {esc.userCount === 1 ? 'fan' : 'fans'}
                            </span>
                            <span className="mt-0.5 font-space-mono text-[8px] tracking-[0.5px] opacity-40" style={{ color: color.text }}>
                                {esc.minAmount > 0 ? `≥ ${esc.minAmount} fandis` : '—'}
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
    const escuadras = exp.escuadras || [];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index ?? 0) * 0.1, duration: 0.3 }}
            className="group flex flex-col border border-[#1E1E1E] bg-[#0A0A0A] transition-all duration-200 hover:border-[#2A2A2A]"
        >
            {/* Header */}
            <div className="flex items-start justify-between p-5">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <Gift size={18} className="text-[#2D00F7]" />
                        <h3 className="font-sora text-xl font-bold text-white">{exp.name}</h3>
                    </div>
                    <StatusBadge status={exp.status} />
                </div>

                <div className="flex items-center gap-2">
                    {/* Edit button — only pending */}
                    {isWrite && exp.status === 'pending' && (
                        <button
                            onClick={() => onEdit(exp)}
                            className="flex cursor-pointer items-center gap-1.5 border border-[#2A2A2A] bg-transparent px-3 py-2 font-space-mono text-[11px] uppercase tracking-[1px] text-[#A0A0A0] transition-all hover:border-[#2D00F7] hover:text-white hover:shadow-[0_0_12px_rgba(45,0,247,0.2)]"
                        >
                            <Pencil size={13} />
                            Editar
                        </button>
                    )}

                    {/* Delete button — only pending with no contributions */}
                    {isWrite && exp.status === 'pending' && (exp.contributorCount || 0) === 0 && (
                        <button
                            onClick={() => onDelete(exp.id)}
                            className="flex cursor-pointer items-center gap-1.5 border border-[#2A2A2A] bg-transparent px-3 py-2 font-space-mono text-[11px] uppercase tracking-[1px] text-[#FF3366] transition-all hover:border-[#FF3366] hover:shadow-[0_0_12px_rgba(255,51,102,0.2)]"
                        >
                            <Trash2 size={13} />
                        </button>
                    )}

                    {/* Reveal button — active + has surprise + not revealed */}
                    {isWrite && exp.surpriseReveal && !exp.surpriseRevealedAt && exp.status === 'active' && (
                        <button
                            onClick={() => onReveal(exp.id)}
                            className="flex cursor-pointer items-center gap-2 border border-[#FFD700] bg-transparent px-3 py-2 font-space-mono text-[11px] uppercase tracking-[1px] text-[#FFD700] transition-all hover:bg-[#FFD70010] hover:shadow-[0_0_12px_rgba(255,215,0,0.3)]"
                        >
                            <Eye size={14} />
                            {t('reveal')}
                        </button>
                    )}
                    {exp.surpriseRevealedAt && (
                        <span className="flex items-center gap-1.5 font-space-mono text-[10px] uppercase tracking-[1px] text-[#FFD700]">
                            <EyeOff size={12} /> Revelado
                        </span>
                    )}

                    {/* Close button — active only */}
                    {isWrite && exp.status === 'active' && (
                        <button
                            onClick={() => onClose(exp.id)}
                            className="flex cursor-pointer items-center gap-2 border border-[#FF3366] bg-transparent px-3 py-2 font-space-mono text-[11px] uppercase tracking-[1px] text-[#FF3366] transition-all hover:bg-[#FF336610] hover:shadow-[0_0_12px_rgba(255,51,102,0.3)]"
                        >
                            <Lock size={14} />
                            {t('close')}
                        </button>
                    )}

                    {/* Expand toggle */}
                    <button onClick={() => setExpanded(!expanded)} className="cursor-pointer p-1 text-[#4A4A4A] hover:text-white">
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 border-t border-[#141414] px-5 py-3">
                <div className="flex items-center gap-2">
                    <Users size={14} className="text-[#4A4A4A]" />
                    <span className="font-space-mono text-[12px] text-[#A0A0A0]">
                        {exp.contributorCount || 0} {t('contributors')}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-[#4A4A4A]" />
                    <span className="font-space-mono text-[12px] text-[#A0A0A0]">
                        {exp.winnersPerEscuadra}× por escuadra
                    </span>
                </div>
            </div>

            {/* Escuadra bar */}
            {escuadras.length > 0 && (
                <div className="border-t border-[#141414] px-5 py-4">
                    <EscuadraBar escuadras={escuadras} />
                </div>
            )}

            {/* Expanded details */}
            {expanded && (
                <div className="flex flex-col gap-3 border-t border-[#141414] px-5 py-4">
                    {exp.description && (
                        <p className="font-sora text-sm leading-relaxed text-[#737373]">{exp.description}</p>
                    )}
                    {exp.surpriseReveal && (
                        <div className="flex items-center gap-2">
                            <span className="font-space-mono text-[10px] uppercase tracking-[1px] text-[#4A4A4A]">
                                Sorpresa:
                            </span>
                            <span className="font-sora text-sm text-[#FFD700]">
                                {exp.surpriseRevealedAt ? exp.surpriseReveal : '••••••••'}
                            </span>
                        </div>
                    )}
                    {exp.redemptionInstructions && (
                        <div className="flex flex-col gap-1">
                            <span className="font-space-mono text-[10px] uppercase tracking-[1px] text-[#4A4A4A]">
                                Instrucciones de canje:
                            </span>
                            <p className="font-sora text-sm text-[#A0A0A0]">{exp.redemptionInstructions}</p>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}

// ── Create / Edit dialog ──
function OpportunityFormDialog({
    eventId,
    existing,
    onClose,
}: {
    eventId: string;
    existing?: Experience | null;
    onClose: () => void;
}) {
    const t = useTranslations('experiences');
    const queryClient = useQueryClient();
    const isEditing = !!existing;

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

    const { mutate: create, isPending: isCreating } = useMutation({
        mutationFn: (dto: CreateExperienceDto) => experiencesApi.create(eventId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experiences', eventId] });
            toast.success(t('created'));
            onClose();
        },
        onError: (err: unknown) => { toast.error(err instanceof Error ? err.message : 'Error'); },
    });

    const { mutate: update, isPending: isUpdating } = useMutation({
        mutationFn: (dto: Partial<CreateExperienceDto>) => experiencesApi.update(existing!.id, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experiences', eventId] });
            toast.success(t('updated'));
            onClose();
        },
        onError: (err: unknown) => { toast.error(err instanceof Error ? err.message : 'Error'); },
    });

    const isPending = isCreating || isUpdating;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        // Only include escuadra names that have values
        const names: Record<string, string> = {};
        for (const [level, val] of Object.entries(escuadraNames)) {
            if (val.trim()) names[level] = val.trim();
        }

        const dto: CreateExperienceDto = {
            name: name.trim(),
            ...(description && { description }),
            winnersPerEscuadra,
            ...(Object.keys(names).length > 0 && { escuadraNames: names }),
            ...(surpriseReveal && { surpriseReveal }),
            ...(redemptionInstructions && { redemptionInstructions }),
        };
        if (isEditing) {
            update(dto);
        } else {
            create(dto);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="flex w-full max-w-lg max-h-[90vh] flex-col border border-[#1E1E1E] bg-[#0A0A0A] shadow-[0_0_60px_rgba(45,0,247,0.1)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HUD bracket top */}
                <div className="flex shrink-0 items-center gap-2 border-b border-[#1E1E1E] px-6 py-4">
                    <div className="h-3 w-1 bg-[#2D00F7]" />
                    <h2 className="font-space-mono text-[14px] uppercase tracking-[2px] text-white">
                        {isEditing ? 'Editar Oportunidad' : t('add')}
                    </h2>
                    <div className="ml-auto h-3 w-1 bg-[#2D00F7]" />
                </div>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    {/* Scrollable form content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                                    {t('name')} *
                                </label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('name')}
                                    className="h-12 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-lg text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:ring-0"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                                    {t('description')}
                                </label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="rounded-none border-[#2A2A2A] bg-[#141414] p-4 font-sora text-base text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:ring-0"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                                    {t('winnersPerEscuadra')}
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={winnersPerEscuadra}
                                    onChange={(e) => setWinnersPerEscuadra(Number(e.target.value))}
                                    className="h-12 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-lg text-white focus:border-[#2D00F7] focus:ring-0"
                                />
                                <p className="font-space-mono text-[10px] text-[#4A4A4A]">{t('distribution')}</p>
                            </div>

                            {/* Escuadra Names */}
                            <div className="mt-4 flex flex-col gap-4 border border-[#2A2A2A] bg-[#0A0A0A] p-5 shadow-inner transition-colors duration-300 hover:border-[#4A4A4A]">
                                <div className="flex items-center gap-2">
                                    <label className="font-space-mono text-[13px] uppercase tracking-[2px] text-white">
                                        Nombres y Distribución de Escuadras
                                    </label>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button type="button" className="cursor-help text-[#2D00F7] transition-colors hover:text-white hover:drop-shadow-[0_0_8px_rgba(45,0,247,0.8)] focus:outline-none">
                                                    <Info size={16} />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[280px] rounded-none border-[#2D00F7] bg-[#020202] py-3 pl-3 pr-4 font-sora text-[12px] leading-relaxed text-[#A0A0A0] shadow-[0_0_20px_rgba(45,0,247,0.2)]">
                                                Las Escuadras agrupan a los participantes según sus contribuciones. <strong className="text-[#FFD700]">Nivel 1</strong> agrupa al Top 5% dándoles la mayor probabilidad de ganar al competir contra menos personas.
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {[4, 3, 2, 1].map((level) => {
                                        const color = ESCUADRA_COLORS[level];
                                        const placeholder = DEFAULT_ESCUADRA_NAMES[level];
                                        const tierLabels: Record<number, string> = {
                                            4: "Top 5%",
                                            3: "Sig. 15%",
                                            2: "Sig. 30%",
                                            1: "Bot. 50%"
                                        };
                                        return (
                                            <div key={level} className="flex flex-col gap-1.5">
                                                <span className="font-space-mono text-[11px] font-bold uppercase tracking-[1px]" style={{ color: color.text }}>
                                                    Nivel {level} <span className="font-normal opacity-70">({tierLabels[level]})</span>
                                                </span>
                                                <Input
                                                    value={escuadraNames[String(level)]}
                                                    onChange={(e) => setEscuadraNames(prev => ({ ...prev, [String(level)]: e.target.value }))}
                                                    placeholder={placeholder}
                                                    className="h-10 rounded-none border-[#2A2A2A] bg-[#141414] px-3 font-sora text-sm text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:ring-0"
                                                    style={{ borderColor: color.bar + '40' }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="font-space-mono text-[10px] text-[#737373]">
                                    Opcional. Deja vacío para usar nombres por defecto.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                                    {t('surpriseReveal')}
                                </label>
                                <Input
                                    value={surpriseReveal}
                                    onChange={(e) => setSurpriseReveal(e.target.value)}
                                    placeholder="Ej: ¡Backstage pass incluido!"
                                    className="h-12 rounded-none border-[#2A2A2A] bg-[#141414] px-4 font-sora text-lg text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:ring-0"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="font-space-mono text-[12px] uppercase tracking-[2px] text-[#A0A0A0]">
                                    {t('redemptionInstructions')}
                                </label>
                                <Textarea
                                    value={redemptionInstructions}
                                    onChange={(e) => setRedemptionInstructions(e.target.value)}
                                    rows={2}
                                    placeholder="Ej: Presentarse en la entrada VIP con QR"
                                    className="rounded-none border-[#2A2A2A] bg-[#141414] p-4 font-sora text-base text-white placeholder:text-[#4A4A4A] focus:border-[#2D00F7] focus:ring-0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sticky footer — always visible */}
                    <div className="shrink-0 border-t border-[#1E1E1E] bg-[#0A0A0A] px-6 py-4">
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={!name.trim() || isPending}
                                className="flex flex-1 cursor-pointer items-center justify-center gap-2 bg-[#2D00F7] px-6 py-3 font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all hover:bg-[#2400C5] hover:shadow-[0_0_24px_rgba(45,0,247,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isPending && <Loader2 size={14} className="animate-spin" />}
                                {isEditing ? 'Guardar' : t('add')}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="cursor-pointer border border-[#2A2A2A] bg-transparent px-6 py-3 font-space-mono text-[13px] uppercase tracking-[1px] text-[#A0A0A0] transition-colors hover:border-[#4A4A4A] hover:text-white"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main page ──
export default function OportunidadesPage() {
    const params = useParams();
    const eventId = params.id as string;
    const t = useTranslations('experiences');
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
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
    });

    const closeMutation = useMutation({
        mutationFn: (id: string) => experiencesApi.close(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experiences', eventId] });
            toast.success(t('closed'));
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => experiencesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experiences', eventId] });
            toast.success(t('deleted'));
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Error'),
    });

    const handleReveal = (id: string) => {
        if (confirm(t('revealConfirm'))) revealMutation.mutate(id);
    };
    const handleClose = (id: string) => {
        if (confirm(t('closeConfirm'))) closeMutation.mutate(id);
    };
    const handleEdit = (exp: Experience) => {
        setEditingExp(exp);
        setShowForm(true);
    };
    const handleDelete = (id: string) => {
        if (confirm('¿Eliminar esta oportunidad? Esta acción no se puede deshacer.')) {
            deleteMutation.mutate(id);
        }
    };
    const handleCloseForm = () => {
        setShowForm(false);
        setEditingExp(null);
    };

    const pending = experiences?.filter((e) => e.status === 'pending') || [];
    const active = experiences?.filter((e) => e.status === 'active') || [];
    const closed = experiences?.filter((e) => e.status === 'closed') || [];

    return (
        <div className="flex flex-col gap-8 p-8">
            {/* ── Banner ── */}
            {showBanner && (
                <div className="relative flex flex-col gap-3 border border-[#2D00F7] bg-[#2D00F705] p-6 shadow-[0_0_30px_rgba(45,0,247,0.1)] transition-all">
                    <button 
                        onClick={() => setShowBanner(false)}
                        className="absolute right-4 top-4 cursor-pointer text-[#A0A0A0] transition-colors hover:text-white"
                        aria-label="Cerrar banner"
                    >
                        <X size={18} />
                    </button>
                    <div className="flex items-center gap-3 text-[#2D00F7]">
                        <Info size={20} />
                        <h3 className="font-space-mono text-sm uppercase tracking-[2px]">¿Qué son las Oportunidades?</h3>
                    </div>
                    <p className="font-sora text-[15px] leading-relaxed text-[#E0E0E0]">
                        Las Oportunidades son rifas escalonadas. Los fans participan fandeando (tokens) para ganar experiencias o artículos VIP. Se dividen en <span className="font-bold text-[#FFD700]">4 Escuadras</span> según su nivel de fandeo: a mayor Escuadra, compites contra menos personas por el mismo premio, aumentando tus posibilidades de ganar.
                    </p>
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                    <h1 className="font-sora text-4xl font-extrabold tracking-[-1px] text-white">
                        {t('title').toUpperCase()}
                    </h1>
                    {event && (
                        <p className="font-space-mono text-[12px] uppercase tracking-[1px] text-[#4A4A4A]">
                            {event.name} — {event.status.toUpperCase()}
                        </p>
                    )}
                </div>

                {isWrite && (
                    <button
                        onClick={() => { setEditingExp(null); setShowForm(true); }}
                        className="flex cursor-pointer items-center gap-2 bg-[#2D00F7] px-5 py-3 font-space-mono text-[13px] uppercase tracking-[1px] text-white transition-all hover:bg-[#2400C5] hover:shadow-[0_0_24px_rgba(45,0,247,0.5)]"
                    >
                        <Plus size={16} />
                        {t('add')}
                    </button>
                )}
            </div>

            {/* ── Loading ── */}
            {isLoading && (
                <div className="flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-none bg-[#1E1E1E]" />
                    ))}
                </div>
            )}

            {/* ── Empty ── */}
            {!isLoading && (!experiences || experiences.length === 0) && (
                <div className="flex flex-col items-center justify-center gap-6 border border-dashed border-[#2A2A2A] bg-[#121212] py-24 text-center">
                    <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden border border-[#2D00F7] bg-[#0A0A0A] shadow-[0_0_40px_rgba(45,0,247,0.2)]">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(45,0,247,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(45,0,247,0.1)_1px,transparent_1px)] bg-[size:4px_4px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)] opacity-50" />
                        <Gift size={40} className="relative z-10 text-[#2D00F7]" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <p className="font-space-mono text-[16px] uppercase tracking-[2px] text-white">
                            No hay recompensas configuradas
                        </p>
                        <p className="font-sora text-[14px] text-[#A0A0A0]">
                            Activa la primera oportunidad para tus fans.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Active section ── */}
            {active.length > 0 && (
                <section className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#00FF88]" />
                        <h2 className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#00FF88]">
                            Activas ({active.length})
                        </h2>
                    </div>
                    {active.map((exp, idx) => (
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
                    ))}
                </section>
            )}

            {/* ── Pending section ── */}
            {pending.length > 0 && (
                <section className="flex flex-col gap-4">
                    <h2 className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#737373]">
                        Pendientes ({pending.length})
                    </h2>
                    {pending.map((exp, idx) => (
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
                    ))}
                </section>
            )}

            {/* ── Closed section ── */}
            {closed.length > 0 && (
                <section className="flex flex-col gap-4">
                    <h2 className="font-space-mono text-[13px] uppercase tracking-[2px] text-[#FF3366]">
                        Cerradas ({closed.length})
                    </h2>
                    {closed.map((exp, idx) => (
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
                    ))}
                </section>
            )}

            {/* ── Create / Edit dialog ── */}
            {showForm && (
                <OpportunityFormDialog
                    eventId={eventId}
                    existing={editingExp}
                    onClose={handleCloseForm}
                />
            )}
        </div>
    );
}
