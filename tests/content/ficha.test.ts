/**
 * Validator of one subject's sheets ("fichas"), for the author while writing content:
 *   npm run ficha -- -t contabilidad-general
 * It fails on any real error (schema, source, undeclared normative figure, arithmetic, exercise) and prints what is
 * still missing to reach the depth standard, which is progress to do, not an error.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkArithmetic } from '../../src/domain/content/arithmetic';
import { materiaCoverage } from '../../src/domain/content/coverage';
import { temarioSchema } from '../../src/domain/content/schemas';
import { detectCifras, ejercicioText, subtemaText } from '../../src/domain/content/vigencia';
import { CONTENT_ROOT, loadAllContent } from './load-content';

const content = loadAllContent();
const fuentes = new Set(content.fuentes.map((f) => f.id));
const formulas = new Set(content.formulas.map((f) => f.id));

describe('ficha', () => {
  for (const materia of content.materias) {
    it(materia.id, () => {
      const raw = JSON.parse(readFileSync(join(CONTENT_ROOT, 'temarios', `${materia.id}.json`), 'utf8'));
      const parsed = temarioSchema.safeParse(raw);
      expect(parsed.success, parsed.success ? '' : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')).toBe(true);
      if (!parsed.success) return;
      const temario = parsed.data;
      const ejercicios = content.ejercicios.filter((e) => e.materia === materia.id);
      const errores: string[] = [];
      for (const tema of temario.temas) {
        for (const s of tema.subtemas) {
          if (!fuentes.has(s.fuente.ref)) errores.push(`${s.id}: la fuente «${s.fuente.ref}» no está en fuentes.json`);
          for (const f of s.formulas) if (!formulas.has(f)) errores.push(`${s.id}: la fórmula «${f}» no existe`);
          for (const id of detectCifras(subtemaText(s), content.normativa)) {
            if (!(s.cifras ?? []).includes(id)) errores.push(`${s.id}: menciona la cifra «${id}» y no la declara en "cifras"`);
          }
          for (const i of [...checkArithmetic(s.ejemplo), ...checkArithmetic(s.explicacion)]) {
            errores.push(`${s.id}: ${i.expresion} da ${i.calculado}`);
          }
        }
      }
      for (const e of ejercicios) {
        for (const id of detectCifras(ejercicioText(e), content.normativa)) {
          if (!(e.cifras ?? []).includes(id)) errores.push(`ejercicio ${e.id}: menciona la cifra «${id}» y no la declara`);
        }
        for (const p of e.procedimiento) for (const i of checkArithmetic(p)) errores.push(`ejercicio ${e.id}: ${i.expresion} da ${i.calculado}`);
      }
      expect(errores).toEqual([]);

      const report = materiaCoverage(materia, temario, content.ejercicios);
      const lines = [
        `${materia.nombre}: ${report.unidades} unidades, ${report.subtemas} subtemas, ${report.subtemasCalculoConPractica} de ${report.subtemasCalculo} subtemas de cálculo con 2 ejercicios · avance ${Math.round(report.avance * 100)} %`,
        ...(report.cumple ? ['Cumple el estándar: puede declararse "completa" en materias.json.'] : report.faltantes.map((f) => `  · ${f}`)),
      ];
      console.info(lines.join('\n'));
    });
  }
});
