import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Fandi — Experiencias VIP y subastas en vivo",
    description:
        "Plataforma de engagement en tiempo real para eventos masivos. Compite para ganar subastas o experiencias únicas.",
    openGraph: {
        title: "Fandi — Experiencias VIP y subastas en vivo",
        description:
            "Plataforma de engagement en tiempo real para eventos masivos. Compite para ganar subastas o experiencias únicas.",
        type: "website",
        locale: "es_CO",
        url: "https://fandi.app",
    },
};

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
