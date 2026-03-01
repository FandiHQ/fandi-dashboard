export default function StaffLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col">
            {/* Minimal mobile-optimized header */}
            <header className="flex h-14 items-center border-b border-border px-4">
                <span className="text-lg font-bold">Fandi Staff</span>
            </header>

            <main className="flex-1 p-4">{children}</main>
        </div>
    );
}
