import { describe, expect, it } from 'vitest';
import { anonymousSummary, usageMetrics, type UsageDay } from '../../src/domain/usage/metrics';

const days: UsageDay[] = [
  { dia: '2026-09-28', eventos: { apertura: 1, entregable: 2 } },
  { dia: '2026-10-02', eventos: { apertura: 1, exportacion: 1, 'coleccion-compartida': 1 } },
  { dia: '2026-10-20', eventos: { apertura: 1, entregable: 1, examen: 2, taller: 1 } },
  { dia: '2026-10-25', eventos: { apertura: 1, exportacion: 3 } },
  { dia: '2026-10-26', eventos: {} },
];

describe('medición local', () => {
  it('counts days, deliverables and exports of the current month only', () => {
    const m = usageMetrics(days, '2026-10-26', 0);
    expect(m).toMatchObject({
      mes: '2026-10',
      diasActivosMes: 3,
      entregablesMes: 1,
      exportacionesMes: 4,
      examenesMes: 2,
      coleccionesCompartidas: 1,
      talleresCompartidos: 1,
      cifrasVencidas: 0,
    });
  });

  it('knows whether the student came back in the week after the first day, once that week is over', () => {
    expect(usageMetrics(days, '2026-10-26', 0).volvioLaSemanaSiguiente).toBe(true);
    expect(usageMetrics(days.slice(0, 1), '2026-10-02', 0).volvioLaSemanaSiguiente).toBeNull();
    expect(usageMetrics([days[0]!, days[2]!], '2026-10-26', 0).volvioLaSemanaSiguiente).toBe(false);
    expect(usageMetrics([], '2026-10-26', 0).volvioLaSemanaSiguiente).toBeNull();
  });

  it('counts the weeks with use among the last four', () => {
    // 2026-10-25 → week 0; 2026-10-20 → week 0; 2026-10-02 → week 3; 2026-09-28 → week 4 (outside).
    expect(usageMetrics(days, '2026-10-26', 0).semanasActivasUltimas4).toBe(2);
  });

  it('the anonymous summary has counts and the month, never days or identifiers', () => {
    const text = anonymousSummary(usageMetrics(days, '2026-10-26', 0));
    expect(text).toContain('(octubre de 2026)');
    expect(text).toContain('Días de uso en el mes: 3');
    expect(text).toContain('Cifras normativas vencidas a la vista: 0');
    expect(text).not.toMatch(/2026-\d\d-\d\d/);
  });
});
