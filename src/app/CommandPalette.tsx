import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { ContentIndex, SearchHit } from '../domain/search/content-search';
import type { SearchDocType } from '../domain/search/index-data';
import { Icon, type IconName } from '../ui/icons';
import { AreaTile } from '../ui/primitives';

const TYPE_LABEL: Record<SearchDocType, string> = {
  carrera: 'Carrera',
  materia: 'Materia',
  tema: 'Tema',
  subtema: 'Subtema',
  formula: 'Fórmula',
  herramienta: 'Herramienta',
  termino: 'Glosario',
  app: 'App externa',
  ejercicio: 'Ejercicio',
};

const QUICK: { label: string; to: string; icon: IconName }[] = [
  { label: 'Entregables paso a paso', to: '/entregables', icon: 'ledger' },
  { label: 'Pega tu enunciado', to: '/enunciado', icon: 'search' },
  { label: '¿Cuánto necesito para pasar?', to: '/herramientas/notas', icon: 'target' },
  { label: 'Ecuador en cifras', to: '/cifras', icon: 'receipt' },
  { label: 'Materias por carrera y ciclo', to: '/materias', icon: 'materias' },
  { label: 'Buscador académico (artículos y tesis)', to: '/buscar', icon: 'book' },
  { label: 'Herramientas de estudio', to: '/herramientas', icon: 'tools' },
  { label: 'Practicar ejercicios', to: '/practica', icon: 'target' },
  { label: 'Modo profesor: armar un taller', to: '/profesor', icon: 'book' },
  { label: 'Glosario', to: '/glosario', icon: 'note' },
  { label: 'Buzón de sugerencias', to: '/sugerencias', icon: 'sparkle' },
];

/** Instant search over the build-time index: formulas, subjects, topics, glossary, apps, exercises. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [index, setIndex] = useState<ContentIndex | null>(null);
  const [search, setSearch] = useState<typeof import('../domain/search/content-search') | null>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      window.setTimeout(() => input.current?.focus(), 0);
      void import('../domain/search/content-search').then(async (module) => {
        setSearch(module);
        setIndex(await module.loadContentIndex());
      });
    }
    if (!open && d.open) d.close();
  }, [open]);

  const hits: SearchHit[] = useMemo(
    () => (index && search ? search.searchContent(index, query, { limit: 12 }) : []),
    [index, search, query],
  );
  const suggestions = useMemo(
    () => (index && search && hits.length === 0 ? search.suggest(index, query) : []),
    [index, search, hits.length, query],
  );

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(hits.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (event.key === 'Enter' && hits[active]) {
      event.preventDefault();
      go(hits[active].ruta);
    }
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onCancel={onClose}
      aria-label="Buscar en ÁBACO"
      className="card mx-auto mt-[10dvh] w-[calc(100%-1.5rem)] max-w-2xl p-0 text-ink backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Icon name="search" className="text-muted" />
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="VAN, depreciación, partida doble, Matemática Financiera…"
          className="h-16 flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls="palette-results"
          aria-activedescendant={hits[active] ? `hit-${active}` : undefined}
          aria-label="Escribe lo que buscas"
        />
        <button
          type="button"
          className="btn btn-icon border-0"
          onClick={onClose}
          aria-label="Cerrar búsqueda"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="max-h-[60dvh] overflow-y-auto p-2">
        {query.trim().length < 2 ? (
          <ul className="space-y-1" aria-label="Accesos rápidos">
            {QUICK.map((q) => (
              <li key={q.to}>
                <button
                  type="button"
                  onClick={() => go(q.to)}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-surface-2"
                >
                  <span className="tile h-9 w-9 rounded-xl">
                    <Icon name={q.icon} size={18} />
                  </span>
                  <span className="font-medium">{q.label}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : hits.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted">
            {index ? 'Sin resultados.' : 'Cargando índice…'}
            {suggestions.length > 0 ? (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span>¿Quisiste decir?</span>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    onClick={() => {
                      setQuery(s);
                      setActive(0);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <ul id="palette-results" role="listbox" aria-label="Resultados" className="space-y-1">
            {hits.map((hit, i) => (
              <li key={hit.id} id={`hit-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(hit.ruta)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === active ? 'bg-red-tint' : ''}`}
                >
                  <AreaTile area={hit.area} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{hit.titulo}</span>
                    <span className="block truncate text-xs text-muted">{hit.extracto}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[0.7rem] font-semibold text-muted">
                    {TYPE_LABEL[hit.tipo]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
