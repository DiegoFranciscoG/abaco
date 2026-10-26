import type { CellFormat } from '../domain/content/schemas';
import type { Locale } from '../domain/formula/tokenizer';

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
  origen: 'glosario' | 'subtema' | 'propia';
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
  tema: 'system',
  movimiento: 'system',
  sintaxisExcel: 'es',
};
