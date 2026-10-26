import type { ReactNode } from 'react';
import { materias, resolveFuente } from '../../data/content';
import type { ToolInfo } from '../../domain/tools/catalog';
import { useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, PageHeader } from '../../ui/primitives';
import { TOOL_ICON } from '../../ui/tool-icons';

/** Common frame of every study tool: what it does, which subjects use it and how its numbers are obtained. */
export function ToolLayout({
  tool,
  metodo,
  aviso,
  children,
}: {
  tool: ToolInfo;
  metodo: ReactNode;
  aviso?: ReactNode;
  children: ReactNode;
}) {
  useDocumentTitle(tool.nombre);
  const related = materias.filter((m) => m.herramientas.includes(tool.id));
  return (
    <div className="space-y-8">
      <PageHeader
        back={{ to: '/herramientas', label: 'Herramientas' }}
        eyebrow={tool.enLinea ? 'Herramienta · necesita conexión' : 'Herramienta · funciona sin conexión'}
        title={
          <span className="flex items-center gap-4">
            <span className="tile shrink-0">
              <Icon name={TOOL_ICON[tool.id]} />
            </span>
            <span>{tool.nombre}</span>
          </span>
        }
        subtitle={tool.descripcion}
      />
      {aviso ? (
        <p
          role="note"
          className="rounded-2xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-ink-2"
        >
          {aviso}
        </p>
      ) : null}
      {children}
      <section aria-labelledby="metodo" className="card space-y-2 p-5 text-sm text-ink-2">
        <h2 id="metodo" className="flex items-center gap-2 text-base font-semibold text-ink">
          <Icon name="book" size={18} className="text-red" /> Cómo calcula y de dónde salen los datos
        </h2>
        <div className="space-y-2 leading-relaxed">{metodo}</div>
        {tool.fuentes.length > 0 ? (
          <ul className="space-y-1 border-t border-line pt-3 text-xs text-muted">
            {tool.fuentes.map((id) => {
              const f = resolveFuente({ ref: id });
              return f ? (
                <li key={id}>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-red"
                  >
                    {f.titulo}
                  </a>{' '}
                  · {f.autor_editor} · {f.licencia}
                </li>
              ) : null;
            })}
          </ul>
        ) : null}
      </section>
      {related.length > 0 ? (
        <nav aria-label="Materias que usan esta herramienta">
          <h2 className="eyebrow mb-2">Se usa en</h2>
          <ul className="flex flex-wrap gap-2">
            {related.map((m) => (
              <li key={m.id}>
                <AppLink to={`/materia/${m.id}`} className="chip min-h-10 hover:border-red hover:text-red">
                  {m.nombre}
                </AppLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

/** Numeric input that accepts decimal comma or point and reports a number (or null when empty/invalid). */
export function NumberField({
  label,
  value,
  onChange,
  suffix,
  min,
  step = 'any',
  hint,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  min?: number;
  step?: string;
  hint?: string;
  id?: string;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 flex items-baseline justify-between gap-2 text-sm font-semibold text-ink-2">
        <span>{label}</span>
        {suffix ? <span className="text-xs font-normal text-muted">{suffix}</span> : null}
      </span>
      <input
        id={id}
        className="field tnum"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint && id ? `${id}-hint` : undefined}
        data-min={min}
        data-step={step}
        maxLength={24}
      />
      {hint ? (
        <span id={id ? `${id}-hint` : undefined} className="mt-1 block text-xs text-muted">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/** Result tile used by the calculators. */
export function Stat({
  label,
  value,
  tone = 'default',
  hint,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'bad';
  hint?: string;
}) {
  const color = tone === 'good' ? 'text-ok' : tone === 'bad' ? 'text-warn' : 'text-ink';
  return (
    <div className="card p-4">
      <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className={`tnum mt-1 font-display text-2xl font-semibold ${color}`}>{value}</dd>
      {hint ? <dd className="mt-1 text-xs text-muted">{hint}</dd> : null}
    </div>
  );
}
