/** Number shown the way Ecuador writes it (decimal comma), with enough digits for rates. */
export const formatNumber = (value: number): string =>
  Math.abs(value) >= 1000 || Number.isInteger(value)
    ? value.toLocaleString('es-EC', { maximumFractionDigits: 2 })
    : value.toLocaleString('es-EC', { maximumSignificantDigits: 8 });
