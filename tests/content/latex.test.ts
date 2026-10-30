import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { loadAllContent } from './load-content';

const content = loadAllContent();

// Same options as scripts/build-math.ts: a formula KaTeX rejects would otherwise only fail at build time.
const typeset = (latex: string, displayMode: boolean) =>
  katex.renderToString(latex, { displayMode, throwOnError: true, output: 'html', strict: 'error', trust: false });

describe('LaTeX de las fórmulas', () => {
  it('every formula and every variable symbol typesets with KaTeX in strict mode', () => {
    const errores: string[] = [];
    for (const f of content.formulas) {
      const pieces: [string, boolean][] = [[f.latex, true], ...f.variables.map((v): [string, boolean] => [v.simbolo, false])];
      for (const [latex, display] of pieces) {
        try {
          typeset(latex, display);
        } catch (error) {
          errores.push(`${f.id}: ${latex} (${(error as Error).message.split('\n')[0]})`);
        }
      }
    }
    expect(errores).toEqual([]);
  });
});
