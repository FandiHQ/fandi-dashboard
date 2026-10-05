/** Host selection only affects the public entry page, never authorization. */
export function isDashboardHost(hostHeader: string | null): boolean {
    const hostname = hostHeader?.split(':')[0].toLowerCase();
    return hostname === 'staging.dashboard.fandi.app'
        || hostname === 'dashboard.fandi.app';
}
