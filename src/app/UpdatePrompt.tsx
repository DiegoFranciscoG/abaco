import { useEffect, useState } from 'react';
import { Icon } from '../ui/icons';

/** Registers the service worker (production only) and offers to reload when a new version is ready. */
export function UpdatePrompt() {
  const [update, setUpdate] = useState<null | (() => Promise<void>)>(null);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    void import('virtual:pwa-register').then(({ registerSW }) => {
      if (cancelled) return;
      const updateSW = registerSW({
        onNeedRefresh: () => setUpdate(() => () => updateSW(true)),
        onOfflineReady: () => {
          setOfflineReady(true);
          window.setTimeout(() => setOfflineReady(false), 5000);
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update && !offlineReady) return null;
  return (
    <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md md:bottom-6" role="status">
      <div className="card flex items-center gap-3 px-4 py-3 text-sm">
        <Icon name={update ? 'sparkle' : 'check'} className="shrink-0 text-red" />
        <p className="flex-1">
          {update ? 'Hay una versión nueva de ÁBACO.' : 'Listo: ÁBACO ya funciona sin conexión.'}
        </p>
        {update ? (
          <button
            type="button"
            className="btn btn-primary min-h-10 px-3 text-sm"
            onClick={() => void update()}
          >
            Actualizar
          </button>
        ) : null}
      </div>
    </div>
  );
}
