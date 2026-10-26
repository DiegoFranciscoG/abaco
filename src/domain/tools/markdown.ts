/**
 * Safe Markdown subset for the report editor. The text is parsed into a small tree; the UI renders that tree with
 * React text nodes, so nothing the student writes is ever interpreted as HTML. Supported: headings (#, ##, ###),
 * paragraphs, **bold**, *italic*, `code`, fenced code, lists, quotes, rules (---), pipe tables, [links](https://…)
 * and math with $…$ (inline) or $$…$$ (block). Links only accept http(s) URLs.
 */
export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'em'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'math'; tex: string }
  | { type: 'link'; href: string; children: Inline[] }
  | { type: 'br' };

export type Align = 'left' | 'center' | 'right' | null;

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; children: Inline[] }
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'list'; ordered: boolean; start: number; items: Inline[][] }
  | { type: 'quote'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'math'; tex: string }
  | { type: 'hr' }
  | { type: 'table'; align: Align[]; header: Inline[][]; rows: Inline[][][] };

export const MAX_DOCUMENT_LENGTH = 200_000;
const MAX_INLINE_DEPTH = 6;

const SAFE_URL = /^https?:\/\/[^\s<>"'`]+$/i;

export function isSafeUrl(url: string): boolean {
  if (!SAFE_URL.test(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function pushText(out: Inline[], text: string): void {
  if (!text) return;
  const last = out[out.length - 1];
  if (last?.type === 'text') last.text += text;
  else out.push({ type: 'text', text });
}

/** Finds the closing "$" of inline math: non-space before it and not followed by a digit (so "$5 y $10" is text). */
function findMathClose(s: string, from: number): number {
  for (let i = from; i < s.length; i += 1) {
    if (s[i] === '\\') {
      i += 1;
      continue;
    }
    if (s[i] === '$' && s[i - 1] !== ' ' && !/\d/.test(s[i + 1] ?? '')) return i;
  }
  return -1;
}

export function parseInline(source: string, depth = 0): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i] as string;
    const next = source[i + 1];

    if (ch === '\\' && next !== undefined && '\\`*_[]()$#-+.!|>'.includes(next)) {
      pushText(out, next);
      i += 2;
      continue;
    }
    if (ch === '`') {
      const end = source.indexOf('`', i + 1);
      if (end > i + 1) {
        out.push({ type: 'code', text: source.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (ch === '$' && next !== '$' && next !== undefined && next !== ' ') {
      const end = findMathClose(source, i + 1);
      if (end > i + 1) {
        out.push({ type: 'math', tex: source.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (ch === '[' && depth < MAX_INLINE_DEPTH) {
      const close = source.indexOf('](', i + 1);
      const end = close >= 0 ? source.indexOf(')', close + 2) : -1;
      if (close > i && end > close) {
        const href = source.slice(close + 2, end).trim();
        const label = source.slice(i + 1, close);
        if (isSafeUrl(href)) {
          out.push({ type: 'link', href, children: parseInline(label, depth + 1) });
          i = end + 1;
          continue;
        }
      }
    }
    if ((ch === '*' || ch === '_') && depth < MAX_INLINE_DEPTH) {
      const strong = next === ch;
      const marker = strong ? ch + ch : ch;
      const start = i + marker.length;
      const end = source.indexOf(marker, start);
      const inner = end > start ? source.slice(start, end) : '';
      const wordInside = ch === '_' && /\w/.test(source[i - 1] ?? '');
      if (end > start && inner.trim() === inner && !wordInside) {
        out.push({ type: strong ? 'strong' : 'em', children: parseInline(inner, depth + 1) });
        i = end + marker.length;
        continue;
      }
    }
    if (ch === ' ' && next === ' ' && source[i + 2] === '\n') {
      out.push({ type: 'br' });
      i += 3;
      continue;
    }
    pushText(out, ch === '\n' ? ' ' : ch);
    i += 1;
  }
  return out;
}

const splitRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim());

function parseAlign(cell: string): Align {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return null;
}

const isTableSeparator = (line: string): boolean => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line);

export function parseMarkdown(source: string): Block[] {
  const text = source.length > MAX_DOCUMENT_LENGTH ? source.slice(0, MAX_DOCUMENT_LENGTH) : source;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length > 0) blocks.push({ type: 'paragraph', children: parseInline(paragraph.join('\n')) });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] as string;
    const trimmed = line.trim();

    if (trimmed === '') {
      flush();
      continue;
    }
    if (trimmed.startsWith('```')) {
      flush();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] as string).trim().startsWith('```')) {
        body.push(lines[i] as string);
        i += 1;
      }
      blocks.push({ type: 'code', text: body.join('\n') });
      continue;
    }
    if (trimmed.startsWith('$$')) {
      flush();
      const rest = trimmed.slice(2);
      if (rest.endsWith('$$') && rest.length >= 2) {
        blocks.push({ type: 'math', tex: rest.slice(0, -2).trim() });
        continue;
      }
      const body: string[] = rest ? [rest] : [];
      i += 1;
      while (i < lines.length && !(lines[i] as string).trim().endsWith('$$')) {
        body.push(lines[i] as string);
        i += 1;
      }
      const last = (lines[i] ?? '').trim();
      if (last.length > 2) body.push(last.slice(0, -2));
      blocks.push({ type: 'math', tex: body.join('\n').trim() });
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', level: (heading[1] as string).length as 1 | 2 | 3, children: parseInline((heading[2] as string).replace(/\s+#+\s*$/, '')) });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flush();
      blocks.push({ type: 'hr' });
      continue;
    }
    if (trimmed.includes('|') && isTableSeparator(lines[i + 1] ?? '')) {
      flush();
      const header = splitRow(trimmed);
      const align = splitRow(lines[i + 1] as string).map(parseAlign);
      const rows: Inline[][][] = [];
      i += 2;
      while (i < lines.length && (lines[i] as string).includes('|') && (lines[i] as string).trim() !== '') {
        const cells = splitRow(lines[i] as string);
        rows.push(header.map((_, c) => parseInline(cells[c] ?? '')));
        i += 1;
      }
      i -= 1;
      blocks.push({ type: 'table', align: header.map((_, c) => align[c] ?? null), header: header.map((h) => parseInline(h)), rows });
      continue;
    }
    const bullet = /^[-*+]\s+(.*)$/.exec(trimmed);
    const numbered = /^(\d{1,6})[.)]\s+(.*)$/.exec(trimmed);
    if (bullet || numbered) {
      flush();
      const ordered = Boolean(numbered);
      const items: Inline[][] = [];
      const start = numbered ? Number(numbered[1]) : 1;
      while (i < lines.length) {
        const current = (lines[i] as string).trim();
        const m = ordered ? /^\d{1,6}[.)]\s+(.*)$/.exec(current) : /^[-*+]\s+(.*)$/.exec(current);
        if (!m) break;
        items.push(parseInline(m[1] as string));
        i += 1;
      }
      i -= 1;
      blocks.push({ type: 'list', ordered, start, items });
      continue;
    }
    if (trimmed.startsWith('>')) {
      flush();
      const body: string[] = [];
      while (i < lines.length && (lines[i] as string).trim().startsWith('>')) {
        body.push((lines[i] as string).trim().replace(/^>\s?/, ''));
        i += 1;
      }
      i -= 1;
      blocks.push({ type: 'quote', children: parseInline(body.join('\n')) });
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return blocks;
}

/** Plain-text word count (used in the editor status bar). */
export function wordCount(source: string): number {
  return source
    .replace(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g, ' ')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Report templates offered by the editor (structure only; the student writes the content). */
export const TEMPLATES: { id: string; nombre: string; contenido: string }[] = [
  {
    id: 'informe',
    nombre: 'Informe académico',
    contenido: `# Título del informe

**Materia:** · **Fecha:**

## 1. Introducción

Plantea el problema y el objetivo del trabajo.

## 2. Desarrollo

Explica el procedimiento. Las fórmulas se escriben entre signos de dólar: $VAN = \\sum_{t=0}^{n} \\frac{F_t}{(1+i)^t}$

$$PE = \\frac{CF}{p - cv}$$

| Concepto | Valor |
|---|---:|
| Costos fijos | 10 000 |
| Margen unitario | 25 |

## 3. Conclusiones

- Primera conclusión.
- Segunda conclusión.

## Referencias

Apellido, A. (Año). *Título*. Editorial.
`,
  },
  {
    id: 'ejercicio',
    nombre: 'Resolución de un ejercicio',
    contenido: `## Enunciado

Escribe el enunciado.

## Datos

- Capital:
- Tasa:
- Plazo:

## Planteamiento

$$VF = VA(1+i)^n$$

## Cálculo

1. Primer paso.
2. Segundo paso.

## Respuesta

**Resultado:**
`,
  },
  {
    id: 'ensayo',
    nombre: 'Ensayo breve',
    contenido: `# Título del ensayo

## Introducción

Presenta la idea central (tesis).

## Argumentos

### Primer argumento

Desarrolla el argumento y cita la evidencia (Autor, año).

### Segundo argumento

> Una cita textual breve va entre comillas o como cita en bloque, con la página.

## Conclusión

Retoma la tesis y responde a la pregunta inicial.

## Referencias
`,
  },
];
