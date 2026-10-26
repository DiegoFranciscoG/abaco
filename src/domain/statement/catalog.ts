import type { Concepto, Formula, Temario } from '../content/schemas';
import type { StatementCatalog } from './match';

/**
 * The statement matcher's catalog: the dictionary plus the names and routes of the subtopics and formulas it
 * points to. Built at compile time (scripts/build-search-index.ts) so the page does not load all 26 syllabi.
 */
export function buildStatementCatalog(input: {
  conceptos: Concepto[];
  temarios: Temario[];
  formulas: Pick<Formula, 'id' | 'nombre'>[];
}): StatementCatalog {
  const used = new Set(input.conceptos.flatMap((c) => c.subtemas));
  const usedFormulas = new Set(input.conceptos.flatMap((c) => c.formulas));
  const subtemas: StatementCatalog['subtemas'] = {};
  for (const t of input.temarios) {
    for (const tema of t.temas) {
      for (const s of tema.subtemas) {
        if (!used.has(s.id)) continue;
        subtemas[s.id] = {
          id: s.id,
          nombre: s.nombre,
          materia: t.materia,
          ruta: `/materia/${t.materia}/tema/${tema.id}?s=${s.id}`,
        };
      }
    }
  }
  const formulas = Object.fromEntries(
    input.formulas.filter((f) => usedFormulas.has(f.id)).map((f) => [f.id, f.nombre]),
  );
  return { conceptos: input.conceptos, subtemas, formulas };
}
