import type { DeliverableResult } from '../../domain/deliverables/types';
import { Icon } from '../../ui/icons';
import { Notice } from '../../ui/primitives';
import { formatValue } from './result-format';

export function ResultView({ result }: { result: DeliverableResult }) {
  return (
    <div className="space-y-6">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {result.resumen.map((s) => (
          <div key={s.etiqueta} className={`card p-4 ${s.destacado ? 'border-red' : ''}`}>
            <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{s.etiqueta}</dt>
            <dd
              className={`tnum mt-1 font-display text-2xl font-semibold ${s.destacado ? 'text-red' : 'text-ink'}`}
            >
              {formatValue(s.valor, s.formato)}
            </dd>
          </div>
        ))}
      </dl>

      {result.advertencias.length > 0 ? (
        <div className="space-y-2">
          {result.advertencias.map((a) => (
            <Notice key={a} tone="warn">
              {a}
            </Notice>
          ))}
        </div>
      ) : null}

      <section aria-labelledby="procedimiento" className="card space-y-3 p-5">
        <h2 id="procedimiento" className="flex items-center gap-2 font-display text-xl font-semibold">
          <Icon name="formula" size={20} className="text-red" /> Procedimiento paso a paso
        </h2>
        <ol className="space-y-3">
          {result.pasos.map((p, i) => (
            <li key={`${p.titulo}-${i}`} className="flex gap-3">
              <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-soft text-sm font-bold text-red">
                {i + 1}
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block text-sm font-semibold text-ink">{p.titulo}</span>
                <span className="tnum block text-sm break-words text-ink-2">{p.expresion}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {result.tablas.map((t) => (
        <section key={t.id} aria-label={t.titulo} className="card overflow-hidden">
          <h2 className="px-5 pt-4 font-display text-lg font-semibold">{t.titulo}</h2>
          <div className="overflow-x-auto p-3" tabIndex={0} role="region" aria-label={`Tabla: ${t.titulo}`}>
            <table className="tnum w-full min-w-max text-left text-sm">
              <thead className="border-b border-line text-xs text-muted uppercase">
                <tr>
                  {t.columnas.map((c) => (
                    <th
                      key={c.titulo}
                      scope="col"
                      className={`px-2 py-2 ${c.formato === 'text' ? '' : 'text-right'}`}
                    >
                      {c.titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.filas.map((row, r) => (
                  <tr key={r} className="border-b border-line last:border-0">
                    {row.map((cell, c) => (
                      <td
                        key={c}
                        className={`px-2 py-1.5 whitespace-pre ${t.columnas[c]?.formato === 'text' ? '' : 'text-right'}`}
                      >
                        {formatValue(cell, t.columnas[c]?.formato ?? 'text')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {t.total ? (
                <tfoot className="border-t-2 border-line-strong font-semibold">
                  <tr>
                    {t.total.map((cell, c) => (
                      <td
                        key={c}
                        className={`px-2 py-2 ${t.columnas[c]?.formato === 'text' ? '' : 'text-right'}`}
                      >
                        {formatValue(cell, t.columnas[c]?.formato ?? 'text')}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </section>
      ))}

      {result.interpretacion.length > 0 ? (
        <section aria-labelledby="lectura" className="card space-y-2 p-5">
          <h2 id="lectura" className="font-display text-xl font-semibold">
            Cómo se lee el resultado
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
            {result.interpretacion.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
