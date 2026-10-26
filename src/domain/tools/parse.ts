/** Number list parsing shared by the tools (kept apart from stats.ts so light tools do not load Formula.js). */
/** Parses numbers written by hand or pasted from a spreadsheet: separators are line breaks, ";", tabs or spaces. */
export function parseData(text: string): { values: number[]; ignored: string[] } {
  const values: number[] = [];
  const ignored: string[] = [];
  for (const raw of text.split(/[\n;\t ]+/)) {
    const token = raw.trim();
    if (!token) continue;
    // "1.234,5" or "1234,5" (Ecuador) and "1234.5" are accepted; a lone comma is a decimal comma.
    const normalized = /,\d+$/.test(token) ? token.replace(/\./g, '').replace(',', '.') : token.replace(/,/g, '');
    const value = Number(normalized);
    if (Number.isFinite(value) && normalized !== '') values.push(value);
    else ignored.push(token);
  }
  return { values, ignored: ignored.slice(0, 20) };
}
