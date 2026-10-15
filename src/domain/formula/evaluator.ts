import type { CellRef } from './address';
import { callFunction, isSupportedFunction, SPECIAL_FORMS } from './functions';
import { canonicalFunctionName } from './locale';
import type { BinaryOp, Node } from './parser';
import {
  FormulaError,
  isMatrix,
  toBoolean,
  toNumber,
  toText,
  type Matrix,
  type Scalar,
  type Value,
} from './values';

export interface EvalContext {
  /** Algebra mode: variables such as `i` or `VA`. Lists are given as number[]. */
  resolveName?: (name: string) => number | number[] | undefined;
  /** Sheet mode: value of one cell (already computed). */
  resolveCell?: (ref: CellRef) => Scalar;
  /** Sheet mode: rectangular block of values. */
  resolveRange?: (from: CellRef, to: CellRef) => Matrix;
}

const MAX_MATRIX_CELLS = 100_000;

export function evaluate(node: Node, ctx: EvalContext): Value {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'string':
      return node.value;
    case 'bool':
      return node.value;
    case 'missing':
      return null;
    case 'name': {
      const value = ctx.resolveName?.(node.name);
      if (value === undefined) return new FormulaError('#NAME?', node.name);
      return Array.isArray(value) ? value.map((n) => [n]) : value;
    }
    case 'ref':
      return ctx.resolveCell ? ctx.resolveCell(node.ref) : new FormulaError('#REF!');
    case 'range':
      return ctx.resolveRange ? ctx.resolveRange(node.from, node.to) : new FormulaError('#REF!');
    case 'unary': {
      const operand = evaluate(node.operand, ctx);
      return mapUnary(operand, (n) => (node.op === '-' ? -n : n));
    }
    case 'percent':
      return mapUnary(evaluate(node.operand, ctx), (n) => n / 100);
    case 'binary':
      return evaluateBinary(node.op, evaluate(node.left, ctx), evaluate(node.right, ctx));
    case 'array':
      return node.rows.map((row) =>
        row.map((cell) => {
          const value = evaluate(cell, ctx);
          return isMatrix(value) ? new FormulaError('#VALUE!') : value;
        }),
      );
    case 'call':
      return evaluateCall(node.name, node.args, ctx);
  }
}

function mapUnary(value: Value, fn: (n: number) => number): Value {
  if (isMatrix(value)) return value.map((row) => row.map((cell) => applyUnary(cell, fn)));
  return applyUnary(value, fn);
}

function applyUnary(value: Scalar, fn: (n: number) => number): Scalar {
  const n = toNumber(value);
  return n instanceof FormulaError ? n : fn(n);
}

function evaluateBinary(op: BinaryOp, left: Value, right: Value): Value {
  if (!isMatrix(left) && !isMatrix(right)) return applyBinary(op, left, right);
  const l = isMatrix(left) ? left : [[left]];
  const r = isMatrix(right) ? right : [[right]];
  const rows = Math.max(l.length, r.length);
  const cols = Math.max(l[0]?.length ?? 0, r[0]?.length ?? 0);
  if (rows * cols > MAX_MATRIX_CELLS) return new FormulaError('#NUM!', 'Matriz demasiado grande');
  const pick = (m: Matrix, row: number, col: number): Scalar => {
    // Broadcasting: a single row/column (or scalar) is reused, like Excel dynamic arrays.
    const rr = m.length === 1 ? 0 : row;
    const cc = (m[0]?.length ?? 0) === 1 ? 0 : col;
    const line = m[rr];
    if (!line || cc >= line.length) return new FormulaError('#N/A');
    return line[cc] ?? null;
  };
  const out: Matrix = [];
  for (let row = 0; row < rows; row += 1) {
    const line: Scalar[] = [];
    for (let col = 0; col < cols; col += 1) line.push(applyBinary(op, pick(l, row, col), pick(r, row, col)));
    out.push(line);
  }
  return out;
}

function applyBinary(op: BinaryOp, left: Scalar, right: Scalar): Scalar {
  if (left instanceof FormulaError) return left;
  if (right instanceof FormulaError) return right;
  switch (op) {
    case '&': {
      const a = toText(left);
      const b = toText(right);
      if (a instanceof FormulaError) return a;
      if (b instanceof FormulaError) return b;
      return a + b;
    }
    case '=':
    case '<>':
    case '<':
    case '>':
    case '<=':
    case '>=':
      return compare(op, left, right);
    default:
      break;
  }
  const a = toNumber(left);
  const b = toNumber(right);
  if (a instanceof FormulaError) return a;
  if (b instanceof FormulaError) return b;
  let result: number;
  switch (op) {
    case '+':
      result = a + b;
      break;
    case '-':
      result = a - b;
      break;
    case '*':
      result = a * b;
      break;
    case '/':
      if (b === 0) return new FormulaError('#DIV/0!');
      result = a / b;
      break;
    case '^':
      if (a === 0 && b < 0) return new FormulaError('#DIV/0!');
      result = a ** b;
      break;
  }
  return Number.isFinite(result) ? result : new FormulaError('#NUM!');
}

function typeRank(value: Exclude<Scalar, FormulaError>): number {
  if (value === null || typeof value === 'number') return 0;
  if (typeof value === 'string') return 1;
  return 2;
}

function compare(op: BinaryOp, left: Scalar, right: Scalar): boolean {
  const a = left as Exclude<Scalar, FormulaError>;
  const b = right as Exclude<Scalar, FormulaError>;
  let diff: number;
  const rankA = typeRank(a);
  const rankB = typeRank(b);
  if (rankA !== rankB) {
    diff = rankA - rankB;
  } else if (rankA === 0) {
    diff = (a === null ? 0 : (a as number)) - (b === null ? 0 : (b as number));
  } else if (rankA === 1) {
    diff = String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
  } else {
    diff = Number(a) - Number(b);
  }
  switch (op) {
    case '=':
      return diff === 0;
    case '<>':
      return diff !== 0;
    case '<':
      return diff < 0;
    case '>':
      return diff > 0;
    case '<=':
      return diff <= 0;
    default:
      return diff >= 0;
  }
}

function scalarOf(value: Value): Scalar {
  if (!isMatrix(value)) return value;
  return value[0]?.[0] ?? null;
}

function evaluateCall(rawName: string, args: Node[], ctx: EvalContext): Value {
  const name = canonicalFunctionName(rawName);
  if (!isSupportedFunction(name)) return new FormulaError('#NAME?', rawName);
  if (SPECIAL_FORMS.has(name)) return evaluateSpecialForm(name, args, ctx);
  const values = args.map((arg) => (arg.type === 'missing' ? undefined : evaluate(arg, ctx)));
  return callFunction(name, values);
}

function evaluateSpecialForm(name: string, args: Node[], ctx: EvalContext): Value {
  const arg = (index: number): Value => {
    const node = args[index];
    return node ? evaluate(node, ctx) : null;
  };
  switch (name) {
    case 'TRUE':
      return true;
    case 'FALSE':
      return false;
    case 'PI':
      return Math.PI;
    case 'IF': {
      if (args.length < 2 || args.length > 3) return new FormulaError('#N/A', 'SI necesita 2 o 3 argumentos');
      const test = toBoolean(scalarOf(arg(0)));
      if (test instanceof FormulaError) return test;
      if (test) return arg(1);
      return args.length === 3 ? arg(2) : false;
    }
    case 'IFERROR': {
      if (args.length !== 2) return new FormulaError('#N/A', 'SI.ERROR necesita 2 argumentos');
      const value = arg(0);
      return scalarOf(value) instanceof FormulaError ? arg(1) : value;
    }
    case 'IFS': {
      if (args.length < 2 || args.length % 2 !== 0) return new FormulaError('#N/A');
      for (let i = 0; i < args.length; i += 2) {
        const test = toBoolean(scalarOf(arg(i)));
        if (test instanceof FormulaError) return test;
        if (test) return arg(i + 1);
      }
      return new FormulaError('#N/A', 'Ninguna condición se cumplió');
    }
    case 'AND':
    case 'OR': {
      if (args.length === 0) return new FormulaError('#VALUE!');
      const flags: boolean[] = [];
      for (let i = 0; i < args.length; i += 1) {
        const value = arg(i);
        const cells = isMatrix(value) ? value.flat().filter((c) => c !== null && typeof c !== 'string') : [value];
        for (const cell of cells) {
          const flag = toBoolean(cell);
          if (flag instanceof FormulaError) return flag;
          flags.push(flag);
        }
      }
      if (flags.length === 0) return new FormulaError('#VALUE!');
      return name === 'AND' ? flags.every(Boolean) : flags.some(Boolean);
    }
    case 'NOT': {
      if (args.length !== 1) return new FormulaError('#N/A');
      const flag = toBoolean(scalarOf(arg(0)));
      return flag instanceof FormulaError ? flag : !flag;
    }
    default:
      return new FormulaError('#NAME?', name);
  }
}
