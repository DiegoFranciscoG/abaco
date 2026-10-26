/**
 * Catalog of the in-house study tools. Plain data with no runtime imports so that the search index script
 * (Node type stripping) can read it too.
 */
import type { Area, ToolId } from '../content/schemas';

export interface ToolInfo {
  id: ToolId;
  nombre: string;
  descripcion: string;
  /** Extra search words. */
  claves: string;
  ruta: string;
  area: Area;
  /** Needs an internet connection (calls a public API). */
  enLinea: boolean;
  /** Ids of content/fuentes.json behind its rules or data (shown on the tool page). */
  fuentes: string[];
  /** Ids of content/normativa.json the tool calculates with (their validity is shown on the tool page). */
  cifras?: string[];
}

export const TOOLS: ToolInfo[] = [
  {
    id: 'editor',
    nombre: 'Editor de informes',
    descripcion:
      'Escribe informes y deberes con títulos, listas, tablas y fórmulas matemáticas, con vista previa al instante. Se imprime o guarda como PDF.',
    claves: 'latex markdown documento ensayo informe pdf ecuaciones',
    ruta: '/herramientas/editor',
    area: 'formacion',
    enLinea: false,
    fuentes: [],
  },
  {
    id: 'diario',
    nombre: 'Libro diario y mayor',
    descripcion:
      'Registra asientos contables, comprueba la partida doble, pasa cada cuenta al mayor en forma de T y arma el balance de comprobación.',
    claves: 'asiento partida doble cuentas t balance de comprobacion mayorizacion',
    ruta: '/herramientas/diario',
    area: 'contabilidad',
    enLinea: false,
    fuentes: ['os-pfa'],
  },
  {
    id: 'estadistica',
    nombre: 'Calculadora estadística',
    descripcion:
      'Pega tus datos y obtén medidas descriptivas, histograma y diagrama de caja, intervalos de confianza, prueba t, regresión y tamaño de muestra.',
    claves: 'media mediana desviacion histograma caja intervalo prueba t regresion correlacion muestra',
    ruta: '/herramientas/estadistica',
    area: 'cuantitativo',
    enLinea: false,
    fuentes: ['os-est-es', 'os-stats'],
  },
  {
    id: 'graficador',
    nombre: 'Graficador de funciones',
    descripcion:
      'Dibuja funciones, su recta tangente y su derivada, y encuentra raíces, máximos y mínimos en un intervalo.',
    claves: 'grafica funcion derivada tangente raiz maximo minimo calculo',
    ruta: '/herramientas/graficador',
    area: 'cuantitativo',
    enLinea: false,
    fuentes: ['os-calc1'],
  },
  {
    id: 'mercado',
    nombre: 'Oferta y demanda',
    descripcion:
      'Mueve las curvas de oferta y demanda, mira el nuevo equilibrio, los excedentes y el efecto de un impuesto o de un precio controlado.',
    claves: 'equilibrio excedente consumidor productor impuesto precio maximo minimo elasticidad',
    ruta: '/herramientas/mercado',
    area: 'economia',
    enLinea: false,
    fuentes: ['os-micro3'],
  },
  {
    id: 'macro',
    nombre: 'Datos macro de los países',
    descripcion:
      'PIB, crecimiento, inflación, desempleo y comercio de Ecuador y otros países, con datos abiertos del Banco Mundial (CC BY 4.0).',
    claves: 'pib inflacion desempleo banco mundial indicadores ecuador paises',
    ruta: '/herramientas/macro',
    area: 'economia',
    enLinea: true,
    fuentes: ['wb-wdi'],
  },
  {
    id: 'divisas',
    nombre: 'Tipos de cambio',
    descripcion:
      'Convierte dólares a otras monedas y mira la evolución con los tipos de referencia publicados por el Banco Central Europeo.',
    claves: 'divisas moneda euro tipo de cambio conversor bce',
    ruta: '/herramientas/divisas',
    area: 'finanzas',
    enLinea: true,
    fuentes: ['ecb-tipos', 'comf'],
  },
  {
    id: 'equilibrio',
    nombre: 'Punto de equilibrio',
    descripcion:
      'Gráfico costo–volumen–utilidad: cambia precio, costos fijos y variables y observa el punto de equilibrio y el margen de seguridad.',
    claves: 'cvu costo volumen utilidad margen de contribucion margen de seguridad',
    ruta: '/herramientas/equilibrio',
    area: 'contabilidad',
    enLinea: false,
    fuentes: ['os-pma'],
  },
  {
    id: 'proyectos',
    nombre: 'Evaluador de proyectos',
    descripcion:
      'Ingresa los flujos de un proyecto y obtén VAN, TIR, índice de rentabilidad y período de recuperación, con el perfil del VAN según la tasa.',
    claves: 'van tir payback indice de rentabilidad flujo de caja inversion',
    ruta: '/herramientas/proyectos',
    area: 'finanzas',
    enLinea: false,
    fuentes: ['os-pfin2'],
  },
  {
    id: 'rol-pagos',
    nombre: 'Rol de pagos',
    descripcion:
      'Calcula aportes al IESS, horas extra, décima tercera, décima cuarta y fondo de reserva de un trabajador según el Código del Trabajo.',
    claves: 'nomina sueldo iess decimo tercero cuarto fondo de reserva horas extra',
    ruta: '/herramientas/rol-pagos',
    area: 'derecho',
    enLinea: false,
    fuentes: ['codigo-trabajo', 'iess-tasas', 'mdt-sbu-2026'],
    cifras: [
      'sbu',
      'iess-aporte-personal',
      'iess-aporte-patronal',
      'recargo-suplementarias',
      'recargo-extraordinarias',
      'fondo-reserva',
    ],
  },
  {
    id: 'impuestos',
    nombre: 'IVA e impuesto a la renta',
    descripcion:
      'Calcula el IVA de una venta, la base desde un precio final, el impuesto a la renta con la tabla vigente y la cuota RIMPE.',
    claves: 'iva renta sri rimpe tabla fraccion basica',
    ruta: '/herramientas/impuestos',
    area: 'tributario',
    enLinea: false,
    fuentes: ['sri-iva', 'sri-circular-iva-2026', 'sri-renta', 'sri-tablas-ir', 'sri-rimpe'],
    cifras: [
      'iva-tarifa-general',
      'ir-personas-tabla',
      'ir-sociedades',
      'rimpe-limites',
      'rimpe-negocios-populares',
      'rimpe-emprendedores',
    ],
  },
  {
    id: 'foda',
    nombre: 'FODA y matriz de decisión',
    descripcion:
      'Arma un análisis FODA con sus estrategias cruzadas y compara alternativas con una matriz de decisión ponderada.',
    claves: 'swot fortalezas oportunidades debilidades amenazas criterios ponderacion',
    ruta: '/herramientas/foda',
    area: 'gestion',
    enLinea: false,
    fuentes: ['os-pmgmt'],
  },
  {
    id: 'tarjetas',
    nombre: 'Tarjetas de estudio',
    descripcion:
      'Repasa términos y puntos clave con repetición espaciada: cada tarjeta vuelve justo cuando estás por olvidarla.',
    claves: 'flashcards memoria repaso repeticion espaciada glosario',
    ruta: '/herramientas/tarjetas',
    area: 'formacion',
    enLinea: false,
    fuentes: [],
  },
  {
    id: 'citas',
    nombre: 'Referencias APA',
    descripcion:
      'Arma referencias en estilo APA 7 a partir de un DOI o llenando los datos de un libro, artículo o página web.',
    claves: 'apa bibliografia referencia cita doi',
    ruta: '/herramientas/citas',
    area: 'formacion',
    enLinea: false,
    fuentes: ['os-writing'],
  },
  {
    id: 'laboratorio',
    nombre: 'Laboratorio de hoja de cálculo',
    descripcion:
      'Una hoja de cálculo con fórmulas en español o inglés, plantillas verificadas y descarga en .xlsx.',
    claves: 'excel hoja de calculo formulas plantillas xlsx',
    ruta: '/laboratorio',
    area: 'tecnologia',
    enLinea: false,
    fuentes: ['ms-excel-formulas'],
  },
  {
    id: 'buscador',
    nombre: 'Buscador académico',
    descripcion: 'Artículos, tesis y libros de fuentes abiertas, con la referencia APA lista para copiar.',
    claves: 'articulos tesis libros crossref openalex doaj la referencia open library',
    ruta: '/buscar',
    area: 'formacion',
    enLinea: true,
    fuentes: [],
  },
];

export function getTool(id: string): ToolInfo | undefined {
  return TOOLS.find((tool) => tool.id === id);
}
