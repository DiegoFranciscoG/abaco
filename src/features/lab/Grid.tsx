import { useMemo, useRef, useState } from 'react';
import type { CellFormat } from '../../domain/content/schemas';
import { cellKey, ERROR_HINTS_ES, FormulaError, indexToColumn, parseCellRef, type Locale } from '../../domain/formula';
import { formatValue } from '../../domain/sheet/format';
import { SHEET_LIMITS, type CellResult } from '../../domain/sheet/sheet';
import { applySuggestion, suggestFunctions } from '../../domain/sheet/suggest';
import { Icon } from '../../ui/icons';

interface GridProps {
  cells: Record<string, string>;
  results: Record<string, CellResult>;
  formats: Record<string, CellFormat>;
  locale: Locale;
  selected: string;
  onSelect: (key: string) => void;
  onCommit: (key: string, raw: string) => void;
}

function extent(cells: Record<string, string>) {
  let cols = 0;
  let rows = 0;
  for (const key of Object.keys(cells)) {
    const ref = parseCellRef(key);
    if (!ref) continue;
    cols = Math.max(cols, ref.col + 1);
    rows = Math.max(rows, ref.row + 1);
  }
  return { cols, rows };
}

/** Spreadsheet grid: a real ARIA grid, keyboard first, numbers aligned in tabular figures. */
export function Grid({ cells, results, formats, locale, selected, onSelect, onCommit }: GridProps) {
  const used = useMemo(() => extent(cells), [cells]);
  const [extraRows, setExtraRows] = useState(0);
  const cols = Math.min(SHEET_LIMITS.cols, Math.max(8, used.cols + 1));
  const rows = Math.min(SHEET_LIMITS.rows, Math.max(30, used.rows + 5) + extraRows);
  // The draft remembers which cell it belongs to, so moving the selection discards it without an effect.
  const [draftState, setDraftState] = useState<{ key: string; value: string } | null>(null);
  const [suggestIndex, setSuggestIndex] = useState(0);
  const formulaBar = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const sel = parseCellRef(selected) ?? { col: 0, row: 0, absCol: false, absRow: false };

  const raw = cells[selected] ?? '';
  const draft = draftState && draftState.key === selected ? draftState.value : null;
  const setDraft = (value: string | null) => setDraftState(value === null ? null : { key: selected, value });
  const editing = draft !== null;
  const value = editing ? draft : raw;
  const suggestions = editing ? suggestFunctions(value, locale) : [];

  const move = (dc: number, dr: number) => {
    const col = Math.min(cols - 1, Math.max(0, sel.col + dc));
    const row = Math.min(SHEET_LIMITS.rows - 1, Math.max(0, sel.row + dr));
    if (row >= rows) setExtraRows((n) => n + 10);
    onSelect(cellKey(col, row));
    window.requestAnimationFrame(() => {
      document.getElementById(`cell-${cellKey(col, row)}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  };

  const commit = (dc = 0, dr = 1) => {
    if (draft !== null && draft !== raw) onCommit(selected, draft);
    setDraft(null);
    move(dc, dr);
    gridRef.current?.focus();
  };

  const onGridKey = (event: React.KeyboardEvent) => {
    if (editing) return;
    const keys: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const delta = keys[event.key];
    if (delta) {
      event.preventDefault();
      move(delta[0], delta[1]);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      move(event.shiftKey ? -1 : 1, 0);
    } else if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      setDraft(raw);
      formulaBar.current?.focus();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      if (raw) onCommit(selected, '');
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      setDraft(event.key);
      formulaBar.current?.focus();
    }
  };

  const onBarKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setSuggestIndex((i) => (event.key === 'ArrowDown' ? Math.min(i + 1, suggestions.length - 1) : Math.max(i - 1, 0)));
      return;
    }
    if (suggestions.length > 0 && event.key === 'Tab') {
      event.preventDefault();
      const chosen = suggestions[suggestIndex];
      if (chosen) setDraft(applySuggestion(value, chosen));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      commit(0, 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setDraft(null);
      gridRef.current?.focus();
    }
  };

  const result = results[selected];
  const error = result?.value instanceof FormulaError ? result.value : null;

  return (
    <div className="card overflow-hidden">
      <div className="relative flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-2">
        <span className="tnum w-14 shrink-0 rounded-lg bg-surface px-2 py-1.5 text-center font-mono text-sm font-semibold" aria-label="Celda seleccionada">
          {selected}
        </span>
        <span className="font-mono text-muted italic" aria-hidden="true">
          fx
        </span>
        <input
          ref={formulaBar}
          value={value}
          onFocus={() => draft === null && setDraft(raw)}
          onChange={(e) => {
            setDraft(e.target.value);
            setSuggestIndex(0);
          }}
          onBlur={() => {
            if (draft !== null && draft !== raw) onCommit(selected, draft);
            setDraft(null);
          }}
          onKeyDown={onBarKey}
          className="h-11 min-w-0 flex-1 rounded-lg border border-transparent bg-surface px-3 font-mono text-[0.95rem] outline-none focus:border-red"
          aria-label={`Contenido de la celda ${selected}`}
          spellCheck={false}
          autoComplete="off"
          maxLength={SHEET_LIMITS.inputLength}
          placeholder={locale === 'es' ? '=PAGO(1%;12;-1000)' : '=PMT(1%,12,-1000)'}
        />
        {suggestions.length > 0 ? (
          <ul role="listbox" aria-label="Funciones sugeridas" className="card absolute top-full right-3 left-20 z-30 mt-1 max-h-72 overflow-auto p-1">
            {suggestions.map((s, i) => (
              <li key={s.info.name} role="option" aria-selected={i === suggestIndex}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setDraft(applySuggestion(value, s));
                    formulaBar.current?.focus();
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left ${i === suggestIndex ? 'bg-red-tint' : ''}`}
                >
                  <span className="font-mono text-sm font-semibold">
                    {s.label}
                    {s.info.signature.replace(/, /g, locale === 'es' ? '; ' : ', ')}
                  </span>
                  <span className="block text-xs text-muted">{s.info.description}</span>
                </button>
              </li>
            ))}
            <li className="px-3 pt-1 pb-1.5 text-[0.7rem] text-muted">Tab para insertar · ↑ ↓ para elegir</li>
          </ul>
        ) : null}
      </div>
      {error ? (
        <p className="flex items-start gap-2 border-b border-line bg-red-tint px-3 py-2 text-sm text-ink-2" role="status">
          <Icon name="info" size={16} className="mt-0.5 text-red" />
          {result?.syntaxError ?? ERROR_HINTS_ES[error.code]}
        </p>
      ) : result?.spilled ? (
        <p className="border-b border-line bg-surface-2 px-3 py-2 text-xs text-muted">Esta fórmula produce varios valores; se muestra el primero.</p>
      ) : null}

      <div
        ref={gridRef}
        role="grid"
        aria-label="Hoja de cálculo"
        aria-rowcount={rows}
        aria-colcount={cols}
        tabIndex={0}
        onKeyDown={onGridKey}
        className="max-h-[62dvh] overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-red/40"
      >
        <table className="tnum border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10">
            <tr role="row">
              <th className="sticky left-0 z-20 w-11 border-r border-b border-line bg-surface-2" aria-hidden="true" />
              {Array.from({ length: cols }, (_, c) => (
                <th
                  key={c}
                  role="columnheader"
                  scope="col"
                  className={`min-w-[7.5rem] border-r border-b border-line bg-surface-2 px-2 py-1.5 text-center font-mono text-xs font-semibold ${
                    c === sel.col ? 'text-red' : 'text-muted'
                  }`}
                >
                  {indexToColumn(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r} role="row" aria-rowindex={r + 1}>
                <th
                  role="rowheader"
                  scope="row"
                  className={`sticky left-0 z-[5] border-r border-b border-line bg-surface-2 px-2 text-center font-mono text-xs font-semibold ${
                    r === sel.row ? 'text-red' : 'text-muted'
                  }`}
                >
                  {r + 1}
                </th>
                {Array.from({ length: cols }, (_, c) => {
                  const key = cellKey(c, r);
                  const cellResult = results[key];
                  const isSelected = key === selected;
                  const isError = cellResult?.value instanceof FormulaError;
                  const isNumber = typeof cellResult?.value === 'number';
                  const shown = cellResult ? formatValue(cellResult.value, formats[key] ?? 'general', locale) : '';
                  return (
                    <td
                      key={key}
                      id={`cell-${key}`}
                      role="gridcell"
                      aria-selected={isSelected}
                      aria-label={`${key}${shown ? `: ${shown}` : ''}`}
                      onClick={() => onSelect(key)}
                      onDoubleClick={() => {
                        onSelect(key);
                        setDraftState({ key, value: cells[key] ?? '' });
                        window.setTimeout(() => formulaBar.current?.focus(), 0);
                      }}
                      className={`h-9 max-w-[14rem] cursor-cell truncate border-r border-b border-line px-2 ${
                        isNumber ? 'text-right' : 'text-left'
                      } ${isError ? 'font-semibold text-red' : 'text-ink'} ${cellResult?.isFormula ? 'bg-red-tint/40' : 'bg-surface'} ${
                        isSelected ? 'outline-2 -outline-offset-2 outline-red' : ''
                      }`}
                    >
                      {shown}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows < SHEET_LIMITS.rows ? (
        <div className="border-t border-line px-3 py-2">
          <button type="button" className="btn btn-ghost min-h-10 text-sm" onClick={() => setExtraRows((n) => n + 20)}>
            <Icon name="plus" size={16} /> 20 filas más
          </button>
        </div>
      ) : null}
    </div>
  );
}
