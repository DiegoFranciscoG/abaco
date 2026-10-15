import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Academic APIs the browser may call directly (see docs/apis.md). Nothing else leaves the device. */
export const ACADEMIC_API_ORIGINS = [
  'https://api.crossref.org',
  'https://api.openalex.org',
  'https://doaj.org',
  'https://buscador.lareferencia.info',
];

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // KaTeX renders inline style attributes; no inline scripts are allowed.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${ACADEMIC_API_ORIGINS.join(' ')}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

/** Injects the Content-Security-Policy only in production builds (the dev server needs inline HMR scripts). */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'abaco-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const base = env.VITE_BASE_PATH || '/';
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      contentSecurityPolicy(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'icons/*.png'],
        manifest: {
          name: 'ÁBACO — estudio para carreras económicas',
          short_name: 'ÁBACO',
          description:
            'Mallas reales, fórmulas verificadas, laboratorio de hoja de cálculo y buscador académico. Tus apuntes viven en tu teléfono.',
          lang: 'es-EC',
          start_url: '.',
          scope: '.',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#fbf6ef',
          theme_color: '#b3122e',
          categories: ['education', 'productivity'],
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // App shell, content chunks, fonts and the 3D chunk are precached: after the first visit
          // the whole app (mallas, notes, lab) works offline.
          globPatterns: ['**/*.{js,css,html,woff2,svg,png,webmanifest,json}'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          // Academic API answers are cached by the app in IndexedDB (with expiry), never by the service worker.
          runtimeCaching: ACADEMIC_API_ORIGINS.map((origin) => ({
            urlPattern: ({ url }: { url: URL }) => url.origin === origin,
            handler: 'NetworkOnly' as const,
          })),
        },
      }),
    ],
    build: {
      target: 'es2022',
      sourcemap: false,
      chunkSizeWarningLimit: 700,
    },
    server: { port: 5173 },
  };
});
