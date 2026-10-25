import { useParams } from 'react-router';
import {
  findAsignatura,
  getUniversidad,
  loadApps,
  loadEjercicios,
  loadFormulas,
  loadPlantillas,
  loadTemario,
  relatedTo,
} from '../../data/content';
import { NotFoundPage } from '../../app/Fallbacks';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, AreaBadge, AreaTile, Notice, PageHeader, Skeleton, SourceNote, TiltCard } from '../../ui/primitives';
import { StarButton } from '../../ui/StarButton';
import { NotesPanel } from '../me/NotesPanel';
import { AppCard } from '../apps/AppsPage';

const COST_ORDER = { gratis: 0, 'gratis-con-cuenta': 1, freemium: 2, pago: 3 } as const;

export default function SubjectPage() {
  const { asignaturaId = '' } = useParams();
  const state = useAsync(async () => {
    const found = await findAsignatura(asignaturaId);
    if (!found) return null;
    const [temario, formulas, apps, plantillas, ejercicios] = await Promise.all([
      loadTemario(asignaturaId),
      loadFormulas(),
      loadApps(),
      loadPlantillas(),
      loadEjercicios(),
    ]);
    return { ...found, temario, formulas, apps, plantillas, ejercicios };
  }, [asignaturaId]);
  useDocumentTitle(state.status === 'ready' && state.data ? state.data.asignatura.nombre : 'Asignatura');

  if (state.status === 'loading') return <Skeleton lines={5} />;
  if (state.status === 'error' || !state.data) return <NotFoundPage />;
  const { asignatura, carrera, temario, formulas, apps, plantillas, ejercicios } = state.data;
  const relatedFormulas = relatedTo(formulas, asignatura.nombre);
  const relatedApps = relatedTo(apps, asignatura.nombre).sort((a, b) => COST_ORDER[a.costo] - COST_ORDER[b.costo]);
  const relatedTemplates = relatedTo(plantillas, asignatura.nombre);
  const exercises = ejercicios.filter((e) => e.asignatura === asignatura.id);
  const area = asignatura.areas[0] ?? 'gestion';

  return (
    <div className="space-y-12">
      <PageHeader
        back={{ to: `/carrera/${carrera.id}`, label: `${carrera.nombre} · ciclo ${asignatura.ciclo}` }}
        eyebrow={`${getUniversidad(carrera.universidad)?.siglas ?? ''} · Ciclo ${asignatura.ciclo}`}
        title={
          <span className="flex items-center gap-4">
            <AreaTile area={area} size="lg" />
            <span>{asignatura.nombre}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-3">
            {asignatura.areas.map((a) => (
              <AreaBadge key={a} area={a} />
            ))}
            {asignatura.nombre_oficial !== asignatura.nombre ? <span className="text-sm">Publicada como «{asignatura.nombre_oficial}»</span> : null}
          </span>
        }
        actions={<StarButton star={{ tipo: 'asignatura', refId: asignatura.id, titulo: asignatura.nombre, ruta: `/asignatura/${asignatura.id}` }} />}
      />

      <section aria-labelledby="temario">
        <h2 id="temario" className="mb-4 font-display text-2xl font-semibold">
          Temario
        </h2>
        {temario ? (
          <ol className="grid gap-3 sm:grid-cols-2">
            {temario.temas.map((tema) => (
              <li key={tema.id}>
                <AppLink to={`/asignatura/${asignatura.id}/tema/${tema.id}`} className="block h-full">
                  <TiltCard className="flex h-full flex-col gap-2 p-5">
                    <span className="flex items-center justify-between">
                      <span className="tnum font-display text-3xl font-semibold text-red/80">{String(tema.orden).padStart(2, '0')}</span>
                      <span className="flex gap-1" aria-label={`Dificultad ${tema.dificultad} de 3`}>
                        {[1, 2, 3].map((d) => (
                          <span key={d} className={`h-1.5 w-5 rounded-full ${d <= tema.dificultad ? 'bg-red' : 'bg-line'}`} />
                        ))}
                      </span>
                    </span>
                    <span className="text-lg font-semibold">{tema.nombre}</span>
                    <span className="text-sm text-muted">{tema.descripcion}</span>
                    <span className="link-red mt-auto pt-2 text-sm">{tema.subtemas.length} subtemas →</span>
                  </TiltCard>
                </AppLink>
              </li>
            ))}
          </ol>
        ) : (
          <Notice>
            El temario detallado de esta asignatura todavía no se publica: ÁBACO solo publica contenido verificado con su
            fuente. Mientras tanto tienes la malla oficial, las fórmulas, las apps y tus apuntes de esta asignatura.
          </Notice>
        )}
      </section>

      {relatedFormulas.length > 0 ? (
        <section aria-labelledby="formulas-rel">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="formulas-rel" className="font-display text-2xl font-semibold">
              Fórmulas que se usan aquí
            </h2>
            <AppLink to="/formulas" className="link-red text-sm">
              Todas →
            </AppLink>
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {relatedFormulas.slice(0, 12).map((f) => (
              <li key={f.id}>
                <AppLink to={`/formulas/${f.id}`} className="card card-lift flex h-full items-center gap-3 p-3.5">
                  <AreaTile area={f.areas[0] ?? 'finanzas'} size="sm" />
                  <span className="min-w-0 flex-1 text-sm leading-snug font-semibold">{f.nombre}</span>
                  <Icon name="chevron-right" size={18} className="text-muted" />
                </AppLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {exercises.length > 0 || relatedTemplates.length > 0 ? (
        <section aria-labelledby="practicar" className="grid gap-4 md:grid-cols-2">
          <h2 id="practicar" className="sr-only">
            Practicar
          </h2>
          {exercises.length > 0 ? (
            <AppLink to={`/practica?asignatura=${asignatura.id}`} className="card card-lift flex items-center gap-4 p-5">
              <span className="tile">
                <Icon name="target" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{exercises.length} ejercicios para practicar</span>
                <span className="text-sm text-muted">Respuesta verificable, pistas y tu historial</span>
              </span>
              <Icon name="arrow-right" className="text-red" />
            </AppLink>
          ) : null}
          {relatedTemplates.map((p) => (
            <AppLink key={p.id} to={`/laboratorio/nueva?plantilla=${p.id}`} className="card card-lift flex items-center gap-4 p-5">
              <span className="tile">
                <Icon name="lab" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">Plantilla: {p.nombre}</span>
                <span className="text-sm text-muted">{p.descripcion}</span>
              </span>
              <Icon name="arrow-right" className="text-red" />
            </AppLink>
          ))}
        </section>
      ) : null}

      {relatedApps.length > 0 ? (
        <section aria-labelledby="apps-rel">
          <h2 id="apps-rel" className="mb-4 font-display text-2xl font-semibold">
            Herramientas recomendadas
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedApps.map((app) => (
              <li key={app.id}>
                <AppCard app={app} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <NotesPanel refTipo="asignatura" refId={asignatura.id} title="Mis apuntes de la asignatura" />

      <SourceNote fuente={carrera.fuente} />
    </div>
  );
}
