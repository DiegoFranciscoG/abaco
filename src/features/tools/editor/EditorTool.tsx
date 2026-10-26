import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { deleteDocument, listDocuments, saveDocument } from '../../../data/tool-repositories';
import type { Documento } from '../../../data/types';
import type { ToolInfo } from '../../../domain/tools/catalog';
import { MAX_DOCUMENT_LENGTH, parseMarkdown, TEMPLATES, wordCount } from '../../../domain/tools/markdown';
import { Icon } from '../../../ui/icons';
import { Tabs } from '../../../ui/primitives';
import { useToast } from '../../../ui/use-toast';
import { downloadFile } from '../../../ui/utils';
import { ToolLayout } from '../ToolLayout';
import { MarkdownView } from './MarkdownView';

const SNIPPETS: { label: string; aria: string; before: string; after?: string }[] = [
  { label: 'T', aria: 'Título de sección', before: '\n## ' },
  { label: 'N', aria: 'Negrita', before: '**', after: '**' },
  { label: 'K', aria: 'Cursiva', before: '*', after: '*' },
  { label: '•', aria: 'Lista', before: '\n- ' },
  { label: '∑', aria: 'Fórmula en línea', before: '$', after: '$' },
  { label: '∫', aria: 'Fórmula en bloque', before: '\n$$\n', after: '\n$$\n' },
  { label: '▦', aria: 'Tabla', before: '\n| Columna | Valor |\n|---|---:|\n| | |\n' },
];

const fileName = (title: string) =>
  `${
    title
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'documento'
  }.md`;

function Editor({ doc }: { doc: Documento }) {
  const toast = useToast();
  const [titulo, setTitulo] = useState(doc.titulo);
  const [contenido, setContenido] = useState(doc.contenido);
  const [saved, setSaved] = useState(true);
  const [pane, setPane] = useState<'escribir' | 'vista'>('escribir');
  const area = useRef<HTMLTextAreaElement>(null);
  const blocks = useMemo(() => parseMarkdown(contenido), [contenido]);

  useEffect(() => {
    if (saved) return;
    const timer = setTimeout(() => {
      saveDocument({
        id: doc.id,
        titulo,
        contenido,
        ...(doc.materiaId ? { materiaId: doc.materiaId } : {}),
      }).then(
        () => setSaved(true),
        (e: unknown) => toast.error(e),
      );
    }, 700);
    return () => clearTimeout(timer);
  }, [saved, titulo, contenido, doc.id, doc.materiaId, toast]);

  const insert = (before: string, after = '') => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const next = `${contenido.slice(0, s)}${before}${contenido.slice(s, e)}${after}${contenido.slice(e)}`;
    if (next.length > MAX_DOCUMENT_LENGTH) return;
    setContenido(next);
    setSaved(false);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, e + before.length);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="min-w-56 flex-1">
          <span className="sr-only">Título del documento</span>
          <input
            className="field font-display text-lg font-semibold"
            value={titulo}
            maxLength={120}
            onChange={(e) => {
              setTitulo(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <span className="text-xs text-muted" aria-live="polite">
          {saved ? 'Guardado en este dispositivo' : 'Guardando…'} · {wordCount(contenido)} palabras
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => downloadFile(fileName(titulo), contenido, 'text/markdown;charset=utf-8')}
        >
          <Icon name="download" size={18} /> .md
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
          <Icon name="note" size={18} /> Imprimir o PDF
        </button>
      </div>
      <div className="lg:hidden">
        <Tabs
          label="Vista"
          value={pane}
          onChange={setPane}
          tabs={[
            { id: 'escribir', label: 'Escribir' },
            { id: 'vista', label: 'Vista previa' },
          ]}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${pane === 'vista' ? 'hidden lg:block' : ''} space-y-2`}>
          <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Formato">
            {SNIPPETS.map((s) => (
              <button
                key={s.aria}
                type="button"
                className="btn btn-icon btn-ghost min-w-11 font-semibold"
                aria-label={s.aria}
                title={s.aria}
                onClick={() => insert(s.before, s.after)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="sr-only">Contenido del documento</span>
            <textarea
              ref={area}
              className="field min-h-[60dvh] font-mono text-sm leading-relaxed"
              value={contenido}
              spellCheck
              maxLength={MAX_DOCUMENT_LENGTH}
              onChange={(e) => {
                setContenido(e.target.value);
                setSaved(false);
              }}
            />
          </label>
        </div>
        <article
          className={`${pane === 'escribir' ? 'hidden lg:block' : ''} card print-doc min-h-[60dvh] p-6`}
          aria-label="Vista previa"
        >
          <h1 className="mb-4 font-display text-3xl font-semibold">{titulo}</h1>
          <MarkdownView blocks={blocks} />
        </article>
      </div>
    </div>
  );
}

export default function EditorTool({ tool }: { tool: ToolInfo }) {
  const toast = useToast();
  const docs = useLiveQuery(() => listDocuments(), [], undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const current = docs?.find((d) => d.id === selected) ?? docs?.[0];

  const create = async (templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    try {
      const d = await saveDocument({
        titulo: template?.nombre ?? 'Documento sin título',
        contenido: template?.contenido ?? '',
      });
      setSelected(d.id);
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <ToolLayout
      tool={tool}
      metodo={
        <>
          <p>
            Escribes en Markdown (# para títulos, **negrita**, *cursiva*, - para listas, tablas con |) y las
            fórmulas con la notación de LaTeX entre signos de dólar: $x^2$ en línea o $$…$$ en bloque, como en
            los editores de LaTeX. La vista previa usa KaTeX con las funciones peligrosas desactivadas.
          </p>
          <p>
            Lo que escribes nunca se interpreta como código: el texto se muestra tal cual y los enlaces solo
            aceptan direcciones http o https. Los documentos se guardan solo en este dispositivo y entran en
            tu respaldo.
          </p>
        </>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        {docs && docs.length > 0 ? (
          <label className="block min-w-56 flex-1">
            <span className="mb-1 block text-sm font-semibold text-ink-2">Documento</span>
            <select className="field" value={current?.id ?? ''} onChange={(e) => setSelected(e.target.value)}>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.titulo}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-2">Nuevo desde plantilla</span>
          <select className="field" value="" onChange={(e) => e.target.value && void create(e.target.value)}>
            <option value="">Elige…</option>
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
            <option value="vacio">Documento en blanco</option>
          </select>
        </label>
        {current ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              void deleteDocument(current.id).then(() => {
                setSelected(null);
                toast.show('Documento borrado');
              })
            }
          >
            <Icon name="trash" size={18} /> Borrar
          </button>
        ) : null}
      </div>
      {current ? (
        <Editor key={current.id} doc={current} />
      ) : docs ? (
        <div className="card space-y-3 p-6 text-center">
          <p className="font-display text-xl font-semibold">Empieza un documento</p>
          <p className="text-sm text-muted">
            Elige una plantilla: informe académico, resolución de un ejercicio o ensayo breve.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" className="btn btn-soft" onClick={() => void create(t.id)}>
                {t.nombre}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </ToolLayout>
  );
}
