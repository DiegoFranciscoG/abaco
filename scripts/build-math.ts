/**
 * Typesets every formula with KaTeX at build time (one small JSON per formula) so the formula page does not
 * download and run KaTeX on the phone. Output: src/generated/math/<formula-id>.json
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import katex from 'katex';

interface FormulaLike {
  id: string;
  latex: string;
  variables: { simbolo: string }[];
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const formulas = JSON.parse(readFileSync(join(root, 'content', 'formulas.json'), 'utf8')) as FormulaLike[];
const outDir = join(root, 'src', 'generated', 'math');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const render = (latex: string, displayMode: boolean) =>
  katex.renderToString(latex, { displayMode, throwOnError: true, output: 'html', strict: 'error', trust: false });

for (const formula of formulas) {
  const map: Record<string, string> = { [`D:${formula.latex}`]: render(formula.latex, true) };
  for (const v of formula.variables) map[`I:${v.simbolo}`] = render(v.simbolo, false);
  writeFileSync(join(outDir, `${formula.id}.json`), JSON.stringify(map));
}
console.log(`Fórmulas compuestas con KaTeX: ${formulas.length} → src/generated/math/`);
