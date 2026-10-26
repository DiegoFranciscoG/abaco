import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { deleteNote, LIMITS, listNotes, saveNote } from '../../data/repositories';
import type { Apunte, RefTipo } from '../../data/types';
import { Icon } from '../../ui/icons';
import { EmptyState } from '../../ui/primitives';
import { formatDate } from '../../ui/utils';
import { useToast } from '../../ui/use-toast';

function NoteForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Apunte;
  onSave: (data: { titulo: string; contenido: string; etiquetas: string[] }) => Promise<void>;
  onCancel?: () => void;
}) {
  const [titulo, setTitulo] = useState(initial?.titulo ?? '');
  const [contenido, setContenido] = useState(initial?.contenido ?? '');
  const [etiquetas, setEtiquetas] = useState(initial?.etiquetas.join(', ') ?? '');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave({
            titulo,
            contenido,
            etiquetas: etiquetas
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          });
          if (!initial) {
            setTitulo('');
            setContenido('');
            setEtiquetas('');
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        className="field"
        placeholder="Título (opcional)"
        value={titulo}
        maxLength={LIMITS.noteTitle}
        onChange={(e) => setTitulo(e.target.value)}
        aria-label="Título del apunte"
      />
      <textarea
        className="field min-h-28 resize-y"
        placeholder="Escribe tu apunte: lo que el profesor recalcó, un truco, una duda…"
        value={contenido}
        maxLength={LIMITS.noteBody}
        onChange={(e) => setContenido(e.target.value)}
        aria-label="Contenido del apunte"
        required
      />
      <input
        className="field"
        placeholder="Etiquetas separadas por coma: examen, parcial 1"
        value={etiquetas}
        onChange={(e) => setEtiquetas(e.target.value)}
        aria-label="Etiquetas"
      />
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy || contenido.trim().length === 0}>
          <Icon name="check" size={18} /> {initial ? 'Guardar cambios' : 'Guardar apunte'}
        </button>
        {onCancel ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function NoteCard({ note }: { note: Apunte }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="card p-4">
        <NoteForm
          initial={note}
          onCancel={() => setEditing(false)}
          onSave={async (data) => {
            try {
              await saveNote({ ...data, id: note.id, refTipo: note.refTipo, refId: note.refId });
              toast.show('Apunte actualizado');
              setEditing(false);
            } catch (error) {
              toast.error(error);
            }
          }}
        />
      </div>
    );
  }
  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {note.titulo ? <h4 className="font-semibold">{note.titulo}</h4> : null}
          <p className="text-xs text-muted">{formatDate(note.actualizadoEn)}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="btn btn-icon btn-ghost min-h-10 min-w-10 border-0"
            onClick={() => setEditing(true)}
            aria-label="Editar apunte"
          >
            <Icon name="note" size={18} />
          </button>
          <button
            type="button"
            className="btn btn-icon btn-ghost min-h-10 min-w-10 border-0"
            aria-label="Eliminar apunte"
            onClick={async () => {
              if (!window.confirm('¿Eliminar este apunte? No se puede deshacer.')) return;
              await deleteNote(note.id);
              toast.show('Apunte eliminado');
            }}
          >
            <Icon name="trash" size={18} />
          </button>
        </div>
      </div>
      <p className="mt-2 text-[0.95rem] leading-relaxed whitespace-pre-wrap text-ink-2">{note.contenido}</p>
      {note.etiquetas.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.etiquetas.map((t) => (
            <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">
              #{t}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

/** Notes attached to any level (subject, topic, subtopic, formula). Stored only on this device. */
export function NotesPanel({
  refTipo,
  refId,
  title = 'Mis apuntes',
}: {
  refTipo: RefTipo;
  refId: string;
  title?: string;
}) {
  const toast = useToast();
  const notes = useLiveQuery(() => listNotes({ refTipo, refId }), [refTipo, refId]);
  return (
    <section aria-labelledby={`notes-${refId}`} className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon name="note" className="text-red" />
        <h2 id={`notes-${refId}`} className="font-display text-xl font-semibold">
          {title}
        </h2>
        <span className="text-xs text-muted">· solo en este dispositivo</span>
      </div>
      <div className="card p-4">
        <NoteForm
          onSave={async (data) => {
            try {
              await saveNote({ ...data, refTipo, refId });
              toast.show('Apunte guardado en este dispositivo');
            } catch (error) {
              toast.error(error);
            }
          }}
        />
      </div>
      {notes === undefined ? null : notes.length === 0 ? (
        <EmptyState icon="note" title="Aún no tienes apuntes aquí">
          Lo que escribas se queda en tu teléfono y entra en tu respaldo.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </div>
      )}
    </section>
  );
}
