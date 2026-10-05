import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Únete a tu equipo — Fandi',
    robots: { index: false, follow: false },
};

export default function InviteAcceptLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
