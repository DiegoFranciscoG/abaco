import { useId, type ReactNode } from 'react';
import { Icon } from '../../ui/icons';
import { readNumber } from '../tools/format';

/**
 * Small form kit of the deliverables. Inputs are uncontrolled and the form remounts them (with a new key) when a
 * saved work or the example is loaded, so typing "1.234,5" never fights with a reformatted value.
 */
export function NumInput({
  label,
  value,
  onChange,
  suffix,
  hint,
  className = '',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <label className={`block min-w-0 ${className}`} htmlFor={id}>
      <span className="mb-1 flex items-baseline justify-between gap-2 text-xs font-semibold text-ink-2">
        <span>{label}</span>
        {suffix ? <span className="font-normal text-muted">{suffix}</span> : null}
      </span>
      <input
        id={id}
        className="field tnum"
        inputMode="decimal"
        maxLength={20}
        defaultValue={Number.isFinite(value) ? String(value).replace('.', ',') : ''}
        onChange={(e) => onChange(readNumber(e.target.value) ?? Number.NaN)}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint ? (
        <span id={`${id}-hint`} className="mt-1 block text-xs text-muted">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  maxLength = 80,
  className = '',
  list,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  className?: string;
  list?: string;
}) {
  const id = useId();
  return (
    <label className={`block min-w-0 ${className}`} htmlFor={id}>
      <span className="mb-1 block text-xs font-semibold text-ink-2">{label}</span>
      <input
        id={id}
        className="field"
        defaultValue={value}
        maxLength={maxLength}
        list={list}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function SelectInput<T extends string>({
  label,
  value,
  options,
  onChange,
  className = '',
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <label className={`block min-w-0 ${className}`} htmlFor={id}>
      <span className="mb-1 block text-xs font-semibold text-ink-2">{label}</span>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CheckInput({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-2">
      <input
        type="checkbox"
        className="h-5 w-5 accent-[var(--red)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

/** A repeatable block (a worker, a movement, an entry) with its remove button. */
export function RowCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove?: () => void;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-3 rounded-2xl border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-ink">{title}</legend>
      {children}
      {onRemove ? (
        <button type="button" className="btn btn-ghost min-h-10" onClick={onRemove}>
          <Icon name="trash" size={16} /> Quitar {title.toLocaleLowerCase('es')}
        </button>
      ) : null}
    </fieldset>
  );
}

export function AddButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="btn btn-ghost" onClick={onClick} disabled={disabled}>
      <Icon name="plus" size={16} /> {label}
    </button>
  );
}
