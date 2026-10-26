import { PDF_TEXT_MAX } from './backup';
import { getDb, type AbacoDB } from './db';
import { ValidationError } from './repositories';
import type { DocumentoPdf, Examen } from './types';

/** Study area: text of the student's PDFs (never the file) and practice exam results, only on this device. */
export const STUDY_LIMITS = { pdfs: 30, pdfName: 200, exams: 2000 } as const;

const now = (): string => new Date().toISOString();

export async function savePdf(
  input: Pick<DocumentoPdf, 'nombre' | 'materiaId' | 'paginas' | 'texto'>,
  db: AbacoDB = getDb(),
): Promise<DocumentoPdf> {
  if ((await db.pdfs.count()) >= STUDY_LIMITS.pdfs) {
    throw new ValidationError(
      `Puedes guardar hasta ${STUDY_LIMITS.pdfs} PDF. Borra alguno para agregar otro.`,
    );
  }
  const nombre = input.nombre.trim().slice(0, STUDY_LIMITS.pdfName) || 'documento.pdf';
  const row: DocumentoPdf = {
    id: crypto.randomUUID(),
    nombre,
    materiaId: input.materiaId,
    paginas: Math.max(1, Math.floor(input.paginas)),
    texto: input.texto.slice(0, PDF_TEXT_MAX),
    creadoEn: now(),
  };
  await db.pdfs.put(row);
  return row;
}

export async function listPdfs(materiaId?: string, db: AbacoDB = getDb()): Promise<DocumentoPdf[]> {
  const rows = materiaId
    ? await db.pdfs.where('materiaId').equals(materiaId).toArray()
    : await db.pdfs.toArray();
  return rows.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export async function deletePdf(id: string, db: AbacoDB = getDb()): Promise<void> {
  await db.pdfs.delete(id);
}

export async function saveExam(input: Omit<Examen, 'id' | 'fecha'>, db: AbacoDB = getDb()): Promise<Examen> {
  if (input.total < 1 || input.correctas < 0 || input.correctas > input.total)
    throw new ValidationError('Resultado de examen inválido.');
  const row: Examen = { ...input, id: crypto.randomUUID(), fecha: now() };
  await db.examenes.put(row);
  const count = await db.examenes.count();
  if (count > STUDY_LIMITS.exams) {
    const oldest = await db.examenes
      .orderBy('fecha')
      .limit(count - STUDY_LIMITS.exams)
      .primaryKeys();
    await db.examenes.bulkDelete(oldest);
  }
  return row;
}

export async function listAllExams(db: AbacoDB = getDb()): Promise<Examen[]> {
  return db.examenes.toArray();
}

export async function listExams(materiaId: string, db: AbacoDB = getDb()): Promise<Examen[]> {
  const rows = await db.examenes.where('materiaId').equals(materiaId).toArray();
  return rows.sort((a, b) => b.fecha.localeCompare(a.fecha));
}
