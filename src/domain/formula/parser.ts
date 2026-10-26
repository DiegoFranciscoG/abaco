import { parseCellRef, type CellRef } from './address';
import { FormulaSyntaxError, tokenize, type Locale, type Token } from './tokenizer';

export type Mode = 'algebra' | 'sheet';

export type Node =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'bool'; value: boolean }
  | { type: 'missing' }
  | { type: 'name'; name: string }
  | { type: 'ref'; ref: CellRef }
  | { type: 'range'; from: CellRef; to: CellRef }
  | { type: 'unary'; op: '-' | '+'; operand: Node }
  | { type: 'percent'; operand: Node }
  | { type: 'binary'; op: BinaryOp; left: Node; right: Node }
  | { type: 'call'; name: string; args: Node[] }
  | { type: 'array'; rows: Node[][] };

export type BinaryOp = '+' | '-' | '*' | '/' | '^' | '&' | '=' | '<>' | '<' | '>' | '<=' | '>=';

/** Excel precedence: comparison < & < +,- < *,/ < ^ < unary minus < % */
const BINARY_PRECEDENCE: Record<BinaryOp, number> = {
  '=': 1,
  '<>': 1,
  '<': 1,
  '>': 1,
  '<=': 1,
  '>=': 1,
  '&': 2,
  '+': 3,
  '-': 3,
  '*': 4,
  '/': 4,
  '^': 5,
};

export interface ParseOptions {
  locale?: Locale;
  mode?: Mode;
}

export function parse(input: string, options: ParseOptions = {}): Node {
  const locale = options.locale ?? 'en';
  const mode = options.mode ?? 'sheet';
  const tokens = tokenize(input, locale);
  let index = 0;

  const peek = (): Token => tokens[index] as Token;
  const next = (): Token => tokens[index++] as Token;
  const expect = (type: Token['type'], message: string): Token => {
    const token = next();
    if (token.type !== type) throw new FormulaSyntaxError(message, token.pos);
    return token;
  };

  function parseExpression(minPrecedence: number): Node {
    let left = parseUnary();
    for (;;) {
      const token = peek();
      if (token.type !== 'op' || token.value === '%') break;
      const op = token.value as BinaryOp;
      const precedence = BINARY_PRECEDENCE[op];
      if (precedence === undefined || precedence < minPrecedence) break;
      next();
      // All Excel binary operators are left-associative (including ^: =2^3^2 is 64).
      const right = parseExpression(precedence + 1);
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  function parseUnary(): Node {
    const token = peek();
    if (token.type === 'op' && (token.value === '-' || token.value === '+')) {
      next();
      const operand = parseUnaryOperand();
      return { type: 'unary', op: token.value, operand };
    }
    return parsePostfix(parsePrimary());
  }

  /** Operand of a unary sign: binds tighter than ^, so =-2^2 is 4 as in Excel. */
  function parseUnaryOperand(): Node {
    const token = peek();
    if (token.type === 'op' && (token.value === '-' || token.value === '+')) {
      next();
      return { type: 'unary', op: token.value, operand: parseUnaryOperand() };
    }
    return parsePostfix(parsePrimary());
  }

  function parsePostfix(node: Node): Node {
    let current = node;
    while (peek().type === 'op' && peek().value === '%') {
      next();
      current = { type: 'percent', operand: current };
    }
    return current;
  }

  function parsePrimary(): Node {
    const token = next();
    switch (token.type) {
      case 'number':
        return { type: 'number', value: Number(token.value) };
      case 'string':
        return { type: 'string', value: token.value };
      case 'bool':
        return { type: 'bool', value: token.value === 'TRUE' };
      case 'lparen': {
        const inner = parseExpression(1);
        expect('rparen', 'Falta cerrar un paréntesis');
        return inner;
      }
      case 'lbrace':
        return parseArray(token);
      case 'ident':
        return parseIdentifier(token);
      case 'eof':
        throw new FormulaSyntaxError('La fórmula termina antes de tiempo', token.pos);
      default:
        throw new FormulaSyntaxError(`No se esperaba «${token.text}»`, token.pos);
    }
  }

  function parseIdentifier(token: Token): Node {
    if (peek().type === 'lparen') {
      next();
      const args: Node[] = [];
      if (peek().type === 'rparen') {
        next();
        return { type: 'call', name: token.value.toUpperCase(), args };
      }
      for (;;) {
        if (peek().type === 'sep' || peek().type === 'rparen') {
          args.push({ type: 'missing' });
        } else {
          args.push(parseExpression(1));
        }
        const separator = next();
        if (separator.type === 'rparen') break;
        if (separator.type !== 'sep') {
          throw new FormulaSyntaxError('Separa los argumentos con el separador de tu idioma', separator.pos);
        }
      }
      return { type: 'call', name: token.value.toUpperCase(), args };
    }

    if (mode === 'sheet') {
      const ref = parseCellRef(token.value);
      if (ref) {
        if (peek().type === 'colon') {
          next();
          const endToken = expect('ident', 'Después de «:» va otra celda');
          const end = parseCellRef(endToken.value);
          if (!end) throw new FormulaSyntaxError(`«${endToken.text}» no es una celda`, endToken.pos);
          return { type: 'range', from: ref, to: end };
        }
        return { type: 'ref', ref };
      }
    }
    return { type: 'name', name: token.value };
  }

  function parseArray(open: Token): Node {
    if (locale !== 'en') {
      throw new FormulaSyntaxError(
        'Las matrices constantes {…} solo se admiten con la sintaxis en inglés; usa un rango de celdas',
        open.pos,
      );
    }
    const rows: Node[][] = [[]];
    for (;;) {
      const current = rows[rows.length - 1] as Node[];
      current.push(parseUnary());
      const token = next();
      if (token.type === 'rbrace') break;
      if (token.type === 'sep') continue;
      if (token.type === 'rowsep') {
        rows.push([]);
        continue;
      }
      throw new FormulaSyntaxError('Matriz constante mal escrita', token.pos);
    }
    const width = rows[0]?.length ?? 0;
    if (rows.some((row) => row.length !== width)) {
      throw new FormulaSyntaxError(
        'Todas las filas de la matriz deben tener el mismo número de elementos',
        open.pos,
      );
    }
    return { type: 'array', rows };
  }

  const ast = parseExpression(1);
  const trailing = peek();
  if (trailing.type !== 'eof') {
    throw new FormulaSyntaxError(`Sobra «${trailing.text}» en la fórmula`, trailing.pos);
  }
  return ast;
}

/** Collects the plain cell keys a formula depends on (ranges expanded). */
export function collectReferences(node: Node, out: { refs: CellRef[]; ranges: [CellRef, CellRef][] }): void {
  switch (node.type) {
    case 'ref':
      out.refs.push(node.ref);
      break;
    case 'range':
      out.ranges.push([node.from, node.to]);
      break;
    case 'unary':
    case 'percent':
      collectReferences(node.operand, out);
      break;
    case 'binary':
      collectReferences(node.left, out);
      collectReferences(node.right, out);
      break;
    case 'call':
      node.args.forEach((arg) => collectReferences(arg, out));
      break;
    case 'array':
      node.rows.forEach((row) => row.forEach((cell) => collectReferences(cell, out)));
      break;
    default:
      break;
  }
}
