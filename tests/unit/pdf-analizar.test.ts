import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..');

/** The review tool reads a real PDF (generated with Chromium) with pdf.js in Node and breaks it down. */
describe('herramienta pdf:analizar', () => {
  it('identifies the subject, its definitions and figures of a real PDF', () => {
    const report = execFileSync(
      process.execPath,
      [join(root, 'scripts', 'pdf-analizar.ts'), join(root, 'tests', 'fixtures', 'apuntes-costos.pdf')],
      {
        encoding: 'utf8',
      },
    );
    const firstRow = report.split('\n').find((l) => l.startsWith('| ') && !l.startsWith('| Materia'));
    expect(firstRow).toMatch(/^\| Contabilidad de costos \|/);
    expect(report).toContain('**Margen de contribución**');
    expect(report).toContain('**Punto de equilibrio**');
    expect(report).toContain('USD 4.500');
    expect(report).toContain('Sin datos personales detectados');
  }, 30_000);

  it('refuses files that are not PDFs', () => {
    expect(() =>
      execFileSync(process.execPath, [join(root, 'scripts', 'pdf-analizar.ts'), join(root, 'package.json')], {
        encoding: 'utf8',
        stdio: 'pipe',
      }),
    ).toThrow();
  });
});
