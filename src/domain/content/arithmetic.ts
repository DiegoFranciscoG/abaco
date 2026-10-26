/**
 * Checks the arithmetic written inside an example: every "a × b = c", "(a − b) ÷ c = d" or "a + b + c = d" with
 * numbers written the Ecuadorian way (1.234,56) is recalculated, and a result that does not match beyond the
 * rounding of its own decimals is reported. Only plain chains of numbers and + − × ÷ are checked; anything with
 * words, powers or percentages in between is left for the reviewer.
 */

const NUM = String.raw`\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?`;
const OP = String.raw`\s*[+\-−×x÷/]\s*`;
const TERM = String.raw`\(?\s*(?:${NUM})\s*\)?`;
/**
 * "a op b [op c…] = r": at least one operator, numbers and parentheses only. The chain must not continue an
 * expression on its left (an exponent, a root, "ln", a factor) and the result must not continue on its right
 * ("= 120 ± 4,2"). A result followed by % is compared as a percentage.
 */
const EQUATION = new RegExp(
  String.raw`(?<!(?:\bln|\blog|√|\^|[\d×÷*/+\-−±(.,])\s*)(${TERM}(?:${OP}${TERM})+)\s*=\s*(?:USD\s*)?(−?${NUM})(?![\d.,]*\d)(?!\s*[±+\-−×÷*/^])(\s*%)?`,
  'gu',
);

export interface ArithmeticIssue {
  expresion: string;
  escrito: number;
  calculado: number;
}

/** "1.234,56" → 1234.56 */
export function parseEsNumber(text: string): number {
  return Number(text.replace(/\./g, '').replace(',', '.').replace('−', '-'));
}

function decimalsOf(text: string): number {
  const i = text.indexOf(',');
  return i === -1 ? 0 : text.length - i - 1;
}

/** Evaluates + − × ÷ and parentheses with the usual precedence (no other syntax is accepted). */
export function evaluatePlain(expression: string): number | null {
  const src = expression.replace(/−/g, '-').replace(/[×x]/g, '*').replace(/÷/g, '/');
  const tokens = src.match(new RegExp(String.raw`${NUM}|[-+*/()]`, 'g'));
  if (!tokens || tokens.join('') !== src.replace(/\s+/g, '')) return null;
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const factor = (): number | null => {
    const t = next();
    if (t === '(') {
      const v = expr();
      return next() === ')' ? v : null;
    }
    if (t === '-') {
      const v = factor();
      return v === null ? null : -v;
    }
    return t !== undefined && /\d/.test(t) ? parseEsNumber(t) : null;
  };
  const term = (): number | null => {
    let v = factor();
    while (v !== null && (peek() === '*' || peek() === '/')) {
      const op = next();
      const r = factor();
      if (r === null) return null;
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const expr = (): number | null => {
    let v = term();
    while (v !== null && (peek() === '+' || peek() === '-')) {
      const op = next();
      const r = term();
      if (r === null) return null;
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const value = expr();
  return pos === tokens.length && value !== null && Number.isFinite(value) ? value : null;
}

export function checkArithmetic(text: string): ArithmeticIssue[] {
  return scanArithmetic(text).issues;
}

/** Same check, also counting how many equalities could be recalculated (the rest are left to the reviewer). */
export function scanArithmetic(text: string): { checked: number; issues: ArithmeticIssue[] } {
  const issues: ArithmeticIssue[] = [];
  let checked = 0;
  for (const m of text.matchAll(EQUATION)) {
    const left = (m[1] ?? '').trim();
    const written = m[2] ?? '';
    // A minus sign right after a word ("Excedente = 21.732 − 20.188") belongs to the chain; a dash between words
    // or a date range does not: only chains that start with a digit or a parenthesis are checked.
    if (!/^[\d(]/.test(left)) continue;
    const parens = (left.match(/\(/g) ?? []).length - (left.match(/\)/g) ?? []).length;
    if (parens !== 0) continue;
    const computed = evaluatePlain(left);
    if (computed === null) continue;
    checked += 1;
    const percent = Boolean(m[3]);
    const escrito = parseEsNumber(written.replace('−', '-'));
    // "a ÷ b = 39,79 %" means a ÷ b × 100; when the chain already multiplies by 100 the value is used as is.
    const value = percent && !/[×x*]\s*100\b/.test(left) ? computed * 100 : computed;
    // The written result may be rounded to its own decimals (half a unit of its last digit), never more.
    const tolerance = 0.5 * 10 ** -decimalsOf(written) + 1e-9;
    if (Math.abs(value - escrito) > tolerance) {
      issues.push({ expresion: `${left} = ${written}${percent ? ' %' : ''}`, escrito, calculado: value });
    }
  }
  return { checked, issues };
}
