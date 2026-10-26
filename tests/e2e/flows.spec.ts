import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { mockDataApis, open } from './helpers';

test.describe('recorridos reales de un estudiante', () => {
  test('de la portada a un subtema, eligiendo carrera y ciclo', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tus materias, tema por tema');
    await page.getByRole('link', { name: /Elige tu carrera y tu ciclo/ }).click();
    await page
      .getByRole('group', { name: 'Carrera' })
      .getByRole('button', { name: 'Contabilidad y auditoría' })
      .click();
    await page.getByRole('button', { name: '1.º ciclo' }).click();
    await expect(page).toHaveURL(/carrera=contabilidad-auditoria&ciclo=1/);
    const cycle = page.getByRole('region', { name: '1.º ciclo' });
    await cycle.getByRole('link', { name: /^Contabilidad general/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Contabilidad general/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contabilidad y auditoría · 1.º ciclo' })).toBeVisible();
    await page.getByRole('link', { name: /La ecuación contable/ }).click();
    const subtopic = page.getByRole('button', { name: 'Activo, pasivo y patrimonio', exact: true });
    await subtopic.click();
    await expect(subtopic).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Errores frecuentes').first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Principles of Accounting, Volume 1/ }).first(),
    ).toBeVisible();
  });

  test('la carrera y el ciclo elegidos se recuerdan en la portada', async ({ page }) => {
    await open(page, '/materias?carrera=economia&ciclo=3');
    await expect(
      page.getByRole('region', { name: '3.º ciclo' }).getByRole('link', { name: /^Macroeconomía/ }),
    ).toBeVisible();
    await page.getByRole('button', { name: /Agregar las de este ciclo/ }).click();
    await open(page, '/');
    await expect(page.getByRole('link', { name: /Economía · 3\.º ciclo/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Macroeconomía', exact: true })).toBeVisible();
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
    await expect(page.getByRole('listbox', { name: 'Resultados' }).getByRole('option').first()).toContainText(
      /Punto de equilibrio/,
    );
    await page.keyboard.press('Enter');
    // The first result may be the formula or the break-even tool: both are the right answer.
    await expect(page).toHaveURL(/formulas\/punto-equilibrio|herramientas\/equilibrio/);
  });

  test('práctica: responder bien registra el intento', async ({ page }) => {
    await open(page, '/practica/ej-cg-patrimonio');
    await page.getByLabel(/Tu respuesta/).fill('32.700');
    await page.getByRole('button', { name: 'Comprobar' }).click();
    await expect(page.getByText('¡Correcto!')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tus intentos' })).toBeVisible();
  });
});

test.describe('herramientas', () => {
  test('rol de pagos con el aporte personal al IESS', async ({ page }) => {
    await open(page, '/herramientas/rol-pagos');
    const salary = page.getByLabel(/Sueldo mensual/);
    await salary.fill('1000');
    await expect(page.getByText(/905,50/).first()).toBeVisible();
    await expect(page.getByText(/Código del Trabajo, art\. 113/).first()).toBeVisible();
  });

  test('IVA desde la base imponible', async ({ page }) => {
    await open(page, '/herramientas/impuestos');
    await page.getByLabel(/Precio sin IVA/).fill('200');
    await expect(page.getByText(/30,00/).first()).toBeVisible();
  });

  test('datos macro del Banco Mundial con su fuente y licencia', async ({ page }) => {
    await mockDataApis(page);
    await open(page, '/herramientas/macro');
    await expect(page.getByText(/World Development Indicators \(CC BY 4\.0\)/).first()).toBeVisible();
    await expect(page.getByRole('figure').first()).toBeVisible();
  });

  test('cada materia ofrece herramientas propias y tecnología externa', async ({ page }) => {
    await open(page, '/materia/talento-humano');
    await expect(page.getByRole('heading', { name: 'Herramientas para esta materia' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Apps externas recomendadas' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Sitio oficial de Ministerio del Trabajo — servicios en línea' }),
    ).toHaveAttribute('href', 'https://sut.trabajo.gob.ec/');
  });
});

test.describe('buzón de sugerencias', () => {
  test('rechaza groserías y, con un mensaje válido, prepara el correo y muestra las redes del autor', async ({
    page,
  }) => {
    await open(page, '/sugerencias?tipo=materia&materia=contabilidad-costos');
    await page
      .getByLabel('Tu sugerencia *')
      .fill('Esta materia es una mierda, pongan más ejercicios de costos por procesos');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Enviar sugerencia' }).click();
    await expect(page.getByText(/palabras ofensivas/)).toBeVisible();

    await page
      .getByLabel('Tu sugerencia *')
      .fill('Faltan ejercicios de costeo por procesos con producción equivalente en Contabilidad de costos.');
    await page.getByRole('button', { name: 'Enviar sugerencia' }).click();
    await expect(page.getByRole('heading', { name: '¡Gracias por ayudar a mejorar ÁBACO!' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Abrir mi correo otra vez' })).toHaveAttribute(
      'href',
      /^mailto:diegofgz2004@gmail\.com\?subject=/,
    );
    await expect(
      page.getByRole('heading', { name: 'Visita mis otras redes y mis otros trabajos' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Estos son mis proyectos' })).toBeVisible();
    await expect(page.locator('main').getByRole('link', { name: /Instagram/ })).toHaveAttribute(
      'href',
      'https://www.instagram.com/diego.granda.z/',
    );
    await expect(page.locator('main').getByRole('link', { name: /LinkedIn/ })).toHaveAttribute(
      'href',
      /linkedin\.com\/in\/diego-francisco-g/,
    );
  });
});

test.describe('legal', () => {
  test('pie de página, privacidad del buzón y avisos de licencias de terceros', async ({ page, request }) => {
    await open(page, '/');
    await page.getByRole('navigation', { name: 'Legal' }).getByRole('link', { name: 'Privacidad' }).click();
    await expect(page.getByRole('heading', { name: 'Buzón de sugerencias' })).toBeVisible();
    await expect(page.getByText(/LOPDP arts\. 7\.1 y 8/).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PDF que envías al autor' })).toBeVisible();
    await page.getByRole('link', { name: 'Licencias y créditos' }).click();
    const link = page.getByRole('link', { name: /Avisos de licencias de terceros/ });
    const href = await link.getAttribute('href');
    const response = await request.get(href ?? '');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('react 19.3.1 — MIT');
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

test('móvil: navegación inferior, materias por carrera y buzón @movil', async ({ page }) => {
  await open(page, '/');
  const nav = page.getByRole('navigation', { name: 'Principal (móvil)' });
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: 'Materias' }).click();
  await page.getByRole('group', { name: 'Carrera' }).getByRole('button', { name: 'Finanzas' }).click();
  await page.getByRole('button', { name: '3.º ciclo' }).click();
  await expect(
    page.getByRole('region', { name: '3.º ciclo' }).getByRole('link', { name: /^Finanzas corporativas/ }),
  ).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await open(page, '/sugerencias');
  await expect(page.getByRole('button', { name: 'Enviar sugerencia' })).toBeVisible();
});

test.describe('área de estudio', () => {
  const pdf = join(import.meta.dirname, '..', 'fixtures', 'apuntes-costos.pdf');

  test('lee un PDF real en el navegador, arma un examen mezclado y lo califica', async ({ page }) => {
    await open(page, '/estudiar?materia=contabilidad-costos');
    await page.getByRole('tab', { name: /Mis PDF/ }).click();
    await page.getByLabel('Agregar un PDF').setInputFiles(pdf);
    const list = page.getByRole('list', { name: 'PDF guardados' });
    await expect(list.getByText('apuntes-costos.pdf')).toBeVisible({ timeout: 20_000 });
    await expect(list.getByText(/6 definiciones encontradas/)).toBeVisible();

    await page.getByRole('tab', { name: 'Repasar' }).click();
    await page.getByRole('button', { name: /De tu PDF: apuntes-costos\.pdf/ }).click();
    await expect(page.locator('dt').getByText('Margen de contribución', { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Examen' }).click();
    await page.getByText('Mezclado', { exact: true }).click();
    await page.getByText('5', { exact: true }).click();
    await page.getByRole('button', { name: /Empezar examen/ }).click();
    await expect(page.getByRole('group', { name: /Pregunta \d/ })).toHaveCount(5);
    await page.getByRole('button', { name: /Calificar/ }).click();
    await expect(page.getByText(/de 5 correctas/)).toBeVisible();
  });

  test('prepara el envío del PDF al autor después de validarlo', async ({ page }) => {
    await open(page, '/estudiar?materia=contabilidad-costos');
    await page.getByRole('tab', { name: /Mis PDF/ }).click();
    await page.getByLabel('Agregar un PDF').setInputFiles(pdf);
    await page
      .getByRole('list', { name: 'PDF guardados' })
      .getByRole('button', { name: /Enviar al autor/ })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Enviar el PDF al autor' });
    await dialog
      .getByLabel(/Qué contiene/)
      .fill('Resumen propio del capítulo de costo volumen utilidad con definiciones para el examen.');
    await dialog.getByLabel(/Soy autor del documento/).check();
    await dialog.getByLabel(/Acepto que/).check();
    await dialog.getByRole('button', { name: /Enviar al autor/ }).click();
    await expect(page.getByRole('dialog', { name: '¡Gracias por compartir!' })).toBeVisible();
    await expect(page.getByText(/Adjunta el archivo «apuntes-costos\.pdf»/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Estos son mis proyectos' })).toBeVisible();
  });
});
