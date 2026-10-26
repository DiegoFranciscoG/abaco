/*
 * Tiny synchronous boot script (no inline scripts: the CSP only allows files from this origin).
 * 1) Applies the theme and motion preference before the first paint: the student's choice cached in
 *    localStorage ('abaco:pantalla', see src/ui/display-prefs.ts) or, without one, the system setting.
 * 2) Tells the static shell whether the visitor opened the home page or a deep link, so the pre-rendered
 *    hero only shows on the home page.
 * 3) Anti-clickjacking for hosts that cannot send headers (GitHub Pages ignores frame-ancestors in a <meta>
 *    tag): inside a frame of another page the app hides itself (CSS rule on html[data-framed]) and offers a
 *    link to open it in its own tab. Docker/nginx also sends frame-ancestors 'none' and X-Frame-Options.
 */
(function () {
  const root = document.documentElement;
  const readPrefs = () => {
    try {
      return JSON.parse(window.localStorage.getItem('abaco:pantalla') || '{}') || {};
    } catch {
      return {};
    }
  };
  const media = (query) => {
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  };
  const prefs = readPrefs();
  const dark =
    prefs.tema === 'dark' || prefs.tema === 'light'
      ? prefs.tema === 'dark'
      : media('(prefers-color-scheme: dark)');
  const reduce =
    prefs.movimiento === 'reduce' || prefs.movimiento === 'full'
      ? prefs.movimiento === 'reduce'
      : media('(prefers-reduced-motion: reduce)');
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.motion = reduce ? 'reduce' : 'full';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#15110e' : '#fbf6ef');
  const hash = window.location.hash;
  root.dataset.route = !hash || hash === '#' || hash === '#/' ? 'home' : 'other';
  let framed;
  try {
    framed = window.self !== window.top;
  } catch {
    framed = true;
  }
  if (framed) {
    root.dataset.framed = 'true';
    document.addEventListener('DOMContentLoaded', () => {
      const notice = document.createElement('a');
      notice.href = window.location.href;
      notice.target = '_top';
      notice.rel = 'noopener';
      notice.className = 'framed-notice';
      notice.textContent = 'ÁBACO no se muestra dentro de otras páginas. Ábrelo en su propia pestaña.';
      document.documentElement.appendChild(notice);
    });
  }
})();
