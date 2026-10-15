import { useMemo, useState } from 'react';
import { carreras, getUniversidad, loadMalla } from '../../data/content';
import type { Malla } from '../../domain/content/schemas';
import { subjectKey } from '../../domain/text/normalize';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { AppLink, PageHeader, Skeleton } from '../../ui/primitives';

function CareerSelect({ id, value, onChange, label }: { id: string; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-2">
        {label}
      </label>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {carreras.map((c) => (
          <option key={c.id} value={c.id}>
            {getUniversidad(c.universidad)?.siglas} · {c.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ComparePage() {
  useDocumentTitle('Comparar mallas');
  const [left, setLeft] = useState('ucuenca-contabilidad-auditoria');
  const [right, setRight] = useState('ucacue-contabilidad-auditoria');
  const data = useAsync(async () => Promise.all([loadMalla(left), loadMalla(right)]), [left, right]);

  const comparison = useMemo(() => {
    if (data.status !== 'ready') return null;
    const [a, b] = data.data as [Malla | undefined, Malla | undefined];
    if (!a || !b) return null;
    const keysA = new Set(a.asignaturas.map((s) => subjectKey(s.nombre)));
    const keysB = new Set(b.asignaturas.map((s) => subjectKey(s.nombre)));
    const shared = [...keysA].filter((k) => keysB.has(k));
    const cycles = Math.max(...a.asignaturas.map((s) => s.ciclo), ...b.asignaturas.map((s) => s.ciclo));
    return { a, b, shared: new Set(shared), cycles };
  }, [data]);

  return (
    <div>
      <PageHeader
        back={{ to: '/carreras', label: 'Mallas' }}
        eyebrow="Comparador"
        title="Dos mallas, lado a lado"
        subtitle="Útil si piensas cambiarte de universidad o pedir convalidación. Se marcan las asignaturas con el mismo nombre; la convalidación real la decide cada universidad."
      />
      <div className="card mb-6 grid gap-4 p-4 sm:grid-cols-2">
        <CareerSelect id="cmp-a" label="Carrera A" value={left} onChange={setLeft} />
        <CareerSelect id="cmp-b" label="Carrera B" value={right} onChange={setRight} />
      </div>
      {!comparison ? (
        <Skeleton lines={5} />
      ) : (
        <>
          <p className="mb-6 text-lg">
            <strong className="tnum font-display text-3xl text-red">{comparison.shared.size}</strong> asignaturas con el mismo nombre en ambas mallas.
          </p>
          <div className="space-y-6">
            {Array.from({ length: comparison.cycles }, (_, i) => i + 1).map((n) => (
              <section key={n} aria-labelledby={`cmp-c${n}`} className="card p-4">
                <h2 id={`cmp-c${n}`} className="mb-3 font-display text-xl font-semibold">
                  Ciclo {n}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[comparison.a, comparison.b].map((malla, side) => (
                    <ul key={side} className="space-y-1.5" aria-label={side === 0 ? 'Carrera A' : 'Carrera B'}>
                      {malla.asignaturas
                        .filter((s) => s.ciclo === n)
                        .map((s) => {
                          const isShared = comparison.shared.has(subjectKey(s.nombre));
                          return (
                            <li key={s.id}>
                              <AppLink
                                to={`/asignatura/${s.id}`}
                                className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                                  isShared ? 'border-red/40 bg-red-tint font-semibold' : 'border-line'
                                }`}
                              >
                                <span>{s.nombre}</span>
                                {isShared ? <span className="shrink-0 text-xs text-red">en ambas</span> : null}
                              </AppLink>
                            </li>
                          );
                        })}
                    </ul>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
