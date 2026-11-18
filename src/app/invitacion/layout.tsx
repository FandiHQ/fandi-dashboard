import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Invitación a tu equipo · Fandi',
    robots: { index: false, follow: false },
};

export default function InvitationLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
