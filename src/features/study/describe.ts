import type { DocumentoPdf } from '../../data/types';
import type { Materia, Temario } from '../../domain/content/schemas';
import {
  findDefinitions,
  personalDataCounts,
  splitSentences,
  subjectRelevance,
} from '../../domain/study/analyze';

/** What the study area knows about a stored PDF, computed from its text only. */
export function describePdf(pdf: DocumentoPdf, materia: Materia, temario: Temario) {
  const definiciones = findDefinitions(splitSentences(pdf.texto));
  const relevancia = subjectRelevance(pdf.texto, materia, temario);
  const datos = personalDataCounts(pdf.texto);
  return { definiciones, relevancia, datosPersonales: datos.cedulas + datos.telefonos + datos.correos };
}
