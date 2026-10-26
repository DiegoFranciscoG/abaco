import { describe, expect, it } from 'vitest';
import { INDICADORES, mayBeOutdated, periodLabel } from '../../src/domain/content/indicadores';
import { imageFileName, wrapText } from '../../src/features/figures/share-image';

describe('Ecuador en cifras', () => {
  it('names the month of each monthly statistic', () => {
    expect(periodLabel('2026-09')).toBe('septiembre de 2026');
    expect(periodLabel('2026-10')).toBe('octubre de 2026');
    expect(INDICADORES.find((i) => i.id === 'inflacion-anual')).toMatchObject({
      valor: 1.34,
      periodo: '2026-09',
    });
  });

  it('says a statistic may be outdated from the day a newer one is usually published', () => {
    expect(mayBeOutdated({ actualizar_desde: '2026-11-10' }, '2026-11-09')).toBe(false);
    expect(mayBeOutdated({ actualizar_desde: '2026-11-10' }, '2026-11-10')).toBe(true);
  });

  it('wraps long titles for the shared image and keeps file names plain', () => {
    const ctx = { measureText: (t: string) => ({ width: t.length * 10 }) as TextMetrics };
    expect(wrapText(ctx, 'Tabla del impuesto a la renta de personas naturales', 200)).toEqual([
      'Tabla del impuesto a',
      'la renta de personas',
      'naturales',
    ]);
    expect(wrapText(ctx, 'Supercalifragilisticoespialidoso', 50)).toEqual([
      'Supercalifragilisticoespialidoso',
    ]);
    expect(imageFileName('Salario básico unificado')).toBe('abaco-salario-basico-unificado.png');
    expect(imageFileName('¿?')).toBe('abaco-cifra.png');
  });
});
