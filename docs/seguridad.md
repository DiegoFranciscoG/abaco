# Seguridad de ÁBACO

Revisión del 2026-10-26. Referencias: OWASP ASVS 5.0.0 (capítulos tomados de https://github.com/OWASP/ASVS/tree/master/5.0/en), OWASP Top 10 y la hoja de defensa contra *clickjacking* de OWASP. Para reportar una vulnerabilidad, ver [SECURITY.md](../SECURITY.md).

## 1. Modelo de amenazas

ÁBACO es un sitio estático (GitHub Pages o nginx en Docker) sin servidor de aplicación, sin cuentas y sin base de datos central. Los activos a proteger son los datos que cada estudiante guarda en su navegador y la integridad del contenido publicado.

| Amenaza | Vector | Defensa | Prueba |
|---|---|---|---|
| Ejecución de código ajeno (XSS) | Markdown del editor, fórmulas, respaldos importados, respuestas de APIs | Markdown convertido a un árbol y pintado con React, sin `innerHTML` (salvo KaTeX con `trust: false`); URLs filtradas por `isSafeUrl`; fórmulas con analizador propio y lista cerrada de funciones, sin `eval`; CSP `script-src 'self'` sin scripts en línea | `tests/components/ui.test.tsx` (XSS en MarkdownView), `tests/e2e/security.spec.ts` (S-02) |
| *Clickjacking* | Otro sitio enmarca ÁBACO | Docker/nginx: `frame-ancestors 'none'` y `X-Frame-Options: DENY`. GitHub Pages no admite cabeceras: `public/boot.js` detecta el marco y oculta la página | `tests/e2e/security.spec.ts` (S-01), job `docker` de la CI |
| Respaldo manipulado | Archivo JSON importado | Límite de 25 MB, formato y versión primero, esquema Zod estricto con longitudes máximas, migraciones solo de versiones conocidas | `tests/integration/storage.test.ts`, S-03 |
| Fuga de datos personales | Peticiones de red | Solo orígenes de la CSP (`connect-src`); las consultas no llevan identificadores, `credentials: 'omit'`, `Referrer-Policy: no-referrer` | T-04 en `tests/e2e/privacy.spec.ts` |
| Abuso del buzón (insultos, spam, datos personales) | Formulario de sugerencias | Validación de contenido, campo trampa, límite de 3 envíos al día por dispositivo; el envío lo hace la aplicación de correo de quien escribe | `tests/unit/suggestions.test.ts`, `tests/components/suggestions.test.tsx` |
| Secretos en el repositorio | Commits | No hay secretos que guardar; gitleaks 8.30.1 (SHA-256 verificado) sobre todo el historial en la CI | job `secretos` |
| Dependencias vulnerables o con licencia incompatible | `package-lock.json` | `npm ci --ignore-scripts`, `npm audit --omit=dev --audit-level=high`, Dependabot semanal, lista de licencias permitidas | job `calidad`, `tests/unit/licenses.test.ts` |
| Cadena de suministro de la CI | Acciones de GitHub | Acciones fijadas por SHA completo, `permissions: contents: read`, `persist-credentials: false`; el despliegue solo corre si la CI pasó en `main` | `.github/workflows/` |
| Contenedor comprometido | Imagen Docker | nginx sin privilegios (UID 101), sistema de archivos de solo lectura, `cap_drop: ALL`, `no-new-privileges`, solo GET/HEAD, imágenes con versión fija, *healthcheck* | job `docker` |

## 2. Correspondencia con OWASP ASVS 5.0

| Capítulo ASVS 5.0 | Aplica | Cómo se cumple |
|---|---|---|
| V1 Encoding and Sanitization | Sí | Salida siempre por React (escapa por defecto); Markdown como árbol; KaTeX `trust: false` |
| V2 Validation and Business Logic | Sí | Zod en contenido, respaldos y colecciones; validación del buzón; asientos contables que solo se guardan si cuadran |
| V3 Web Frontend Security | Sí | CSP estricta compartida entre `<meta>` y nginx (`csp.config.ts`, prueba de paridad), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, anti-*clickjacking*, enlaces externos con `noopener noreferrer` |
| V4 API and Web Service | Parcial | No expone API propia; consume APIs públicas solo por GET, con tiempo de espera, caché y validación de la respuesta |
| V5 File Handling | Sí | Importación de `.json` y `.xlsx` en el navegador con tamaño y tipo limitados; nada se sube a un servidor |
| V6 Authentication, V7 Session Management, V8 Authorization, V9 Self-contained Tokens, V10 OAuth and OIDC | No | No hay cuentas, sesiones ni tokens (decisión de diseño que elimina esa superficie de ataque) |
| V11 Cryptography | Parcial | Identificador local con `crypto.randomUUID()`; la huella del buzón (FNV-1a) no es criptográfica y solo evita repetidos |
| V12 Secure Communication | Sí | HTTPS de GitHub Pages; todas las APIs y fuentes son `https://` (lo exige el esquema de contenido) |
| V13 Configuration | Sí | Sin secretos ni valores por defecto sensibles; `.env.example` solo con la ruta base; dependencias fijadas |
| V14 Data Protection | Sí | Datos solo en el dispositivo; respaldos que el estudiante controla; borrado completo en Ajustes; minimización en el buzón |
| V15 Secure Coding and Architecture | Sí | Capas `domain` (lógica pura con pruebas), `data` (Dexie), `features` (interfaz); sin `eval` ni `new Function` |
| V16 Security Logging and Error Handling | Parcial | Sin servidor no hay registros centrales; los errores se muestran sin trazas técnicas y nunca con datos del estudiante |
| V17 WebRTC | No | No se usa |

## 3. Cómo verificarlo

```bash
npm run lint && npm run build && npm run test:coverage
npx playwright test tests/e2e/security.spec.ts tests/e2e/privacy.spec.ts
docker compose up --build
```

Con el contenedor arriba, `curl -I http://localhost:8080/` muestra las cabeceras y `curl -X POST http://localhost:8080/` responde 403.
