import type { CellFormat } from '../domain/content/schemas';
import type { Locale } from '../domain/formula/tokenizer';
import type { Question } from '../domain/study/quiz';

export type RefTipo = 'materia' | 'tema' | 'subtema' | 'formula' | 'libre';
export type EstrellaTipo = 'formula' | 'subtema' | 'ejercicio' | 'articulo' | 'materia';
export type ThemePreference = 'system' | 'light' | 'dark';
export type MotionPreference = 'system' | 'reduce' | 'full';

export const COLLECTION_COLORS = ['carmin', 'ocre', 'jade', 'cobalto', 'ciruela', 'grafito'] as const;
export type CollectionColor = (typeof COLLECTION_COLORS)[number];

export interface Perfil {
  id: 'yo';
  /** Subjects the student is taking (ids of content/materias.json). */
  materias: string[];
  /** Career and cycle the student chose (content/carreras.json), or null. */
  carrera: string | null;
  ciclo: number | null;
  tema: ThemePreference;
  movimiento: MotionPreference;
  sintaxisExcel: Locale;
}

export interface Apunte {
  id: string;
  refTipo: RefTipo;
  refId: string;
  titulo: string;
  contenido: string;
  etiquetas: string[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface ArticuloSnapshot {
  titulo: string;
  autores: string[];
  anio?: number;
  revista?: string;
  doi?: string;
  url: string;
  fuente: string;
  cita: string;
}

export interface Estrella {
  id: string;
  tipo: EstrellaTipo;
  refId: string;
  titulo: string;
  ruta?: string;
  snapshot?: ArticuloSnapshot;
  creadoEn: string;
}

export interface ItemColeccion {
  tipo: EstrellaTipo;
  refId: string;
  titulo: string;
  ruta?: string;
  snapshot?: ArticuloSnapshot;
  agregadoEn: string;
}

export interface Coleccion {
  id: string;
  nombre: string;
  descripcion: string;
  color: CollectionColor;
  items: ItemColeccion[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface Recordatorio {
  id: string;
  titulo: string;
  materiaId?: string;
  fecha: string;
  avisoMinutos: number;
  estado: 'pendiente' | 'hecho';
  creadoEn: string;
}

export interface Intento {
  id: string;
  ejercicioId: string;
  respuesta: number;
  correcto: boolean;
  segundos: number;
  fecha: string;
}

export interface Hoja {
  id: string;
  nombre: string;
  plantillaId?: string;
  celdas: Record<string, string>;
  formatos: Record<string, CellFormat>;
  sintaxis: Locale;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Busqueda {
  id: string;
  consulta: string;
  fecha: string;
  total: number;
}

/** Report written in the editor (Markdown with formulas). */
export interface Documento {
  id: string;
  titulo: string;
  contenido: string;
  materiaId?: string;
  creadoEn: string;
  actualizadoEn: string;
}

export const ACCOUNT_KINDS = ['activo', 'pasivo', 'patrimonio', 'ingreso', 'gasto'] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export interface LineaAsiento {
  cuenta: string;
  tipo: AccountKind;
  debe: number;
  haber: number;
}

export interface Asiento {
  id: string;
  fecha: string;
  glosa: string;
  lineas: LineaAsiento[];
}

/** A practice journal: entries, posted to T accounts and a trial balance by the app. */
export interface Diario {
  id: string;
  nombre: string;
  asientos: Asiento[];
  creadoEn: string;
  actualizadoEn: string;
}

/** Flashcard with its spaced-repetition state (SM-2). */
export interface Tarjeta {
  id: string;
  mazo: string;
  frente: string;
  reverso: string;
  origen: 'glosario' | 'subtema' | 'propia' | 'pdf';
  ef: number;
  intervalo: number;
  repeticiones: number;
  proximaRevision: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CriterioDecision {
  nombre: string;
  peso: number;
}

/** SWOT board or weighted decision matrix. */
export interface Tablero {
  id: string;
  tipo: 'foda' | 'decision';
  titulo: string;
  foda?: { fortalezas: string[]; oportunidades: string[]; debilidades: string[]; amenazas: string[] };
  decision?: { criterios: CriterioDecision[]; opciones: string[]; puntajes: number[][] };
  creadoEn: string;
  actualizadoEn: string;
}

/** Text of a PDF the student loaded in the study area. The file itself is never stored or sent. */
export interface DocumentoPdf {
  id: string;
  nombre: string;
  materiaId: string;
  paginas: number;
  texto: string;
  creadoEn: string;
}

/** Result of a practice exam in the study area. */
export interface Examen {
  id: string;
  materiaId: string;
  fuentes: 'abaco' | 'pdf' | 'mixto';
  total: number;
  correctas: number;
  segundos: number;
  fecha: string;
}

/** One graded part of a subject (an exam, homework, a project) with the weight its teacher set. */
export interface ComponenteNota {
  id: string;
  nombre: string;
  /** Percentage of the final grade. */
  peso: number;
  /** Grade already obtained, or null while it is pending. */
  nota: number | null;
}

/** Grades of a subject in an academic period. Components, weights and scale are the student's, never preset. */
export interface Calificacion {
  id: string;
  materiaId: string;
  /** Free label of the academic period, e.g. "2026-2". */
  periodo: string;
  /** Highest grade of the scale (10, 20, 100…). */
  notaMaxima: number;
  /** Final grade the student wants to reach (usually the passing grade). */
  objetivo: number;
  componentes: ComponenteNota[];
  creadoEn: string;
  actualizadoEn: string;
}

/** A question failed in a practice exam, reviewed with spaced repetition until it is answered well 3 times. */
export interface ErrorRepaso {
  /** Same id as the question, so failing it again updates the same row. */
  id: string;
  materiaId: string;
  subtemaId: string | null;
  subtemaNombre: string | null;
  pregunta: Question;
  fallos: number;
  aciertos: number;
  ef: number;
  intervalo: number;
  repeticiones: number;
  proximaRevision: string;
  dominada: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

/** A deliverable (payroll, amortization table…) saved to be resumed later. Only its inputs are stored. */
export interface Entregable {
  id: string;
  tipo: string;
  titulo: string;
  entradas: Record<string, unknown>;
  creadoEn: string;
  actualizadoEn: string;
}

/** Usage counters of one day (YYYY-MM-DD). They stay on the device unless the student shares a summary. */
export interface UsoDia {
  dia: string;
  eventos: Record<string, number>;
}

export interface CacheApi {
  clave: string;
  expiraEn: number;
  datos: unknown;
}

export interface MetaRow {
  clave: string;
  valor: unknown;
}

export const DEFAULT_PROFILE: Perfil = {
  id: 'yo',
  materias: [],
  carrera: null,
  ciclo: null,
  tema: 'system',
  movimiento: 'system',
  sintaxisExcel: 'es',
};
