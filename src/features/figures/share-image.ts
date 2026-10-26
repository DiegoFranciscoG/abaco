/**
 * Draws a figure ("SBU 2026: USD 482 al mes") as a square PNG on the device, ready to share in a study group. The
 * image carries its source, its validity and the app's name, so it never travels without its context.
 */
export interface FigureCard {
  titulo: string;
  valor: string;
  /** Validity or period ("Vigente en 2026", "Dato de septiembre de 2026"). */
  vigencia: string;
  fuente: string;
}

const SIZE = 1080;
const MARGIN = 90;
const COLORS = { fondo: '#fbf6ef', tinta: '#1f1a17', suave: '#6b625b', marca: '#b3122e', linea: '#e6ddd3' };
const FONT = '"Inter Variable", "Inter", system-ui, sans-serif';

/** Splits text into lines that fit `width` with the current font. */
export function wrapText(
  ctx: Pick<CanvasRenderingContext2D, 'measureText'>,
  text: string,
  width: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= width || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawLines(ctx: CanvasRenderingContext2D, lines: string[], y: number, lineHeight: number): number {
  for (const l of lines) {
    ctx.fillText(l, MARGIN, y);
    y += lineHeight;
  }
  return y;
}

export async function renderFigureImage(card: FigureCard): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no puede crear la imagen. Usa «Copiar» para compartir el texto.');
  const width = SIZE - MARGIN * 2;

  ctx.fillStyle = COLORS.fondo;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = COLORS.marca;
  ctx.fillRect(0, 0, SIZE, 18);
  ctx.textBaseline = 'top';

  ctx.fillStyle = COLORS.marca;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText('ECUADOR EN CIFRAS', MARGIN, 110);

  ctx.fillStyle = COLORS.tinta;
  ctx.font = `600 58px ${FONT}`;
  let y = drawLines(ctx, wrapText(ctx, card.titulo, width).slice(0, 3), 180, 70);

  ctx.font = `700 120px ${FONT}`;
  ctx.fillStyle = COLORS.marca;
  y = drawLines(ctx, wrapText(ctx, card.valor, width).slice(0, 3), y + 40, 136);

  ctx.font = `500 38px ${FONT}`;
  ctx.fillStyle = COLORS.tinta;
  y = drawLines(ctx, wrapText(ctx, card.vigencia, width).slice(0, 2), y + 30, 48);

  ctx.font = `400 30px ${FONT}`;
  ctx.fillStyle = COLORS.suave;
  drawLines(ctx, wrapText(ctx, `Fuente: ${card.fuente}`, width).slice(0, 4), y + 30, 40);

  ctx.fillStyle = COLORS.linea;
  ctx.fillRect(MARGIN, SIZE - 170, width, 2);
  ctx.fillStyle = COLORS.tinta;
  ctx.font = `700 44px ${FONT}`;
  ctx.fillText('ÁBACO', MARGIN, SIZE - 130);
  ctx.fillStyle = COLORS.suave;
  ctx.font = `400 28px ${FONT}`;
  ctx.fillText('Estudio para carreras económicas y administrativas', MARGIN, SIZE - 75);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo crear la imagen.'))),
      'image/png',
    );
  });
}

/** File name without accents or spaces: "abaco-salario-basico-unificado.png". */
export function imageFileName(titulo: string): string {
  const slug = titulo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `abaco-${slug || 'cifra'}.png`;
}
