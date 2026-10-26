import { useId, useState } from 'react';
import { addCards } from '../../data/tool-repositories';
import type { DocumentoPdf } from '../../data/types';
import type { Materia, Temario } from '../../domain/content/schemas';
import { studyCards } from '../../domain/study/quiz';
import { Icon } from '../../ui/icons';
import { Accordion, AppLink } from '../../ui/primitives';
import { useToast } from '../../ui/use-toast';
import { describePdf } from './describe';

/** Theory and example of every subtopic, next to the definitions found in the student's PDFs. */
export function ReviewPanel({
  materia,
  temario,
  pdfs,
}: {
  materia: Materia;
  temario: Temario;
  pdfs: DocumentoPdf[];
}) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-t`} className="space-y-4">
      <h2 id={`${id}-t`} className="font-display text-xl font-semibold">
        Repasar {materia.nombre}
      </h2>
      {temario.temas.map((tema) => (
        <Accordion key={tema.id} title={`${tema.orden}. ${tema.nombre}`}>
          <div className="space-y-5">
            {tema.subtemas.map((s) => (
              <article key={s.id} className="space-y-2">
                <h3 className="font-semibold">{s.nombre}</h3>
                <p className="text-sm leading-relaxed text-ink-2">
                  <strong className="text-ink">Teoría. </strong>
                  {s.explicacion}
                </p>
                <p className="rounded-xl bg-surface-2 p-3 text-sm leading-relaxed text-ink-2">
                  <strong className="text-red">Ejemplo. </strong>
                  {s.ejemplo}
                </p>
                <AppLink to={`/materia/${materia.id}/tema/${tema.id}?s=${s.id}`} className="link-red text-sm">
                  Ver completo con su fuente →
                </AppLink>
              </article>
            ))}
          </div>
        </Accordion>
      ))}
      {pdfs.map((pdf) => {
        const info = describePdf(pdf, materia, temario);
        return (
          <Accordion key={pdf.id} title={`De tu PDF: ${pdf.nombre}`}>
            <div className="space-y-4 text-sm">
              {info.relevancia.subtemas.length > 0 ? (
                <div>
                  <h3 className="mb-1 font-semibold">Coincide con estos subtemas</h3>
                  <ul className="flex flex-wrap gap-2">
                    {info.relevancia.subtemas.slice(0, 8).map((s) => (
                      <li key={s.subtemaId} className="chip min-h-8">
                        {s.nombre}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {info.definiciones.length > 0 ? (
                <dl className="space-y-2">
                  {info.definiciones.map((d) => (
                    <div key={d.termino}>
                      <dt className="font-semibold">{d.termino}</dt>
                      <dd className="text-ink-2">{d.oracion}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-muted">
                  No encontramos definiciones con la forma «X es…» o «X se define como…» en este PDF.
                </p>
              )}
              <p className="text-xs text-muted">
                Estas frases salen tal cual de tu PDF: ÁBACO no las verificó. Compáralas con la teoría de
                arriba, que sí cita su fuente.
              </p>
            </div>
          </Accordion>
        );
      })}
    </section>
  );
}

/** Flashcards for memorizing: one per subtopic and one per PDF definition, reviewed with spaced repetition. */
export function MemoryPanel({
  materia,
  temario,
  pdfs,
}: {
  materia: Materia;
  temario: Temario;
  pdfs: DocumentoPdf[];
}) {
  const toast = useToast();
  const id = useId();
  const [created, setCreated] = useState<number | null>(null);
  const subtopics = temario.temas.reduce((n, t) => n + t.subtemas.length, 0);
  const pdfCards = pdfs.map((pdf) => ({ pdf, defs: describePdf(pdf, materia, temario).definiciones }));
  const pdfTotal = pdfCards.reduce((n, x) => n + x.defs.length, 0);

  const create = async () => {
    try {
      const cards = [
        ...studyCards(materia, temario),
        ...pdfCards.flatMap((x) =>
          studyCards(materia, temario, { id: x.pdf.id, nombre: x.pdf.nombre, definiciones: x.defs }).filter(
            (c) => c.origen === 'pdf',
          ),
        ),
      ];
      const added = await addCards(cards);
      setCreated(added);
      toast.show(
        added > 0 ? `${added} tarjetas nuevas listas para repasar` : 'Esas tarjetas ya estaban en tu mazo',
      );
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <section aria-labelledby={`${id}-t`} className="card space-y-4 p-5">
      <h2 id={`${id}-t`} className="font-display text-xl font-semibold">
        Memorizar con tarjetas
      </h2>
      <p className="text-sm text-ink-2">
        Crea una tarjeta por cada subtema de {materia.nombre} ({subtopics}, con su teoría y su ejemplo) y una
        por cada definición de tus PDF ({pdfTotal}). Después repásalas con repetición espaciada: las que te
        cuestan vuelven antes y las que dominas se espacian.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => void create()}>
          <Icon name="cards" size={18} /> Crear tarjetas de {materia.nombre}
        </button>
        <AppLink to="/herramientas/tarjetas" className="btn btn-ghost">
          Repasar ahora <Icon name="arrow-right" size={18} />
        </AppLink>
      </div>
      {created !== null ? (
        <p role="status" className="text-sm text-muted">
          {created} tarjetas nuevas en tu mazo.
        </p>
      ) : null}
    </section>
  );
}
