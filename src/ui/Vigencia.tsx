import { resolveFuente } from '../data/content';
import { getCifra } from '../domain/content/normativa';
import type { Cifra } from '../domain/content/schemas';
import { vigenciaStatus } from '../domain/content/vigencia';
import { Icon } from './icons';
import { useToday } from './use-vigencia';
import { formatDate } from './utils';

function SourceLink({ cifra }: { cifra: Cifra }) {
  const fuente = resolveFuente(cifra.fuente);
  if (!fuente) return null;
  return (
    <a
      href={fuente.url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-red"
    >
      {fuente.titulo}
    </a>
  );
}

/**
 * Normative figures (content/normativa.json) used by a record or a tool, each labelled with the fiscal year it was
 * verified for. Once that year is over the label turns into a visible warning: the figure may have changed and has
 * to be checked at its official source before it is used.
 */
export function VigenciaNote({
  cifras,
  today: fixedToday,
  className = '',
}: {
  cifras?: readonly string[];
  /** Only for tests and previews; the view uses the device date. */
  today?: string;
  className?: string;
}) {
  const deviceToday = useToday();
  const today = fixedToday ?? deviceToday;
  const items = (cifras ?? []).map(getCifra).filter((c): c is Cifra => c !== undefined);
  if (items.length === 0) return null;
  const vencidas = items.filter((c) => vigenciaStatus(c.vigencia, today).estado === 'vencida');
  const vigentes = items.filter((c) => !vencidas.includes(c));

  return (
    <div className={`space-y-2 ${className}`}>
      {vencidas.length > 0 ? (
        <div
          role="note"
          aria-label="Cifras por verificar"
          className="rounded-2xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-ink-2"
        >
          <p className="flex items-center gap-2 font-semibold text-ink">
            <Icon name="info" size={16} className="shrink-0 text-warn" /> Cifra por verificar
          </p>
          <ul className="mt-1 space-y-1 leading-relaxed">
            {vencidas.map((c) => (
              <li key={c.id}>
                {c.nombre} ({c.texto}): esta cifra corresponde al ejercicio {c.vigencia.ejercicio_fiscal};
                verifica la vigente en <SourceLink cifra={c} />.
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {vigentes.length > 0 ? (
        <div className="space-y-1.5">
          <ul className="flex flex-wrap gap-2" aria-label="Cifras de la normativa usadas aquí">
            {vigentes.map((c) => (
              <li key={c.id} className="chip min-h-8 gap-2 text-xs">
                <span className="text-ink-2">
                  {c.nombre}: <span className="tnum font-semibold">{c.texto}</span>
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-ok">
                  <Icon name="check" size={13} /> vigente {c.vigencia.ejercicio_fiscal}
                </span>
              </li>
            ))}
          </ul>
          <details className="text-xs text-muted">
            <summary className="inline-flex min-h-6 cursor-pointer items-center hover:text-red">
              Base legal y vigencia
            </summary>
            <ul className="mt-2 space-y-2 leading-relaxed">
              {vigentes.map((c) => (
                <li key={c.id}>
                  <span className="font-semibold text-ink-2">{c.nombre}.</span> {c.base_legal} Vigente del{' '}
                  {formatDate(c.vigencia.desde)} al {formatDate(c.vigencia.hasta)}; verificada el{' '}
                  {formatDate(c.verificado_en)} en <SourceLink cifra={c} />. {c.cambia}
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : null}
    </div>
  );
}
