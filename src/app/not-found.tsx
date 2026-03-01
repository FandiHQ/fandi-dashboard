import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4">
            <h1 className="text-6xl font-bold tracking-tight">404</h1>
            <p className="text-lg text-muted-foreground">
                Página no encontrada
            </p>
            <Link
                href="/"
                className="text-primary underline-offset-4 hover:underline"
            >
                Volver al inicio
            </Link>
        </main>
    );
}
