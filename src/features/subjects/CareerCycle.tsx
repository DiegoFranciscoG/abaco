import { useSearchParams } from 'react-router';
import { carreras, materiasDeCiclo } from '../../data/content';
import { updateProfile } from '../../data/repositories';
import type { Perfil } from '../../data/types';
import type { Carrera } from '../../domain/content/schemas';
import { Icon } from '../../ui/icons';
import { AppLink, AreaTile } from '../../ui/primitives';
import { useToast } from '../../ui/use-toast';
import { ordinal, otherCycles, readSelection } from './career-selection';

function CycleSubjects({ carrera, ciclo }: { carrera: Carrera; ciclo: number }) {
  const rows = materiasDeCiclo(carrera, ciclo);
  return (
    <section aria-labelledby={`ciclo-${ciclo}`} className="space-y-3">
      <h3 id={`ciclo-${ciclo}`} className="font-display text-xl font-semibold">
        {ordinal(ciclo)} ciclo
      </h3>
      {rows.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ materia, entrada }) => (
            <li key={materia.id}>
              <AppLink
                to={`/materia/${materia.id}`}
                className="card card-lift flex h-full items-start gap-3 p-4"
              >
                <AreaTile area={materia.areas[0] ?? 'gestion'} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block leading-snug font-semibold">{materia.nombre}</span>
                  <span className="mt-1 block text-xs text-muted">
                    En {entrada.planes} de {carrera.planes}{' '}
                    {carrera.planes === 1 ? 'plan revisado' : 'planes revisados'}
                    {otherCycles(entrada.ciclos, entrada.ciclo)
                      ? ` · ${otherCycles(entrada.ciclos, entrada.ciclo)}`
                      : ''}
                  </span>
                </span>
                <Icon name="chevron-right" size={18} className="mt-0.5 text-muted" />
              </AppLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          Ninguna materia del catálogo suele cursarse en este ciclo. Revisa el ciclo anterior o el siguiente.
        </p>
      )}
    </section>
  );
}

/**
 * Career → cycle → subject: the student picks a generic career and a cycle and sees the catalog subjects usually
 * taken then. The choice is kept in the URL and in the profile on this device; nothing is sent anywhere.
 */
export function CareerCycle({ profile }: { profile: Perfil }) {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const { carrera, ciclo } = readSelection(params, profile);

  const save = (changes: Pick<Perfil, 'carrera' | 'ciclo'>) => {
    updateProfile(changes).catch((error: unknown) => toast.error(error));
  };

  const chooseCareer = (id: string) => {
    const next = carrera?.id === id ? null : id;
    setParams(next ? { carrera: next } : {}, { replace: true });
    save({ carrera: next, ciclo: null });
  };

  const chooseCycle = (value: number | null) => {
    if (!carrera) return;
    setParams(value ? { carrera: carrera.id, ciclo: String(value) } : { carrera: carrera.id }, {
      replace: true,
    });
    save({ carrera: carrera.id, ciclo: value });
  };

  const addCycle = async () => {
    if (!carrera || !ciclo) return;
    const ids = materiasDeCiclo(carrera, ciclo).map((r) => r.materia.id);
    const merged = [...new Set([...profile.materias, ...ids])];
    try {
      await updateProfile({ materias: merged, carrera: carrera.id, ciclo });
      toast.show(`${merged.length - profile.materias.length} materias agregadas a las tuyas`);
    } catch (error) {
      toast.error(error);
    }
  };

  const cycles = carrera ? Array.from({ length: carrera.ciclos }, (_, i) => i + 1) : [];
  const pending =
    carrera && ciclo
      ? materiasDeCiclo(carrera, ciclo).filter((r) => !profile.materias.includes(r.materia.id)).length
      : 0;

  return (
    <section aria-labelledby="por-carrera" className="space-y-5">
      <div>
        <h2 id="por-carrera" className="font-display text-2xl font-semibold">
          Por carrera y ciclo
        </h2>
        <p className="mt-1 text-sm text-muted">
          Elige tu carrera y tu ciclo para ver las materias que se suelen cursar en él.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Carrera">
        {carreras.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={carrera?.id === c.id}
            onClick={() => chooseCareer(c.id)}
            className={`chip min-h-10 ${carrera?.id === c.id ? 'border-red bg-red-soft text-red' : ''}`}
          >
            {c.nombre}
          </button>
        ))}
      </div>

      {carrera ? (
        <div className="card space-y-6 p-5 sm:p-6">
          <div className="space-y-3">
            <p className="text-sm text-ink-2">{carrera.descripcion}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Ciclo">
              <button
                type="button"
                aria-pressed={ciclo === null}
                onClick={() => chooseCycle(null)}
                className={`chip min-h-10 ${ciclo === null ? 'border-red bg-red-soft text-red' : ''}`}
              >
                Todos
              </button>
              {cycles.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={ciclo === c}
                  aria-label={`${ordinal(c)} ciclo`}
                  onClick={() => chooseCycle(c)}
                  className={`chip tnum min-h-10 min-w-10 justify-center ${ciclo === c ? 'border-red bg-red-soft text-red' : ''}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {ciclo ? (
            <CycleSubjects carrera={carrera} ciclo={ciclo} />
          ) : (
            cycles.map((c) => <CycleSubjects key={c} carrera={carrera} ciclo={c} />)
          )}

          {ciclo && pending > 0 ? (
            <button type="button" className="btn btn-soft" onClick={() => void addCycle()}>
              <Icon name="plus" size={18} /> Agregar las de este ciclo a mis materias
            </button>
          ) : null}

          <p className="border-t border-line pt-4 text-xs text-muted">
            Ciclo habitual calculado con {carrera.planes}{' '}
            {carrera.planes === 1 ? 'plan de estudios público' : 'planes de estudio públicos'} de carreras de
            Cuenca revisados el 14 de octubre de 2026 (la mediana del primer ciclo en que aparece la materia).
            Tu universidad puede ubicarla en otro ciclo o con otro nombre; los planes no se publican aquí.
          </p>
        </div>
      ) : null}
    </section>
  );
}
