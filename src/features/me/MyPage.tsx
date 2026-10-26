import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { importSharedCollection } from '../../data/backup';
import { getMateria, loadEjercicios } from '../../data/content';
import {
  createCollection,
  createReminder,
  deleteReminder,
  listAttempts,
  listCollections,
  listReminders,
  listStars,
  searchNotes,
  setReminderDone,
  toggleStar,
} from '../../data/repositories';
import { COLLECTION_COLORS, type CollectionColor } from '../../data/types';
import { reminderToIcs } from '../../domain/calendar/ics';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, EmptyState, PageHeader, Tabs } from '../../ui/primitives';
import { downloadFile, formatDate } from '../../ui/utils';
import { useToast } from '../../ui/use-toast';
import { accuracyBySubject, summarizeAttempts } from '../practice/progress';
import { COLOR_HEX } from './colors';
import { NoteCard } from './NotesPanel';

type Tab = 'apuntes' | 'estrellas' | 'colecciones' | 'recordatorios' | 'avance';


function NotesTab() {
  const [query, setQuery] = useState('');
  const notes = useLiveQuery(() => searchNotes(query), [query]);
  return (
    <div className="space-y-4">
      <input type="search" className="field" placeholder="Buscar en mis apuntes…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar en mis apuntes" />
      {notes && notes.length === 0 ? (
        <EmptyState icon="note" title={query ? 'Sin coincidencias' : 'Aún no tienes apuntes'}>
          Escribe apuntes desde cualquier materia, tema o fórmula.
        </EmptyState>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {notes?.map((n) => (
          <NoteCard key={n.id} note={n} />
        ))}
      </div>
    </div>
  );
}

function StarsTab() {
  const stars = useLiveQuery(() => listStars(), []);
  const toast = useToast();
  if (stars && stars.length === 0)
    return (
      <EmptyState icon="star" title="Nada marcado todavía">
        Toca la estrella en una fórmula, un subtema, un ejercicio o un artículo para tenerlo aquí.
      </EmptyState>
    );
  return (
    <ul className="space-y-2">
      {stars?.map((s) => (
        <li key={s.id} className="card flex items-center gap-3 p-3">
          <Icon name="star-filled" className="shrink-0 text-gold" />
          <span className="min-w-0 flex-1">
            {s.ruta ? (
              <AppLink to={s.ruta} className="font-semibold hover:text-red">
                {s.titulo}
              </AppLink>
            ) : s.snapshot ? (
              <a href={s.snapshot.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-red">
                {s.titulo}
              </a>
            ) : (
              <span className="font-semibold">{s.titulo}</span>
            )}
            <span className="block text-xs text-muted">
              {s.tipo} · {formatDate(s.creadoEn)}
            </span>
          </span>
          <button
            type="button"
            className="btn btn-icon btn-ghost border-0"
            aria-label={`Quitar estrella de ${s.titulo}`}
            onClick={async () => {
              await toggleStar({ tipo: s.tipo, refId: s.refId, titulo: s.titulo });
              toast.show('Estrella quitada');
            }}
          >
            <Icon name="close" size={18} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function CollectionsTab() {
  const collections = useLiveQuery(() => listCollections(), []);
  const toast = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState<CollectionColor>('carmin');
  return (
    <div className="space-y-5">
      <form
        className="card flex flex-wrap items-end gap-3 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await createCollection({ nombre: name, color });
            setName('');
            toast.show('Colección creada');
          } catch (error) {
            toast.error(error);
          }
        }}
      >
        <label className="min-w-48 flex-1">
          <span className="mb-1 block text-sm font-semibold">Nueva colección</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Examen de Costos, Fórmulas que siempre olvido…" maxLength={60} />
        </label>
        <fieldset className="flex gap-1.5" aria-label="Color">
          {COLLECTION_COLORS.map((c) => (
            <button key={c} type="button" aria-pressed={color === c} aria-label={`Color ${c}`} onClick={() => setColor(c)} className={`h-9 w-9 rounded-full border-2 ${color === c ? 'border-ink' : 'border-transparent'}`} style={{ background: COLOR_HEX[c] }} />
          ))}
        </fieldset>
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
          <Icon name="plus" size={18} /> Crear
        </button>
        <label className="btn btn-ghost cursor-pointer">
          <Icon name="upload" size={18} /> Importar
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                await importSharedCollection(await file.text());
                toast.show('Colección importada');
              } catch (error) {
                toast.error(error);
              }
            }}
          />
        </label>
      </form>
      {collections && collections.length === 0 ? (
        <EmptyState icon="folder" title="Sin colecciones">
          Agrupa fórmulas, subtemas y artículos para un examen o para compartir con tu grupo de estudio.
        </EmptyState>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {collections?.map((c) => (
          <li key={c.id}>
            <AppLink to={`/coleccion/${c.id}`} className="card card-lift flex h-full flex-col gap-2 overflow-hidden p-0">
              <span className="h-2" style={{ background: COLOR_HEX[c.color] }} />
              <span className="px-4 pt-2 text-lg font-semibold">{c.nombre}</span>
              {c.descripcion ? <span className="px-4 text-sm text-muted">{c.descripcion}</span> : null}
              <span className="mt-auto px-4 pb-4 text-xs text-muted">
                {c.items.length} elementos · {formatDate(c.actualizadoEn)}
              </span>
            </AppLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RemindersTab() {
  const reminders = useLiveQuery(() => listReminders(), []);
  const toast = useToast();
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState('');
  const [aviso, setAviso] = useState(60);
  const [now] = useState(() => Date.now());
  return (
    <div className="space-y-5">
      <form
        className="card grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await createReminder({ titulo, fecha: new Date(fecha).toISOString(), avisoMinutos: aviso });
            setTitulo('');
            setFecha('');
            toast.show('Recordatorio guardado');
          } catch (error) {
            toast.error(error);
          }
        }}
      >
        <label>
          <span className="mb-1 block text-sm font-semibold">Qué</span>
          <input className="field" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Entregar taller de Costos" maxLength={120} required />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold">Cuándo</span>
          <input className="field" type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold">Aviso</span>
          <select className="field" value={aviso} onChange={(e) => setAviso(Number(e.target.value))}>
            <option value={30}>30 min antes</option>
            <option value={60}>1 hora antes</option>
            <option value={1440}>1 día antes</option>
            <option value={2880}>2 días antes</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary">
          <Icon name="bell" size={18} /> Guardar
        </button>
      </form>
      {reminders && reminders.length === 0 ? (
        <EmptyState icon="bell" title="Sin recordatorios">
          Puedes añadir cada recordatorio al calendario de tu teléfono con el botón «Al calendario».
        </EmptyState>
      ) : null}
      <ul className="space-y-2">
        {reminders?.map((r) => {
          const overdue = r.estado === 'pendiente' && new Date(r.fecha).getTime() < now;
          return (
            <li key={r.id} className={`card flex flex-wrap items-center gap-3 p-3 ${overdue ? 'border-red' : ''}`}>
              <input type="checkbox" className="h-5 w-5 accent-[var(--red)]" checked={r.estado === 'hecho'} onChange={(e) => void setReminderDone(r.id, e.target.checked)} aria-label={`Marcar «${r.titulo}» como hecho`} />
              <span className="min-w-0 flex-1">
                <span className={`block font-semibold ${r.estado === 'hecho' ? 'text-muted line-through' : ''}`}>{r.titulo}</span>
                <span className={`tnum text-xs ${overdue ? 'font-semibold text-red' : 'text-muted'}`}>
                  {new Date(r.fecha).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}
                  {overdue ? ' · vencido' : ''}
                </span>
              </span>
              <button type="button" className="btn btn-ghost min-h-10 text-sm" onClick={() => downloadFile(`recordatorio-${r.id.slice(0, 8)}.ics`, reminderToIcs(r), 'text/calendar')}>
                <Icon name="download" size={16} /> Al calendario
              </button>
              <button type="button" className="btn btn-icon btn-ghost border-0" aria-label={`Eliminar «${r.titulo}»`} onClick={() => void deleteReminder(r.id)}>
                <Icon name="trash" size={18} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProgressTab() {
  const attempts = useLiveQuery(() => listAttempts(), [], []);
  const data = useAsync(async () => {
    const exercises = await loadEjercicios();
    const names = new Map(exercises.map((e) => [e.materia, getMateria(e.materia)?.nombre ?? e.materia] as const));
    return { exercises, names };
  }, []);
  const rows = useMemo(() => {
    if (data.status !== 'ready') return [];
    const subjectOf = new Map(data.data.exercises.map((e) => [e.id, e.materia]));
    const acc = accuracyBySubject(attempts ?? [], (id) => subjectOf.get(id));
    const solved = summarizeAttempts(attempts ?? []);
    const bySubject = new Map<string, { total: number; solved: number }>();
    for (const e of data.data.exercises) {
      const current = bySubject.get(e.materia) ?? { total: 0, solved: 0 };
      current.total += 1;
      if (solved.get(e.id)?.solved) current.solved += 1;
      bySubject.set(e.materia, current);
    }
    return [...bySubject.entries()].map(([id, s]) => ({ id, name: data.data.names.get(id) ?? id, ...s, ...(acc.get(id) ?? { attempts: 0, correct: 0 }) }));
  }, [data, attempts]);

  if ((attempts ?? []).length === 0)
    return (
      <EmptyState icon="target" title="Aún no hay intentos">
        Resuelve ejercicios en <AppLink to="/practica" className="link-red">Práctica</AppLink> y aquí verás en qué temas fallas más.
      </EmptyState>
    );
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const pct = r.total === 0 ? 0 : Math.round((r.solved / r.total) * 100);
        const accuracy = r.attempts === 0 ? null : Math.round((r.correct / r.attempts) * 100);
        return (
          <li key={r.id} className="card p-4">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <AppLink to={`/practica?materia=${r.id}`} className="font-semibold hover:text-red">
                {r.name}
              </AppLink>
              <span className="tnum text-sm text-muted">
                {r.solved}/{r.total} resueltos{accuracy !== null ? ` · ${accuracy} % de aciertos` : ''}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Avance en ${r.name}`}>
              <div className="h-full rounded-full bg-red transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function MyPage() {
  useDocumentTitle('Mi espacio');
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'apuntes') as Tab;
  return (
    <div>
      <PageHeader eyebrow="Solo en este dispositivo" title="Mi espacio" subtitle="Tus apuntes, lo marcado con estrella, tus colecciones, recordatorios y avance. Nada de esto sale de tu teléfono." />
      <Tabs<Tab>
        label="Secciones de mi espacio"
        value={tab}
        onChange={(id) => setParams({ tab: id }, { replace: true })}
        tabs={[
          { id: 'apuntes', label: 'Apuntes' },
          { id: 'estrellas', label: 'Estrellas' },
          { id: 'colecciones', label: 'Colecciones' },
          { id: 'recordatorios', label: 'Recordatorios' },
          { id: 'avance', label: 'Avance' },
        ]}
      />
      <div role="tabpanel">
        {tab === 'apuntes' ? <NotesTab /> : null}
        {tab === 'estrellas' ? <StarsTab /> : null}
        {tab === 'colecciones' ? <CollectionsTab /> : null}
        {tab === 'recordatorios' ? <RemindersTab /> : null}
        {tab === 'avance' ? <ProgressTab /> : null}
      </div>
    </div>
  );
}
