/**
 * Deliverables: the weekly assignments of these careers (payroll, amortization table, kardex…) solved step by step.
 * Plain metadata with no runtime imports, so the search index script and the statement page can read it.
 */
export interface DeliverableInfo {
  id: string;
  nombre: string;
  descripcion: string;
  /** Subjects where it is usually assigned (ids of content/materias.json). */
  materias: string[];
}

export const DELIVERABLES: DeliverableInfo[] = [
  {
    id: 'libro-diario',
    nombre: 'Libro diario, mayor y balance de comprobación',
    descripcion:
      'Registra los asientos, comprueba la partida doble de cada uno, pasa las cuentas al mayor y arma el balance de comprobación.',
    materias: ['contabilidad-general'],
  },
  {
    id: 'kardex',
    nombre: 'Kardex de inventarios',
    descripcion:
      'Tarjeta kardex por promedio ponderado o PEPS, con el costo de ventas y el inventario final.',
    materias: ['contabilidad-general', 'contabilidad-financiera', 'contabilidad-costos'],
  },
  {
    id: 'rol-pagos',
    nombre: 'Rol de pagos',
    descripcion:
      'Rol de varios trabajadores con aportes al IESS, horas extra, décimos y fondo de reserva, más las provisiones del empleador.',
    materias: ['legislacion-laboral', 'talento-humano', 'contabilidad-general'],
  },
  {
    id: 'amortizacion',
    nombre: 'Tabla de amortización',
    descripcion:
      'Tabla de un préstamo por el sistema francés, alemán o americano, con intereses, capital y saldo.',
    materias: ['matematica-financiera', 'finanzas-corporativas', 'informatica-gestion'],
  },
  {
    id: 'depreciacion',
    nombre: 'Depreciación de activos fijos',
    descripcion:
      'Tabla de depreciación por línea recta, suma de dígitos, doble saldo decreciente o unidades de producción.',
    materias: ['contabilidad-financiera', 'contabilidad-general'],
  },
  {
    id: 'punto-equilibrio',
    nombre: 'Punto de equilibrio',
    descripcion:
      'Punto de equilibrio en unidades y en dólares, unidades para una utilidad deseada, margen de seguridad y apalancamiento operativo.',
    materias: ['contabilidad-costos', 'emprendimiento', 'evaluacion-proyectos'],
  },
  {
    id: 'evaluacion-proyecto',
    nombre: 'VAN, TIR y período de recuperación',
    descripcion:
      'Evalúa un proyecto con sus flujos: VAN, TIR, índice de rentabilidad y recuperación simple y descontada.',
    materias: ['evaluacion-proyectos', 'finanzas-corporativas', 'emprendimiento'],
  },
  {
    id: 'razones-financieras',
    nombre: 'Razones financieras',
    descripcion:
      'Liquidez, endeudamiento, rentabilidad y eficiencia de una empresa, cada razón con su lectura en lenguaje claro.',
    materias: ['finanzas-corporativas', 'contabilidad-financiera'],
  },
];

export function getDeliverable(id: string): DeliverableInfo | undefined {
  return DELIVERABLES.find((d) => d.id === id);
}
