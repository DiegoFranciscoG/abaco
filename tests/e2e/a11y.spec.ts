import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { open } from './helpers';

const VIEWS = [
  '/',
  '/materias',
  '/materias?carrera=contabilidad-auditoria&ciclo=2',
  '/materia/contabilidad-general',
  '/materia/contabilidad-general/tema/cg-partida-doble?s=cg-partida-doble-reglas',
  '/herramientas',
  '/herramientas/rol-pagos',
  '/herramientas/impuestos',
  '/herramientas/editor',
  '/herramientas/diario',
  '/herramientas/graficador',
  '/herramientas/estadistica',
  '/formulas',
  '/formulas/van',
  '/laboratorio',
  '/buscar',
  '/practica',
  '/practica/ej-ed-media',
  '/mi-espacio',
  '/apps',
  '/glosario',
  '/ajustes',
  '/acerca',
  '/sugerencias',
  '/legal/privacidad',
  '/legal/licencias',
];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`accesibilidad (${scheme === 'light' ? 'modo claro' : 'modo oscuro'})`, () => {
    test.use({ colorScheme: scheme });
    for (const view of VIEWS) {
      test(`sin violaciones graves: ${view}`, async ({ page }) => {
        await open(page, view);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(400);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const serious = results.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
        expect(serious).toEqual([]);
      });
    }
  });
}

test('la laboratorio se maneja con el teclado', async ({ page }) => {
  await open(page, '/laboratorio/nueva');
  const grid = page.getByRole('grid', { name: 'Hoja de cálculo' });
  await grid.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByLabel('Celda seleccionada')).toHaveText('B2');
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('gridcell', { name: 'B2: 5' })).toBeVisible();
});
