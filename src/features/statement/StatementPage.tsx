import { useState } from 'react';
import { getMateria } from '../../data/content';
import { countUsage } from '../../data/everyday-repositories';
import {
  createMatcher,
  type ConceptMatch,
  type StatementCatalog,
  type StatementMatch,
} from '../../domain/statement/match';
import { getTool } from '../../domain/tools/catalog';
import catalogJson from '../../generated/enunciados.json';
import { useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, Notice, PageHeader } from '../../ui/primitives';
import { getDeliverable } from '../../domain/deliverables/catalog';

const catalog = catalogJson as unknown as StatementCatalog;
const matchStatement = createMatcher(catalog);

const EXAMPLE =
  'Un banco le presta a una estudiante $6.000 a 18 meses con una tasa del 16 % anual. Elabore la tabla de pagos del préstamo con cuotas fijas.';

function Option({ option, main }: { option: ConceptMatch; main: boolean }) {
  const { concepto, subtema, principal, frases } = option;
  const materia = subtema ? getMateria(subtema.materia) : undefined;
  const tools = concepto.herramientas.map(getTool).filter((t) => t !== undefined);
  const deliverables = concepto.entregables.map(getDeliverable).filter((d) => d !== undefined);
  return (
    <article className={`card space-y-3 p-5 ${main ? '' : 'bg-surface'}`}>
      <h3 className="font-display text-xl font-semibold">{concepto.nombre}</h3>
      {frases.length > 0 ? (
        <p className="text-sm text-muted">
          Encontré en tu enunciado:{' '}
          {frases.slice(0, 4).map((f, i) => (
            <span key={f}>
              {i > 0 ? ', ' : ''}«{f.replace(/\*/g, '…')}»
            </span>
          ))}
          .
        </p>
      ) : (
        <p className="text-sm text-muted">Coinciden palabras de tu enunciado con este tema.</p>
      )}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {subtema ? (
          <div>
            <dt className="eyebrow mb-1">Tema para estudiar</dt>
            <dd>
              <AppLink to={subtema.ruta} className="link-red font-semibold">
                {subtema.nombre}
              </AppLink>
              {materia ? <span className="block text-xs text-muted">{materia.nombre}</span> : null}
              {principal ? (
                <span className="mt-1 block text-xs text-muted">
                  También:{' '}
                  <AppLink to={principal.ruta} className="link-red">
                    {principal.nombre}
                  </AppLink>{' '}
                  ({getMateria(principal.materia)?.nombre ?? principal.materia})
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}
        {deliverables.length > 0 ? (
          <div>
            <dt className="eyebrow mb-1">Resuélvelo paso a paso</dt>
            <dd className="flex flex-wrap gap-2">
              {deliverables.map((d) => (
                <AppLink
                  key={d.id}
                  to={`/entregables/${d.id}`}
                  className="chip min-h-10 hover:border-red hover:text-red"
                >
                  <Icon name="ledger" size={15} /> {d.nombre}
                </AppLink>
              ))}
            </dd>
          </div>
        ) : null}
        {concepto.formulas.length > 0 ? (
          <div>
            <dt className="eyebrow mb-1">Fórmulas</dt>
            <dd className="flex flex-wrap gap-2">
              {concepto.formulas.slice(0, 5).map((id) => (
                <AppLink
                  key={id}
                  to={`/formulas/${id}`}
                  className="chip min-h-10 hover:border-red hover:text-red"
                >
                  <Icon name="formula" size={15} /> {catalog.formulas[id] ?? id}
                </AppLink>
              ))}
            </dd>
          </div>
        ) : null}
        {tools.length > 0 ? (
          <div>
            <dt className="eyebrow mb-1">Herramientas</dt>
            <dd className="flex flex-wrap gap-2">
              {tools.map((t) => (
                <AppLink key={t.id} to={t.ruta} className="chip min-h-10 hover:border-red hover:text-red">
                  <Icon name="tools" size={15} /> {t.nombre}
                </AppLink>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

function Result({ result }: { result: StatementMatch }) {
  if (result.muyCorto) {
    return (
      <Notice tone="warn">
        Pega el enunciado completo: con tan pocas palabras no puedo saber de qué tema se trata.
      </Notice>
    );
  }
  if (result.confianza === 'baja') {
    return (
      <div className="card space-y-2 p-5">
        <h2 className="font-display text-xl font-semibold">No estoy seguro de qué tema es</h2>
        <p className="text-sm leading-relaxed text-muted">
          Prefiero decírtelo antes que adivinar. Si conoces el nombre del tema o de la fórmula, búscalo en{' '}
          <AppLink to="/materias" className="link-red">
            Materias
          </AppLink>{' '}
          o en{' '}
          <AppLink to="/formulas" className="link-red">
            Fórmulas
          </AppLink>
          . También puedes pegar un enunciado más completo, con los datos y lo que te piden calcular.
        </p>
      </div>
    );
  }
  const [main, ...rest] = result.opciones;
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-semibold">
        {result.confianza === 'alta' ? 'Es un ejercicio de este tema' : 'Probablemente es uno de estos temas'}
      </h2>
      {result.confianza === 'media' ? (
        <p className="text-sm text-muted">
          No hay una sola respuesta clara: revisa cuál se parece más a lo que te piden.
        </p>
      ) : null}
      {main ? <Option option={main} main /> : null}
      {rest.map((o) => (
        <Option key={o.concepto.id} option={o} main={false} />
      ))}
    </div>
  );
}

export default function StatementPage() {
  useDocumentTitle('Pega tu enunciado');
  const [text, setText] = useState('');
  const [result, setResult] = useState<StatementMatch | null>(null);

  const analyze = (value = text) => {
    setResult(matchStatement(value));
    void countUsage('enunciado');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Para tu deber"
        title="Pega tu enunciado"
        subtitle="Pega el texto de tu tarea y ÁBACO te dice qué tema, qué fórmula y qué herramienta aplican. No usa inteligencia artificial: compara tus palabras con un diccionario de cómo se piden las tareas, y si no está seguro te lo dice."
      />
      <form
        className="card space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          analyze();
        }}
      >
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-2">Enunciado de tu deber</span>
          <textarea
            className="field min-h-36"
            value={text}
            maxLength={3000}
            placeholder="Por ejemplo: Elabore la tabla de amortización de un préstamo de $10.000 a 12 meses…"
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={text.trim().length === 0}>
            <Icon name="search" size={18} /> ¿Qué tema es?
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setText(EXAMPLE);
              analyze(EXAMPLE);
            }}
          >
            Probar con un ejemplo
          </button>
          <span className="text-xs text-muted">
            El texto se analiza en tu dispositivo y no se envía a ningún lado.
          </span>
        </div>
      </form>
      <div aria-live="polite">{result ? <Result result={result} /> : null}</div>
    </div>
  );
}
