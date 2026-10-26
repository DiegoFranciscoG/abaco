# Dependencias

Versiones verificadas en el registro oficial de npm (y en el CDN oficial de SheetJS) el **2026-10-14**. Todas fijadas sin rangos (`package.json` y `package-lock.json`). `npm audit`: **0 vulnerabilidades** en el momento de la instalación.

## Producción

| Paquete | Versión | Licencia | Para qué | Nota |
|---|---|---|---|---|
| react / react-dom | 19.3.1 | MIT | Interfaz | Parche publicado el mismo día en todas las ramas; se toma la más reciente |
| react-router | 8.4.0 | MIT | Rutas (`createHashRouter`) | Hash router: funciona en GitHub Pages sin reescrituras y sin conexión |
| dexie | 4.4.6 | Apache-2.0 | IndexedDB con versiones y migraciones | Evita perder apuntes en actualizaciones |
| dexie-react-hooks | 4.4.0 | Apache-2.0 | `useLiveQuery` | — |
| motion | 14.2.0 | MIT | Animaciones con resorte (`LazyMotion` + `m`) | Respeta "reducir movimiento" |
| three | 0.186.1 | MIT | Ábaco 3D de la portada | Se carga aparte, después de que la página es usable |
| @formulajs/formulajs | 4.6.1 | MIT | Funciones de Excel (VA, PAGO, TIR…) | **Elegida sobre HyperFormula (GPLv3)** para mantener todo el proyecto en MIT |
| xlsx (SheetJS CE) | 0.20.3 | Apache-2.0 | Leer y escribir `.xlsx` | Instalada desde `cdn.sheetjs.com` (distribución oficial). La copia de npm (0.18.5) está desactualizada y tiene vulnerabilidades conocidas |
| katex | 0.19.0 | MIT | Fórmulas compuestas | Carga diferida |
| minisearch | 7.2.0 | MIT | Búsqueda instantánea de fórmulas y temas | Índice generado al compilar (`scripts/build-search-index.ts`) |
| zod | 4.6.7 | MIT | Esquemas del contenido, del respaldo y de las respuestas de las APIs | Una sola definición para tipos y validación |
| workbox-window | 7.4.1 | MIT | Registro del service worker | — |
| @fontsource-variable/inter, fraunces, jetbrains-mono | 5.3.0 | OFL-1.1 | Tipografías autoalojadas | Cero peticiones a terceros (privacidad y modo sin conexión) |

## Desarrollo y pruebas

| Paquete | Versión | Licencia | Nota |
|---|---|---|---|
| vite | 8.3.4 | MIT | Build estático |
| @vitejs/plugin-react | 6.1.2 | MIT | Requiere Vite 8 |
| tailwindcss / @tailwindcss/vite | 4.3.3 | MIT | Tokens propios en `@theme` |
| vite-plugin-pwa / workbox-build | 2.0.0 / 7.4.1 | MIT | PWA con estrategia de caché por tipo de recurso. `workbox-build` arrastra `glob@11` marcado como obsoleto; solo se usa al compilar |
| typescript | **6.0.3** | Apache-2.0 | Existe la 7.0.2, pero `typescript-eslint@8.71.2` declara `typescript <6.1.0`. Se elige la última compatible para no romper el lint |
| typescript-eslint | 8.71.2 | MIT | — |
| eslint / @eslint/js | 10.12.0 / 10.0.1 | MIT | Configuración plana |
| eslint-plugin-react-hooks / react-refresh | 7.1.1 / 0.5.7 | MIT | — |
| prettier | 3.9.10 | MIT | — |
| vitest / @vitest/coverage-v8 | 5.0.4 | MIT | Unitarias, componentes, integración y contenido |
| @testing-library/react, dom, user-event, jest-dom | 16.3.3 / 10.4.2 / 14.6.8 / 7.0.1 | MIT | — |
| jsdom | 30.1.2 | MIT | Entorno DOM de pruebas |
| fake-indexeddb | 6.2.5 | Apache-2.0 | IndexedDB en pruebas de integración |
| @playwright/test | 1.64.1 | Apache-2.0 | Flujos completos (T-03, T-04, T-08, T-09) |
| @axe-core/playwright | 4.13.0 | MPL-2.0 | Accesibilidad. MPL-2.0 es copyleft débil por archivo y solo se usa en pruebas: no afecta a la licencia MIT del código distribuido |
| @lhci/cli | 0.15.1 | Apache-2.0 | Lighthouse CI (se ejecuta con `npx` en CI) |

## Entorno

| Herramienta | Versión | Nota |
|---|---|---|
| Node.js (CI y Docker) | 24.22.0 LTS "Krypton" | Publicada el 2026-10-14. Varias dependencias declaran `^24.15 \|\| >=26`; Node 25 (no LTS) produce avisos `EBADENGINE` |
| Imagen de build | `node:24.22.0-alpine` | — |
| Imagen de servicio | `nginxinc/nginx-unprivileged:1.31.7-alpine-slim` | Usuario no root, puerto 8080 |

## Descartadas

| Opción | Motivo |
|---|---|
| HyperFormula | GPLv3: obligaría a licenciar todo ÁBACO como GPLv3 |
| xlsx desde npm (0.18.5) | Versión vieja con vulnerabilidades conocidas; SheetJS distribuye la edición comunitaria desde su CDN |
| jspreadsheet-ce | La cuadrícula propia pesa menos, se integra con el motor de fórmulas en español y es accesible con teclado |
| Fuse.js | MiniSearch permite serializar el índice al compilar y es más liviano para este caso |
| Google Fonts por CDN | Cada visita filtraría la IP del estudiante a un tercero y no funcionaría sin conexión |
