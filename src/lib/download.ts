/**
 * Browser-side helper to download a Blob with a given filename.
 *
 * Standard pattern: create an object URL, attach a hidden <a>
 * with the `download` attribute, click it, then revoke the URL.
 * Works in every evergreen browser. Safe to call from React event
 * handlers — does NOT touch the document until invoked.
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
