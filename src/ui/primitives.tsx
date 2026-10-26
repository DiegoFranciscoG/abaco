import { AnimatePresence, m } from 'motion/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { resolveFuente } from '../data/content';
import type { FuenteRef } from '../domain/content/schemas';
import { areaLabel, areaVars } from './areas';
import { useReducedMotion } from './hooks';
import { Icon, type IconName } from './icons';
import { useToast } from './use-toast';
import { formatDate } from './utils';

/** Router link with a cross-fade view transition (disabled when motion is reduced). */
export function AppLink({ viewTransition, ...props }: LinkProps) {
  const reduce = useReducedMotion();
  return <Link {...props} viewTransition={reduce ? false : (viewTransition ?? true)} />;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  back,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { to: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="rise mb-6 md:mb-8">
      {back ? (
        <AppLink
          to={back.to}
          className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
        >
          <Icon name="arrow-left" size={18} /> {back.label}
        </AppLink>
      ) : null}
      {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[clamp(1.9rem,5vw,3rem)] leading-[1.05] font-semibold text-ink">
          {title}
        </h1>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {subtitle ? (
        <div className="mt-3 max-w-2xl text-[1.02rem] leading-relaxed text-muted">{subtitle}</div>
      ) : null}
    </header>
  );
}

export function AreaTile({ area, size = 'md' }: { area: string; size?: 'sm' | 'md' | 'lg' }) {
  const dims =
    size === 'sm'
      ? 'h-9 w-9 rounded-xl'
      : size === 'lg'
        ? 'h-14 w-14 rounded-2xl'
        : 'h-11 w-11 rounded-[0.9rem]';
  const icon = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;
  return (
    <span
      className={`area area-tile inline-grid shrink-0 place-items-center ${dims}`}
      style={areaVars(area)}
      aria-hidden="true"
    >
      <Icon name={area as IconName} size={icon} />
    </span>
  );
}

export function AreaBadge({ area }: { area: string }) {
  return (
    <span
      className="area area-text inline-flex items-center gap-1.5 text-xs font-semibold"
      style={areaVars(area)}
    >
      <span className="area-bar h-1.5 w-1.5 rounded-full" aria-hidden="true" />
      {areaLabel(area)}
    </span>
  );
}

/**
 * Card with a subtle 3D tilt that follows the pointer (fine pointers only, never with reduced motion).
 * Depth without WebGL: layered shadows + perspective.
 */
export function TiltCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || event.pointerType !== 'mouse' || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-3px)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = '';
  };
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={`card card-lift h-full ${className}`}
    >
      {children}
    </div>
  );
}

export function Accordion({
  title,
  children,
  defaultOpen = false,
  id,
  aside,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
  aside?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (defaultOpen) ref.current?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  }, [defaultOpen, reduce]);
  return (
    <div
      ref={ref}
      id={id}
      className={`card overflow-hidden transition-colors duration-200 ${open ? 'border-red ring-1 ring-red/20' : ''}`}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          className="flex min-h-14 flex-1 items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-ink"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-[1.02rem]">{title}</span>
          <m.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="text-red"
          >
            <Icon name="chevron-down" size={20} />
          </m.span>
        </button>
        {aside ? <div className="flex items-center pr-3">{aside}</div> : null}
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <m.div
            id={panelId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="tile">
        <Icon name={icon} />
      </span>
      <p className="font-display text-xl font-semibold">{title}</p>
      {children ? <div className="max-w-md text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-line/60" />
      ))}
    </div>
  );
}

export function CopyButton({
  text,
  label = 'Copiar',
  className = '',
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const toast = useToast();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      toast.show('Copiado al portapapeles');
      window.setTimeout(() => setDone(false), 1600);
    } catch {
      toast.show('Tu navegador no permitió copiar. Selecciona el texto y cópialo a mano.', 'error');
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={`btn btn-ghost ${className}`}
      aria-label={`${label}: ${text}`}
    >
      <Icon name={done ? 'check' : 'copy'} size={18} /> <span>{done ? 'Copiado' : label}</span>
    </button>
  );
}

export function SourceNote({ fuente, className = '' }: { fuente: FuenteRef; className?: string }) {
  const resolved = resolveFuente(fuente);
  if (!resolved) return null;
  return (
    <p className={`flex items-start gap-2 text-xs leading-relaxed text-muted ${className}`}>
      <Icon name="book" size={15} className="mt-0.5 shrink-0" />
      <span>
        Fuente:{' '}
        <a
          href={resolved.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-red"
        >
          {resolved.titulo}
          {resolved.seccion ? ` — ${resolved.seccion}` : ''}
        </a>{' '}
        · {resolved.autor_editor} · consultado el {formatDate(resolved.fecha_consulta)}
      </span>
    </p>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className="chip shrink-0"
        >
          {tab.label}
          {tab.count !== undefined ? <span className="tnum opacity-70">{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Native <dialog> with focus trapping handled by the browser. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      aria-label={title}
      className={`card m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-2xl' : 'max-w-lg'} p-0 text-ink backdrop:bg-black/40 backdrop:backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <button
          type="button"
          className="btn btn-icon btn-ghost border-0"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="max-h-[75dvh] overflow-y-auto px-5 py-5">{children}</div>
    </dialog>
  );
}

export function Notice({
  tone = 'info',
  icon = 'info',
  children,
}: {
  tone?: 'info' | 'warn' | 'ok';
  icon?: IconName;
  children: ReactNode;
}) {
  const styles =
    tone === 'warn'
      ? 'bg-warn-soft text-warn'
      : tone === 'ok'
        ? 'bg-ok-soft text-ok'
        : 'bg-red-tint text-ink-2';
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${styles}`}
      role={tone === 'warn' ? 'alert' : undefined}
    >
      <Icon name={icon} size={18} className="mt-0.5 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
