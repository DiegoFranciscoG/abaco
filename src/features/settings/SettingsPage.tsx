import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { backupFileName, BackupError, createBackup, markBackupDone, parseBackup, restoreBackup, serializeBackup, type RestoreMode } from '../../data/backup';
import { getCarrera, getMateria } from '../../data/content';
import { countUserData, getDeviceId, getMeta, updateProfile, wipeAllData } from '../../data/repositories';
import { checkStorage, formatBytes, requestPersistence, type StorageStatus } from '../../data/storage-health';
import type { MotionPreference, ThemePreference } from '../../data/types';
import { resetDisplayPrefs } from '../../ui/display-prefs';
import { useDocumentTitle } from '../../ui/hooks';
import { useProfile } from '../../ui/use-profile';
import { Icon } from '../../ui/icons';
import { AppLink, Notice, PageHeader } from '../../ui/primitives';
import { downloadFile, formatDate } from '../../ui/utils';
import { useToast } from '../../ui/use-toast';
import { clearSuggestionLedger } from '../suggestions/limits';
import { InstallCard } from './InstallCard';

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink-2">{label}</legend>
      <div className="inline-flex flex-wrap rounded-xl border border-line bg-surface p-1">
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${value === o.id ? 'bg-ink text-paper' : 'text-muted'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function SettingsPage() {
  useDocumentTitle('Ajustes y respaldo');
  const profile = useProfile();
  const toast = useToast();
  const counts = useLiveQuery(() => countUserData(), []);
  const lastBackup = useLiveQuery(() => getMeta<string>('lastBackupAt'), []);
  // getDeviceId may write (first time), so it cannot run inside a read-only live query.
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [mode, setMode] = useState<RestoreMode>('reemplazar');
  const [confirmText, setConfirmText] = useState('');
  const [pending, setPending] = useState<ReturnType<typeof parseBackup> | null>(null);

  useEffect(() => {
    void checkStorage().then(setStatus);
    void getDeviceId().then(setDeviceId);
  }, []);

  const doBackup = async () => {
    try {
      const backup = await createBackup();
      downloadFile(backupFileName(backup), serializeBackup(backup), 'application/json');
      await markBackupDone();
      toast.show('Respaldo descargado. Guárdalo en un lugar seguro.');
    } catch (error) {
      toast.error(error);
    }
  };

  const onFile = async (file: File) => {
    try {
      setPending(parseBackup(await file.text()));
    } catch (error) {
      toast.show(error instanceof BackupError ? error.message : 'No se pudo leer el archivo.', 'error');
    }
  };

  const confirmRestore = async () => {
    if (!pending) return;
    try {
      await restoreBackup(pending, mode);
      setPending(null);
      toast.show('Respaldo restaurado');
    } catch (error) {
      toast.error(error);
    }
  };

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Ajustes" title="Tu ÁBACO" subtitle="Preferencias, respaldo y estado del almacenamiento de este dispositivo." />

      <section className="card space-y-5 p-5" aria-labelledby="perfil">
        <h2 id="perfil" className="font-display text-xl font-semibold">
          Perfil (solo en este dispositivo)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-sm font-semibold text-ink-2">Mis materias</span>
            {profile.materias.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {profile.materias.map((id) => (
                  <li key={id}>
                    <AppLink to={`/materia/${id}`} className="chip min-h-9 hover:border-red hover:text-red">
                      {getMateria(id)?.nombre ?? id}
                    </AppLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Todavía no marcas ninguna.</p>
            )}
            <AppLink to="/materias" className="link-red mt-2 inline-block text-sm">
              Elegir materias →
            </AppLink>
          </div>
          <div>
            <span className="mb-1 block text-sm font-semibold text-ink-2">Carrera y ciclo</span>
            <p className="text-sm text-ink-2">
              {profile.carrera && getCarrera(profile.carrera)
                ? `${getCarrera(profile.carrera)?.nombre ?? ''}${profile.ciclo ? ` · ${profile.ciclo}.º ciclo` : ''}`
                : 'Sin elegir'}
            </p>
            <AppLink to={profile.carrera ? `/materias?carrera=${profile.carrera}${profile.ciclo ? `&ciclo=${profile.ciclo}` : ''}` : '/materias'} className="link-red mt-2 inline-block text-sm">
              {profile.carrera ? 'Cambiar →' : 'Elegir carrera y ciclo →'}
            </AppLink>
          </div>
        </div>
        <Segmented<ThemePreference> label="Tema" value={profile.tema} onChange={(v) => void updateProfile({ tema: v })} options={[{ id: 'system', label: 'Como el sistema' }, { id: 'light', label: 'Claro' }, { id: 'dark', label: 'Oscuro' }]} />
        <Segmented<MotionPreference> label="Animaciones y 3D" value={profile.movimiento} onChange={(v) => void updateProfile({ movimiento: v })} options={[{ id: 'system', label: 'Como el sistema' }, { id: 'full', label: 'Completas' }, { id: 'reduce', label: 'Reducidas (sin 3D)' }]} />
        <Segmented<'es' | 'en'> label="Sintaxis de Excel por defecto" value={profile.sintaxisExcel} onChange={(v) => void updateProfile({ sintaxisExcel: v })} options={[{ id: 'es', label: 'Español: =VA(1%;12;-100)' }, { id: 'en', label: 'Inglés: =PV(1%,12,-100)' }]} />
      </section>

      <InstallCard />

      <section id="respaldo" className="card space-y-4 p-5" aria-labelledby="respaldo-titulo">
        <h2 id="respaldo-titulo" className="font-display text-xl font-semibold">
          Respaldo y restauración
        </h2>
        <p className="text-sm text-muted">
          Tienes {total} elementos guardados
          {counts ? ` (${counts.apuntes} apuntes, ${counts.colecciones} colecciones, ${counts.hojas} hojas, ${counts.estrellas} estrellas, ${counts.recordatorios} recordatorios, ${counts.intentos} intentos)` : ''}. Último respaldo:{' '}
          <strong className="text-ink-2">{lastBackup ? formatDate(lastBackup) : 'nunca'}</strong>.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => void doBackup()}>
            <Icon name="download" size={18} /> Descargar respaldo
          </button>
          <label className="btn btn-ghost cursor-pointer">
            <Icon name="upload" size={18} /> Restaurar desde archivo
            <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void onFile(f); }} />
          </label>
        </div>
        {pending ? (
          <div className="space-y-3 rounded-2xl border border-line p-4">
            <p className="text-sm">
              Respaldo del <strong>{formatDate(pending.exportadoEn)}</strong> con {pending.datos.apuntes.length} apuntes, {pending.datos.colecciones.length} colecciones y {pending.datos.hojas.length} hojas.
            </p>
            <Segmented<RestoreMode> label="¿Cómo restaurar?" value={mode} onChange={setMode} options={[{ id: 'reemplazar', label: 'Reemplazar todo' }, { id: 'combinar', label: 'Combinar con lo actual' }]} />
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary" onClick={() => void confirmRestore()}>
                Restaurar
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
        {deviceId ? (
          <p className="text-xs text-muted">
            Identificador local de este dispositivo: <code className="font-mono">{deviceId.slice(0, 8)}</code>. Se genera aquí, no se envía a ningún lado y solo sirve para nombrar tus respaldos.
          </p>
        ) : null}
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="almacen">
        <h2 id="almacen" className="font-display text-xl font-semibold">
          Almacenamiento
        </h2>
        {status ? (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-muted">Estado</dt><dd className="font-semibold">{status.indexedDb === 'ok' ? 'Disponible' : 'Bloqueado'}</dd></div>
              <div><dt className="text-muted">Usado</dt><dd className="tnum font-semibold">{formatBytes(status.usoBytes)}</dd></div>
              <div><dt className="text-muted">Cuota</dt><dd className="tnum font-semibold">{formatBytes(status.cuotaBytes)}</dd></div>
              <div><dt className="text-muted">Protegido</dt><dd className="font-semibold">{status.persistente === null ? 'Desconocido' : status.persistente ? 'Sí' : 'No'}</dd></div>
            </dl>
            {status.posibleIncognito ? <Notice tone="warn">Parece una ventana privada: lo guardado se borrará al cerrarla.</Notice> : null}
            {status.persistente === false ? (
              <button type="button" className="btn btn-soft" onClick={async () => { const ok = await requestPersistence(); toast.show(ok ? 'El navegador protegerá tus datos' : 'El navegador no aceptó la solicitud; haz respaldos.', ok ? 'ok' : 'info'); setStatus(await checkStorage()); }}>
                <Icon name="shield" size={18} /> Pedir al navegador que no borre mis datos
              </button>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="card space-y-3 border-red/40 p-5" aria-labelledby="borrar">
        <h2 id="borrar" className="font-display text-xl font-semibold text-red">
          Empezar de cero
        </h2>
        <p className="text-sm text-muted">Borra apuntes, colecciones, hojas, recordatorios, intentos y preferencias de este dispositivo. No se puede deshacer: descarga un respaldo antes.</p>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Escribe BORRAR para confirmar</span>
          <input className="field max-w-xs" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => void doBackup()}>
            <Icon name="download" size={18} /> Primero, respaldo
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={confirmText.trim().toUpperCase() !== 'BORRAR'}
            onClick={async () => {
              await wipeAllData();
              resetDisplayPrefs();
              clearSuggestionLedger();
              setConfirmText('');
              toast.show('Todo se borró de este dispositivo');
            }}
          >
            <Icon name="trash" size={18} /> Borrar todo
          </button>
        </div>
      </section>
    </div>
  );
}
