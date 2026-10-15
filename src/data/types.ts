import type { CellFormat } from '../domain/content/schemas';
import type { Locale } from '../domain/formula/tokenizer';

export type RefTipo = 'asignatura' | 'tema' | 'subtema' | 'formula' | 'libre';
export type EstrellaTipo = 'formula' | 'subtema' | 'ejercicio' | 'articulo' | 'asignatura';
export type ThemePreference = 'system' | 'light' | 'dark';
export type MotionPreference = 'system' | 'reduce' | 'full';

export const COLLECTION_COLORS = ['carmin', 'ocre', 'jade', 'cobalto', 'ciruela', 'grafito'] as const;
export type CollectionColor = (typeof COLLECTION_COLORS)[number];

export interface Perfil {
  id: 'yo';
  universidad?: string;
  carrera?: string;
  ciclo?: number;
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
  asignaturaId?: string;
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
  tema: 'system',
  movimiento: 'system',
  sintaxisExcel: 'es',
};
