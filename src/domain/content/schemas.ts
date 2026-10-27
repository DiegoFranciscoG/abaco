import { z } from '../zod';

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

/**
 * Period for which ÁBACO states that a normative figure is in force, checked against its official source. It never
 * goes past the fiscal year that was verified: in January the figure is checked again (docs/revision-anual.md).
 */
export const vigenciaSchema = z
  .object({
    desde: isoDate,
    hasta: isoDate,
    ejercicio_fiscal: z.number().int().min(2020).max(2100),
  })
  .refine((v) => v.desde <= v.hasta, { message: 'La vigencia debe empezar antes de terminar' })
  .refine(
    (v) => v.desde.startsWith(`${v.ejercicio_fiscal}-`) && v.hasta.startsWith(`${v.ejercicio_fiscal}-`),
    { message: 'La vigencia debe caer dentro de su ejercicio fiscal' },
  );
export type Vigencia = z.infer<typeof vigenciaSchema>;

export const CIFRA_CATEGORIES = ['laboral', 'seguridad-social', 'tributario', 'societario'] as const;

const regexSource = z
  .string()
  .min(2)
  .refine((source) => {
    try {
      new RegExp(source, 'iu');
      return true;
    } catch {
      return false;
    }
  }, 'Expresión regular inválida');

const tramoSchema = z.object({
  desde: z.number().nonnegative(),
  /** null only in the last bracket ("en adelante"). */
  hasta: z.number().positive().nullable(),
  impuesto_fraccion: z.number().nonnegative(),
  /** Marginal rate in percent, as the official table prints it (5 means 5 %). */
  porcentaje: z.number().min(0).max(100),
});

const cuotaSchema = z.object({
  desde: z.number().nonnegative(),
  hasta: z.number().positive(),
  cuota: z.number().nonnegative(),
});

/** A rate per concept, as in the withholding tables ("2 %: bienes muebles…"). */
const filaSchema = z.object({
  valor: z.number().min(0).max(100),
  concepto: nonEmpty,
});

/**
 * A figure of Ecuadorian law or regulation (wage, contribution rate, tax rate or table) that can change with a new
 * norm. It is written once here, with its validity, and every record that uses it declares it in `cifras`.
 */
export const cifraSchema = z
  .object({
    id,
    nombre: nonEmpty,
    categoria: z.enum(CIFRA_CATEGORIES),
    descripcion: nonEmpty,
    /** The figure as students read it ("USD 482 al mes"). */
    texto: nonEmpty,
    valor: z.number().nonnegative().optional(),
    unidad: z.enum(['USD', '%', 'horas', 'días', 'meses']).optional(),
    tramos: z.array(tramoSchema).min(2).optional(),
    cuotas: z.array(cuotaSchema).min(2).optional(),
    filas: z.array(filaSchema).min(2).optional(),
    vigencia: vigenciaSchema,
    base_legal: nonEmpty,
    fuente: fuenteRefSchema,
    /** Who changes it and when, so the yearly review knows where to look. */
    cambia: nonEmpty,
    verificado_en: isoDate,
    /** Patterns that reveal the figure inside any record; a match obliges the record to declare it. */
    detectar: z.array(regexSource).min(1),
  })
  .superRefine((cifra, ctx) => {
    const forms = [
      cifra.valor !== undefined,
      cifra.tramos !== undefined,
      cifra.cuotas !== undefined,
      cifra.filas !== undefined,
    ];
    if (forms.filter(Boolean).length !== 1) {
      ctx.addIssue({ code: 'custom', message: 'Una cifra tiene exactamente uno de: valor, tramos, cuotas o filas' });
    }
    if (cifra.valor !== undefined && !cifra.unidad) {
      ctx.addIssue({ code: 'custom', message: 'Un valor necesita su unidad' });
    }
    const rows = cifra.tramos ?? cifra.cuotas ?? [];
    rows.forEach((row, i) => {
      const next = rows[i + 1];
      if (row.hasta === null && next) {
        ctx.addIssue({ code: 'custom', message: 'Solo el último tramo puede no tener límite' });
      }
      if (next && row.hasta !== null && Math.abs(next.desde - row.hasta) > 0.011) {
        ctx.addIssue({ code: 'custom', message: `El tramo ${i + 2} no empieza donde termina el anterior` });
      }
    });
    if (cifra.verificado_en > cifra.vigencia.hasta) {
      ctx.addIssue({ code: 'custom', message: 'No se puede verificar una cifra después de su vigencia' });
    }
  });
export type Cifra = z.infer<typeof cifraSchema>;

/** Ids of content/normativa.json used by a record (optional: most records do not depend on any norm). */
const cifrasRef = z.array(id).min(1).optional();

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
  'notas',
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
  /**
   * Declared state against the depth standard (src/domain/content/coverage.ts) and ÁBACO's target of units. Test
   * T-17 checks that "completa" is only declared when the content really meets the standard.
   */
  cobertura: z.object({
    estado: z.enum(['completa', 'parcial']),
    unidades_objetivo: z.number().int().min(5).max(7),
  }),
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
  /** Subjects of this career (in at least half of its plans) that ÁBACO does not cover yet, by usual cycle. */
  pendientes: z
    .array(
      z.object({
        nombre: nonEmpty,
        ciclo: z.number().int().min(1).max(12),
        planes: z.number().int().min(1),
      }),
    )
    .optional(),
});
export type Carrera = z.infer<typeof carreraSchema>;

/**
 * Repetition map: how many generic careers and public plans include each subject name (normalized). Aggregated
 * data only; no plan or institution is kept (docs/investigacion.md, sección 1 y 16).
 */
export const repeticionSchema = z.object({
  nombre: nonEmpty,
  carreras: z.number().int().min(1).max(7),
  planes: z.number().int().min(1).max(13),
  ciclo_habitual: z.number().int().min(1).max(12),
  materia: id.nullable(),
  tipo: z.enum(['materia', 'practica']),
});
export type Repeticion = z.infer<typeof repeticionSchema>;

export const subtemaSchema = z.object({
  id,
  nombre: nonEmpty,
  explicacion: z.string().trim().min(80, 'La explicación debe tener al menos 80 caracteres'),
  /** A concrete, worked case of the theory above (own writing; numbers are checked when the example is written). */
  ejemplo: z.string().trim().min(60, 'Cada subtema necesita un ejemplo concreto'),
  puntos_clave: z.array(nonEmpty).min(1),
  errores_frecuentes: z.array(nonEmpty).min(1),
  formulas: z.array(id),
  cifras: cifrasRef,
  fuente: fuenteRefSchema,
});
export type Subtema = z.infer<typeof subtemaSchema>;

export const temaSchema = z.object({
  id,
  nombre: nonEmpty,
  orden: z.number().int().min(1),
  descripcion: nonEmpty,
  dificultad: z.number().int().min(1).max(3),
  // The depth standard (coverage.ts) allows up to 6 subtopics per unit.
  subtemas: z.array(subtemaSchema).min(3).max(6),
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
    cifras: cifrasRef,
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
    cifras: cifrasRef,
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
  cifras: cifrasRef,
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
  /** Normative figures typed into the cells (the IVA rate…), checked every year like any other record (T-11). */
  cifras: cifrasRef,
  verificacion: z
    .array(z.object({ celda: cellAddress, esperado: z.number(), tolerancia: z.number().nonnegative() }))
    .min(1),
  fuente: fuenteRefSchema,
  actualizado_en: isoDate,
});
export type Plantilla = z.infer<typeof plantillaSchema>;

/**
 * "Pega tu enunciado": a concept the student names in their own words ("tabla de pagos del préstamo"), linked to the
 * subtopics, formulas, tools and deliverables that solve it. Phrases are matched in order; a trailing * in a word
 * accepts any ending ("amortiz*" → amortización, amortizar).
 */
/**
 * A statistic published every month (inflation, interest rates). Unlike a normative figure it does not expire: it
 * is shown with the month it describes, and after `actualizar_desde` the page says a newer value may exist.
 */
export const indicadorSchema = z
  .object({
    id,
    nombre: nonEmpty,
    descripcion: nonEmpty,
    grupo: z.enum(['precios', 'tasas']),
    valor: z.number(),
    unidad: z.enum(['%', 'USD']),
    texto: nonEmpty,
    /** Month the value describes (YYYY-MM). */
    periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    /** From this day the source has probably published a newer value. */
    actualizar_desde: isoDate,
    fuente: fuenteRefSchema,
    verificado_en: isoDate,
  })
  .refine((i) => i.actualizar_desde > `${i.periodo}-01`, {
    message: 'La fecha de actualización tiene que ser posterior al período del dato',
  });
export type Indicador = z.infer<typeof indicadorSchema>;

export const conceptoSchema = z.object({
  id,
  nombre: nonEmpty,
  frases: z
    .array(
      z
        .string()
        .trim()
        .min(2)
        .regex(/^[a-z0-9ñ* ]+$/i, 'Solo letras, números, espacios y * al final de una palabra'),
    )
    .min(1),
  subtemas: z.array(id).min(1),
  formulas: z.array(id),
  herramientas: z.array(z.enum(TOOL_IDS)),
  entregables: z.array(id),
});
export type Concepto = z.infer<typeof conceptoSchema>;

export const fuentesFileSchema = z.array(fuenteSchema);
export const materiasFileSchema = z.array(materiaSchema);
export const carrerasFileSchema = z.array(carreraSchema);
export const formulasFileSchema = z.array(formulaSchema);
export const ejerciciosFileSchema = z.array(ejercicioSchema);
export const appsFileSchema = z.array(appSchema);
export const glosarioFileSchema = z.array(terminoSchema);
export const plantillasFileSchema = z.array(plantillaSchema);
export const normativaFileSchema = z.array(cifraSchema);
export const enunciadosFileSchema = z.array(conceptoSchema);
export const indicadoresFileSchema = z.array(indicadorSchema);
export const repeticionFileSchema = z.array(repeticionSchema);
