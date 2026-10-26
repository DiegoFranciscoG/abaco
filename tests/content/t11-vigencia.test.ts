import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DIAS_AVISO,
  detectCifras,
  ejercicioText,
  formulaText,
  isoDay,
  plantillaText,
  subtemaText,
  terminoText,
  vigenciaStatus,
} from '../../src/domain/content/vigencia';
import { TOOLS } from '../../src/domain/tools/catalog';
import { CONTENT_ROOT, loadAllContent } from './load-content';

const content = loadAllContent();
const catalog = content.normativa;
const ids = new Set(catalog.map((c) => c.id));
/** The real date: this suite has to fail on the first day a figure is out of date. ABACO_HOY simulates another day. */
const TODAY = process.env.ABACO_HOY ?? isoDay(new Date());

/** Every record a student reads, with the text where a figure could appear and the figures it declares. */
function records(): { where: string; text: string; cifras: string[] }[] {
  return [
    ...content.temarios.flatMap(({ data }) =>
      data.temas.flatMap((tema) =>
        tema.subtemas.map((s) => ({ where: `subtema ${s.id}`, text: subtemaText(s), cifras: s.cifras ?? [] })),
      ),
    ),
    ...content.formulas.map((f) => ({ where: `fórmula ${f.id}`, text: formulaText(f), cifras: f.cifras ?? [] })),
    ...content.ejercicios.map((e) => ({ where: `ejercicio ${e.id}`, text: ejercicioText(e), cifras: e.cifras ?? [] })),
    ...content.glosario.map((t) => ({ where: `término ${t.id}`, text: terminoText(t), cifras: t.cifras ?? [] })),
    ...content.plantillas.map((p) => ({ where: `plantilla ${p.id}`, text: plantillaText(p), cifras: p.cifras ?? [] })),
  ];
}

/** T-11: no normative figure is shown after its validity, and every figure in the content is tracked. */
describe('T-11: ninguna cifra normativa vencida', () => {
  it('no figure is past its validity today', () => {
    const vencidas = catalog
      .filter((c) => vigenciaStatus(c.vigencia, TODAY).estado === 'vencida')
      .map(
        (c) =>
          `${c.id}: su vigencia terminó el ${c.vigencia.hasta} (ejercicio ${c.vigencia.ejercicio_fiscal}); revísala con docs/revision-anual.md`,
      );
    expect(vencidas).toEqual([]);
  });

  it(`announces the figures that expire in fewer than ${DIAS_AVISO} days without failing`, () => {
    const porVencer = catalog
      .map((cifra) => ({ cifra, status: vigenciaStatus(cifra.vigencia, TODAY) }))
      .filter(({ status }) => status.estado === 'por-vencer');
    for (const { cifra, status } of porVencer) {
      const message = `La cifra «${cifra.id}» vence en ${status.dias} días (${cifra.vigencia.hasta}): revísala con docs/revision-anual.md`;
      // In GitHub Actions this line becomes a warning annotation on the run.
      console.warn(process.env.GITHUB_ACTIONS ? `::warning title=Cifra por vencer::${message}` : message);
    }
    expect(porVencer.every(({ status }) => status.dias >= 0)).toBe(true);
  });

  it('every record that mentions a normative figure declares it', () => {
    const missing = records().flatMap(({ where, text, cifras }) =>
      detectCifras(text, catalog)
        .filter((id) => !cifras.includes(id))
        .map((id) => `${where} menciona «${id}» y no lo declara en "cifras"`),
    );
    expect(missing).toEqual([]);
  });

  it('records only declare figures they mention with their current value', () => {
    // When a value changes (a new SBU, a new table), its patterns change too: any record still showing the old
    // number keeps declaring the figure without matching it, and the yearly review has to rewrite it.
    const stale = records().flatMap(({ where, text, cifras }) => {
      const found = new Set(detectCifras(text, catalog));
      return cifras.filter((id) => ids.has(id) && !found.has(id)).map((id) => `${where} declara «${id}» sin mencionarla`);
    });
    expect(stale).toEqual([]);
  });

  it('records only declare figures that exist in the catalog', () => {
    const unknown = records().flatMap(({ where, cifras }) =>
      cifras.filter((id) => !ids.has(id)).map((id) => `${where} → ${id}`),
    );
    expect(unknown).toEqual([]);
    expect(records().filter((r) => r.cifras.length > 0).length).toBeGreaterThanOrEqual(30);
  });

  it('a template that declares a single-value figure types its current value in a cell', () => {
    // The label says «IVA 15 %», and the cell the formulas use has to hold the same rate, or a new rate would
    // leave the template computing with the old one.
    for (const p of content.plantillas) {
      const numbers = Object.values(p.celdas).filter((c): c is number => typeof c === 'number');
      for (const id of p.cifras ?? []) {
        const cifra = catalog.find((c) => c.id === id);
        if (cifra?.valor === undefined) continue;
        const expected = cifra.unidad === '%' ? cifra.valor / 100 : cifra.valor;
        expect(numbers.some((n) => Math.abs(n - expected) < 1e-9), `${p.id} → ${id} = ${expected}`).toBe(true);
      }
    }
  });

  it('the calculators declare the figures they compute with', () => {
    for (const tool of TOOLS) {
      for (const id of tool.cifras ?? []) expect(ids.has(id), `${tool.id} → ${id}`).toBe(true);
    }
    for (const id of ['rol-pagos', 'impuestos']) {
      expect(TOOLS.find((t) => t.id === id)?.cifras?.length, id).toBeGreaterThan(0);
    }
  });

  it('progressive tables are consistent: each basic tax = previous basic tax + rate × bracket width', () => {
    for (const cifra of catalog) {
      const tramos = cifra.tramos ?? [];
      for (let i = 1; i < tramos.length; i += 1) {
        const prev = tramos[i - 1]!;
        const expected = prev.impuesto_fraccion + ((prev.hasta ?? 0) - prev.desde) * (prev.porcentaje / 100);
        expect(Math.abs(expected - tramos[i]!.impuesto_fraccion), `${cifra.id}, tramo ${i + 1}`).toBeLessThan(1);
      }
    }
  });

  it('the yearly review checklist lists every figure with its official source', () => {
    const doc = readFileSync(join(CONTENT_ROOT, '..', 'docs', 'revision-anual.md'), 'utf8');
    const fuentes = new Map(content.fuentes.map((f) => [f.id, f.url]));
    for (const cifra of catalog) {
      expect(doc, cifra.id).toContain(`\`${cifra.id}\``);
      expect(doc, `${cifra.id}: enlace a su fuente`).toContain(cifra.fuente.url ?? fuentes.get(cifra.fuente.ref) ?? '¿?');
    }
  });
});

/** Monthly statistics do not expire, but the author hears about it when a newer value is probably out. */
describe('indicadores mensuales', () => {
  it('each indicator says which month it describes and when to look for a newer value', () => {
    for (const i of content.indicadores) {
      expect(i.actualizar_desde > `${i.periodo}-01`, i.id).toBe(true);
      if (TODAY >= i.actualizar_desde) {
        const message = `El indicador «${i.id}» (${i.periodo}) puede tener un dato más reciente desde el ${i.actualizar_desde}`;
        console.warn(process.env.GITHUB_ACTIONS ? `::warning title=Indicador por actualizar::${message}` : message);
      }
    }
    expect(content.indicadores.length).toBeGreaterThanOrEqual(8);
  });
});
