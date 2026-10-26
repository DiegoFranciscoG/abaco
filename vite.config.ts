import { defineConfig, loadEnv, type Plugin } from 'vite';
import type { OutputBundle } from 'rolldown';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { CSP_META, EXTERNAL_API_ORIGINS } from './csp.config';

/** Injects the Content-Security-Policy only in production builds (the dev server needs inline HMR scripts). */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'abaco-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP_META}" />`,
      );
    },
  };
}

/**
 * The entry only paints the static shell and then imports the app after the first frame. To keep the download
 * parallel, the app chunks are announced in index.html as modulepreload with low priority: they arrive while the
 * shell is on screen without competing with the CSS that the first paint needs.
 */
function lowPriorityAppPreload(): Plugin {
  let base = '/';
  return {
    name: 'abaco-low-priority-preload',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle as OutputBundle | undefined;
        const entry = ctx.chunk;
        if (!bundle || !entry) return html;
        const files = new Set<string>();
        const visit = (fileName: string) => {
          const chunk = bundle[fileName];
          if (files.has(fileName) || !chunk || chunk.type !== 'chunk') return;
          files.add(fileName);
          chunk.imports.forEach(visit);
        };
        entry.dynamicImports.forEach(visit);
        files.delete(entry.fileName);
        entry.imports.forEach((file) => files.delete(file));
        return {
          html,
          tags: [...files].map((file) => ({
            tag: 'link',
            attrs: { rel: 'modulepreload', href: `${base}${file}`, fetchpriority: 'low', crossorigin: '' },
            injectTo: 'head' as const,
          })),
        };
      },
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
      lowPriorityAppPreload(),
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
          // API answers are cached by the app in IndexedDB (with expiry), never by the service worker.
          runtimeCaching: EXTERNAL_API_ORIGINS.map((origin) => ({
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
