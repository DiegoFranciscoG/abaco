/**
 * Breaks down a PDF received through the study area so it can be reviewed before any content is added:
 * which subjects and subtopics of the catalog it covers, which definitions and figures it states, and whether it
 * carries personal data. Nothing is added automatically: every fact still has to be checked against an official
 * source and rewritten (docs/legal.md, CONTRIBUTING.md).
 *
 * Usage: npm run pdf:analizar -- ruta/al/archivo.pdf [informe.md]
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { Materia, Temario } from '../src/domain/content/schemas.ts';
import {
  cleanPdfText,
  findDefinitions,
  personalDataCounts,
  splitSentences,
  subjectRelevance,
} from '../src/domain/study/analyze.ts';

const [, , pdfPath, outPath] = process.argv;
if (!pdfPath) {
  console.error('Uso: npm run pdf:analizar -- ruta/al/archivo.pdf [informe.md]');
  process.exit(2);
}

const root = join(import.meta.dirname, '..');
const read = <T>(file: string): T => JSON.parse(readFileSync(join(root, 'content', file), 'utf8')) as T;
const materias = read<Materia[]>('materias.json');
const temarios = new Map(
  readdirSync(join(root, 'content', 'temarios')).map((f) => {
    const t = read<Temario>(`temarios/${f}`);
    return [t.materia, t] as const;
  }),
);

const data = new Uint8Array(readFileSync(pdfPath));
if (String.fromCharCode(...data.slice(0, 5)) !== '%PDF-') {
  console.error('El archivo no es un PDF.');
  process.exit(1);
}
const task = getDocument({ data, disableFontFace: true, useWasm: false, verbosity: 0 });
const doc = await task.promise;
let raw = '';
for (let i = 1; i <= doc.numPages; i++) {
  const content = await (await doc.getPage(i)).getTextContent();
  for (const item of content.items) if ('str' in item) raw += item.str + (item.hasEOL ? '\n' : ' ');
  raw += '\n';
}
const pages = doc.numPages;
await task.destroy();

const text = cleanPdfText(raw);
const ranking = materias
  .map((m) => ({ materia: m, rel: subjectRelevance(text, m, temarios.get(m.id) as Temario) }))
  .sort((a, b) => b.rel.puntaje - a.rel.puntaje);
const definitions = findDefinitions(splitSentences(text));
const figures = [...new Set(text.match(/(?:USD\s?|\$\s?)\d[\d.,]*|\d[\d.,]*\s?%/g) ?? [])].slice(0, 30);
const personal = personalDataCounts(text);

const lines = [
  `# Análisis de «${basename(pdfPath)}»`,
  '',
  `${pages} páginas · ${text.length.toLocaleString('es-EC')} caracteres de texto.`,
  '',
  personal.cedulas + personal.telefonos + personal.correos > 0
    ? `**Datos personales detectados:** ${personal.cedulas} cédulas o RUC, ${personal.telefonos} teléfonos, ${personal.correos} correos. No usar ni reenviar sin anonimizar.`
    : 'Sin datos personales detectados (cédulas, teléfonos, correos).',
  '',
  '## Materias que más coinciden',
  '',
  '| Materia | Coincidencia | Subtemas con más términos |',
  '|---|---|---|',
  ...ranking.slice(0, 5).map(
    ({ materia, rel }) =>
      `| ${materia.nombre} | ${Math.round(rel.puntaje * 100)} % | ${
        rel.subtemas
          .slice(0, 4)
          .map((s) => `${s.nombre} (${s.coincidencias})`)
          .join(', ') || '—'
      } |`,
  ),
  '',
  `## Definiciones encontradas (${definitions.length})`,
  '',
  ...(definitions.length
    ? definitions.map((d) => `- **${d.termino}**: ${d.oracion}`)
    : ['Ninguna con la forma «X es…» o «X se define como…».']),
  '',
  '## Cifras mencionadas',
  '',
  figures.length ? figures.join(' · ') : 'Ninguna.',
  '',
  '## Próximos pasos',
  '',
  '1. Confirmar que quien envió el PDF declaró ser autor o tener permiso.',
  '2. Verificar cada dato que se quiera usar en una fuente oficial o abierta y anotarla en docs/investigacion.md.',
  '3. Redactar de nuevo (no copiar) el subtema, el ejemplo o el ejercicio, con su fuente, y correr `npm run content:check`.',
  '4. Responder al remitente si lo pidió y borrar el PDF y el correo al terminar (máximo 12 meses).',
  '',
];
const report = lines.join('\n');
if (outPath) {
  writeFileSync(outPath, report);
  console.log(`Informe guardado en ${outPath}`);
} else {
  console.log(report);
}
