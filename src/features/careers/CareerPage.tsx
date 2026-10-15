import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { getCarrera, getUniversidad, loadMalla, SUBJECTS_WITH_CONTENT } from '../../data/content';
import { updateProfile } from '../../data/repositories';
import { useAsync, useDocumentTitle, useProfile } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, AreaBadge, AreaTile, Notice, PageHeader, Skeleton, SourceNote } from '../../ui/primitives';
import { useToast } from '../../ui/use-toast';
import { NotFoundPage } from '../../app/Fallbacks';

export default function CareerPage() {
  const { carreraId = '' } = useParams();
  const carrera = getCarrera(carreraId);
  const universidad = carrera ? getUniversidad(carrera.universidad) : undefined;
  const profile = useProfile();
  const toast = useToast();
  const malla = useAsync(() => loadMalla(carreraId), [carreraId]);
  const [cycle, setCycle] = useState<number | 'todos'>('todos');
  useDocumentTitle(carrera ? `Malla de ${carrera.nombre}` : 'Malla');

  const byCycle = useMemo(() => {
    if (malla.status !== 'ready' || !malla.data) return [];
    const groups = new Map<number, typeof malla.data.asignaturas>();
    for (const a of malla.data.asignaturas) groups.set(a.ciclo, [...(groups.get(a.ciclo) ?? []), a]);
    return [...groups.entries()].sort((x, y) => x[0] - y[0]);
  }, [malla]);

  if (!carrera) return <NotFoundPage />;
  const isMine = profile.carrera === carrera.id;
  const discrepancy = carrera.asignaturas_declaradas !== null && carrera.asignaturas_declaradas !== carrera.asignaturas_listadas;

  return (
    <div>
      <PageHeader
        back={{ to: '/carreras', label: 'Todas las carreras' }}
        eyebrow={universidad?.nombre}
        title={carrera.nombre}
        subtitle={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span>{carrera.titulo_otorgado}</span>
            <span className="tnum">{carrera.num_ciclos} ciclos</span>
            <span>{carrera.modalidad.join(' · ')}</span>
            {carrera.horas ? <span className="tnum">{carrera.horas.toLocaleString('es-EC')} horas</span> : null}
            {carrera.creditos ? <span className="tnum">{carrera.creditos} créditos</span> : null}
            {carrera.requisito_idioma ? <span>Idioma: {carrera.requisito_idioma.replace('//', '·')}</span> : null}
          </span>
        }
        actions={
          <button
            type="button"
            className={`btn ${isMine ? 'btn-soft' : 'btn-ghost'}`}
            aria-pressed={isMine}
            onClick={async () => {
              try {
                await updateProfile(isMine ? { carrera: undefined, ciclo: undefined } : { carrera: carrera.id, universidad: carrera.universidad });
                toast.show(isMine ? 'Ya no es tu carrera' : 'Guardada como tu carrera');
              } catch (error) {
                toast.error(error);
              }
            }}
          >
            <Icon name={isMine ? 'check' : 'plus'} size={18} /> {isMine ? 'Es mi carrera' : 'Marcar como mi carrera'}
          </button>
        }
      />

      <div className="mb-6 space-y-3">
        {discrepancy ? (
          <Notice tone="warn">
            La página oficial declara <strong>{carrera.asignaturas_declaradas}</strong> asignaturas, pero su malla publicada lista{' '}
            <strong>{carrera.asignaturas_listadas}</strong>. ÁBACO muestra exactamente lo que está publicado.
          </Notice>
        ) : null}
        {carrera.observaciones.map((o) => (
          <Notice key={o}>{o}</Notice>
        ))}
      </div>

      <div role="tablist" aria-label="Ciclos" className="sticky top-16 z-20 -mx-4 mb-6 flex gap-2 overflow-x-auto bg-paper/85 px-4 py-3 backdrop-blur-md">
        {(['todos', ...Array.from({ length: carrera.num_ciclos }, (_, i) => i + 1)] as const).map((c) => (
          <button key={c} type="button" role="tab" aria-selected={cycle === c} className="chip shrink-0" onClick={() => setCycle(c)}>
            {c === 'todos' ? 'Todos' : `Ciclo ${c}`}
          </button>
        ))}
      </div>

      {malla.status === 'loading' ? <Skeleton lines={6} /> : null}
      {malla.status === 'error' ? <Notice tone="warn">No se pudo cargar la malla. Revisa tu conexión e intenta otra vez.</Notice> : null}

      <div className="space-y-10">
        {byCycle
          .filter(([n]) => cycle === 'todos' || cycle === n)
          .map(([n, subjects]) => (
            <section key={n} aria-labelledby={`ciclo-${n}`}>
              <div className="mb-3 flex items-center gap-3">
                <h2 id={`ciclo-${n}`} className="font-display text-2xl font-semibold">
                  Ciclo {n}
                </h2>
                <span className="h-px flex-1 bg-line" />
                {isMine ? (
                  <button
                    type="button"
                    className={`chip ${profile.ciclo === n ? 'border-red text-red' : ''}`}
                    onClick={() => void updateProfile({ ciclo: n })}
                  >
                    {profile.ciclo === n ? 'Mi ciclo actual' : 'Estoy en este ciclo'}
                  </button>
                ) : null}
              </div>
              <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {subjects.map((a) => (
                  <li key={a.id}>
                    <AppLink to={`/asignatura/${a.id}`} className="card card-lift flex h-full items-center gap-3 p-3.5">
                      <AreaTile area={a.areas[0] ?? 'gestion'} />
                      <span className="min-w-0 flex-1">
                        <span className="block leading-snug font-semibold">{a.nombre}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2">
                          <AreaBadge area={a.areas[0] ?? 'gestion'} />
                          {SUBJECTS_WITH_CONTENT.has(a.id) ? (
                            <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[0.7rem] font-semibold text-ok">Temario completo</span>
                          ) : null}
                        </span>
                      </span>
                      <Icon name="chevron-right" size={18} className="text-muted" />
                    </AppLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>

      <div className="mt-10">
        <SourceNote fuente={carrera.fuente} />
      </div>
    </div>
  );
}
