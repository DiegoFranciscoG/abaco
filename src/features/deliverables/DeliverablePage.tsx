import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { NotFoundPage } from '../../app/Fallbacks';
import { getDb } from '../../data/db';
import { countUsage, saveEntregable } from '../../data/everyday-repositories';
import type { Entregable } from '../../data/types';
import { getDeliverable, type DeliverableInfo } from '../../domain/deliverables/catalog';
import { DEFINITIONS } from '../../domain/deliverables/registry';
import {
  DeliverableError,
  type DeliverableDefinition,
  type DeliverableResult,
} from '../../domain/deliverables/types';
import { useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { CopyButton, Notice, PageHeader, Skeleton, SourceNote } from '../../ui/primitives';
import { useToast } from '../../ui/use-toast';
import { downloadFile, XLSX_TYPE } from '../../ui/utils';
import { VigenciaNote } from '../../ui/Vigencia';
import { FORMS } from './form-registry';
import { procedureText } from './result-format';
import { ResultView } from './ResultView';

/** The name the student gave to this work (each deliverable has a title-like first field). */
function titleOf(input: unknown, fallback: string): string {
  const o = (input ?? {}) as Record<string, unknown>;
  for (const key of ['titulo', 'activo', 'producto', 'proyecto', 'empresa']) {
    const v = o[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return fallback;
}

function evaluate(
  def: DeliverableDefinition<unknown>,
  input: unknown,
): { ok: true; parsed: unknown; result: DeliverableResult } | { ok: false; errores: string[] } {
  let parsed: unknown;
  try {
    parsed = def.parse(input);
  } catch {
    return { ok: false, errores: ['Revisa los campos: hay un valor vacío o que no es un número.'] };
  }
  try {
    return { ok: true, parsed, result: def.compute(parsed) };
  } catch (error) {
    if (error instanceof DeliverableError) return { ok: false, errores: error.errores };
    return { ok: false, errores: ['No se pudo calcular con estos datos. Revísalos.'] };
  }
}

function Editor({
  info,
  def,
  initial,
  saved,
}: {
  info: DeliverableInfo;
  def: DeliverableDefinition<unknown>;
  initial: unknown;
  saved: Entregable | null;
}) {
  const toast = useToast();
  const [input, setInput] = useState<unknown>(initial);
  const [formKey, setFormKey] = useState(0);
  const [savedId, setSavedId] = useState(saved?.id);
  const counted = useRef(false);
  const Form = FORMS[info.id]!;
  const state = evaluate(def, input);

  const markUsed = () => {
    if (counted.current) return;
    counted.current = true;
    void countUsage('entregable');
  };

  const loadExample = () => {
    setInput(def.ejemplo);
    setFormKey((k) => k + 1);
  };

  const download = async () => {
    if (!state.ok) return;
    try {
      const sheet = def.toSheet(state.parsed, state.result);
      // The spreadsheet library is only downloaded when a student exports.
      const { exportXlsx } = await import('../../domain/sheet/xlsx');
      const bytes = exportXlsx(sheet.cells, sheet.formats, 'en', info.nombre);
      downloadFile(`abaco-${info.id}.xlsx`, bytes as BlobPart, XLSX_TYPE);
      markUsed();
      void countUsage('exportacion');
      toast.show('Excel descargado, con las fórmulas vivas.');
    } catch {
      toast.show('No se pudo crear el Excel con estos datos.', 'error');
    }
  };

  const print = () => {
    markUsed();
    void countUsage('exportacion');
    window.print();
  };

  const save = async () => {
    try {
      const row = await saveEntregable({
        ...(savedId ? { id: savedId } : {}),
        tipo: info.id,
        titulo: titleOf(input, info.nombre),
        entradas: input as Record<string, unknown>,
      });
      setSavedId(row.id);
      markUsed();
      toast.show('Guardado en este dispositivo: lo encuentras en Entregables.');
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <div className="space-y-8">
      <section aria-labelledby="datos" className="card space-y-4 p-5 print-hide">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="datos" className="font-display text-xl font-semibold">
            Datos de tu ejercicio
          </h2>
          <button type="button" className="btn btn-ghost" onClick={loadExample}>
            Cargar el ejemplo
          </button>
        </div>
        <Form key={formKey} value={input} onChange={setInput} />
      </section>

      {state.ok ? (
        <>
          <div className="flex flex-wrap gap-2 print-hide" role="group" aria-label="Exportar y guardar">
            <button type="button" className="btn btn-primary" onClick={() => void download()}>
              <Icon name="download" size={18} /> Excel (.xlsx)
            </button>
            <button type="button" className="btn btn-ghost" onClick={print}>
              <Icon name="note" size={18} /> PDF o imprimir
            </button>
            <CopyButton
              text={procedureText(`${info.nombre}: ${titleOf(input, '')}`, state.result)}
              label="Copiar procedimiento"
            />
            <button type="button" className="btn btn-ghost" onClick={() => void save()}>
              <Icon name="folder" size={18} /> {savedId ? 'Guardar cambios' : 'Guardar'}
            </button>
          </div>
          <div className="print-doc space-y-6">
            <h2 className="hidden font-display text-2xl font-semibold print:block">
              {info.nombre} · {titleOf(input, '')}
            </h2>
            <ResultView result={state.result} />
          </div>
        </>
      ) : (
        <div role="status" className="card border-warn/40 bg-warn-soft p-5 text-sm text-ink-2">
          <p className="font-semibold text-ink">Revisa estos datos</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {state.errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3 print-hide">
        <VigenciaNote cifras={def.cifras} />
        {def.fuentes.map((ref) => (
          <SourceNote key={ref} fuente={{ ref }} />
        ))}
        <Notice>
          El procedimiento y el Excel salen de las mismas cuentas: cada paso se recalcula en las pruebas de
          ÁBACO. Revisa que los datos sean los de tu enunciado y las reglas de redondeo que pida tu docente.
        </Notice>
      </div>
    </div>
  );
}

function Workbench({
  info,
  def,
  savedId,
}: {
  info: DeliverableInfo;
  def: DeliverableDefinition<unknown>;
  savedId: string | null;
}) {
  const saved = useLiveQuery(
    async () => (savedId ? ((await getDb().entregables.get(savedId)) ?? null) : null),
    [savedId],
  );
  if (savedId && saved === undefined) return <Skeleton lines={6} />;
  let initial: unknown = def.ejemplo;
  let broken = false;
  if (saved && saved.tipo === info.id) {
    try {
      initial = def.parse(saved.entradas);
    } catch {
      broken = true;
    }
  }
  return (
    <>
      {broken ? (
        <Notice tone="warn">No se pudo abrir el trabajo guardado; se cargó el ejemplo.</Notice>
      ) : null}
      <Editor info={info} def={def} initial={initial} saved={saved && !broken ? saved : null} />
    </>
  );
}

export default function DeliverablePage() {
  const { entregableId = '' } = useParams();
  const [params] = useSearchParams();
  const info = getDeliverable(entregableId);
  const def = DEFINITIONS[entregableId];
  useDocumentTitle(info?.nombre ?? 'Entregable');
  if (!info || !def) return <NotFoundPage />;
  const savedId = params.get('guardado');
  return (
    <div className="space-y-8">
      <PageHeader
        back={{ to: '/entregables', label: 'Entregables' }}
        eyebrow="Entregable paso a paso"
        title={info.nombre}
        subtitle={info.descripcion}
      />
      <Workbench key={`${info.id}|${savedId ?? ''}`} info={info} def={def} savedId={savedId} />
    </div>
  );
}
