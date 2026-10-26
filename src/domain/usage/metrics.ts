/**
 * Local measurement from the `uso` table (one row per day, counts only). Everything is computed on the device; the
 * anonymous summary is plain counts that the student may copy and send if they want.
 */
export interface UsageDay {
  dia: string;
  eventos: Record<string, number>;
}

export interface UsageMetrics {
  /** Month the monthly figures describe (YYYY-MM). */
  mes: string;
  diasActivosMes: number;
  entregablesMes: number;
  exportacionesMes: number;
  examenesMes: number;
  /** Days with use in the 7 days after the first one; null while those 7 days have not passed. */
  volvioLaSemanaSiguiente: boolean | null;
  semanasActivasUltimas4: number;
  coleccionesCompartidas: number;
  talleresCompartidos: number;
  cifrasVencidas: number;
}

const DAY_MS = 86_400_000;
const toTime = (iso: string) =>
  Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const active = (d: UsageDay) => Object.values(d.eventos).some((n) => n > 0);

export function usageMetrics(days: readonly UsageDay[], today: string, cifrasVencidas: number): UsageMetrics {
  const mes = today.slice(0, 7);
  const used = days.filter(active).sort((a, b) => a.dia.localeCompare(b.dia));
  const thisMonth = used.filter((d) => d.dia.startsWith(mes));
  const sum = (list: readonly UsageDay[], event: string) =>
    list.reduce((n, d) => n + (d.eventos[event] ?? 0), 0);

  let volvio: boolean | null = null;
  const first = used[0];
  if (first) {
    const start = toTime(first.dia);
    if ((toTime(today) - start) / DAY_MS >= 7) {
      volvio = used.some((d) => {
        const gap = (toTime(d.dia) - start) / DAY_MS;
        return gap >= 1 && gap <= 7;
      });
    }
  }

  const now = toTime(today);
  const weeks = new Set(
    used.map((d) => Math.floor((now - toTime(d.dia)) / DAY_MS / 7)).filter((w) => w >= 0 && w < 4),
  );

  return {
    mes,
    diasActivosMes: thisMonth.length,
    entregablesMes: sum(thisMonth, 'entregable'),
    exportacionesMes: sum(thisMonth, 'exportacion'),
    examenesMes: sum(thisMonth, 'examen'),
    volvioLaSemanaSiguiente: volvio,
    semanasActivasUltimas4: weeks.size,
    coleccionesCompartidas: sum(used, 'coleccion-compartida'),
    talleresCompartidos: sum(used, 'taller'),
    cifrasVencidas,
  };
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** The text the student can copy: counts and the month, never dates, ids, names or content. */
export function anonymousSummary(m: UsageMetrics): string {
  const month = `${MONTHS[Number(m.mes.slice(5, 7)) - 1]} de ${m.mes.slice(0, 4)}`;
  const volvio =
    m.volvioLaSemanaSiguiente === null ? 'aún no se sabe' : m.volvioLaSemanaSiguiente ? 'sí' : 'no';
  return [
    `Resumen anónimo de uso de ÁBACO (${month})`,
    `Días de uso en el mes: ${m.diasActivosMes}`,
    `Entregables resueltos en el mes: ${m.entregablesMes}`,
    `Exportaciones a Excel o PDF en el mes: ${m.exportacionesMes}`,
    `Exámenes de práctica en el mes: ${m.examenesMes}`,
    `Volvió la semana siguiente a su primer uso: ${volvio}`,
    `Semanas con uso en las últimas 4: ${m.semanasActivasUltimas4}`,
    `Colecciones compartidas: ${m.coleccionesCompartidas}`,
    `Talleres compartidos (modo profesor): ${m.talleresCompartidos}`,
    `Cifras normativas vencidas a la vista: ${m.cifrasVencidas}`,
  ].join('\n');
}
