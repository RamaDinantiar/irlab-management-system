/** "1,2 MB" / "340 KB". */
export function formatFileSize(bytes: number): string {
    const format = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

    return bytes >= 1024 * 1024
        ? `${format.format(bytes / 1024 / 1024)} MB`
        : `${format.format(Math.max(1, bytes / 1024))} KB`;
}
