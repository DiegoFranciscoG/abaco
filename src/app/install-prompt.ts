/**
 * "Install as an app" support. Chromium browsers fire `beforeinstallprompt` once the page qualifies as an
 * installable PWA; the event is kept so a button can open the native prompt later. Safari (iPhone/iPad) has no
 * such event: the page explains the "Share → Add to Home Screen" steps instead.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Registered from main.tsx before the app mounts, so the early event is not missed. */
export function listenForInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

export type InstallState = 'available' | 'installed' | 'ios' | 'unsupported';

export function installState(): InstallState {
  if (installed) return 'installed';
  try {
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
      return 'installed';
  } catch {
    // matchMedia unavailable: keep checking the other signals.
  }
  if (deferred) return 'available';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  return 'unsupported';
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') installed = true;
  notify();
  return outcome;
}
