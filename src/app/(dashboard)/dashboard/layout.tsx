export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen">
            {/* Sidebar — will be added in Step 4.3 */}
            <aside className="hidden w-64 border-r border-border bg-card lg:block">
                <div className="flex h-16 items-center px-6">
                    <span className="text-lg font-bold">Fandi</span>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex flex-1 flex-col">
                {/* Header — will be added in Step 4.3 */}
                <header className="flex h-16 items-center border-b border-border px-6">
                    <span className="text-sm text-muted-foreground">Dashboard</span>
                </header>

                <main className="flex-1 p-6">{children}</main>
            </div>
        </div>
    );
}
