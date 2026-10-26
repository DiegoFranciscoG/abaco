import { useParams, useSearchParams } from 'react-router';
import { getMateria, loadFormulas, loadTemario } from '../../data/content';
import { NotFoundPage } from '../../app/Fallbacks';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { Accordion, AppLink, PageHeader, Skeleton, SourceNote } from '../../ui/primitives';
import { StarButton } from '../../ui/StarButton';
import { AddToCollectionButton } from '../me/AddToCollection';
import { NotesPanel } from '../me/NotesPanel';

export default function TopicPage() {
  const { materiaId = '', temaId = '' } = useParams();
  const materia = getMateria(materiaId);
  const [params] = useSearchParams();
  const openSubtopic = params.get('s');
  const state = useAsync(async () => {
    const [temario, formulas] = await Promise.all([loadTemario(materiaId), loadFormulas()]);
    return { temario, formulas };
  }, [materiaId]);

  const temaName =
    state.status === 'ready' ? state.data.temario?.temas.find((t) => t.id === temaId)?.nombre : undefined;
  useDocumentTitle(temaName ?? 'Tema');

  if (state.status === 'loading') return <Skeleton lines={5} />;
  if (state.status === 'error' || !materia || !state.data.temario) return <NotFoundPage />;
  const { temario, formulas } = state.data;
  const index = temario.temas.findIndex((t) => t.id === temaId);
  const tema = temario.temas[index];
  if (!tema) return <NotFoundPage />;
  const prev = temario.temas[index - 1];
  const next = temario.temas[index + 1];
  const formulaName = new Map(formulas.map((f) => [f.id, f.nombre]));
  const base = `/materia/${materia.id}`;

  return (
    <div className="space-y-10">
      <PageHeader
        back={{ to: base, label: materia.nombre }}
        eyebrow={`Tema ${tema.orden} de ${temario.temas.length}`}
        title={tema.nombre}
        subtitle={tema.descripcion}
      />

      <section aria-label="Subtemas" className="space-y-3">
        {tema.subtemas.map((s) => (
          <Accordion
            key={`${s.id}-${openSubtopic === s.id ? 'abierto' : 'cerrado'}`}
            id={s.id}
            title={s.nombre}
            defaultOpen={openSubtopic === s.id}
            aside={
              <StarButton
                compact
                star={{
                  tipo: 'subtema',
                  refId: s.id,
                  titulo: s.nombre,
                  ruta: `${base}/tema/${tema.id}?s=${s.id}`,
                }}
              />
            }
          >
            <div className="space-y-5">
              <p className="text-[1.02rem] leading-relaxed text-ink-2">{s.explicacion}</p>
              <div>
                <h3 className="eyebrow mb-2">Puntos clave</h3>
                <ul className="space-y-1.5">
                  {s.puntos_clave.map((p) => (
                    <li key={p} className="flex gap-2 text-ink-2">
                      <Icon name="check" size={18} className="mt-0.5 shrink-0 text-ok" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-warn-soft p-4">
                <h3 className="mb-2 text-xs font-bold tracking-[0.12em] text-warn uppercase">
                  Errores frecuentes
                </h3>
                <ul className="space-y-1.5">
                  {s.errores_frecuentes.map((e) => (
                    <li key={e} className="flex gap-2 text-sm text-ink-2">
                      <Icon name="info" size={17} className="mt-0.5 shrink-0 text-warn" />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {s.formulas.length > 0 ? (
                <div>
                  <h3 className="eyebrow mb-2">Fórmulas</h3>
                  <div className="flex flex-wrap gap-2">
                    {s.formulas.map((id) => (
                      <AppLink
                        key={id}
                        to={`/formulas/${id}`}
                        className="chip hover:border-red hover:text-red"
                      >
                        <Icon name="formula" size={15} /> {formulaName.get(id) ?? id}
                      </AppLink>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <SourceNote fuente={s.fuente} />
                <AddToCollectionButton
                  item={{
                    tipo: 'subtema',
                    refId: s.id,
                    titulo: s.nombre,
                    ruta: `${base}/tema/${tema.id}?s=${s.id}`,
                  }}
                />
              </div>
            </div>
          </Accordion>
        ))}
      </section>

      <nav aria-label="Temas" className="grid gap-3 sm:grid-cols-2">
        {prev ? (
          <AppLink to={`${base}/tema/${prev.id}`} className="card card-lift flex items-center gap-3 p-4">
            <Icon name="arrow-left" className="text-red" />
            <span>
              <span className="block text-xs text-muted">Tema anterior</span>
              <span className="font-semibold">{prev.nombre}</span>
            </span>
          </AppLink>
        ) : (
          <span />
        )}
        {next ? (
          <AppLink
            to={`${base}/tema/${next.id}`}
            className="card card-lift flex items-center justify-end gap-3 p-4 text-right"
          >
            <span>
              <span className="block text-xs text-muted">Siguiente tema</span>
              <span className="font-semibold">{next.nombre}</span>
            </span>
            <Icon name="arrow-right" className="text-red" />
          </AppLink>
        ) : null}
      </nav>

      <NotesPanel refTipo="tema" refId={tema.id} title="Mis apuntes del tema" />
    </div>
  );
}
