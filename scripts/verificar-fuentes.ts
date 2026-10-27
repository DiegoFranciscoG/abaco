/**
 * Checks that every cited section says what the subtopic claims: downloads the text of the cited page (OpenStax
 * section or official PDF) and looks for the evidence words written in content/evidencias.json.
 *   node scripts/verificar-fuentes.ts [materia...]
 * Writes docs/verificacion-contenido.md. Downloads are cached in .cache/fuentes (not versioned).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Evidencia {
  /** Subtopic or exercise id. */
  id: string;
  /** Words (or word starts) that must appear in the cited text, in lower case without accents. */
  palabras: string[];
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, '.cache', 'fuentes');
mkdirSync(cacheDir, { recursive: true });
const read = (file: string) => JSON.parse(readFileSync(join(root, 'content', file), 'utf8'));
const fuentes = new Map<string, { url: string; titulo: string }>(
  read('fuentes.json').map((f: { id: string; url: string; titulo: string }) => [f.id, f]),
);
const evidencias = new Map<string, string[]>(
  (read('evidencias.json') as Evidencia[]).map((e) => [e.id, e.palabras]),
);
const only = new Set(process.argv.slice(2));

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ');

async function pdfText(bytes: Uint8Array): Promise<string> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await getDocument({
    data: bytes,
    disableFontFace: true,
    useWasm: false,
    isEvalSupported: false,
  }).promise;
  let out = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it) => ('str' in it ? it.str : '')).join(' ') + '\n';
  }
  return out;
}

async function textOf(url: string): Promise<string> {
  const file = join(cacheDir, createHash('sha256').update(url).digest('hex').slice(0, 24) + '.txt');
  if (existsSync(file)) return readFileSync(file, 'utf8');
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (ABACO verificacion de fuentes)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  const bytes = new Uint8Array(await res.arrayBuffer());
  const text =
    type.includes('pdf') || url.toLowerCase().endsWith('.pdf')
      ? await pdfText(bytes)
      : new TextDecoder()
          .decode(bytes)
          .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;|&#160;/g, ' ')
          .replace(/&amp;/g, '&');
  writeFileSync(file, fold(text));
  return fold(text);
}

interface Row {
  materia: string;
  id: string;
  url: string;
  seccion: string;
  encontradas: string[];
  faltan: string[];
  error?: string;
}

const rows: Row[] = [];
for (const file of readdirSync(join(root, 'content', 'temarios'))) {
  const temario = read(`temarios/${file}`);
  if (only.size > 0 && !only.has(temario.materia)) continue;
  for (const tema of temario.temas) {
    for (const s of tema.subtemas) {
      const palabras = evidencias.get(s.id);
      if (!palabras) continue;
      const url = s.fuente.url ?? fuentes.get(s.fuente.ref)?.url ?? '';
      const row: Row = {
        materia: temario.materia,
        id: s.id,
        url,
        seccion: s.fuente.seccion ?? '',
        encontradas: [],
        faltan: [],
      };
      try {
        // Removing the tags leaves stray spaces ("y -intercept", "( iqr )"), so words are compared without spaces.
        const text = (await textOf(url)).replace(/\s/g, '');
        for (const p of palabras)
          (text.includes(fold(p).replace(/\s/g, '')) ? row.encontradas : row.faltan).push(p);
      } catch (error) {
        row.error = (error as Error).message;
      }
      rows.push(row);
    }
  }
}

const bad = rows.filter((r) => r.error || r.faltan.length > 0);
const md = [
  '# Verificación del contenido por subtema',
  '',
  `Generado con \`node scripts/verificar-fuentes.ts\` el ${new Date().toISOString().slice(0, 10)}. Para cada subtema se descargó el texto de la sección citada (página oficial de OpenStax, norma o documento oficial) y se comprobó que contiene las palabras clave del concepto que explica (\`content/evidencias.json\`). La redacción de ÁBACO es propia: la fuente se usa para verificar, no se copia.`,
  '',
  `**${rows.length - bad.length} de ${rows.length} subtemas verificados.**`,
  '',
  '| Materia | Subtema | Sección citada | Evidencia encontrada |',
  '|---|---|---|---|',
  ...rows.map(
    (r) =>
      `| ${r.materia} | ${r.id} | ${r.seccion.replace(/\|/g, '/')} | ${r.error ? `ERROR ${r.error}` : r.encontradas.join(', ')}${r.faltan.length ? ` · FALTA: ${r.faltan.join(', ')}` : ''} |`,
  ),
  '',
].join('\n');
if (only.size === 0) writeFileSync(join(root, 'docs', 'verificacion-contenido.md'), md);
for (const r of bad)
  console.log(`✗ ${r.materia} ${r.id}: ${r.error ?? 'falta ' + r.faltan.join(', ')} (${r.url})`);
console.log(`${rows.length - bad.length} de ${rows.length} subtemas verificados.`);
if (bad.length > 0) process.exitCode = 1;
