import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  getCarrera,
  getMateria,
  loadEjercicios,
  loadTemario,
  materias,
  materiasDeCiclo,
} from '../../data/content';
import { dueMistakes, listMistakes } from '../../data/everyday-repositories';
import { listPdfs } from '../../data/study-repositories';
import type { DocumentoPdf } from '../../data/types';
import { useAsync, useDocumentTitle } from '../../ui/hooks';
import { PageHeader, Skeleton, Tabs } from '../../ui/primitives';
import { useProfile } from '../../ui/use-profile';
import { ErrorsPanel } from './ErrorsPanel';
import { ExamPanel } from './ExamPanel';
import { PdfPanel } from './PdfPanel';
import { MemoryPanel, ReviewPanel } from './ReviewPanels';
import { SharePdfDialog } from './SharePdfDialog';

type Pane = 'pdf' | 'repasar' | 'memoria' | 'examen' | 'errores';

/**
 * Study area: one subject at a time, with ÁBACO's verified content, the student's own PDFs (read on the device)
 * or both, and three ways to study: review, memorize with flashcards and practice exams.
 */
export default function StudyPage() {
  useDocumentTitle('Área de estudio');
  const profile = useProfile();
  const [params, setParams] = useSearchParams();
  const [pane, setPane] = useState<Pane>('repasar');
  const [files, setFiles] = useState<Map<string, File>>(() => new Map());
  const [sharing, setSharing] = useState<DocumentoPdf | null>(null);

  const fromProfile =
    profile.materias[0] ??
    (profile.carrera && getCarrera(profile.carrera)
      ? materiasDeCiclo(getCarrera(profile.carrera)!, profile.ciclo ?? undefined)[0]?.materia.id
      : undefined);
  const materiaId = getMateria(params.get('materia') ?? '')?.id ?? fromProfile ?? materias[0]!.id;
  const materia = getMateria(materiaId)!;

  const state = useAsync(async () => {
    const [temario, ejercicios] = await Promise.all([loadTemario(materiaId), loadEjercicios()]);
    return { temario, ejercicios };
  }, [materiaId]);
  const pdfs = useLiveQuery(() => listPdfs(materiaId), [materiaId], []);
  const mistakes = useLiveQuery(() => listMistakes(materiaId), [materiaId], []);

  const mine = materias.filter((m) => profile.materias.includes(m.id));
  const others = materias.filter((m) => !profile.materias.includes(m.id));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Área de estudio"
        title="Estudia con ÁBACO y con tus PDF"
        subtitle="Elige una materia y estudia con su contenido verificado, con tus propios PDF o con ambos mezclados: repasa la teoría y los ejemplos, memoriza con tarjetas y ponte a prueba con exámenes."
      />

      <label className="block max-w-md" htmlFor="estudio-materia">
        <span className="mb-1 block text-sm font-semibold text-ink-2">Materia</span>
        <select
          id="estudio-materia"
          className="field"
          value={materiaId}
          onChange={(e) => setParams({ materia: e.target.value }, { replace: true })}
        >
          {mine.length > 0 ? (
            <optgroup label="Mis materias">
              {mine.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </optgroup>
          ) : null}
          <optgroup label={mine.length > 0 ? 'Otras materias' : 'Materias'}>
            {others.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <Tabs<Pane>
        label="Modo de estudio"
        value={pane}
        onChange={setPane}
        tabs={[
          { id: 'repasar', label: 'Repasar' },
          { id: 'memoria', label: 'Memorizar' },
          { id: 'examen', label: 'Examen' },
          { id: 'errores', label: 'Errores', count: dueMistakes(mistakes).length },
          { id: 'pdf', label: 'Mis PDF', count: pdfs.length },
        ]}
      />

      {state.status !== 'ready' || !state.data.temario ? (
        <Skeleton lines={6} />
      ) : pane === 'pdf' ? (
        <PdfPanel
          materia={materia}
          temario={state.data.temario}
          pdfs={pdfs}
          files={files}
          onFile={(fileId, file) => setFiles((prev) => new Map(prev).set(fileId, file))}
          onShare={setSharing}
        />
      ) : pane === 'repasar' ? (
        <ReviewPanel materia={materia} temario={state.data.temario} pdfs={pdfs} />
      ) : pane === 'memoria' ? (
        <MemoryPanel materia={materia} temario={state.data.temario} pdfs={pdfs} />
      ) : pane === 'errores' ? (
        <ErrorsPanel materia={materia} />
      ) : (
        <ExamPanel
          materia={materia}
          temario={state.data.temario}
          ejercicios={state.data.ejercicios}
          pdfs={pdfs}
        />
      )}

      {sharing && state.status === 'ready' && state.data.temario ? (
        <SharePdfDialog
          pdf={sharing}
          file={files.get(sharing.id)}
          materia={materia}
          temario={state.data.temario}
          onClose={() => setSharing(null)}
        />
      ) : null}
    </div>
  );
}
