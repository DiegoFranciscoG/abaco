import { useLiveQuery } from 'dexie-react-hooks';
import { loadPlantillas } from '../../data/content';
import { deleteSheet, listSheets } from '../../data/repositories';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, EmptyState, PageHeader, TiltCard } from '../../ui/primitives';
import { formatDate } from '../../ui/utils';
import { useToast } from '../../ui/use-toast';

export default function LabHome() {
  useDocumentTitle('Laboratorio');
  const sheets = useLiveQuery(() => listSheets(), []);
  const templates = useAsync(loadPlantillas, []);
  const toast = useToast();

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Laboratorio de hoja de cálculo"
        title="Practica sin abrir Excel"
        subtitle="Escribe fórmulas en español (=VA, =PAGO, =TIR) o en inglés, comprueba resultados y descarga un .xlsx que abre en Excel, LibreOffice o Google Sheets. Nada se sube a ningún servidor."
        actions={
          <AppLink to="/laboratorio/nueva" className="btn btn-primary">
            <Icon name="plus" size={18} /> Hoja en blanco
          </AppLink>
        }
      />

      <section aria-labelledby="plantillas">
        <h2 id="plantillas" className="mb-4 font-display text-2xl font-semibold">
          Empieza con una plantilla
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.status === 'ready'
            ? templates.data.map((p) => (
                <li key={p.id}>
                  <AppLink to={`/laboratorio/nueva?plantilla=${p.id}`} className="block h-full">
                    <TiltCard className="flex h-full flex-col gap-2 p-5">
                      <span className="tile">
                        <Icon name="lab" />
                      </span>
                      <span className="text-lg font-semibold">{p.nombre}</span>
                      <span className="text-sm text-muted">{p.descripcion}</span>
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-xs font-semibold text-ok">
                        <Icon name="check" size={14} /> Con comprobación automática
                      </span>
                    </TiltCard>
                  </AppLink>
                </li>
              ))
            : null}
        </ul>
      </section>

      <section aria-labelledby="mis-hojas">
        <h2 id="mis-hojas" className="mb-4 font-display text-2xl font-semibold">
          Mis hojas
        </h2>
        {sheets && sheets.length === 0 ? (
          <EmptyState icon="lab" title="Todavía no tienes hojas">
            Las hojas se guardan solas en este dispositivo mientras trabajas.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {sheets?.map((s) => (
              <li key={s.id} className="card flex items-center gap-3 p-3">
                <AppLink to={`/laboratorio/${s.id}`} className="flex min-h-11 flex-1 items-center gap-3">
                  <span className="tile h-10 w-10 rounded-xl">
                    <Icon name="lab" size={18} />
                  </span>
                  <span>
                    <span className="block font-semibold">{s.nombre}</span>
                    <span className="text-xs text-muted">
                      {Object.keys(s.celdas).length} celdas · editada el {formatDate(s.actualizadoEn)}
                    </span>
                  </span>
                </AppLink>
                <button
                  type="button"
                  className="btn btn-icon btn-ghost border-0"
                  aria-label={`Eliminar la hoja ${s.nombre}`}
                  onClick={async () => {
                    if (!window.confirm(`¿Eliminar la hoja «${s.nombre}»?`)) return;
                    await deleteSheet(s.id);
                    toast.show('Hoja eliminada');
                  }}
                >
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
