import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { temarioSchema } from '../../src/domain/content/schemas';
import { DELIVERABLES } from '../../src/domain/deliverables/catalog';
import { computeSheet } from '../../src/domain/sheet/sheet';
import { exportXlsx, importSpreadsheet } from '../../src/domain/sheet/xlsx';
import { templateToCells } from '../../src/features/lab/convert';
import { CONTENT_ROOT, loadAllContent } from './load-content';

const content = loadAllContent();

describe('plantillas de Excel por materia', () => {
  it.each(content.plantillas.map((p) => [p.id, p] as const))(
    '%s: the downloaded .xlsx, opened again, gives the verified numbers',
    (_id, plantilla) => {
      const bytes = exportXlsx(templateToCells(plantilla, 'en'), plantilla.formatos, 'en', plantilla.nombre);
      const back = importSpreadsheet(bytes, 'en');
      const results = computeSheet(back.cells, 'en');
      for (const check of plantilla.verificacion) {
        const value = results[check.celda]?.value;
        expect(typeof value, `${plantilla.id}!${check.celda}`).toBe('number');
        expect(Math.abs((value as number) - check.esperado), `${plantilla.id}!${check.celda}`).toBeLessThanOrEqual(
          check.tolerancia + 1e-9,
        );
      }
      // Formulas travel as formulas, not as frozen numbers.
      const formulas = Object.values(plantilla.celdas).filter((c) => typeof c === 'string' && c.startsWith('='));
      expect(Object.values(back.cells).filter((c) => c.startsWith('=')).length).toBe(formulas.length);
    },
  );

  it('every subject with calculation subtopics has at least one Excel: a template or a deliverable', () => {
    const missing = content.materias.filter((m) => {
      const temario = temarioSchema.parse(
        JSON.parse(readFileSync(join(CONTENT_ROOT, 'temarios', `${m.id}.json`), 'utf8')),
      );
      const calculation = temario.temas.some((t) => t.subtemas.some((s) => s.formulas.length > 0));
      const excel =
        content.plantillas.some((p) => p.materias.includes(m.id)) ||
        DELIVERABLES.some((d) => d.materias.includes(m.id));
      return calculation && !excel;
    });
    expect(missing.map((m) => m.id)).toEqual([]);
  });
});
