import { useParams } from 'react-router';
import {
  carrerasDeMateria,
  getMateria,
  loadApps,
  loadEjercicios,
  loadFormulas,
  loadPlantillas,
  loadTemario,
  relatedTo,
  resolveFuente,
} from '../../data/content';
import { NotFoundPage } from '../../app/Fallbacks';
import { getTool } from '../../domain/tools/catalog';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, AreaBadge, AreaTile, PageHeader, Skeleton, TiltCard } from '../../ui/primitives';
import { StarButton } from '../../ui/StarButton';
import { TOOL_ICON } from '../../ui/tool-icons';
import { useProfile } from '../../ui/use-profile';
import { useToast } from '../../ui/use-toast';
import { AppCard } from '../apps/AppsPage';
import { NotesPanel } from '../me/NotesPanel';
import { ordinal } from './career-selection';
import { toggleMySubject } from './my-subjects';

const COST_ORDER = { gratis: 0, 'gratis-con-cuenta': 1, freemium: 2, pago: 3 } as const;

export default function SubjectPage() {
  const { materiaId = '' } = useParams();
  const materia = getMateria(materiaId);
  const profile = useProfile();
  const toast = useToast();
  const state = useAsync(async () => {
    const [temario, formulas, apps, plantillas, ejercicios] = await Promise.all([
      loadTemario(materiaId),
      loadFormulas(),
      loadApps(),
      loadPlantillas(),
      loadEjercicios(),
    ]);
    return { temario, formulas, apps, plantillas, ejercicios };
  }, [materiaId]);
  useDocumentTitle(materia?.nombre ?? 'Materia');

  if (!materia) return <NotFoundPage />;
  if (state.status === 'loading') return <Skeleton lines={5} />;
  if (state.status === 'error' || !state.data.temario) return <NotFoundPage />;
  const { temario, formulas, apps, plantillas, ejercicios } = state.data;
  const relatedFormulas = relatedTo(formulas, materia.id);
  const relatedApps = relatedTo(apps, materia.id).sort((a, b) => COST_ORDER[a.costo] - COST_ORDER[b.costo]);
  const relatedTemplates = relatedTo(plantillas, materia.id);
  const exercises = ejercicios.filter((e) => e.materia === materia.id);
  const tools = materia.herramientas.map(getTool).filter((t) => t !== undefined);
  const area = materia.areas[0] ?? 'gestion';
  const mine = profile.materias.includes(materia.id);
  const subtopicCount = temario.temas.reduce((sum, t) => sum + t.subtemas.length, 0);
  const careers = carrerasDeMateria(materia.id);

  const sources = new Map<string, { titulo: string; autor: string; url: string }>();
  for (const tema of temario.temas) {
    for (const s of tema.subtemas) {
      const f = resolveFuente(s.fuente);
      if (f && !sources.has(f.id)) sources.set(f.id, { titulo: f.titulo, autor: f.autor_editor, url: f.url });
    }
  }

  const toggleMine = async () => {
    try {
      const added = await toggleMySubject(profile.materias, materia.id);
      toast.show(added ? 'Agregada a tus materias' : 'Quitada de tus materias');
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <div className="space-y-12">
      <PageHeader
        back={{ to: '/materias', label: 'Materias' }}
        eyebrow={`${temario.temas.length} temas · ${subtopicCount} subtemas`}
        title={
          <span className="flex items-center gap-4">
            <AreaTile area={area} size="lg" />
            <span>{materia.nombre}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-col gap-3">
            <span>{materia.descripcion}</span>
            <span className="flex flex-wrap items-center gap-2">
              {materia.areas.map((a) => (
                <AreaBadge key={a} area={a} />
              ))}
            </span>
            {careers.length > 0 ? (
              <span className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">Se suele cursar en:</span>
                {careers.map(({ carrera, ciclo }) => (
                  <AppLink
                    key={carrera.id}
                    to={`/materias?carrera=${carrera.id}&ciclo=${ciclo}`}
                    className="chip min-h-9"
                  >
                    {carrera.nombre} · {ordinal(ciclo)} ciclo
                  </AppLink>
                ))}
              </span>
            ) : null}
          </span>
        }
        actions={
          <span className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn ${mine ? 'btn-soft' : 'btn-ghost'}`}
              aria-pressed={mine}
              onClick={() => void toggleMine()}
            >
              <Icon name={mine ? 'check' : 'plus'} size={18} /> {mine ? 'En mis materias' : 'La llevo'}
            </button>
            <StarButton
              star={{
                tipo: 'materia',
                refId: materia.id,
                titulo: materia.nombre,
                ruta: `/materia/${materia.id}`,
              }}
            />
          </span>
        }
      />

      <section aria-labelledby="temario">
        <h2 id="temario" className="mb-4 font-display text-2xl font-semibold">
          Temario
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {temario.temas.map((tema) => (
            <li key={tema.id}>
              <AppLink to={`/materia/${materia.id}/tema/${tema.id}`} className="block h-full">
                <TiltCard className="flex h-full flex-col gap-2 p-5">
                  <span className="flex items-center justify-between">
                    <span className="tnum font-display text-3xl font-semibold text-red/80">
                      {String(tema.orden).padStart(2, '0')}
                    </span>
                    <span className="flex gap-1" role="img" aria-label={`Dificultad ${tema.dificultad} de 3`}>
                      {[1, 2, 3].map((d) => (
                        <span
                          key={d}
                          className={`h-1.5 w-5 rounded-full ${d <= tema.dificultad ? 'bg-red' : 'bg-line'}`}
                        />
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
      </section>

      {tools.length > 0 ? (
        <section aria-labelledby="herramientas">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="herramientas" className="font-display text-2xl font-semibold">
              Herramientas para esta materia
            </h2>
            <AppLink to="/herramientas" className="link-red text-sm">
              Todas →
            </AppLink>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <li key={tool.id}>
                <AppLink to={tool.ruta} className="card card-lift flex h-full items-start gap-3 p-4">
                  <span className="tile tile-sm shrink-0">
                    <Icon name={TOOL_ICON[tool.id]} size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{tool.nombre}</span>
                    <span className="text-sm text-muted">{tool.descripcion}</span>
                  </span>
                </AppLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
                <AppLink
                  to={`/formulas/${f.id}`}
                  className="card card-lift flex h-full items-center gap-3 p-3.5"
                >
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
            <AppLink
              to={`/practica?materia=${materia.id}`}
              className="card card-lift flex items-center gap-4 p-5"
            >
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
            <AppLink
              key={p.id}
              to={`/laboratorio/nueva?plantilla=${p.id}`}
              className="card card-lift flex items-center gap-4 p-5"
            >
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
          <h2 id="apps-rel" className="mb-1 font-display text-2xl font-semibold">
            Apps externas recomendadas
          </h2>
          <p className="mb-4 text-sm text-muted">
            Sitios de terceros; ÁBACO no está afiliado a ellos y cada uno tiene sus propias condiciones.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedApps.map((app) => (
              <li key={app.id}>
                <AppCard app={app} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <NotesPanel refTipo="materia" refId={materia.id} title="Mis apuntes de la materia" />

      <AppLink
        to={`/sugerencias?tipo=materia&materia=${materia.id}`}
        className="card card-lift flex items-center gap-4 p-5"
      >
        <span className="tile tile-sm shrink-0">
          <Icon name="sparkle" size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            ¿Falta un tema o encontraste un error en {materia.nombre}?
          </span>
          <span className="text-sm text-muted">
            Cuéntalo en el buzón de sugerencias, con la fuente si la tienes.
          </span>
        </span>
        <Icon name="arrow-right" className="text-red" />
      </AppLink>

      <section aria-labelledby="fuentes-temario" className="card p-5">
        <h2 id="fuentes-temario" className="mb-3 flex items-center gap-2 text-base font-semibold">
          <Icon name="book" size={18} className="text-red" /> Fuentes de este temario
        </h2>
        <p className="mb-3 text-sm text-muted">
          Las explicaciones son redacción propia de ÁBACO. Cada subtema enlaza a la sección exacta que lo
          respalda.
        </p>
        <ul className="space-y-1.5 text-sm">
          {[...sources.values()].map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-red"
              >
                {s.titulo}
              </a>{' '}
              <span className="text-muted">· {s.autor}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
