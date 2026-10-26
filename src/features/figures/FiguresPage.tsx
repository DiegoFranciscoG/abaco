import { resolveFuente } from '../../data/content';
import { INDICADORES, mayBeOutdated, periodLabel } from '../../domain/content/indicadores';
import { NORMATIVA } from '../../domain/content/normativa';
import type { Cifra, Indicador } from '../../domain/content/schemas';
import { vigenciaStatus } from '../../domain/content/vigencia';
import { num } from '../tools/format';
import { useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { CopyButton, PageHeader } from '../../ui/primitives';
import { useToday } from '../../ui/use-vigencia';
import { useToast } from '../../ui/use-toast';
import { downloadFile, formatDate } from '../../ui/utils';
import { imageFileName, renderFigureImage, type FigureCard } from './share-image';

const SECTIONS: { titulo: string; categorias: Cifra['categoria'][] }[] = [
  { titulo: 'Trabajo y seguridad social', categorias: ['laboral', 'seguridad-social'] },
  { titulo: 'Impuestos', categorias: ['tributario'] },
  { titulo: 'Compañías', categorias: ['societario'] },
];

const pct = (n: number) => `${num(n)} %`;

function ShareImageButton({ card }: { card: FigureCard }) {
  const toast = useToast();
  const share = async () => {
    try {
      const blob = await renderFigureImage(card);
      const name = imageFileName(card.titulo);
      const file = new File([blob], name, { type: 'image/png' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: card.titulo });
      } else {
        downloadFile(name, blob, 'image/png');
        toast.show('Imagen descargada: compártela en tu grupo de estudio.');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') toast.show((error as Error).message, 'error');
    }
  };
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={() => void share()}
      aria-label={`Compartir como imagen: ${card.titulo}`}
    >
      <Icon name="upload" size={18} /> <span>Imagen</span>
    </button>
  );
}

function SourceLine({ fuente }: { fuente: Cifra['fuente'] }) {
  const f = resolveFuente(fuente);
  if (!f) return null;
  return (
    <p className="text-xs leading-relaxed text-muted">
      Fuente:{' '}
      <a
        href={f.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-red"
      >
        {f.titulo}
      </a>{' '}
      · consultada el {formatDate(f.fecha_consulta)}
    </p>
  );
}

function Rows({ cifra }: { cifra: Cifra }) {
  if (cifra.tramos) {
    return (
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={cifra.nombre}>
        <table className="tnum w-full text-left text-xs">
          <thead className="text-muted">
            <tr>
              <th scope="col" className="py-1 pr-2 font-semibold">
                Desde
              </th>
              <th scope="col" className="py-1 pr-2 font-semibold">
                Hasta
              </th>
              <th scope="col" className="py-1 pr-2 font-semibold">
                Impuesto fracción básica
              </th>
              <th scope="col" className="py-1 font-semibold">
                % excedente
              </th>
            </tr>
          </thead>
          <tbody>
            {cifra.tramos.map((t) => (
              <tr key={t.desde} className="border-t border-line">
                <td className="py-1 pr-2">{num(t.desde, 2)}</td>
                <td className="py-1 pr-2">{t.hasta === null ? 'en adelante' : num(t.hasta, 2)}</td>
                <td className="py-1 pr-2">{num(t.impuesto_fraccion, 2)}</td>
                <td className="py-1">{pct(t.porcentaje)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (cifra.cuotas) {
    return (
      <ul className="tnum space-y-0.5 text-xs text-ink-2">
        {cifra.cuotas.map((c) => (
          <li key={c.desde}>
            Ingresos de USD {num(c.desde, 2)} a {num(c.hasta, 2)}: cuota de USD {num(c.cuota, 2)} al año
          </li>
        ))}
      </ul>
    );
  }
  if (cifra.filas) {
    return (
      <ul className="space-y-1 text-xs text-ink-2">
        {cifra.filas.map((f) => (
          <li key={f.valor} className="flex gap-2">
            <span className="tnum w-12 shrink-0 font-semibold text-ink">{pct(f.valor)}</span>
            <span>{f.concepto}</span>
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

function NormativeCard({ cifra, today }: { cifra: Cifra; today: string }) {
  const { estado } = vigenciaStatus(cifra.vigencia, today);
  const year = cifra.vigencia.ejercicio_fiscal;
  const fuente = resolveFuente(cifra.fuente);
  const copyText = `${cifra.nombre} (${year}): ${cifra.texto}. ${cifra.base_legal} Fuente: ${fuente?.url ?? ''} · Visto en ÁBACO.`;
  return (
    <article className="card flex flex-col gap-3 p-5" aria-labelledby={`cifra-${cifra.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={`cifra-${cifra.id}`} className="font-semibold text-ink">
          {cifra.nombre}
        </h3>
        {estado === 'vencida' ? (
          <span className="rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn">
            Ejercicio {year}: verifica la vigente
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok">
            <Icon name="check" size={13} /> vigente {year}
          </span>
        )}
      </div>
      <p className="tnum font-display text-2xl leading-tight font-semibold text-red">{cifra.texto}</p>
      <p className="text-sm leading-relaxed text-muted">{cifra.descripcion}</p>
      <Rows cifra={cifra} />
      <p className="text-xs leading-relaxed text-ink-2">{cifra.base_legal}</p>
      <SourceLine fuente={cifra.fuente} />
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <CopyButton text={copyText} label="Copiar" />
        <ShareImageButton
          card={{
            titulo: cifra.nombre,
            valor: cifra.texto,
            vigencia:
              estado === 'vencida' ? `Ejercicio ${year}: verifica la cifra vigente` : `Vigente en ${year}`,
            fuente: cifra.base_legal,
          }}
        />
      </div>
    </article>
  );
}

function IndicatorCard({ indicador, today }: { indicador: Indicador; today: string }) {
  const fuente = resolveFuente(indicador.fuente);
  const period = periodLabel(indicador.periodo);
  const outdated = mayBeOutdated(indicador, today);
  const copyText = `${indicador.nombre} (${period}): ${indicador.texto}. Fuente: ${fuente?.titulo ?? ''} ${fuente?.url ?? ''} · Visto en ÁBACO.`;
  return (
    <article className="card flex flex-col gap-3 p-5" aria-labelledby={`indicador-${indicador.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={`indicador-${indicador.id}`} className="font-semibold text-ink">
          {indicador.nombre}
        </h3>
        <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink-2">
          Dato de {period}
        </span>
      </div>
      <p className="tnum font-display text-2xl leading-tight font-semibold text-red">{indicador.texto}</p>
      <p className="text-sm leading-relaxed text-muted">{indicador.descripcion}</p>
      {outdated ? (
        <p role="note" className="rounded-xl bg-warn-soft px-3 py-2 text-xs text-ink-2">
          Puede haber un dato más reciente: revisa la fuente antes de usarlo.
        </p>
      ) : null}
      <SourceLine fuente={indicador.fuente} />
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <CopyButton text={copyText} label="Copiar" />
        <ShareImageButton
          card={{
            titulo: indicador.nombre,
            valor: indicador.texto,
            vigencia: `Dato de ${period}`,
            fuente: `${fuente?.autor_editor ?? ''}, ${fuente?.titulo ?? ''}`,
          }}
        />
      </div>
    </article>
  );
}

export default function FiguresPage() {
  useDocumentTitle('Ecuador en cifras');
  const today = useToday();
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Ecuador"
        title="Ecuador en cifras"
        subtitle="Las cifras que más se usan en los deberes, cada una con su fuente oficial, su fecha y su vigencia. Cópialas con su fuente o compártelas como imagen en tu grupo de estudio."
      />
      {SECTIONS.map((section) => {
        const items = NORMATIVA.filter((c) => section.categorias.includes(c.categoria));
        return (
          <section key={section.titulo} aria-labelledby={`sec-${section.titulo}`} className="space-y-4">
            <h2 id={`sec-${section.titulo}`} className="font-display text-2xl font-semibold">
              {section.titulo}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((c) => (
                <NormativeCard key={c.id} cifra={c} today={today} />
              ))}
            </div>
          </section>
        );
      })}
      <section aria-labelledby="sec-indicadores" className="space-y-4">
        <div>
          <h2 id="sec-indicadores" className="font-display text-2xl font-semibold">
            Precios y tasas de interés
          </h2>
          <p className="mt-1 text-sm text-muted">
            Datos que el INEC y el Banco Central publican cada mes. Cada uno indica el mes al que corresponde.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {INDICADORES.map((i) => (
            <IndicatorCard key={i.id} indicador={i} today={today} />
          ))}
        </div>
      </section>
    </div>
  );
}
