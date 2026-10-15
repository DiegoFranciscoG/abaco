import { expect, test } from '@playwright/test';
import { open } from './helpers';

test.describe('recorridos reales de un estudiante', () => {
  test('de la portada a un subtema, pasando por la malla oficial', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu malla real');
    await page.getByRole('link', { name: /Ver mi malla/ }).click();
    await expect(page.getByRole('heading', { name: 'Elige una carrera' })).toBeVisible();
    await page.getByRole('link', { name: /Contabilidad y Auditoría/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Contabilidad y Auditoría' })).toBeVisible();
    await expect(page.getByText(/Fuente:/).first()).toBeVisible();
    await page.getByRole('link', { name: /Contabilidad General/ }).first().click();
    await expect(page.getByRole('heading', { name: /Temario/ })).toBeVisible();
    await page.getByRole('link', { name: /La ecuación contable/ }).click();
    const subtopic = page.getByRole('button', { name: 'Activo, pasivo y patrimonio', exact: true });
    await subtopic.click();
    await expect(subtopic).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Errores frecuentes').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /OpenStax|Principles of Accounting/ }).first()).toBeVisible();
  });

  test('la malla muestra las diferencias con lo declarado por la universidad', async ({ page }) => {
    await open(page, '/carrera/ucacue-contabilidad-auditoria');
    await expect(page.getByText(/declara/)).toContainText('40');
    await expect(page.getByText(/declara/)).toContainText('38');
  });

  test('ficha de fórmula: calculadora en vivo y sintaxis de Excel en español', async ({ page }) => {
    await open(page, '/formulas/cuota-prestamo');
    await expect(page.getByRole('heading', { name: /Cuota fija de un préstamo/ })).toBeVisible();
    await expect(page.locator('code', { hasText: '=PAGO(0,0125;24;-12000)' }).first()).toBeVisible();
    const amount = page.getByLabel(/Monto del préstamo/);
    await amount.fill('6000');
    await expect(page.getByText(/Resultado =/).locator('..')).toContainText('290,9');
    await expect(page.getByText('Verificado automáticamente')).toBeVisible();
  });

  test('buscador de fórmulas sin tildes y por nombre de función', async ({ page }) => {
    await open(page, '/formulas');
    await page.getByLabel('Buscar fórmula', { exact: true }).fill('depreciacion');
    await expect(page.getByRole('link', { name: /Depreciación en línea recta/ })).toBeVisible();
    await page.getByLabel('Buscar fórmula', { exact: true }).fill('VNA');
    await expect(page.getByRole('link', { name: /Valor actual neto/ })).toBeVisible();
  });

  test('búsqueda global con Ctrl+K', async ({ page }) => {
    await open(page, '/');
    await page.keyboard.press('Control+k');
    const box = page.getByRole('combobox', { name: 'Escribe lo que buscas' });
    await box.fill('punto de equilibrio');
    await expect(page.getByRole('listbox', { name: 'Resultados' }).getByRole('option').first()).toContainText(/Punto de equilibrio/);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/formulas\/punto-equilibrio/);
  });

  test('práctica: responder bien registra el intento', async ({ page }) => {
    await open(page, '/practica/ej-cg-patrimonio');
    await page.getByLabel(/Tu respuesta/).fill('32.700');
    await page.getByRole('button', { name: 'Comprobar' }).click();
    await expect(page.getByText('¡Correcto!')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tus intentos' })).toBeVisible();
  });

  test('comparador de mallas entre universidades', async ({ page }) => {
    await open(page, '/comparar');
    await expect(page.getByText(/asignaturas con el mismo nombre en ambas mallas/)).toBeVisible();
    await expect(page.getByText('en ambas').first()).toBeVisible();
  });
});

test.describe('laboratorio', () => {
  test('plantilla de amortización con comprobación automática y descarga .xlsx', async ({ page }) => {
    await open(page, '/laboratorio');
    await page.getByRole('link', { name: /Tabla de amortización/ }).click();
    await expect(page.getByText('Comprobación de la plantilla')).toBeVisible();
    await expect(page.getByText('Correcto')).toHaveCount(3);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: '.xlsx' }).click();
    expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test('escribir una fórmula en español con sugerencias', async ({ page }) => {
    await open(page, '/laboratorio/nueva');
    await expect(page.getByRole('grid', { name: 'Hoja de cálculo' })).toBeVisible();
    const bar = page.getByLabel('Contenido de la celda A1');
    await bar.click();
    await bar.fill('=PA');
    await expect(page.getByRole('listbox', { name: 'Funciones sugeridas' })).toContainText('PAGO');
    await bar.fill('=REDONDEAR(PAGO(1%;12;-1000);2)');
    await bar.press('Enter');
    await expect(page.getByRole('gridcell', { name: /^A1: 88,85/ })).toBeVisible();
    await expect(page.getByText('Guardado en este dispositivo')).toBeVisible();
  });
});

test('móvil: navegación inferior y portada @movil', async ({ page }) => {
  await open(page, '/');
  const nav = page.getByRole('navigation', { name: 'Principal (móvil)' });
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: 'Fórmulas' }).click();
  await expect(page.getByRole('heading', { name: 'Fórmulas verificadas' })).toBeVisible();
});
