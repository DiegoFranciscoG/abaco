export interface CellRef {
  col: number; // 0-based
  row: number; // 0-based
  absCol: boolean;
  absRow: boolean;
}

export const MAX_COLS = 16384; // XFD, same limit as Excel
export const MAX_ROWS = 1048576;

const CELL_PATTERN = /^(\$?)([A-Za-z]{1,3})(\$?)([1-9][0-9]{0,6})$/;

export function columnToIndex(letters: string): number {
  let index = 0;
  for (const ch of letters.toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index - 1;
}

export function indexToColumn(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function parseCellRef(text: string): CellRef | null {
  const match = CELL_PATTERN.exec(text);
  if (!match) return null;
  const [, absCol = '', letters = '', absRow = '', digits = ''] = match;
  const col = columnToIndex(letters);
  const row = Number(digits) - 1;
  if (col >= MAX_COLS || row >= MAX_ROWS) return null;
  return { col, row, absCol: absCol === '$', absRow: absRow === '$' };
}

export function formatCellRef(ref: Pick<CellRef, 'col' | 'row'> & Partial<CellRef>): string {
  return `${ref.absCol ? '$' : ''}${indexToColumn(ref.col)}${ref.absRow ? '$' : ''}${ref.row + 1}`;
}

/** Plain address without "$", used as a key in sheet storage ("B7"). */
export function cellKey(col: number, row: number): string {
  return `${indexToColumn(col)}${row + 1}`;
}

export function isCellAddress(text: string): boolean {
  return parseCellRef(text) !== null;
}

/** Enumerates the plain keys of a rectangular range (row-major). */
export function rangeKeys(from: CellRef, to: CellRef): string[][] {
  const top = Math.min(from.row, to.row);
  const bottom = Math.max(from.row, to.row);
  const left = Math.min(from.col, to.col);
  const right = Math.max(from.col, to.col);
  const rows: string[][] = [];
  for (let r = top; r <= bottom; r += 1) {
    const row: string[] = [];
    for (let c = left; c <= right; c += 1) row.push(cellKey(c, r));
    rows.push(row);
  }
  return rows;
}
