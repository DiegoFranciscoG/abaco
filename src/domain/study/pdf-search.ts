/**
 * Search inside the text of the student's PDFs, on the device. Accents, capitals and line breaks do not matter
 * ("depreciacion" finds «Depreciación»), and every hit keeps its exact position in the original text so the reader
 * can jump to it. Pages are separated by a form feed (\f) since PDFs are stored with page marks.
 */

export const PAGE_BREAK = '\f';
export const SEARCH_LIMITS = { minQuery: 3, perPdf: 10, total: 50, context: 80 } as const;

export interface SearchablePdf {
  id: string;
  nombre: string;
  materiaId: string;
  texto: string;
}

export interface PdfHit {
  pdfId: string;
  nombre: string;
  materiaId: string;
  /** Position of the match in the original text. */
  inicio: number;
  fin: number;
  /** Page of the match, or null for PDFs saved before pages were marked. */
  pagina: number | null;
  antes: string;
  coincidencia: string;
  despues: string;
}

interface Folded {
  text: string;
  /** Original index of each folded character. */
  map: number[];
}

/** Lowercase, no accents and single spaces, remembering where each character came from. */
export function foldWithMap(original: string): Folded {
  let text = '';
  const map: number[] = [];
  let lastWasSpace = true;
  for (let i = 0; i < original.length; i += 1) {
    const ch = original[i] ?? '';
    if (/\s/.test(ch)) {
      if (!lastWasSpace) {
        text += ' ';
        map.push(i);
        lastWasSpace = true;
      }
      continue;
    }
    const folded = ch
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
    for (const f of folded) {
      text += f;
      map.push(i);
    }
    lastWasSpace = false;
  }
  return { text, map };
}

export function foldQuery(query: string): string {
  return foldWithMap(query).text.trim();
}

/** Page (1-based) of an original position, counting page breaks before it; null when the text has none. */
export function pageAt(texto: string, index: number): number | null {
  if (!texto.includes(PAGE_BREAK)) return null;
  let page = 1;
  for (let i = 0; i < index && i < texto.length; i += 1) if (texto[i] === PAGE_BREAK) page += 1;
  return page;
}

const clean = (s: string) => s.replace(/\s+/g, ' ');

export function searchPdfs(pdfs: readonly SearchablePdf[], query: string): PdfHit[] {
  const needle = foldQuery(query);
  if (needle.length < SEARCH_LIMITS.minQuery) return [];
  const hits: PdfHit[] = [];
  for (const pdf of pdfs) {
    const folded = foldWithMap(pdf.texto);
    let from = 0;
    let count = 0;
    while (count < SEARCH_LIMITS.perPdf && hits.length < SEARCH_LIMITS.total) {
      const at = folded.text.indexOf(needle, from);
      if (at === -1) break;
      const inicio = folded.map[at] ?? 0;
      const fin = (folded.map[at + needle.length - 1] ?? inicio) + 1;
      const ctx = SEARCH_LIMITS.context;
      hits.push({
        pdfId: pdf.id,
        nombre: pdf.nombre,
        materiaId: pdf.materiaId,
        inicio,
        fin,
        pagina: pageAt(pdf.texto, inicio),
        antes:
          (inicio > ctx ? '…' : '') + clean(pdf.texto.slice(Math.max(0, inicio - ctx), inicio)).trimStart(),
        coincidencia: clean(pdf.texto.slice(inicio, fin)),
        despues: clean(pdf.texto.slice(fin, fin + ctx)).trimEnd() + (fin + ctx < pdf.texto.length ? '…' : ''),
      });
      count += 1;
      from = at + needle.length;
    }
    if (hits.length >= SEARCH_LIMITS.total) break;
  }
  return hits;
}

/** The text a reader shows for a hit: its whole page when pages are marked, or a wide window around it. */
export function readerWindow(
  texto: string,
  hit: Pick<PdfHit, 'inicio' | 'fin'>,
  radius = 1500,
): { desde: number; hasta: number } {
  if (texto.includes(PAGE_BREAK)) {
    const start = texto.lastIndexOf(PAGE_BREAK, hit.inicio - 1);
    const end = texto.indexOf(PAGE_BREAK, hit.fin);
    return { desde: start === -1 ? 0 : start + 1, hasta: end === -1 ? texto.length : end };
  }
  return { desde: Math.max(0, hit.inicio - radius), hasta: Math.min(texto.length, hit.fin + radius) };
}
