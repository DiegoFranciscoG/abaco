/**
 * Per-device limits of the suggestion box, kept in localStorage ("abaco:buzon"): at most three messages a day, two
 * minutes between messages and never the same text twice. Only send times and a short fingerprint of each text are
 * stored, never the text itself.
 */
export const SUGGESTION_LIMITS = { porDia: 3, minutosEntreEnvios: 2 } as const;
export const SUGGESTION_STORAGE_KEY = 'abaco:buzon';

interface Ledger {
  enviados: number[];
  huellas: string[];
}

const DAY = 24 * 60 * 60 * 1000;

/** FNV-1a 32-bit hash of the normalized text: enough to recognize a repeated message, not to recover it. */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (const ch of text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()) {
    hash ^= ch.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function read(storage: Storage | undefined): Ledger {
  try {
    const raw = storage?.getItem(SUGGESTION_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Ledger>) : {};
    return {
      enviados: Array.isArray(parsed.enviados)
        ? parsed.enviados.filter((n): n is number => typeof n === 'number')
        : [],
      huellas: Array.isArray(parsed.huellas)
        ? parsed.huellas.filter((h): h is string => typeof h === 'string').slice(-20)
        : [],
    };
  } catch {
    return { enviados: [], huellas: [] };
  }
}

const defaultStorage = (): Storage | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

/** Message explaining why this device cannot send now, or null. */
export function limitReason(text: string, now = Date.now(), storage = defaultStorage()): string | null {
  const ledger = read(storage);
  const recent = ledger.enviados.filter((t) => now - t < DAY && t <= now);
  if (ledger.huellas.includes(fingerprint(text)))
    return 'Ya enviaste este mismo mensaje. Gracias: no hace falta repetirlo.';
  if (recent.length >= SUGGESTION_LIMITS.porDia)
    return `Puedes enviar hasta ${SUGGESTION_LIMITS.porDia} sugerencias al día. Vuelve mañana con tu próxima idea.`;
  const last = Math.max(0, ...recent);
  if (last && now - last < SUGGESTION_LIMITS.minutosEntreEnvios * 60_000)
    return 'Espera un par de minutos antes de enviar otra sugerencia.';
  return null;
}

export function recordSuggestion(text: string, now = Date.now(), storage = defaultStorage()): void {
  const ledger = read(storage);
  const next: Ledger = {
    enviados: [...ledger.enviados.filter((t) => now - t < DAY), now],
    huellas: [...ledger.huellas, fingerprint(text)].slice(-20),
  };
  try {
    storage?.setItem(SUGGESTION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked (private mode): the limits simply do not persist.
  }
}

/** Part of "Empezar de cero": forgets the send times and fingerprints. */
export function clearSuggestionLedger(storage = defaultStorage()): void {
  try {
    storage?.removeItem(SUGGESTION_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is blocked.
  }
}
