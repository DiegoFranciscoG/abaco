import { useId, useRef, useState } from 'react';
import { deletePdf, savePdf } from '../../data/study-repositories';
import type { DocumentoPdf } from '../../data/types';
import type { Materia, Temario } from '../../domain/content/schemas';
import { Icon } from '../../ui/icons';
import { Notice } from '../../ui/primitives';
import { useToast } from '../../ui/use-toast';
import { describePdf } from './describe';
import { extractPdfText, PDF_LIMITS, PdfError } from './pdf-extract';

export function PdfPanel({
  materia,
  temario,
  pdfs,
  files,
  onFile,
  onShare,
}: {
  materia: Materia;
  temario: Temario;
  pdfs: DocumentoPdf[];
  /** Files loaded in this visit, kept in memory so they can be shared with the author. */
  files: Map<string, File>;
  onFile: (id: string, file: File) => void;
  onShare: (pdf: DocumentoPdf) => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setProgress(0);
    try {
      const { paginas, texto } = await extractPdfText(file, setProgress);
      if (texto.replace(/\s/g, '').length < 200) {
        throw new PdfError(
          'Este PDF casi no tiene texto (quizá es una imagen escaneada): no se puede estudiar con él.',
        );
      }
      const saved = await savePdf({ nombre: file.name, materiaId: materia.id, paginas, texto });
      onFile(saved.id, file);
      toast.show(`«${file.name}» quedó listo para estudiar`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el PDF.');
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (pdf: DocumentoPdf) => {
    await deletePdf(pdf.id);
    toast.show(`«${pdf.nombre}» se borró de este dispositivo`);
  };

  return (
    <section aria-labelledby={`${id}-t`} className="space-y-4">
      <div className="card space-y-3 p-5">
        <h2 id={`${id}-t`} className="font-display text-xl font-semibold">
          Tus PDF de {materia.nombre}
        </h2>
        <p className="text-sm text-ink-2">
          Agrega tus apuntes, guías o lecturas en PDF para estudiarlos junto con el contenido de ÁBACO. El PDF
          se lee en tu dispositivo: no se sube a ningún servidor y solo se guarda su texto aquí. Máximo{' '}
          {PDF_LIMITS.maxBytes / 1024 / 1024} MB y {PDF_LIMITS.maxPages} páginas.
        </p>
        <label className="btn btn-primary cursor-pointer" htmlFor={`${id}-file`}>
          <Icon name="upload" size={18} /> Agregar un PDF
        </label>
        <input
          ref={inputRef}
          id={`${id}-file`}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => void load(e.target.files?.[0])}
        />
        {progress !== null ? (
          <p role="status" className="text-sm text-muted">
            Leyendo el PDF… {Math.round(progress * 100)} %
          </p>
        ) : null}
        {error ? <Notice tone="warn">{error}</Notice> : null}
      </div>

      {pdfs.length > 0 ? (
        <ul className="space-y-3" aria-label="PDF guardados">
          {pdfs.map((pdf) => {
            const info = describePdf(pdf, materia, temario);
            return (
              <li key={pdf.id} className="card space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold break-all">{pdf.nombre}</p>
                    <p className="text-xs text-muted">
                      {pdf.paginas} {pdf.paginas === 1 ? 'página' : 'páginas'} · {info.definiciones.length}{' '}
                      definiciones encontradas · coincide con {info.relevancia.subtemas.length} subtemas de{' '}
                      {materia.nombre}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-ghost min-h-10" onClick={() => onShare(pdf)}>
                      <Icon name="sparkle" size={16} /> Enviar al autor
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost min-h-10"
                      aria-label={`Borrar ${pdf.nombre}`}
                      onClick={() => void remove(pdf)}
                    >
                      <Icon name="trash" size={16} /> Borrar
                    </button>
                  </div>
                </div>
                {info.relevancia.subtemas.length === 0 ? (
                  <Notice tone="warn">
                    Este PDF casi no usa los términos de {materia.nombre}: revisa si lo agregaste en la
                    materia correcta.
                  </Notice>
                ) : null}
                {info.datosPersonales > 0 ? (
                  <Notice tone="warn">
                    Parece contener datos personales (cédulas, teléfonos o correos). Solo está en tu
                    dispositivo, pero no lo compartas así.
                  </Notice>
                ) : null}
                {files.has(pdf.id) ? null : (
                  <p className="text-xs text-muted">
                    Para enviarlo al autor tendrás que elegir el archivo otra vez: ÁBACO guarda solo su texto.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          Todavía no agregas PDF a esta materia. Puedes estudiar solo con el contenido de ÁBACO.
        </p>
      )}
    </section>
  );
}
