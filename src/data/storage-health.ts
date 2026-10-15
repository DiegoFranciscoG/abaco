/**
 * What the app can tell the student about where their data lives. Browsers do not expose "private mode"
 * directly, so it is inferred (and worded as a possibility): a very small quota or an IndexedDB that refuses
 * to open are the usual signs.
 */
export interface StorageStatus {
  indexedDb: 'ok' | 'bloqueado';
  persistente: boolean | null;
  usoBytes: number | null;
  cuotaBytes: number | null;
  posibleIncognito: boolean;
}

/** Below this quota browsers are almost always in a private/incognito window. */
export const PRIVATE_MODE_QUOTA_BYTES = 150 * 1024 * 1024;

export function inferPrivateMode(quotaBytes: number | null, indexedDbOk: boolean): boolean {
  if (!indexedDbOk) return true;
  return quotaBytes !== null && quotaBytes > 0 && quotaBytes < PRIVATE_MODE_QUOTA_BYTES;
}

async function canOpenIndexedDb(factory: IDBFactory | null): Promise<boolean> {
  if (!factory) return false;
  return new Promise((resolve) => {
    try {
      const request = factory.open('abaco-sonda');
      request.onsuccess = () => {
        request.result.close();
        factory.deleteDatabase('abaco-sonda');
        resolve(true);
      };
      request.onerror = () => resolve(false);
      request.onblocked = () => resolve(true);
    } catch {
      resolve(false);
    }
  });
}

export async function checkStorage(
  nav: Pick<Navigator, 'storage'> | null = globalThis.navigator ?? null,
  factory: IDBFactory | null = globalThis.indexedDB ?? null,
): Promise<StorageStatus> {
  const indexedDbOk = await canOpenIndexedDb(factory);
  let usoBytes: number | null = null;
  let cuotaBytes: number | null = null;
  let persistente: boolean | null = null;
  try {
    const estimate = await nav?.storage?.estimate?.();
    usoBytes = estimate?.usage ?? null;
    cuotaBytes = estimate?.quota ?? null;
    persistente = (await nav?.storage?.persisted?.()) ?? null;
  } catch {
    // Some browsers throw in private windows; the status simply stays unknown.
  }
  return {
    indexedDb: indexedDbOk ? 'ok' : 'bloqueado',
    persistente,
    usoBytes,
    cuotaBytes,
    posibleIncognito: inferPrivateMode(cuotaBytes, indexedDbOk),
  };
}

/** Asks the browser not to evict our data under storage pressure. */
export async function requestPersistence(
  nav: Pick<Navigator, 'storage'> | null = globalThis.navigator ?? null,
): Promise<boolean> {
  try {
    return (await nav?.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** Translates storage exceptions into a message the student can act on. */
export function describeStorageError(error: unknown): string {
  const name = (error as { name?: string; inner?: { name?: string } } | null)?.name ?? '';
  const inner = (error as { inner?: { name?: string } } | null)?.inner?.name ?? '';
  if (name === 'QuotaExceededError' || inner === 'QuotaExceededError') {
    return 'El almacenamiento de tu navegador está lleno. Descarga un respaldo y libera espacio borrando hojas o apuntes antiguos.';
  }
  if (name === 'InvalidStateError' || name === 'SecurityError' || name === 'MissingAPIError' || name === 'OpenFailedError') {
    return 'Tu navegador está bloqueando el almacenamiento (¿modo incógnito o datos de sitios desactivados?). Lo que escribas no se guardará.';
  }
  if (name === 'ValidationError' || name === 'BackupError') {
    return (error as Error).message;
  }
  return 'No se pudo guardar. Intenta de nuevo; si sigue fallando, descarga un respaldo.';
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'desconocido';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
