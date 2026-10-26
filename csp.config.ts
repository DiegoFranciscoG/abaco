/**
 * Content-Security-Policy shared by the build (<meta> tag, see vite.config.ts) and nginx (HTTP header,
 * see nginx.conf). A unit test checks that both stay identical.
 */

/** Academic APIs the browser may call directly (see docs/apis.md). */
export const ACADEMIC_API_ORIGINS = [
  'https://api.crossref.org',
  'https://api.openalex.org',
  'https://doaj.org',
  'https://buscador.lareferencia.info',
  'https://openlibrary.org',
];

/** Open data APIs used by the study tools (docs/investigacion.md, section 11). */
export const DATA_API_ORIGINS = ['https://api.worldbank.org', 'https://api.frankfurter.dev'];

/** Every origin the app may contact besides its own. Nothing else leaves the device. */
export const EXTERNAL_API_ORIGINS = [...ACADEMIC_API_ORIGINS, ...DATA_API_ORIGINS];

export const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  // KaTeX renders inline style attributes; no inline scripts are allowed.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${EXTERNAL_API_ORIGINS.join(' ')}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
];

/** frame-ancestors only works as an HTTP header (browsers ignore it inside <meta>). */
export const CSP_HEADER_ONLY = ["frame-ancestors 'none'"];

export const CSP_META = CSP_DIRECTIVES.join('; ');
export const CSP_HEADER = [...CSP_DIRECTIVES, ...CSP_HEADER_ONLY].join('; ');
