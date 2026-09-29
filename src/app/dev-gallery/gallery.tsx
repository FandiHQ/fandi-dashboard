'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/status-badge';

const STATS = [
    { k: 'RECAUDADO', v: '1.578 F', sub: '$ 7.890.000' },
    { k: 'FANS ÚNICOS', v: '2.847', sub: '+12% VS ÚLTIMO' },
    { k: 'PREMIOS', v: '48', sub: '31 RECLAMADOS' },
];

export function Gallery() {
    return (
        <div className="min-h-screen bg-blue px-9 py-8 text-white">
            <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="font-hero text-5xl">Hola, Jose</h1>
                        <p className="label-mono mt-2 text-[11px] text-lilac">SÁBADO, 26 DE SEPTIEMBRE DE 2026</p>
                    </div>
                    <Button variant="secondary" size="lg">
                        <Plus /> Crear evento
                    </Button>
                </div>

                <section className="block-ink grid grid-cols-[1.2fr_1fr_auto] items-center gap-8 p-7 shadow-ext-live-xl">
                    <div>
                        <span className="label-mono inline-flex rounded-full bg-lime px-2.5 py-0.5 font-bold text-ink">HOY · 21:00</span>
                        <div className="font-hero mt-3 text-4xl">Omerta Tour · Yalí</div>
                        <div className="mt-2 font-space-mono text-[11px] text-muted-ink">MOVISTAR ARENA, BOGOTÁ · 14.000 BOLETAS</div>
                    </div>
                    <div className="label-mono text-muted-ink">CHECKLIST</div>
                    <div className="flex flex-col items-end gap-2.5">
                        <div className="label-mono text-muted-ink">LAS PUERTAS ABREN EN</div>
                        <div className="font-space-mono text-[34px] font-bold leading-none text-lime">02:14:08</div>
                        <Button size="lg" className="border-0 shadow-ext-cta">Abrir sala en vivo →</Button>
                    </div>
                </section>

                <div className="grid grid-cols-3 gap-5">
                    {STATS.map((s) => (
                        <div key={s.k} className="block-white px-5 py-4">
                            <div className="label-mono text-muted-white">{s.k}</div>
                            <div className="font-display mt-2 text-[42px]">{s.v}</div>
                            <div className="mt-1.5 font-space-mono text-[10px] text-muted-white">{s.sub}</div>
                        </div>
                    ))}
                </div>

                <Tabs defaultValue="resumen">
                    <TabsList>
                        {['resumen', 'oportunidades', 'subastas', 'insignias', 'ganadores', 'analítica'].map((t) => (
                            <TabsTrigger key={t} value={t}>{t}</TabsTrigger>
                        ))}
                    </TabsList>
                    <TabsContent value="resumen">
                        <div className="block-white overflow-hidden">
                            <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3.5">
                                <span className="font-display text-[17px]">Eventos</span>
                                <span className="font-space-mono text-[10px] text-blue">VER LOS 20 ›</span>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Evento</TableHead>
                                        <TableHead>Lugar</TableHead>
                                        <TableHead className="text-right">Recaudado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(['live', 'published', 'draft', 'ended'] as const).map((st, i) => (
                                        <TableRow key={st}>
                                            <TableCell><StatusBadge status={st} /></TableCell>
                                            <TableCell className="font-display text-[15px]">Evento {i + 1}</TableCell>
                                            <TableCell className="text-muted-white">Movistar Arena</TableCell>
                                            <TableCell className="text-right font-black">{(i + 1) * 312} F</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="grid grid-cols-2 gap-5">
                    <Card>
                        <CardHeader>
                            <CardTitle>Card primitive</CardTitle>
                            <CardDescription>White block, ink border, 5px extrusion.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            <Input placeholder="Nombre de la oportunidad" />
                            <label className="flex items-center gap-2 text-sm font-semibold"><Checkbox defaultChecked /> Visible para fans</label>
                            <div className="flex flex-wrap gap-2">
                                <Badge>En vivo</Badge>
                                <Badge variant="secondary">Programado</Badge>
                                <Badge variant="destructive">Alerta</Badge>
                                <Badge variant="outline">Outline</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button>Guardar</Button>
                                <Button variant="secondary">Secundario</Button>
                                <Button variant="outline">Outline</Button>
                                <Button variant="destructive">Cerrar ahora</Button>
                                <Button variant="ghost">Ghost</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="block-ink flex flex-col gap-3 p-5">
                        <span className="font-display text-[17px]">Equipo</span>
                        {['Jose Osorio · PROPIETARIO', 'Laura M. · ADMIN', 'Staff Puerta 4 · STAFF'].map((m) => (
                            <div key={m} className="flex items-center gap-2.5">
                                <span className="flex size-8 items-center justify-center rounded-full bg-tier-vip text-xs font-black text-ink">
                                    {m.charAt(0)}
                                </span>
                                <span className="text-sm font-bold">{m}</span>
                            </div>
                        ))}
                        <Sheet>
                            <SheetTrigger asChild>
                                <button className="rounded-[10px] border-2 border-dashed border-dash-ink py-2.5 text-sm font-extrabold text-lime">
                                    + Abrir panel lateral
                                </button>
                            </SheetTrigger>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle>Nueva oportunidad</SheetTitle>
                                    <SheetDescription>Panel lateral 520px sobre el scrim.</SheetDescription>
                                </SheetHeader>
                                <div className="flex flex-col gap-3 px-4">
                                    <Input placeholder="Nombre" />
                                    <p className="label-mono text-alert-white">EL FAN NUNCA VE ESTOS PORCENTAJES</p>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </div>
    );
}
