import { PDF_TEXT_MAX } from '../../data/backup';
import { PAGE_BREAK } from '../../domain/study/pdf-search';

/**
 * Reads the text of a PDF inside the browser with pdf.js (Mozilla, Apache-2.0), in a Web Worker served from this
 * site. The file is never uploaded: only the extracted text is kept, on this device. pdf.js 6 does not evaluate
 * code; fonts, XFA forms and WebAssembly decoders are turned off because only the text is needed.
 */
export const PDF_LIMITS = { maxBytes: 20 * 1024 * 1024, maxPages: 400 } as const;

export class PdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfError';
  }
}

export async function isPdfFile(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head) === '%PDF-';
}

export async function extractPdfText(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<{ paginas: number; texto: string }> {
  if (file.size > PDF_LIMITS.maxBytes) throw new PdfError('El PDF supera los 20 MB permitidos.');
  if (!(await isPdfFile(file))) throw new PdfError('El archivo no es un PDF válido.');
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    disableFontFace: true,
    enableXfa: false,
    useWasm: false,
  });
  let doc;
  try {
    doc = await task.promise;
  } catch (error) {
    await task.destroy();
    const name = (error as { name?: string }).name;
    if (name === 'PasswordException') throw new PdfError('El PDF está protegido con contraseña.');
    throw new PdfError('No se pudo leer el PDF: puede estar dañado.');
  }
  try {
    if (doc.numPages > PDF_LIMITS.maxPages)
      throw new PdfError(`El PDF tiene más de ${PDF_LIMITS.maxPages} páginas.`);
    let texto = '';
    for (let i = 1; i <= doc.numPages && texto.length < PDF_TEXT_MAX; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if ('str' in item) texto += item.str + (item.hasEOL ? '\n' : ' ');
      }
      // Pages are marked with a form feed so a search can say on which page a word appears.
      texto += i < doc.numPages ? `\n${PAGE_BREAK}` : '\n';
      page.cleanup();
      onProgress?.(i / doc.numPages);
    }
    return { paginas: doc.numPages, texto: texto.slice(0, PDF_TEXT_MAX) };
  } finally {
    await task.destroy();
  }
}
