import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { loadEjercicios, loadFormulas, loadPlantillas } from '../../data/content';
import { getDb } from '../../data/db';
import { saveSheet } from '../../data/repositories';
import type { Hoja } from '../../data/types';
import { CELL_FORMATS, type CellFormat, type Ejercicio, type Plantilla } from '../../domain/content/schemas';
import { isClose, type Locale } from '../../domain/formula';
import { computeSheet, validateCells } from '../../domain/sheet/sheet';
import { useDocumentTitle } from '../../ui/hooks';
import { useProfile } from '../../ui/use-profile';
import { Icon } from '../../ui/icons';
import { AppLink, Notice, Skeleton } from '../../ui/primitives';
import { downloadFile } from '../../ui/utils';
import { useToast } from '../../ui/use-toast';
import { convertCells, formulaToCells, templateToCells } from './convert';
import { Grid } from './Grid';

const FORMAT_LABEL: Record<CellFormat, string> = {
  general: 'General',
  numero: 'Número',
  moneda: 'Moneda',
  porcentaje: 'Porcentaje',
  entero: 'Entero',
};

/** Creates the sheet requested by /laboratorio/nueva (blank, template or formula example) and redirects. */
function NewSheet() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const profile = useProfile();
  const toast = useToast();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const locale = profile.sintaxisExcel;
      let draft: Omit<Hoja, 'id' | 'creadoEn' | 'actualizadoEn'> = {
        nombre: 'Hoja sin título',
        celdas: {},
        formatos: {},
        sintaxis: locale,
      };
      const templateId = params.get('plantilla');
      const formulaId = params.get('formula');
      if (templateId) {
        const template = (await loadPlantillas()).find((p) => p.id === templateId);
        if (template)
          draft = {
            nombre: template.nombre,
            plantillaId: template.id,
            celdas: templateToCells(template, locale),
            formatos: template.formatos,
            sintaxis: locale,
          };
      } else if (formulaId) {
        const formula = (await loadFormulas()).find((f) => f.id === formulaId);
        if (formula) {
          const { cells, formats } = formulaToCells(formula, locale);
          draft = { nombre: formula.nombre, celdas: cells, formatos: formats, sintaxis: locale };
        }
      }
      try {
        const saved = await saveSheet(draft);
        navigate(`/laboratorio/${saved.id}`, { replace: true });
      } catch (error) {
        toast.error(error);
        navigate('/laboratorio', { replace: true });
      }
    })();
  }, [params, navigate, profile.sintaxisExcel, toast]);
  return <Skeleton lines={4} />;
}

function TemplateCheck({
  template,
  results,
}: {
  template: Plantilla;
  results: ReturnType<typeof computeSheet>;
}) {
  const checks = template.verificacion.map((c) => {
    const v = results[c.celda]?.value;
    return { ...c, ok: typeof v === 'number' && isClose(v, c.esperado, c.tolerancia), actual: v };
  });
  const allOk = checks.every((c) => c.ok);
  return (
    <div className={`card p-4 ${allOk ? 'border-ok' : ''}`}>
      <h3 className="mb-2 flex items-center gap-2 font-semibold">
        <Icon name={allOk ? 'check' : 'target'} className={allOk ? 'text-ok' : 'text-red'} /> Comprobación de
        la plantilla
      </h3>
      <ul className="space-y-1 text-sm">
        {checks.map((c) => (
          <li key={c.celda} className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${c.ok ? 'bg-ok' : 'bg-red'}`} />
            <span className="font-mono">{c.celda}</span>
            <span className="text-muted">
              debe dar {c.esperado.toLocaleString('es-EC', { maximumFractionDigits: 2 })}
            </span>
            <span className="ml-auto font-semibold">{c.ok ? 'Correcto' : 'Revisa'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExerciseCheck({
  results,
  selected,
}: {
  results: ReturnType<typeof computeSheet>;
  selected: string;
}) {
  const [exercises, setExercises] = useState<Ejercicio[]>([]);
  const [exerciseId, setExerciseId] = useState('');
  const [outcome, setOutcome] = useState<null | boolean>(null);
  useEffect(() => {
    void loadEjercicios().then(setExercises);
  }, []);
  const exercise = exercises.find((e) => e.id === exerciseId);
  return (
    <div className="card space-y-3 p-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <Icon name="target" className="text-red" /> Comprobar un ejercicio
      </h3>
      <select
        className="field"
        value={exerciseId}
        onChange={(e) => {
          setExerciseId(e.target.value);
          setOutcome(null);
        }}
        aria-label="Ejercicio a comprobar"
      >
        <option value="">Elige el ejercicio que estás resolviendo…</option>
        {exercises.map((e) => (
          <option key={e.id} value={e.id}>
            {e.enunciado.slice(0, 80)}…
          </option>
        ))}
      </select>
      {exercise ? <p className="text-sm text-ink-2">{exercise.enunciado}</p> : null}
      <button
        type="button"
        className="btn btn-soft w-full"
        disabled={!exercise}
        onClick={() => {
          const v = results[selected]?.value;
          setOutcome(
            Boolean(exercise && typeof v === 'number' && isClose(v, exercise.respuesta, exercise.tolerancia)),
          );
        }}
      >
        Comprobar la celda {selected}
      </button>
      {outcome !== null ? (
        <Notice tone={outcome ? 'ok' : 'warn'} icon={outcome ? 'check' : 'info'}>
          {outcome
            ? '¡Correcto! Tu hoja da la respuesta esperada.'
            : 'Todavía no: revisa tus fórmulas o elige la celda del resultado.'}
        </Notice>
      ) : null}
    </div>
  );
}

function SheetEditor({ initial }: { initial: Hoja }) {
  const toast = useToast();
  const [name, setName] = useState(initial.nombre);
  const [cells, setCells] = useState(initial.celdas);
  const [formats, setFormats] = useState(initial.formatos);
  const [locale, setLocale] = useState<Locale>(initial.sintaxis);
  const [selected, setSelected] = useState('A1');
  const [template, setTemplate] = useState<Plantilla | null>(null);
  const snapshot = JSON.stringify({ name, cells, formats, locale });
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const [saveError, setSaveError] = useState(false);
  const saving: 'saved' | 'saving' | 'error' = saveError
    ? 'error'
    : snapshot === savedSnapshot
      ? 'saved'
      : 'saving';
  const fileInput = useRef<HTMLInputElement>(null);
  useDocumentTitle(name);

  useEffect(() => {
    if (!initial.plantillaId) return;
    void loadPlantillas().then((list) => setTemplate(list.find((p) => p.id === initial.plantillaId) ?? null));
  }, [initial.plantillaId]);

  const results = useMemo(() => computeSheet(cells, locale), [cells, locale]);
  const templateResults = useMemo(
    () => (template ? computeSheet(convertCells(cells, locale, 'en'), 'en') : null),
    [template, cells, locale],
  );

  // Auto-save (debounced) to IndexedDB on this device.
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        await saveSheet({
          id: initial.id,
          nombre: name.trim() || 'Hoja sin título',
          celdas: cells,
          formatos: formats,
          sintaxis: locale,
          ...(initial.plantillaId ? { plantillaId: initial.plantillaId } : {}),
        });
        setSaveError(false);
        setSavedSnapshot(JSON.stringify({ name, cells, formats, locale }));
      } catch (error) {
        setSaveError(true);
        toast.error(error);
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [name, cells, formats, locale, initial.id, initial.plantillaId, toast]);

  const commit = (key: string, raw: string) => {
    setCells((prev) => {
      const next = { ...prev };
      if (raw.trim() === '') delete next[key];
      else next[key] = raw;
      const problems = validateCells(next);
      if (problems.length > 0) {
        toast.show(problems[0] as string, 'error');
        return prev;
      }
      return next;
    });
  };

  const switchLocale = (to: Locale) => {
    if (to === locale) return;
    setCells((prev) => convertCells(prev, locale, to));
    setLocale(to);
    toast.show(
      to === 'es' ? 'Fórmulas convertidas a Excel en español' : 'Fórmulas convertidas a Excel en inglés',
    );
  };

  const exportFile = async () => {
    try {
      const { exportXlsx } = await import('../../domain/sheet/xlsx');
      const bytes = exportXlsx(cells, formats, locale, name);
      const safe = (name.trim() || 'hoja').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 50);
      downloadFile(
        `${safe}.xlsx`,
        bytes as BlobPart,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      toast.show('Archivo .xlsx descargado');
    } catch {
      toast.show('No se pudo generar el archivo.', 'error');
    }
  };

  const importFile = async (file: File) => {
    try {
      const { checkSpreadsheetFile, importSpreadsheet } = await import('../../domain/sheet/xlsx');
      checkSpreadsheetFile(file);
      const imported = importSpreadsheet(new Uint8Array(await file.arrayBuffer()), locale);
      setCells(imported.cells);
      setFormats(imported.formats);
      setName(file.name.replace(/\.[^.]+$/, '').slice(0, 60));
      toast.show(imported.warnings[0] ?? `Importado: ${Object.keys(imported.cells).length} celdas`);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'No se pudo leer el archivo.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <AppLink to="/laboratorio" className="btn btn-icon btn-ghost" aria-label="Volver al laboratorio">
          <Icon name="arrow-left" />
        </AppLink>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="min-w-0 flex-1 rounded-xl bg-transparent px-2 py-1 font-display text-2xl font-semibold outline-none focus:bg-surface"
          aria-label="Nombre de la hoja"
        />
        <span className="text-xs text-muted" role="status">
          {saving === 'saving'
            ? 'Guardando…'
            : saving === 'saved'
              ? 'Guardado en este dispositivo'
              : 'No se pudo guardar'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Sintaxis de Excel"
          className="flex rounded-xl border border-line bg-surface p-1"
        >
          {(['es', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={locale === l}
              onClick={() => switchLocale(l)}
              className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${locale === l ? 'bg-ink text-paper' : 'text-muted'}`}
            >
              {l === 'es' ? 'Español ( ; )' : 'Inglés ( , )'}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only">Formato de la celda {selected}</span>
          <select
            className="field min-h-11 w-auto py-1"
            value={formats[selected] ?? 'general'}
            onChange={(e) => {
              const value = e.target.value as CellFormat;
              setFormats((prev) => {
                const next = { ...prev };
                if (value === 'general') delete next[selected];
                else next[selected] = value;
                return next;
              });
            }}
          >
            {CELL_FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABEL[f]}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.xls,.ods,.csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = '';
            }}
            aria-label="Importar archivo de hoja de cálculo"
          />
          <button type="button" className="btn btn-ghost" onClick={() => fileInput.current?.click()}>
            <Icon name="upload" size={18} /> Importar
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void exportFile()}>
            <Icon name="download" size={18} /> .xlsx
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Grid
          cells={cells}
          results={results}
          formats={formats}
          locale={locale}
          selected={selected}
          onSelect={setSelected}
          onCommit={commit}
        />
        <aside className="space-y-4">
          {template && templateResults ? (
            <TemplateCheck template={template} results={templateResults} />
          ) : null}
          <ExerciseCheck results={results} selected={selected} />
          <div className="card p-4 text-sm text-muted">
            <p className="mb-2 font-semibold text-ink">Atajos</p>
            <ul className="space-y-1">
              <li>
                <span className="kbd">Enter</span> editar / confirmar
              </li>
              <li>
                <span className="kbd">Tab</span> insertar la función sugerida
              </li>
              <li>
                <span className="kbd">Supr</span> borrar celda
              </li>
              <li>
                <span className="kbd">$</span> fija filas o columnas: $B$1
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function LabSheetPage() {
  const { hojaId = '' } = useParams();
  const [sheet, setSheet] = useState<Hoja | null | undefined>(undefined);
  useEffect(() => {
    if (hojaId === 'nueva') return;
    void getDb()
      .hojas.get(hojaId)
      .then((h) => setSheet(h ?? null));
  }, [hojaId]);
  if (hojaId === 'nueva') return <NewSheet />;
  if (sheet === undefined) return <Skeleton lines={4} />;
  if (sheet === null)
    return (
      <Notice tone="warn">
        Esta hoja no existe en este dispositivo.{' '}
        <AppLink to="/laboratorio" className="link-red">
          Volver al laboratorio
        </AppLink>
      </Notice>
    );
  return <SheetEditor key={sheet.id} initial={sheet} />;
}
