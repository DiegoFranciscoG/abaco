import { useState } from 'react';
import { formatApa } from '../../../domain/academic/apa';
import { crossrefWorkUrl, normalizeDoi, parseCrossrefWork, safeUrl } from '../../../domain/academic/sources';
import type { AcademicResult } from '../../../domain/academic/types';
import type { ToolInfo } from '../../../domain/tools/catalog';
import { useOnline } from '../../../ui/hooks';
import { Icon } from '../../../ui/icons';
import { CopyButton, Notice, Tabs } from '../../../ui/primitives';
import { ToolLayout } from '../ToolLayout';

type Kind = 'doi' | 'libro' | 'articulo' | 'web';

function Citation({ result }: { result: AcademicResult }) {
  const c = formatApa(result);
  return (
    <div className="card space-y-3 p-5" aria-live="polite">
      <p className="leading-relaxed">
        {c.parts.before}
        <em>{c.parts.italic}</em>
        {c.parts.after}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted">Revisa nombres y mayúsculas: los datos pueden venir incompletos de la fuente.</span>
        <CopyButton text={c.text} label="Copiar referencia" />
      </div>
    </div>
  );
}

const authorsFrom = (text: string) =>
  text
    .split(/;|\n/)
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 20)
    // "Apellido, Nombre" is a person; a name without a comma is kept whole (an organization as author).
    .map((name) => (name.includes(',') ? { full: name } : { family: name }));

export default function CitationsTool({ tool }: { tool: ToolInfo }) {
  const online = useOnline();
  const [kind, setKind] = useState<Kind>('doi');
  const [doi, setDoi] = useState('');
  const [found, setFound] = useState<AcademicResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [f, setF] = useState({ autores: '', anio: '', titulo: '', fuente: '', volumen: '', numero: '', paginas: '', url: '' });
  const set = (key: keyof typeof f) => (e: { target: { value: string } }) => setF((prev) => ({ ...prev, [key]: e.target.value }));

  const lookup = async () => {
    const clean = normalizeDoi(doi);
    if (!clean) {
      setStatus('error');
      setMessage('Eso no parece un DOI. Un DOI empieza con «10.» (por ejemplo 10.1016/j.ejor.2020.01.001).');
      return;
    }
    setStatus('loading');
    try {
      const response = await fetch(crossrefWorkUrl(clean), { credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (response.status === 404) throw new Error('Crossref no tiene ese DOI. Revisa que esté bien escrito.');
      if (!response.ok) throw new Error(`Crossref respondió con un error (${response.status}).`);
      const result = parseCrossrefWork(await response.json());
      if (!result) throw new Error('Crossref devolvió el registro sin título.');
      setFound(result);
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof TypeError ? 'No se pudo conectar con Crossref. Revisa tu conexión.' : (e as Error).message);
    }
  };

  const year = Number.parseInt(f.anio, 10);
  const manual: AcademicResult | null =
    f.titulo.trim() && kind !== 'doi'
      ? {
          id: 'manual',
          source: 'crossref',
          title: f.titulo.trim().slice(0, 400),
          authors: authorsFrom(f.autores),
          ...(Number.isInteger(year) && year > 1500 && year < 2200 ? { year } : {}),
          ...(kind === 'articulo' ? { container: f.fuente.trim(), volume: f.volumen.trim() || undefined, issue: f.numero.trim() || undefined, pages: f.paginas.trim() || undefined } : {}),
          ...(kind === 'libro' ? { publisher: f.fuente.trim() || undefined } : {}),
          ...(kind === 'web' ? { container: f.fuente.trim() || undefined } : {}),
          url: safeUrl(f.url.trim()) ?? '',
          type: kind === 'libro' ? 'book' : kind === 'web' ? 'webpage' : 'journal-article',
          language: 'es',
        }
      : null;

  return (
    <ToolLayout
      tool={tool}
      metodo={
        <>
          <p>Formato APA 7.ª edición, como lo resume la sección «APA Documentation and Format» de la Writing Guide with Handbook de OpenStax: autor con apellido e iniciales, año entre paréntesis, título y fuente; DOI o URL al final.</p>
          <p>Con un DOI, los datos se piden a Crossref (solo se envía el DOI). Los nombres compuestos en español se separan con una regla aproximada: revisa siempre el resultado antes de entregarlo.</p>
        </>
      }
    >
      <Tabs<Kind>
        label="Tipo de fuente"
        value={kind}
        onChange={setKind}
        tabs={[
          { id: 'doi', label: 'Desde un DOI' },
          { id: 'articulo', label: 'Artículo' },
          { id: 'libro', label: 'Libro' },
          { id: 'web', label: 'Página web' },
        ]}
      />
      {kind === 'doi' ? (
        <div className="space-y-4">
          {!online ? <Notice tone="warn">Sin conexión no se puede consultar el DOI; usa el formulario manual.</Notice> : null}
          <form
            className="card flex flex-wrap items-end gap-3 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void lookup();
            }}
          >
            <label className="block min-w-64 flex-1" htmlFor="ct-doi">
              <span className="mb-1 block text-sm font-semibold text-ink-2">DOI o enlace doi.org</span>
              <input id="ct-doi" className="field font-mono" value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="10.xxxx/…" maxLength={300} autoComplete="off" />
            </label>
            <button type="submit" className="btn btn-primary" disabled={status === 'loading'}>
              <Icon name="search" size={18} /> {status === 'loading' ? 'Buscando…' : 'Buscar'}
            </button>
          </form>
          {status === 'error' ? <Notice tone="warn">{message}</Notice> : null}
          {found ? <Citation result={found} /> : null}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="card space-y-3 p-5">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-2">Autores: «Apellido, Nombre», uno por línea (sin coma = organización)</span>
              <textarea className="field min-h-20" value={f.autores} onChange={set('autores')} placeholder={'Pérez Gómez, Ana\nOrganización Mundial del Comercio'} maxLength={2000} />
            </label>
            <div className="grid grid-cols-[6rem_1fr] gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-2">Año</span>
                <input className="field tnum" inputMode="numeric" value={f.anio} onChange={set('anio')} maxLength={4} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-2">Título</span>
                <input className="field" value={f.titulo} onChange={set('titulo')} maxLength={400} />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-2">{kind === 'libro' ? 'Editorial' : kind === 'web' ? 'Nombre del sitio' : 'Revista'}</span>
              <input className="field" value={f.fuente} onChange={set('fuente')} maxLength={300} />
            </label>
            {kind === 'articulo' ? (
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-ink-2">Volumen</span>
                  <input className="field" value={f.volumen} onChange={set('volumen')} maxLength={20} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-ink-2">Número</span>
                  <input className="field" value={f.numero} onChange={set('numero')} maxLength={20} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-ink-2">Páginas</span>
                  <input className="field" value={f.paginas} onChange={set('paginas')} maxLength={20} />
                </label>
              </div>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-2">Enlace (https://)</span>
              <input className="field" type="url" value={f.url} onChange={set('url')} maxLength={1000} />
            </label>
          </div>
          <div>{manual ? <Citation result={manual} /> : <p className="text-sm text-muted">Escribe al menos el título para ver la referencia.</p>}</div>
        </div>
      )}
    </ToolLayout>
  );
}
