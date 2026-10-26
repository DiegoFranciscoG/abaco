export type Locale = 'en' | 'es';

export interface LocaleSyntax {
  argSeparator: ',' | ';';
  decimalSeparator: '.' | ',';
}

export const SYNTAX: Record<Locale, LocaleSyntax> = {
  en: { argSeparator: ',', decimalSeparator: '.' },
  es: { argSeparator: ';', decimalSeparator: ',' },
};

export type TokenType =
  | 'number'
  | 'string'
  | 'bool'
  | 'ident'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'sep'
  | 'lbrace'
  | 'rbrace'
  | 'rowsep'
  | 'colon'
  | 'eof';

export interface Token {
  type: TokenType;
  /** Raw text as written by the user. */
  text: string;
  /** Normalized value: numbers use "." as decimal separator, identifiers are kept as written. */
  value: string;
  pos: number;
}

export class FormulaSyntaxError extends Error {
  constructor(
    message: string,
    readonly position: number,
  ) {
    super(message);
    this.name = 'FormulaSyntaxError';
  }
}

const IDENT_START = /[A-Za-z_$À-ɏ]/;
const IDENT_PART = /[A-Za-z0-9_.$À-ɏ]/;
const BOOLEAN_WORDS = new Set(['TRUE', 'FALSE', 'VERDADERO', 'FALSO']);

export function tokenize(input: string, locale: Locale = 'en'): Token[] {
  const syntax = SYNTAX[locale];
  const source = input.startsWith('=') ? input.slice(1) : input;
  const offset = input.length - source.length;
  const tokens: Token[] = [];
  let i = 0;
  let braceDepth = 0;

  const push = (type: TokenType, text: string, value: string, pos: number) =>
    tokens.push({ type, text, value, pos: pos + offset });

  while (i < source.length) {
    const ch = source.charAt(i);

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    const startsNumber =
      /[0-9]/.test(ch) || (ch === syntax.decimalSeparator && /[0-9]/.test(source.charAt(i + 1)));
    if (startsNumber) {
      const start = i;
      while (/[0-9]/.test(source.charAt(i))) i += 1;
      if (source.charAt(i) === syntax.decimalSeparator && /[0-9]/.test(source.charAt(i + 1))) {
        i += 1;
        while (/[0-9]/.test(source.charAt(i))) i += 1;
      }
      if (/[eE]/.test(source.charAt(i)) && /[0-9+-]/.test(source.charAt(i + 1))) {
        const save = i;
        i += 1;
        if (/[+-]/.test(source.charAt(i))) i += 1;
        if (/[0-9]/.test(source.charAt(i))) {
          while (/[0-9]/.test(source.charAt(i))) i += 1;
        } else {
          i = save;
        }
      }
      // A number immediately followed by letters is a cell-like identifier only when it starts with letters,
      // so here letters after digits are a syntax error (e.g. "12abc").
      if (IDENT_START.test(source.charAt(i)) && !/[eE]/.test(source.charAt(i))) {
        throw new FormulaSyntaxError(
          `Número mal escrito cerca de la posición ${start + offset + 1}`,
          start + offset,
        );
      }
      const text = source.slice(start, i);
      const normalized = syntax.decimalSeparator === ',' ? text.replace(',', '.') : text;
      push('number', text, normalized, start);
      continue;
    }

    if (ch === '"') {
      const start = i;
      i += 1;
      let value = '';
      let closed = false;
      while (i < source.length) {
        const c = source.charAt(i);
        if (c === '"') {
          if (source.charAt(i + 1) === '"') {
            value += '"';
            i += 2;
            continue;
          }
          i += 1;
          closed = true;
          break;
        }
        value += c;
        i += 1;
      }
      if (!closed) throw new FormulaSyntaxError('Falta cerrar las comillas de un texto', start + offset);
      push('string', source.slice(start, i), value, start);
      continue;
    }

    if (IDENT_START.test(ch)) {
      const start = i;
      i += 1;
      while (i < source.length && IDENT_PART.test(source.charAt(i))) i += 1;
      const text = source.slice(start, i);
      const upper = text.toUpperCase();
      let lookahead = i;
      while (/\s/.test(source.charAt(lookahead))) lookahead += 1;
      const isCall = source.charAt(lookahead) === '(';
      if (BOOLEAN_WORDS.has(upper) && !isCall) {
        push('bool', text, upper === 'TRUE' || upper === 'VERDADERO' ? 'TRUE' : 'FALSE', start);
      } else {
        push('ident', text, text, start);
      }
      continue;
    }

    const two = source.slice(i, i + 2);
    if (two === '<>' || two === '<=' || two === '>=') {
      push('op', two, two, i);
      i += 2;
      continue;
    }
    if ('+-*/^&=<>%'.includes(ch)) {
      push('op', ch, ch, i);
      i += 1;
      continue;
    }
    if (ch === '(') {
      push('lparen', ch, ch, i);
      i += 1;
      continue;
    }
    if (ch === ')') {
      push('rparen', ch, ch, i);
      i += 1;
      continue;
    }
    if (ch === '{') {
      braceDepth += 1;
      push('lbrace', ch, ch, i);
      i += 1;
      continue;
    }
    if (ch === '}') {
      braceDepth -= 1;
      push('rbrace', ch, ch, i);
      i += 1;
      continue;
    }
    if (ch === ':') {
      push('colon', ch, ch, i);
      i += 1;
      continue;
    }
    if (ch === syntax.argSeparator) {
      push('sep', ch, ',', i);
      i += 1;
      continue;
    }
    if (locale === 'en' && ch === ';' && braceDepth > 0) {
      push('rowsep', ch, ';', i);
      i += 1;
      continue;
    }
    const hint =
      locale === 'en' && ch === ';'
        ? ' (¿escribiste la fórmula con «;»? Cambia la sintaxis de la hoja a Excel en español)'
        : '';
    throw new FormulaSyntaxError(`Carácter inesperado «${ch}»${hint}`, i + offset);
  }

  tokens.push({ type: 'eof', text: '', value: '', pos: source.length + offset });
  return tokens;
}
