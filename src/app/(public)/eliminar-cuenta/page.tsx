import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { DeleteAccountForm } from '@/components/legal/DeleteAccountForm';

/**
 * /eliminar-cuenta — public account deletion.
 *
 * Required twice over: Google Play expects a deletion route reachable
 * without installing the app, and all three legal documents name this
 * exact URL.
 *
 * It must work for someone who has already uninstalled Fandi and has no
 * way back in — so no login, no app, no account. Fans authenticate by
 * phone + SMS code, and there is no web dashboard for them, which is why
 * the web path is a verified request rather than an instant execution.
 *
 * Order is deliberate: the in-app route comes first because it is
 * immediate and it is the only one that can show the fan their balance
 * before they commit.
 */
export const metadata: Metadata = {
    title: 'Eliminar mi cuenta · Fandi',
    description:
        'Cómo eliminar tu cuenta de Fandi y todos tus datos personales, desde la app o desde aquí si ya la desinstalaste.',
    alternates: { canonical: '/eliminar-cuenta' },
};

const ERASED = [
    'Tu nombre, tu foto de perfil y tu fecha de nacimiento.',
    'Tu número de celular y tu correo electrónico.',
    'Tu ciudad y tus preferencias de notificaciones.',
    'Los ídolos que sigues y los eventos que guardaste.',
    'Tus dispositivos registrados, para que no vuelvas a recibir notificaciones.',
];

const KEPT = [
    {
        what: 'Tus aportes y tus pujas',
        why: 'Quedan en la historia del evento sin ningún nombre asociado. Si los borráramos, cambiaríamos la categoría y el ranking de los demás fans, incluso en eventos que ya terminaron.',
    },
    {
        what: 'Los premios que ganaste',
        why: 'El registro de un premio entregado es un documento legal que el ídolo y nosotros debemos conservar. Deja de tener tu nombre.',
    },
    {
        what: 'Tus movimientos de dinero',
        why: 'La ley contable nos obliga a conservarlos. Es también la razón por la que puedes pedir la devolución de tu saldo incluso después de eliminar tu cuenta.',
    },
];

export default function EliminarCuentaPage() {
    return (
        <div className="min-h-screen bg-black text-white">
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
                    Fandi Holding S.A.S. · NIT 902.070.820-4
                </p>
                <h1 className="mt-4 font-sora text-3xl font-extrabold uppercase leading-tight tracking-tight text-white md:text-5xl">
                    Eliminar mi cuenta
                </h1>
                <p className="mt-6 font-sora text-lg leading-relaxed text-[#B8B8C2]">
                    Puedes eliminar tu cuenta de Fandi cuando quieras, sin dar
                    explicaciones y sin escribirnos.
                </p>

                {/* ── 1. The fast path ── */}
                <section className="mt-14">
                    <h2 className="font-sora text-2xl font-bold text-white">
                        Desde la app (inmediato)
                    </h2>
                    <p className="mt-4 font-sora text-base leading-relaxed text-[#B8B8C2]">
                        Es la forma más rápida y la única que te muestra tu saldo
                        antes de continuar:
                    </p>
                    <p className="mt-5 border-l-2 border-[#CCFF00] py-2 pl-5 font-space-mono text-sm uppercase tracking-[2px] text-white">
                        Perfil › Configuración › Eliminar mi cuenta
                    </p>
                    <p className="mt-5 font-sora text-base leading-relaxed text-[#B8B8C2]">
                        Se elimina en el momento. No hay lista de espera ni
                        revisión.
                    </p>
                </section>

                {/* ── 2. The fallback, for people without the app ── */}
                <section className="mt-14">
                    <h2 className="font-sora text-2xl font-bold text-white">
                        Desde aquí (si ya desinstalaste la app)
                    </h2>
                    <p className="mt-4 font-sora text-base leading-relaxed text-[#B8B8C2]">
                        Déjanos el número con el que te registraste. Verificamos
                        que la cuenta es tuya y la eliminamos por ti en un máximo
                        de <strong className="text-white">15 días hábiles</strong>.
                    </p>
                    <div className="mt-6">
                        <DeleteAccountForm />
                    </div>
                </section>

                {/* ── 3. What Play reviewers look for: the distinction ── */}
                <section className="mt-16">
                    <h2 className="font-sora text-2xl font-bold text-white">
                        Qué se borra
                    </h2>
                    <ul className="mt-5 flex flex-col gap-3">
                        {ERASED.map((item) => (
                            <li
                                key={item}
                                className="flex gap-3 font-sora text-base leading-relaxed text-[#B8B8C2]"
                            >
                                <span
                                    aria-hidden="true"
                                    className="text-[#CCFF00]"
                                >
                                    —
                                </span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="mt-14">
                    <h2 className="font-sora text-2xl font-bold text-white">
                        Qué conservamos, y por qué
                    </h2>
                    <p className="mt-4 font-sora text-base leading-relaxed text-[#B8B8C2]">
                        Nada de esto queda asociado a tu nombre. Aparece como
                        &laquo;Fan eliminado&raquo;.
                    </p>
                    <dl className="mt-6 flex flex-col gap-6">
                        {KEPT.map((item) => (
                            <div key={item.what}>
                                <dt className="font-sora text-base font-bold text-white">
                                    {item.what}
                                </dt>
                                <dd className="mt-2 font-sora text-base leading-relaxed text-[#8A8A94]">
                                    {item.why}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>

                {/* ── 4. The money. Stated plainly, before anyone deletes. ── */}
                <section className="mt-14 border border-white/15 p-6">
                    <h2 className="font-sora text-2xl font-bold text-white">
                        Si te queda saldo
                    </h2>
                    <p className="mt-4 font-sora text-base leading-relaxed text-[#B8B8C2]">
                        Pide la devolución escribiendo a{' '}
                        <a
                            href="mailto:hola@fandi.app?subject=Devoluci%C3%B3n%20de%20saldo"
                                                        className="text-[#CCFF00] underline underline-offset-4"
                        >
                            hola@fandi.app
                        </a>
                        . Las devoluciones tienen un costo de $8.000 + IVA y se
                        hacen al mismo medio de pago que usaste.
                    </p>
                    <p className="mt-4 font-sora text-base leading-relaxed text-[#B8B8C2]">
                        Puedes pedirla también{' '}
                        <strong className="text-white">
                            después de eliminar tu cuenta
                        </strong>
                        : conservamos el registro de tus movimientos, así que no
                        tienes que elegir entre tu privacidad y tu dinero.
                    </p>
                    <p className="mt-4 font-sora text-sm leading-relaxed text-[#8A8A94]">
                        El dinero de una puja activa ya está comprometido y no se
                        puede devolver.
                    </p>
                </section>

                <nav
                    aria-label="Documentos legales"
                    className="mt-16 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-8"
                >
                    {[
                        { href: '/terminos', label: 'Términos y Condiciones' },
                        { href: '/privacidad', label: 'Política de Privacidad' },
                        {
                            href: '/datos-personales',
                            label: 'Tratamiento de Datos',
                        },
                    ].map((r) => (
                        <Link
                            key={r.href}
                            href={r.href}
                            className="font-space-mono text-[11px] uppercase tracking-[2px] text-[#A0A0A0] transition-colors hover:text-white"
                        >
                            {r.label}
                        </Link>
                    ))}
                </nav>
            </main>
        </div>
    );
}
