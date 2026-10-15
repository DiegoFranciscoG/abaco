import { AnimatePresence, m } from 'motion/react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { describeStorageError } from '../data/storage-health';
import { Icon } from './icons';
import { ToastContext, type Tone, type ToastApi } from './use-toast';

interface Toast {
  id: number;
  message: string;
  tone: Tone;
}


export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, tone: Tone = 'ok') => {
    counter.current += 1;
    const id = counter.current;
    setToasts((list) => [...list.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === 'error' ? 6500 : 3200);
  }, []);

  const api = useMemo<ToastApi>(() => ({ show, error: (e) => show(describeStorageError(e), 'error') }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-8"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <m.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 520, damping: 34 }}
              className={`card pointer-events-auto flex max-w-md items-start gap-3 px-4 py-3 text-sm font-medium ${
                t.tone === 'error' ? 'border-red text-red-ink' : ''
              }`}
            >
              <Icon name={t.tone === 'error' ? 'info' : 'check'} size={18} className={t.tone === 'error' ? 'text-red' : 'text-ok'} />
              <span>{t.message}</span>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
