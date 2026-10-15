import { createContext, useContext } from 'react';

export type Tone = 'ok' | 'error' | 'info';

export interface ToastApi {
  show: (message: string, tone?: Tone) => void;
  /** Shows a storage/validation error with an actionable message. */
  error: (error: unknown) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
