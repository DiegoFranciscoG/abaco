import { useLiveQuery } from 'dexie-react-hooks';
import { getMateria } from '../../data/content';
import { deleteEntregable, listEntregables } from '../../data/everyday-repositories';
import { DELIVERABLES, getDeliverable } from '../../domain/deliverables/catalog';
import { useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, PageHeader } from '../../ui/primitives';
import { useToast } from '../../ui/use-toast';
import { formatDate } from '../../ui/utils';

export default function DeliverablesPage() {
  useDocumentTitle('Entregables');
  const toast = useToast();
  const saved = useLiveQuery(() => listEntregables(), [], []);
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Para la tarea de esta semana"
        title="Entregables paso a paso"
        subtitle="Escribe los datos de tu deber y ÁBACO arma el entregable con el procedimiento completo, como lo califica tu docente. Descárgalo en Excel con fórmulas vivas o en PDF, y guárdalo para seguir después."
      />
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DELIVERABLES.map((d) => (
          <li key={d.id}>
            <AppLink to={`/entregables/${d.id}`} className="card card-lift flex h-full flex-col gap-2 p-5">
              <span className="flex items-center gap-3">
                <span className="tile shrink-0">
                  <Icon name="ledger" />
                </span>
                <span className="font-display text-lg font-semibold text-ink">{d.nombre}</span>
              </span>
              <span className="text-sm leading-relaxed text-muted">{d.descripcion}</span>
              <span className="mt-auto flex flex-wrap gap-1.5 pt-2">
                {d.materias.map((m) => (
                  <span key={m} className="chip min-h-7 text-xs">
                    {getMateria(m)?.nombre ?? m}
                  </span>
                ))}
              </span>
            </AppLink>
          </li>
        ))}
      </ul>

      <section aria-labelledby="guardados" className="space-y-3">
        <h2 id="guardados" className="font-display text-2xl font-semibold">
          Tus entregables guardados
        </h2>
        {saved.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no guardas ninguno. Se guardan solo en este dispositivo, con los datos que escribiste.
          </p>
        ) : (
          <ul className="space-y-2">
            {saved.map((e) => (
              <li key={e.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <AppLink to={`/entregables/${e.tipo}?guardado=${e.id}`} className="min-w-0">
                  <span className="block font-semibold text-ink hover:text-red">{e.titulo}</span>
                  <span className="text-xs text-muted">
                    {getDeliverable(e.tipo)?.nombre ?? e.tipo} · {formatDate(e.actualizadoEn)}
                  </span>
                </AppLink>
                <button
                  type="button"
                  className="btn btn-ghost min-h-10"
                  aria-label={`Borrar ${e.titulo}`}
                  onClick={() => {
                    void deleteEntregable(e.id).then(() =>
                      toast.show(`«${e.titulo}» se borró de este dispositivo`),
                    );
                  }}
                >
                  <Icon name="trash" size={16} /> Borrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
