/**
 * Runs before the app to avoid a light flash for students who use dark mode. Only the system preference is
 * known this early; the saved preference (IndexedDB) is applied a few milliseconds later by the app.
 */
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
