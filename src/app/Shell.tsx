import { LazyMotion, MotionConfig } from 'motion/react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { AUTHOR } from '../config/author';
import { LogoMark } from '../ui/art';
import { setDisplayPrefs } from '../ui/display-prefs';
import { useApplyPreferences, useEffectiveTheme, useOnline, useReducedMotion } from '../ui/hooks';
import { Icon, type IconName } from '../ui/icons';
import { AppLink } from '../ui/primitives';
import { ToastProvider } from '../ui/toast';
import { CommandPalette } from './CommandPalette';
import { UpdatePrompt } from './UpdatePrompt';

const loadMotionFeatures = () => import('./motion-features').then((module) => module.default);
// IndexedDB (Dexie) stays out of the first download: onboarding and profile sync arrive right after.
const DeviceLayer = lazy(() => import('./DeviceLayer'));

/** Main navigation. The bottom bar on phones has room for five items; formulas stay one tap away from home. */
const NAV: { to: string; label: string; icon: IconName; end?: boolean; mobile?: false }[] = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/materias', label: 'Materias', icon: 'materias' },
  { to: '/estudiar', label: 'Estudiar', icon: 'book' },
  { to: '/formulas', label: 'Fórmulas', icon: 'formula', mobile: false },
  { to: '/herramientas', label: 'Herramientas', icon: 'tools' },
  { to: '/mi-espacio', label: 'Mi espacio', icon: 'me' },
];

function ThemeToggle() {
  const theme = useEffectiveTheme();
  const toggle = () => {
    const tema = theme === 'dark' ? 'light' : 'dark';
    setDisplayPrefs({ tema });
    void import('../data/repositories').then((data) => data.updateProfile({ tema })).catch(() => undefined);
  };
  return (
    <button
      type="button"
      className="btn btn-icon btn-ghost border-0"
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={toggle}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}

export function Shell() {
  useApplyPreferences();
  const reduce = useReducedMotion();
  const online = useOnline();
  const { pathname } = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion={reduce ? 'always' : 'never'}>
        <ToastProvider>
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-xl focus:bg-surface focus:px-4 focus:py-3"
          >
            Saltar al contenido
          </a>
          <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur-xl supports-[backdrop-filter]:bg-paper/70">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
              <AppLink to="/" className="flex min-h-11 items-center gap-2.5" aria-label="ÁBACO, inicio">
                <LogoMark />
                <span className="font-display text-xl font-semibold tracking-tight">ÁBACO</span>
              </AppLink>
              <nav aria-label="Principal" className="ml-6 hidden items-center gap-1 md:flex">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end ?? false}
                    viewTransition={!reduce}
                    className={({ isActive }) =>
                      `relative flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors ${
                        isActive ? 'text-red' : 'text-ink-2 hover:text-ink'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {item.label}
                        {isActive ? (
                          <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-red" />
                        ) : null}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="btn btn-ghost hidden h-11 w-64 justify-start text-muted sm:inline-flex"
                  aria-label="Buscar fórmulas, asignaturas y temas"
                >
                  <Icon name="search" size={18} />
                  <span className="truncate text-sm font-medium">Buscar…</span>
                  <span className="kbd ml-auto">Ctrl K</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="btn btn-icon btn-ghost border-0 sm:hidden"
                  aria-label="Buscar"
                >
                  <Icon name="search" />
                </button>
                <ThemeToggle />
                <AppLink
                  to="/ajustes"
                  className="btn btn-icon btn-ghost border-0"
                  aria-label="Ajustes y respaldo"
                >
                  <Icon name="settings" />
                </AppLink>
              </div>
            </div>
            {!online ? (
              <div
                className="border-t border-line bg-warn-soft px-4 py-1.5 text-center text-xs font-semibold text-warn"
                role="status"
              >
                Sin conexión: tus apuntes, las materias, el laboratorio y casi todas las herramientas siguen
                funcionando.
              </div>
            ) : null}
          </header>

          <main id="contenido" className="mx-auto min-h-[100dvh] max-w-6xl px-4 pt-6 pb-28 md:pt-10 md:pb-16">
            <Outlet />
          </main>

          <footer className="mx-auto max-w-6xl px-4 pb-28 text-xs leading-relaxed text-muted md:pb-10">
            {pathname !== '/sugerencias' ? (
              <AppLink to="/sugerencias" className="card card-lift mb-6 flex items-center gap-4 p-4 text-sm">
                <span className="tile tile-sm shrink-0">
                  <Icon name="sparkle" size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">
                    ¿Falta una materia, un tema o una herramienta?
                  </span>
                  <span className="text-muted">
                    Escríbelo en el buzón de sugerencias: llega directo al autor.
                  </span>
                </span>
                <Icon name="arrow-right" size={18} className="text-red" />
              </AppLink>
            ) : null}
            <div className="border-t border-line pt-6">
              <p>
                <strong className="text-ink-2">ÁBACO no está afiliado a ninguna universidad.</strong> No
                reproduce planes de estudio; el contenido es redacción propia y cada ficha cita su fuente. Es
                gratis, sin cuentas, sin publicidad y sin cookies: tus apuntes viven solo en este dispositivo.
                Contenido educativo, no asesoría profesional.
              </p>
              <nav aria-label="Legal" className="mt-3">
                <ul className="flex flex-wrap gap-x-4 gap-y-2">
                  <li>
                    <AppLink to="/acerca" className="link-red inline-flex min-h-6 items-center">
                      Fuentes
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/legal/privacidad" className="link-red inline-flex min-h-6 items-center">
                      Privacidad
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/legal/terminos" className="link-red inline-flex min-h-6 items-center">
                      Términos
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/legal/almacenamiento" className="link-red inline-flex min-h-6 items-center">
                      Cookies y almacenamiento
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/legal/licencias" className="link-red inline-flex min-h-6 items-center">
                      Licencias
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/legal/accesibilidad" className="link-red inline-flex min-h-6 items-center">
                      Accesibilidad
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/legal/aviso" className="link-red inline-flex min-h-6 items-center">
                      Aviso legal
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/sugerencias" className="link-red inline-flex min-h-6 items-center">
                      Buzón de sugerencias
                    </AppLink>
                  </li>
                </ul>
              </nav>
              <p className="mt-3">
                Hecho por {AUTHOR.nombre} ·{' '}
                {AUTHOR.redes.map((red, i) => (
                  <span key={red.id}>
                    {i > 0 ? ' · ' : ''}
                    <a
                      href={red.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-red inline-flex min-h-6 items-center"
                    >
                      {red.nombre}
                    </a>
                  </span>
                ))}
              </p>
            </div>
          </footer>

          <nav
            aria-label="Principal (móvil)"
            className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-line bg-surface/90 p-1 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.35)] backdrop-blur-xl md:hidden"
            style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
          >
            {NAV.filter((item) => item.mobile !== false).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end ?? false}
                viewTransition={!reduce}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.68rem] font-semibold ${
                    isActive ? 'bg-red-soft text-red' : 'text-muted'
                  }`
                }
              >
                <Icon name={item.icon} size={21} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
          <Suspense fallback={null}>
            <DeviceLayer />
          </Suspense>
          <UpdatePrompt />
          <ScrollRestoration />
        </ToastProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
