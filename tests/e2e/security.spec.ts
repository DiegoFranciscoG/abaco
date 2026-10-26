import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { open } from './helpers';

/** Anti-clickjacking: another site that frames ÁBACO only sees a link to open it in its own tab. */
test('S-01: la app se oculta dentro de un marco ajeno', async ({ page, baseURL }) => {
  await page.setContent(`<!doctype html><title>sitio ajeno</title><iframe src="${baseURL}/#/ajustes" width="800" height="600"></iframe>`);
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('.framed-notice')).toBeVisible();
  await expect(frame.locator('html')).toHaveAttribute('data-framed', 'true');
  await expect(frame.locator('body')).toBeHidden();
});

/** Script injection through the editor never runs: the Markdown is rendered as React elements. */
test('S-02: el editor no ejecuta HTML ni scripts', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  await open(page, '/herramientas/editor');
  await page.getByRole('button', { name: 'Informe académico' }).click();
  await page.getByLabel('Contenido del documento').fill('<img src=x onerror="alert(1)"> <script>alert(2)</script> [x](javascript:alert(3))');
  await page.waitForTimeout(500);
  expect(dialogs).toEqual([]);
  await expect(page.locator('article[aria-label="Vista previa"] img')).toHaveCount(0);
  await expect(page.locator('article[aria-label="Vista previa"] a[href^="javascript"]')).toHaveCount(0);
});

/** A tampered backup is rejected before touching the local database. */
test('S-03: un respaldo manipulado no se restaura', async ({ page }, testInfo) => {
  mkdirSync(testInfo.outputDir, { recursive: true });
  const file = join(testInfo.outputDir, 'respaldo-malicioso.json');
  writeFileSync(
    file,
    JSON.stringify({ formato: 'abaco-respaldo', version: 3, datos: { apuntes: [{ id: '<script>alert(1)</script>', refTipo: 'eval', contenido: 'x'.repeat(30_000) }] } }),
  );
  await open(page, '/ajustes');
  await page.locator('input[type=file][accept*="json"]').setInputFiles(file);
  await expect(page.getByText(/no es un respaldo válido|no se pudo|inválid/i).first()).toBeVisible();
  await open(page, '/mi-espacio');
  await expect(page.getByText('<script>alert(1)</script>')).toHaveCount(0);
});
