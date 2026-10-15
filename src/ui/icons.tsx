import type { SVGProps } from 'react';

/** Hand-drawn icon set (1.75 stroke, rounded joins) so the app does not look like every other template. */
export type IconName =
  | 'home'
  | 'mallas'
  | 'formula'
  | 'lab'
  | 'me'
  | 'search'
  | 'star'
  | 'star-filled'
  | 'arrow-right'
  | 'arrow-left'
  | 'chevron-down'
  | 'chevron-right'
  | 'close'
  | 'plus'
  | 'check'
  | 'copy'
  | 'download'
  | 'upload'
  | 'note'
  | 'bell'
  | 'folder'
  | 'trash'
  | 'sun'
  | 'moon'
  | 'settings'
  | 'info'
  | 'external'
  | 'shield'
  | 'compare'
  | 'book'
  | 'target'
  | 'apps'
  | 'up'
  | 'down'
  | 'wifi-off'
  | 'sparkle'
  | 'contabilidad'
  | 'finanzas'
  | 'tributario'
  | 'cuantitativo'
  | 'derecho'
  | 'gestion'
  | 'economia'
  | 'tecnologia'
  | 'formacion';

const PATHS: Record<IconName, string> = {
  home: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
  mallas: 'M4 5h16M4 5v14h16V5M9 5v14M14.5 5v14M4 10h16M4 14.5h16',
  formula: 'M6 5h9M6 5l5 7-5 7h10M17 15.5l3 3.5M20 15.5 17 19',
  lab: 'M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16',
  me: 'M12 12.2a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20c.9-3.6 3.9-5.6 7.5-5.6s6.6 2 7.5 5.6',
  search: 'M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM15.6 15.6 20.5 20.5',
  star: 'm12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z',
  'star-filled': 'm12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z',
  'arrow-right': 'M5 12h13.5M13 6.5l5.5 5.5-5.5 5.5',
  'arrow-left': 'M19 12H5.5M11 6.5 5.5 12l5.5 5.5',
  'chevron-down': 'm6 9.5 6 6 6-6',
  'chevron-right': 'm9.5 6 6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  copy: 'M8.5 8.5h10v11h-10zM15.5 8.5V4.5h-10v11h3',
  download: 'M12 4v11.5M7 10.5l5 5 5-5M5 19.5h14',
  upload: 'M12 16V4.5M7 9.5l5-5 5 5M5 19.5h14',
  note: 'M6 3.5h8.5L19 8v12.5H6zM14 3.5V8.5h5M9 13h7M9 16.5h5',
  bell: 'M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2H5zM10 20.5a2.2 2.2 0 0 0 4 0',
  folder: 'M3.5 6.5a1 1 0 0 1 1-1h5l2 2.5h8a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z',
  trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13M10.5 11v5.5M13.5 11v5.5',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  moon: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5.5M12 7.5v.5',
  external: 'M14 4.5h5.5V10M19.5 4.5 11 13M17 13.5v5.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1H11',
  shield: 'M12 3.5 5 6v5.5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6zM9 12l2.2 2.2L15.5 10',
  compare: 'M7 4v16M17 4v16M3.5 8.5H7M17 8.5h3.5M3.5 15.5H7M17 15.5h3.5M10 12h4',
  book: 'M4.5 5.5c2.5-1 5-1 7.5.5v13c-2.5-1.5-5-1.5-7.5-.5zM19.5 5.5c-2.5-1-5-1-7.5.5v13c2.5-1.5 5-1.5 7.5-.5z',
  target: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 12.5v-.5',
  apps: 'M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 16.5h6M16.5 13.5v6',
  up: 'm6.5 14.5 5.5-5.5 5.5 5.5',
  down: 'm6.5 9.5 5.5 5.5 5.5-5.5',
  'wifi-off': 'M3.5 3.5 20.5 20.5M8.5 12.5a6 6 0 0 1 3.5-1.5M5 9a11 11 0 0 1 3.5-2.2M19 9a11 11 0 0 0-6-2.9M10 15.5a3 3 0 0 1 4 0M12 19h.01',
  sparkle: 'M12 3.5 13.8 10.2 20.5 12 13.8 13.8 12 20.5 10.2 13.8 3.5 12 10.2 10.2z',
  // Area marks
  contabilidad: 'M5 4.5h12.5a1.5 1.5 0 0 1 1.5 1.5v14H6.5A1.5 1.5 0 0 1 5 18.5zM5 18.5A1.5 1.5 0 0 1 6.5 17H19M9 8.5h6.5M9 11.5h6.5M12.2 8.5v5.5',
  finanzas: 'M4 19.5h16M6.5 16V12M10.5 16V9.5M14.5 16v-4.5M18.5 16V6.5M5.5 9.5 10 6l3.5 2.5 5-4',
  tributario: 'M6.5 3.5h11v17l-2.2-1.5-2 1.5-2-1.5-2.3 1.5-2.5-1.5zM9.5 9.5l5-2M9.8 7.6h.01M14.2 9.6h.01M9 13.5h6.5M9 16.5h4',
  cuantitativo: 'M17.5 5H7l5.5 7L7 19h10.5',
  derecho: 'M12 4v16M6.5 20h11M5 7.5h14M7 7.5l-3 6.5a3 3 0 0 0 6 0zM17 7.5 14 14a3 3 0 0 0 6 0z',
  gestion: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5z',
  economia: 'M4.5 4.5v15h15M7.5 7.5c3.5 0 5 9 11 9.5M7.5 17c6 0 7-9 11-9.5',
  tecnologia: 'M7.5 4.5h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3zM9 9h6v6H9zM2.5 9.5h2M2.5 14.5h2M19.5 9.5h2M19.5 14.5h2',
  formacion: 'M2.5 9 12 4.5 21.5 9 12 13.5zM6.5 11v5c1.5 1.5 3.5 2.5 5.5 2.5s4-1 5.5-2.5v-5M21.5 9v5',
};

const FILLED = new Set<IconName>(['star-filled']);

export function Icon({ name, size = 22, title, ...rest }: { name: IconName; size?: number; title?: string } & SVGProps<SVGSVGElement>) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[name]} />
    </svg>
  );
}
