import type { Metadata } from 'next';
import Link from 'next/link';
import { DeleteAccountForm } from '@/components/legal/DeleteAccountForm';
import {
    LEGAL_NAV_LINK,
    LegalHeader,
    LegalTitle,
} from '@/components/legal/LegalDoc';

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
        <div className="min-h-screen bg-blue text-white">
            <LegalHeader />

            <main className="mx-auto max-w-[860px] px-4 pb-20 pt-10 sm:px-6 md:pt-16">
                <LegalTitle
                    eyebrow="Fandi Holding S.A.S. · NIT 902.070.820-4"
                    title="Eliminar mi cuenta"
                >
                    <p className="mt-6 max-w-[640px] text-[17px] leading-relaxed text-lilac">
                        Puedes eliminar tu cuenta de Fandi cuando quieras, sin dar
                        explicaciones y sin escribirnos.
                    </p>
                </LegalTitle>

                <article className="block-white mt-10 max-w-[760px] px-5 py-8 text-ink sm:px-10 sm:py-12">
                    {/* ── 1. The fast path ── */}
                    <section>
                        <h2 className="font-display text-[22px] text-ink md:text-[26px]">
                            Desde la app (inmediato)
                        </h2>
                        <p className="mt-4 text-[16px] leading-[1.65] text-ink md:text-[17px]">
                            Es la forma más rápida y la única que te muestra tu saldo
                            antes de continuar:
                        </p>
                        <p className="mt-5 rounded-[12px] bg-ink px-5 py-4 font-space-mono text-sm uppercase tracking-[0.1em] text-white">
                            Perfil › Configuración › Eliminar mi cuenta
                        </p>
                        <p className="mt-5 text-[16px] leading-[1.65] text-ink md:text-[17px]">
                            Se elimina en el momento. No hay lista de espera ni
                            revisión.
                        </p>
                    </section>

                    {/* ── 2. The fallback, for people without the app ── */}
                    <section className="mt-10 border-t-2 border-line-white pt-10">
                        <h2 className="font-display text-[22px] text-ink md:text-[26px]">
                            Desde aquí (si ya desinstalaste la app)
                        </h2>
                        <p className="mt-4 text-[16px] leading-[1.65] text-ink md:text-[17px]">
                            Déjanos el número con el que te registraste. Verificamos
                            que la cuenta es tuya y la eliminamos por ti en un máximo
                            de <strong className="font-extrabold text-ink">15 días hábiles</strong>.
                        </p>
                        <div className="mt-6">
                            <DeleteAccountForm />
                        </div>
                    </section>

                    {/* ── 3. What Play reviewers look for: the distinction ── */}
                    <section className="mt-10 border-t-2 border-line-white pt-10">
                        <h2 className="font-display text-[22px] text-ink md:text-[26px]">
                            Qué se borra
                        </h2>
                        <ul className="mt-5 flex flex-col gap-3">
                            {ERASED.map((item) => (
                                <li
                                    key={item}
                                    className="flex gap-3 text-[16px] leading-[1.65] text-ink md:text-[17px]"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="font-extrabold text-blue"
                                    >
                                        —
                                    </span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="mt-10 border-t-2 border-line-white pt-10">
                        <h2 className="font-display text-[22px] text-ink md:text-[26px]">
                            Qué conservamos, y por qué
                        </h2>
                        <p className="mt-4 text-[16px] leading-[1.65] text-ink md:text-[17px]">
                            Nada de esto queda asociado a tu nombre. Aparece como
                            &laquo;Fan eliminado&raquo;.
                        </p>
                        <dl className="mt-6 flex flex-col gap-6">
                            {KEPT.map((item) => (
                                <div key={item.what}>
                                    <dt className="text-[17px] font-extrabold text-ink">
                                        {item.what}
                                    </dt>
                                    <dd className="mt-2 text-[16px] leading-[1.65] text-ink md:text-[17px]">
                                        {item.why}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    {/* ── 4. The money. Stated plainly, before anyone deletes. ── */}
                    <section className="mt-10 rounded-2xl border-2 border-ink p-5 sm:p-7">
                        <h2 className="font-display text-[22px] text-ink md:text-[26px]">
                            Si te queda saldo
                        </h2>
                        <p className="mt-4 text-[16px] leading-[1.65] text-ink md:text-[17px]">
                            Pide la devolución escribiendo a{' '}
                            <a
                                href="mailto:hola@fandi.app?subject=Devoluci%C3%B3n%20de%20saldo"
                                className="font-bold text-blue underline decoration-2 underline-offset-4"
                            >
                                hola@fandi.app
                            </a>
                            . Las devoluciones tienen un costo de $8.000 + IVA y se
                            hacen al mismo medio de pago que usaste.
                        </p>
                        <p className="mt-4 text-[16px] leading-[1.65] text-ink md:text-[17px]">
                            Puedes pedirla también{' '}
                            <strong className="font-extrabold text-ink">
                                después de eliminar tu cuenta
                            </strong>
                            : conservamos el registro de tus movimientos, así que no
                            tienes que elegir entre tu privacidad y tu dinero.
                        </p>
                        <p className="mt-4 text-[15px] leading-relaxed text-muted-white">
                            El dinero de una puja activa ya está comprometido y no se
                            puede devolver.
                        </p>
                    </section>
                </article>

                <nav
                    aria-label="Documentos legales"
                    className="mt-12 flex max-w-[760px] flex-wrap gap-x-7 gap-y-3"
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
                            className={LEGAL_NAV_LINK}
                        >
                            {r.label}
                        </Link>
                    ))}
                </nav>
            </main>
        </div>
    );
}
