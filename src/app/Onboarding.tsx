import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { shouldRemindBackup } from '../data/backup-reminder';
import { getMeta, setMeta } from '../data/repositories';
import { checkStorage, requestPersistence, type StorageStatus } from '../data/storage-health';
import { Icon } from '../ui/icons';
import { AppLink, Dialog, Notice } from '../ui/primitives';

/**
 * First visit: explains, honestly, that data lives on this phone. Detects a likely private window or a
 * blocked storage BEFORE the student writes notes they would lose. Every 15 days, reminds to back up.
 */
export function Onboarding() {
  const seen = useLiveQuery(() => getMeta<string>('onboardingAt'), [], 'cargando');
  const remind = useLiveQuery(() => shouldRemindBackup(), [], false);
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [dismissedReminder, setDismissedReminder] = useState(false);

  useEffect(() => {
    void checkStorage().then(setStatus);
  }, []);

  const open = seen === undefined;
  const accept = async () => {
    try {
      await setMeta('onboardingAt', new Date().toISOString());
    } catch {
      // Storage blocked: the dialog explains it; nothing else to do.
    }
    void requestPersistence();
  };

  return (
    <>
      <Dialog open={open} onClose={() => void accept()} title="Tus datos viven en este teléfono">
        <div className="space-y-4 text-[0.98rem] leading-relaxed text-ink-2">
          <p>
            ÁBACO no tiene cuentas ni servidores. Tus apuntes, estrellas, colecciones y hojas de cálculo se guardan
            <strong> solo en este navegador</strong>. Nadie más puede verlos, ni siquiera quien usa el mismo enlace.
          </p>
          <ul className="space-y-2">
            <li className="flex gap-2">
              <Icon name="download" size={18} className="mt-0.5 text-red" /> Si cambias de teléfono o borras los datos del navegador, se pierden: descarga un
              respaldo de vez en cuando (Ajustes → Respaldo).
            </li>
            <li className="flex gap-2">
              <Icon name="shield" size={18} className="mt-0.5 text-red" /> Lo único que sale a internet son las búsquedas del buscador académico.
            </li>
          </ul>
          {status?.indexedDb === 'bloqueado' ? (
            <Notice tone="warn" icon="info">
              Tu navegador está bloqueando el almacenamiento. Puedes leer todo el contenido, pero lo que escribas no se
              guardará.
            </Notice>
          ) : status?.posibleIncognito ? (
            <Notice tone="warn" icon="info">
              Parece que estás en una ventana privada o de incógnito: todo lo que guardes se borrará al cerrarla. Abre
              ÁBACO en una ventana normal si quieres conservar tus apuntes.
            </Notice>
          ) : null}
          <button type="button" className="btn btn-primary w-full" onClick={() => void accept()}>
            Entendido, empezar
          </button>
        </div>
      </Dialog>

      {remind && !dismissedReminder && !open ? (
        <div className="fixed inset-x-3 top-20 z-30 mx-auto max-w-xl">
          <div className="card flex items-center gap-3 px-4 py-3 text-sm">
            <Icon name="download" className="shrink-0 text-red" />
            <p className="flex-1">Hace más de 15 días que no descargas un respaldo de tus apuntes.</p>
            <AppLink to="/ajustes#respaldo" className="btn btn-soft min-h-10 px-3 text-sm" onClick={() => setDismissedReminder(true)}>
              Respaldar
            </AppLink>
            <button type="button" className="btn btn-icon border-0" aria-label="Recordar más tarde" onClick={() => setDismissedReminder(true)}>
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
