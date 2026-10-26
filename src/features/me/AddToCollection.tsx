import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { addToCollection, createCollection, listCollections } from '../../data/repositories';
import type { ItemColeccion } from '../../data/types';
import { Icon } from '../../ui/icons';
import { Dialog } from '../../ui/primitives';
import { useToast } from '../../ui/use-toast';

export function AddToCollectionButton({
  item,
  compact = false,
}: {
  item: Omit<ItemColeccion, 'agregadoEn'>;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const collections = useLiveQuery(() => listCollections(), []);
  const toast = useToast();

  const add = async (id: string, label: string) => {
    try {
      await addToCollection(id, item);
      toast.show(`Agregado a «${label}»`);
      setOpen(false);
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`btn btn-ghost ${compact ? 'btn-icon' : ''}`}
        onClick={() => setOpen(true)}
        aria-label={`Agregar «${item.titulo}» a una colección`}
      >
        <Icon name="folder" size={19} />
        {compact ? null : <span>Colección</span>}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Agregar a una colección">
        <p className="mb-4 text-sm text-muted">«{item.titulo}»</p>
        {collections && collections.length > 0 ? (
          <ul className="mb-5 space-y-2">
            {collections.map((c) => {
              const already = c.items.some((i) => i.tipo === item.tipo && i.refId === item.refId);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => void add(c.id, c.nombre)}
                    className="flex min-h-12 w-full items-center justify-between rounded-xl border border-line px-4 text-left hover:border-red disabled:opacity-60"
                  >
                    <span className="font-semibold">{c.nombre}</span>
                    <span className="text-xs text-muted">
                      {already ? 'Ya está aquí' : `${c.items.length} elementos`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-muted">Todavía no tienes colecciones. Crea la primera:</p>
        )}
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const created = await createCollection({ nombre: name });
              setName('');
              await add(created.id, created.nombre);
            } catch (error) {
              toast.error(error);
            }
          }}
        >
          <input
            className="field"
            placeholder="Nueva colección, p. ej. «Examen de Costos»"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Nombre de la nueva colección"
            maxLength={60}
          />
          <button type="submit" className="btn btn-primary shrink-0" disabled={!name.trim()}>
            Crear
          </button>
        </form>
      </Dialog>
    </>
  );
}
