import { describe, expect, it, vi } from 'vitest';
import {
  installState,
  listenForInstallPrompt,
  promptInstall,
  subscribeInstall,
} from '../../src/app/install-prompt';

describe('instalar como app', () => {
  it('keeps the browser prompt and opens it on demand', async () => {
    listenForInstallPrompt();
    expect(installState()).toBe('unsupported');
    const listener = vi.fn();
    const unsubscribe = subscribeInstall(listener);

    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    const prompt = vi.fn(async () => undefined);
    Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(installState()).toBe('available');
    expect(listener).toHaveBeenCalled();
    await expect(promptInstall()).resolves.toBe('accepted');
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(installState()).toBe('installed');
    await expect(promptInstall()).resolves.toBe('unavailable');
    unsubscribe();
  });
});
