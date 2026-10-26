# APIs académicas: comprobación real (bloque 1)

**Fecha de las pruebas:** 2026-10-14 · **Método:** `curl` con cabecera `Origin: https://diegofranciscog.github.io`, una petición GET real por fuente, revisando la cabecera CORS de la respuesta y los límites que declara el propio servicio.

Un sitio estático no puede guardar claves secretas: toda API que exija clave queda descartada o pasa a enlace profundo. No se usan proxys de terceros.

## Resultado por fuente

| Fuente | URL base probada | Clave | ¿Acepta llamadas del navegador? | Límite observado | Formato | Decisión |
|---|---|---|---|---|---|---|
| Crossref | `https://api.crossref.org/works?query=…` | No | Sí (cabecera CORS con comodín) | `x-rate-limit-limit: 1` por `1s` (pool público) | JSON | **Integración directa** |
| OpenAlex | `https://api.openalex.org/works?search=…` | No (opcional) | Sí (comodín; expone cabeceras de cupo) | 1000 créditos/día por IP sin clave; cada búsqueda cuesta 10 créditos (`X-RateLimit-Cost-USD: 0.001`, `X-RateLimit-Limit-USD: 0.1`) → ~100 búsquedas/día | JSON | **Integración directa con caché agresiva** |
| DOAJ | `https://doaj.org/api/search/articles/{q}` | No | Sí (comodín) | No declara cabeceras de límite | JSON | **Integración directa** |
| LA Referencia | `https://buscador.lareferencia.info/api/v1/search?lookfor=…` (redirige desde `www.lareferencia.info/vufind/api/v1/…`) | No | Sí (comodín) | No declara | JSON (VuFind API, admite `field[]`) | **Integración directa** (tesis y artículos latinoamericanos, incluye repositorios de Ecuador) |
| DataCite | `https://api.datacite.org/dois?query=…` | No | Sí (refleja el origen) | No declara | JSON:API | **Descartada por calidad**: los primeros resultados son depósitos sin revisión por pares (Zenodo); poco útil para el área |
| arXiv | `https://export.arxiv.org/api/query?…` | No | No se pudo confirmar: respondió `429 Rate exceeded` en tres intentos | Muy restrictivo | Atom XML | **Enlace profundo** |
| Semantic Scholar | `https://api.semanticscholar.org/graph/v1/paper/search?…` | Recomendada | No se pudo confirmar: `429 Too Many Requests` sin clave | Pool compartido | JSON | **Enlace profundo** (exige clave para uso fiable) |
| SciELO (ArticleMeta) | `https://articlemeta.scielo.org/api/v1/…` | No | **No** (sin cabecera CORS) y no es un buscador | — | JSON | **Enlace profundo** a `search.scielo.org` |
| BASE | `https://api.base-search.net/cgi-bin/BaseHttpSearchInterface.fcgi` | Registro de IP | **No**: `Access denied for IP address` | — | JSON | **Enlace profundo** |
| Redalyc | `https://www.redalyc.org/busquedaArticuloFiltros.oa?q=…` | — | Página HTML (CORS solo para `redalyc.org`) | — | HTML | **Enlace profundo** |
| Dialnet | `https://dialnet.unirioja.es/buscar/documentos?querysDismax.DOCUMENTAL_TODO=…` | — | Sin API de búsqueda pública | — | HTML | **Enlace profundo** |
| Google Académico | `https://scholar.google.com/scholar?q=…` | — | Sin API; sus condiciones prohíben la consulta automatizada | — | HTML | **Solo enlace profundo (no negociable)** |
| Scribd | `https://www.scribd.com/search?query=…` | — | Sin API; documentos con derechos de terceros | — | HTML | **Solo enlace profundo (no negociable)** |

## Consecuencias para el diseño

1. **Cuatro fuentes directas** en paralelo: Crossref, OpenAlex, DOAJ y LA Referencia. Cada una con tiempo de espera de 8 s; si una falla o tarda, la interfaz muestra las demás y avisa cuál falló (prueba T-09).
2. **OpenAlex tiene cupo por IP.** En una red universitaria con NAT todos los estudiantes comparten IP, así que: caché local de 7 días por consulta normalizada, y la app lee `X-RateLimit-Remaining` (OpenAlex la expone por CORS) para avisar cuando el cupo se agota en vez de fallar en silencio.
3. **Sin correo en las peticiones.** Crossref recomienda `mailto` para el "polite pool", pero enviar el correo del estudiante violaría la promesa de privacidad (T-04). Se usa el pool público.
4. **Peticiones mínimas:** `select`/`field[]` para pedir solo los campos que se muestran (menos datos móviles).
5. **Enlaces profundos** para el resto, con la búsqueda ya escrita y `rel="noopener noreferrer"`.

## Peticiones de ejemplo

Ver [docs/http/apis-academicas.http](http/apis-academicas.http) (formato REST Client / IntelliJ HTTP).

## Bloque 2: datos abiertos y libros (2026-10-25)

Verificadas con peticiones reales y con sus condiciones de uso en [investigacion.md](investigacion.md), sección 11:

| Fuente | URL base | Licencia o condiciones | Uso en ÁBACO |
|---|---|---|---|
| Banco Mundial, World Development Indicators | `https://api.worldbank.org/v2/` | CC BY 4.0 (se muestra la atribución bajo cada gráfico) | Herramienta «Datos macro» |
| Frankfurter con proveedor BCE | `https://api.frankfurter.dev/v2/rates?providers=ECB` | Código MIT; datos del Banco Central Europeo citando la fuente | Herramienta «Divisas» |
| Open Library Search | `https://openlibrary.org/search.json` | Sin derechos nuevos sobre la base; 1 petición por segundo | Quinta fuente del buscador académico (solo libros) |

Todas aceptan llamadas del navegador (`Access-Control-Allow-Origin: *`), están en `connect-src` de la CSP (`csp.config.ts`) y en la política de privacidad, y la prueba T-04 falla si la app contacta cualquier otro origen.
