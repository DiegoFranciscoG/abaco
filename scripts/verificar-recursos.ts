/**
 * Checks online that every recommended course and video in content/recursos.json is what it says it is:
 * a video must answer YouTube's public oEmbed endpoint with the same title and channel recorded in the file,
 * and a course or official guide page must answer 200 and contain its `frase` (lower case, without accents).
 *   node scripts/verificar-recursos.ts [materia...]
 * Writes docs/verificacion-recursos.md. Nothing is cached: links can disappear, so each run asks again.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Recurso {
  id: string;
  tipo: 'curso' | 'video' | 'guia';
  titulo: string;
  autor: string;
  materias: string[];
  url: string;
  youtube_id?: string;
  frase?: string;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const recursos = JSON.parse(readFileSync(join(root, 'content', 'recursos.json'), 'utf8')) as Recurso[];
const only = new Set(process.argv.slice(2));
const headers = { 'user-agent': 'Mozilla/5.0 (ABACO verificacion de fuentes)' };

const fold = (s: string) =>
  s
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

async function check(r: Recurso): Promise<string | null> {
  if (r.tipo === 'video') {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(r.url)}`, {
      headers,
    });
    if (!res.ok) return `oEmbed respondió ${res.status}`;
    const data = (await res.json()) as { title?: string; author_name?: string };
    // Some channels publish accents as combining marks, so both sides are compared in composed form.
    const same = (a: string | undefined, b: string) => (a ?? '').normalize('NFC') === b.normalize('NFC');
    if (!same(data.title, r.titulo)) return `el título publicado es «${data.title ?? ''}»`;
    if (!same(data.author_name, r.autor)) return `el canal publicado es «${data.author_name ?? ''}»`;
    return null;
  }
  const res = await fetch(r.url, { headers });
  if (!res.ok) return `la página respondió ${res.status}`;
  const text = fold(await res.text());
  return text.includes(fold(r.frase ?? '')) ? null : `no aparece «${r.frase ?? ''}»`;
}

const selected = recursos.filter((r) => only.size === 0 || r.materias.some((m) => only.has(m)));
const fallas: string[] = [];
for (const r of selected) {
  let problema: string | null;
  try {
    problema = await check(r);
  } catch (error) {
    problema = `error de red: ${(error as Error).message}`;
  }
  if (problema) {
    fallas.push(`- ${r.id}: ${problema} (${r.url})`);
    console.log(`✗ ${r.id}: ${problema}`);
  }
}
console.log(`${selected.length - fallas.length} de ${selected.length} recursos verificados.`);

if (only.size === 0) {
  const fecha = new Date().toISOString().slice(0, 10);
  const lines = [
    '# Verificación de cursos y videos recomendados',
    '',
    `Generado por \`node scripts/verificar-recursos.ts\` el ${fecha}.`,
    '',
    'Cada video se consultó en el endpoint público oEmbed de YouTube y debía devolver el mismo título y canal',
    'registrados en `content/recursos.json`. Cada curso o guía debía responder con estado 200 y contener su frase.',
    '',
    `Resultado: ${selected.length - fallas.length} de ${selected.length} recursos verificados.`,
    '',
    ...(fallas.length ? ['## Pendientes', '', ...fallas, ''] : []),
  ];
  writeFileSync(join(root, 'docs', 'verificacion-recursos.md'), lines.join('\n'));
}
process.exitCode = fallas.length ? 1 : 0;
