import { useLiveQuery } from 'dexie-react-hooks';
import { m } from 'motion/react';
import { useEffect, useState } from 'react';
import { shouldRemindBackup } from '../data/backup-reminder';
import { getMeta, setMeta } from '../data/repositories';
import { checkStorage, requestPersistence, type StorageStatus } from '../data/storage-health';
import { Icon } from '../ui/icons';
import { AppLink, Notice } from '../ui/primitives';

/**
 * First visit: explains, honestly, that data lives on this phone. It is a card anchored to the bottom (not a
 * modal) so the student can keep reading. A likely private window or a blocked storage is announced BEFORE
 * any note is written. Every 15 days it reminds to back up.
 */
export function Onboarding() {
  const seen = useLiveQuery(() => getMeta<string>('onboardingAt'), [], 'cargando');
  const remind = useLiveQuery(() => shouldRemindBackup(), [], false);
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [dismissedReminder, setDismissedReminder] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    void checkStorage().then(setStatus);
  }, []);

  const open = seen === undefined && !closed;
  const accept = async () => {
    setClosed(true);
    try {
      await setMeta('onboardingAt', new Date().toISOString());
    } catch {
      // Storage blocked: the card already explained it.
    }
    void requestPersistence();
  };

  return (
    <>
      {open ? (
        <m.section
          role="dialog"
          aria-modal="false"
          aria-labelledby="bienvenida-titulo"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-xl md:bottom-6"
        >
          <div className="card space-y-3 p-4">
            <div className="flex items-start gap-3">
              <span className="tile shrink-0">
                <Icon name="shield" />
              </span>
              <div className="min-w-0">
                <h2 id="bienvenida-titulo" className="font-display text-base font-semibold">
                  Tus datos viven en este teléfono
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-2">
                  Sin cuentas ni servidores: si borras el navegador o cambias de teléfono se pierden. Descarga
                  un respaldo de vez en cuando.
                </p>
              </div>
            </div>
            {status?.indexedDb === 'bloqueado' ? (
              <Notice tone="warn">
                Tu navegador está bloqueando el almacenamiento: puedes leer todo, pero lo que escribas no se
                guardará.
              </Notice>
            ) : status?.posibleIncognito ? (
              <Notice tone="warn">
                Parece una ventana privada o de incógnito: lo que guardes se borrará al cerrarla.
              </Notice>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <AppLink to="/legal/privacidad" className="btn btn-ghost min-h-11 text-sm">
                Privacidad
              </AppLink>
              <button
                type="button"
                className="btn btn-primary min-h-11 text-sm"
                onClick={() => void accept()}
              >
                Entendido, empezar
              </button>
            </div>
          </div>
        </m.section>
      ) : null}

      {remind && !dismissedReminder && !open ? (
        <div className="fixed inset-x-3 top-20 z-30 mx-auto max-w-xl">
          <div className="card flex items-center gap-3 px-4 py-3 text-sm">
            <Icon name="download" className="shrink-0 text-red" />
            <p className="flex-1">Hace más de 15 días que no descargas un respaldo de tus apuntes.</p>
            <AppLink
              to="/ajustes#respaldo"
              className="btn btn-soft min-h-10 px-3 text-sm"
              onClick={() => setDismissedReminder(true)}
            >
              Respaldar
            </AppLink>
            <button
              type="button"
              className="btn btn-icon border-0"
              aria-label="Recordar más tarde"
              onClick={() => setDismissedReminder(true)}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
