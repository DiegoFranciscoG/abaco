import { z } from 'zod';

export const AREAS = [
  'contabilidad',
  'finanzas',
  'tributario',
  'cuantitativo',
  'derecho',
  'gestion',
  'economia',
  'tecnologia',
  'formacion',
] as const;
export type Area = (typeof AREAS)[number];

export const FORMULA_CATEGORIES = [
  'contabilidad-basica',
  'inventarios',
  'depreciacion',
  'interes',
  'valor-dinero',
  'anualidades',
  'amortizacion',
  'evaluacion-proyectos',
  'costo-volumen-utilidad',
  'razones-financieras',
  'tributario',
  'estadistica',
  'calculo',
  'economia',
] as const;
export type FormulaCategory = (typeof FORMULA_CATEGORIES)[number];

const id = z.string().regex(/^[a-z0-9]+(?:-{1,2}[a-z0-9]+)*$/, 'Identificador en minúsculas con guiones');
const nonEmpty = z.string().trim().min(1);
const isoDate = z.iso.date();
export const httpsUrl = z.url().refine((value) => value.startsWith('https://'), 'La URL debe usar https://');
const area = z.enum(AREAS);
const numericValue = z.union([z.number(), z.array(z.number()).min(1)]);
/** A1-style cell address without $ (used by templates and Excel examples). */
const cellAddress = z.string().regex(/^[A-Z]{1,3}[1-9][0-9]{0,6}$/);

export const fuenteSchema = z.object({
  id,
  titulo: nonEmpty,
  autor_editor: nonEmpty,
  tipo: z.enum(['norma', 'ley', 'libro', 'articulo', 'pagina_oficial', 'documentacion']),
  url: httpsUrl,
  licencia: nonEmpty,
  fecha_consulta: isoDate,
});
export type Fuente = z.infer<typeof fuenteSchema>;

export const fuenteRefSchema = z.object({
  ref: id,
  url: httpsUrl.optional(),
  seccion: nonEmpty.optional(),
});
export type FuenteRef = z.infer<typeof fuenteRefSchema>;

/** In-house study tools a subject can link to (see src/features/tools). */
export const TOOL_IDS = [
  'editor',
  'diario',
  'estadistica',
  'graficador',
  'mercado',
  'macro',
  'divisas',
  'equilibrio',
  'proyectos',
  'rol-pagos',
  'impuestos',
  'foda',
  'tarjetas',
  'citas',
  'laboratorio',
  'buscador',
] as const;
export type ToolId = (typeof TOOL_IDS)[number];

/** A subject of the catalog: no university, career or curriculum is attached to it. */
export const materiaSchema = z.object({
  id,
  nombre: nonEmpty,
  areas: z.array(area).min(1).max(2),
  descripcion: nonEmpty,
  sinonimos: z.array(nonEmpty),
  herramientas: z.array(z.enum(TOOL_IDS)).min(1),
  orden: z.number().int().min(1),
});
export type Materia = z.infer<typeof materiaSchema>;

/**
 * Generic career (no institution): which catalog subjects it usually includes and in which cycle. Aggregated from
 * public study plans (docs/investigacion.md, section 1b); the plans themselves are not published.
 */
export const carreraSchema = z.object({
  id,
  nombre: nonEmpty,
  descripcion: nonEmpty,
  /** Number of public plans the figures come from. */
  planes: z.number().int().min(1),
  ciclos: z.number().int().min(1).max(12),
  materias: z
    .array(
      z.object({
        materia: id,
        /** Usual cycle: median (lower) of the first cycle in which the subject appears in each plan. */
        ciclo: z.number().int().min(1).max(12),
        /** Every cycle in which it appears in some plan (subjects split in I, II, III). */
        ciclos: z.array(z.number().int().min(1).max(12)).min(1),
        /** Plans of this career that include it. */
        planes: z.number().int().min(1),
      }),
    )
    .min(1),
});
export type Carrera = z.infer<typeof carreraSchema>;

export const subtemaSchema = z.object({
  id,
  nombre: nonEmpty,
  explicacion: z.string().trim().min(80, 'La explicación debe tener al menos 80 caracteres'),
  puntos_clave: z.array(nonEmpty).min(1),
  errores_frecuentes: z.array(nonEmpty).min(1),
  formulas: z.array(id),
  fuente: fuenteRefSchema,
});
export type Subtema = z.infer<typeof subtemaSchema>;

export const temaSchema = z.object({
  id,
  nombre: nonEmpty,
  orden: z.number().int().min(1),
  descripcion: nonEmpty,
  dificultad: z.number().int().min(1).max(3),
  subtemas: z.array(subtemaSchema).min(3).max(5),
});
export type Tema = z.infer<typeof temaSchema>;

export const temarioSchema = z.object({
  materia: id,
  actualizado_en: isoDate,
  temas: z.array(temaSchema).min(4).max(6),
});
export type Temario = z.infer<typeof temarioSchema>;

export const variableSchema = z.object({
  simbolo: nonEmpty,
  nombre: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'Identificador válido para el motor de cálculo'),
  significado: nonEmpty,
  unidad: nonEmpty,
});
export type Variable = z.infer<typeof variableSchema>;

export const formulaSchema = z
  .object({
    id,
    nombre: nonEmpty,
    categoria: z.enum(FORMULA_CATEGORIES),
    areas: z.array(area).min(1),
    descripcion: nonEmpty,
    latex: nonEmpty,
    variables: z.array(variableSchema).min(1),
    supuestos: z.array(nonEmpty),
    calculo: z.object({
      tipo: z.enum(['directo', 'implicito']),
      expresion: nonEmpty,
      incognita: z.string().optional(),
      tolerancia_residuo: z.number().positive().optional(),
    }),
    excel: z.object({ es: z.string().startsWith('='), en: z.string().startsWith('=') }),
    ejemplo: z.object({
      enunciado: nonEmpty,
      entradas: z.record(z.string(), numericValue),
      celdas: z.record(cellAddress, z.union([z.number(), z.string()])).optional(),
      pasos: z.array(nonEmpty).min(1),
      resultado: z.number(),
      unidad: nonEmpty,
      tolerancia: z.number().nonnegative(),
      excel_es: z.string().startsWith('='),
      excel_en: z.string().startsWith('='),
    }),
    materias: z.array(id).min(1),
    notas: z.array(nonEmpty).default([]),
    estado: z.enum(['verificada', 'pendiente']).default('verificada'),
    fuente: fuenteRefSchema,
    actualizado_en: isoDate,
  })
  .superRefine((formula, ctx) => {
    if (formula.calculo.tipo === 'implicito') {
      if (!formula.calculo.incognita) {
        ctx.addIssue({ code: 'custom', message: 'Una fórmula implícita necesita "incognita"' });
      }
      if (!formula.calculo.tolerancia_residuo) {
        ctx.addIssue({ code: 'custom', message: 'Una fórmula implícita necesita "tolerancia_residuo"' });
      }
    }
    const names = new Set(formula.variables.map((v) => v.nombre));
    for (const key of Object.keys(formula.ejemplo.entradas)) {
      if (!names.has(key)) {
        ctx.addIssue({ code: 'custom', message: `La entrada "${key}" no está declarada en variables` });
      }
    }
  });
export type Formula = z.infer<typeof formulaSchema>;

export const ejercicioSchema = z
  .object({
    id,
    materia: id,
    subtema: id.optional(),
    formula: id.optional(),
    enunciado: nonEmpty,
    datos: z.record(z.string(), numericValue),
    calculo: nonEmpty,
    respuesta: z.number(),
    unidad: nonEmpty,
    tolerancia: z.number().nonnegative(),
    procedimiento: z.array(nonEmpty).min(1),
    pistas: z.array(nonEmpty).min(1),
    dificultad: z.number().int().min(1).max(3),
    fuente: fuenteRefSchema,
    actualizado_en: isoDate,
  })
  .refine((e) => e.subtema !== undefined || e.formula !== undefined, {
    message: 'Un ejercicio debe ligarse a un subtema o a una fórmula',
  });
export type Ejercicio = z.infer<typeof ejercicioSchema>;

export const appSchema = z.object({
  id,
  nombre: nonEmpty,
  para_que: nonEmpty,
  materias: z.array(id).min(1),
  areas: z.array(area).min(1),
  costo: z.enum(['gratis', 'gratis-con-cuenta', 'freemium', 'pago']),
  plataformas: z.array(nonEmpty).min(1),
  url_oficial: httpsUrl,
  fecha_consulta: isoDate,
  nota: nonEmpty.optional(),
});
export type App = z.infer<typeof appSchema>;

export const terminoSchema = z.object({
  id,
  termino: nonEmpty,
  definicion: z.string().trim().min(30),
  sinonimos: z.array(nonEmpty),
  equivalente_ingles: nonEmpty,
  areas: z.array(area).min(1),
  fuente: fuenteRefSchema,
  actualizado_en: isoDate,
});
export type Termino = z.infer<typeof terminoSchema>;

export const CELL_FORMATS = ['general', 'numero', 'moneda', 'porcentaje', 'entero'] as const;
export type CellFormat = (typeof CELL_FORMATS)[number];

export const plantillaSchema = z.object({
  id,
  nombre: nonEmpty,
  descripcion: nonEmpty,
  materias: z.array(id).min(1),
  celdas: z.record(cellAddress, z.union([z.number(), z.string()])),
  formatos: z.record(cellAddress, z.enum(CELL_FORMATS)).default({}),
  verificacion: z
    .array(z.object({ celda: cellAddress, esperado: z.number(), tolerancia: z.number().nonnegative() }))
    .min(1),
  fuente: fuenteRefSchema,
  actualizado_en: isoDate,
});
export type Plantilla = z.infer<typeof plantillaSchema>;

export const fuentesFileSchema = z.array(fuenteSchema);
export const materiasFileSchema = z.array(materiaSchema);
export const carrerasFileSchema = z.array(carreraSchema);
export const formulasFileSchema = z.array(formulaSchema);
export const ejerciciosFileSchema = z.array(ejercicioSchema);
export const appsFileSchema = z.array(appSchema);
export const glosarioFileSchema = z.array(terminoSchema);
export const plantillasFileSchema = z.array(plantillaSchema);
