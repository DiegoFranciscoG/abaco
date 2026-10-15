import type { CSSProperties } from 'react';
import type { Area } from '../domain/content/schemas';

export interface AreaStyle {
  label: string;
  light: string;
  dark: string;
}

/** One color and one mark per area, constant across the whole app. Colors pass WCAG AA on their tint. */
export const AREA_STYLES: Record<Area, AreaStyle> = {
  contabilidad: { label: 'Contabilidad', light: '#b3122e', dark: '#f0566c' },
  finanzas: { label: 'Finanzas', light: '#17704d', dark: '#4cc28c' },
  tributario: { label: 'Tributario', light: '#8c5a08', dark: '#e3a93f' },
  cuantitativo: { label: 'Matemática y estadística', light: '#2453a3', dark: '#7aa6f0' },
  derecho: { label: 'Derecho', light: '#6a3d9a', dark: '#b38be6' },
  gestion: { label: 'Gestión', light: '#0b6e7a', dark: '#45c1cf' },
  economia: { label: 'Economía', light: '#5a6510', dark: '#b5c24d' },
  tecnologia: { label: 'Tecnología', light: '#3a4a78', dark: '#9db0e6' },
  formacion: { label: 'Formación', light: '#9a421c', dark: '#ec8a5c' },
};

export function areaLabel(area: string): string {
  return AREA_STYLES[area as Area]?.label ?? area;
}

/** CSS variables consumed by `.area-*` utilities in components (light/dark resolved by the theme). */
export function areaVars(area: string): CSSProperties {
  const style = AREA_STYLES[area as Area] ?? AREA_STYLES.gestion;
  return { '--area-light': style.light, '--area-dark': style.dark } as CSSProperties;
}
