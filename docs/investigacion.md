# Investigación y fuentes

Todo se consultó el **2026-10-14** salvo que se indique otra fecha. Regla aplicada: si dos fuentes se contradicen, gana la oficial y más reciente. Lo que no se pudo verificar queda marcado como **SUPUESTO** o **PENDIENTE** y no se publica en la app.

## 1. Mallas curriculares (fuente oficial de cada carrera)

Método: descarga de la página oficial de cada carrera (los `robots.txt` de ambas universidades permiten esas rutas), extracción de la lista de asignaturas por ciclo y comparación del conteo contra lo que la propia página declara. El texto de cada asignatura se guarda **tal como lo publica la universidad** (`nombre_oficial`) y se agrega un `nombre` normalizado solo para lectura (mayúsculas y minúsculas, sin punto final).

| # | Carrera | URL oficial | Ciclos | Asignaturas listadas | Declaradas por la página | Observación |
|---|---|---|---|---|---|---|
| M1 | UCuenca · Administración de Empresas | https://www.ucuenca.edu.ec/carreras/administracion-de-empresas/ | 8 | 50 | — | Presencial · Licenciado/a en Administración de Empresas |
| M2 | UCuenca · Administración de Empresas (Modalidad Dual) | https://www.ucuenca.edu.ec/carreras/administracion-de-empresas-modalidad-dual/ | 8 | 51 | — | La página repite algunas asignaturas en el mismo ciclo y divide "Práctica Preprofesional III" en dos ítems; se reproduce tal cual con nota visible |
| M3 | UCuenca · Contabilidad y Auditoría | https://www.ucuenca.edu.ec/carreras/contabilidad-y-auditoria/ | 8 | 51 | — | Presencial · PASLE B1 en 8.º ciclo |
| M4 | UCuenca · Economía | https://www.ucuenca.edu.ec/carreras/economia/ | 8 | 50 | — | Título: Economista |
| M5 | UCuenca · Emprendimiento e Innovación | https://www.ucuenca.edu.ec/carreras/emprendimiento-e-innovacion/ | 8 | 57 | — | — |
| M6 | UCuenca · Mercadotecnia | https://www.ucuenca.edu.ec/carreras/mercadotecnia/ | 8 | 50 | — | — |
| M7 | UCACUE · Administración de Empresas | https://www.ucacue.edu.ec/pregrado/unidad-academica-de-ciencias-economicas-y-empresariales/carrera-de-administracion-de-empresas/ | 8 | 40 | 42 | Diferencia mostrada en la app |
| M8 | UCACUE · Administración de Empresas (Dual) | https://www.ucacue.edu.ec/pregrado/unidad-academica-de-ciencias-economicas-y-empresariales/carrera-de-administracin-de-empresas-dual/ | 8 | 46 | 42 | Incluye 6 "Prácticas en entornos laborales" como ítems de malla |
| M9 | UCACUE · Contabilidad y Auditoría | https://www.ucacue.edu.ec/pregrado/unidad-academica-de-ciencias-economicas-y-empresariales/carrera-de-contabilidad-y-auditoria/ | 8 | 38 | 40 | 5 760 h · 120 créditos · presencial y en línea |
| M10 | UCACUE · Economía | https://www.ucacue.edu.ec/pregrado/unidad-academica-de-ciencias-economicas-y-empresariales/carrera-de-economia/ | 8 | 39 | 40 | — |
| M11 | UCACUE · Finanzas, Banca y Seguros | https://www.ucacue.edu.ec/pregrado/unidad-academica-de-ciencias-economicas-y-empresariales/carrera-de-finanzas-banca-y-seguros/ | 8 | 39 | 40 | Solo en línea |
| M12 | UCACUE · Marketing e Inteligencia de Mercados | https://www.ucacue.edu.ec/pregrado/unidad-academica-de-ciencias-economicas-y-empresariales/carrera-de-marketing-e-inteligencia-de-mercado/ | 8 | 40 | 40 | Coincide |
| M13 | UCACUE · Negocios Internacionales | https://www.ucacue.edu.ec/pregrado/unidad-academica-de-ciencias-economicas-y-empresariales/carrera-de-negocios-internacionales/ | 8 | 37 | 37 | 6 144 h · 128 créditos |

Facultades: [FCEA — Universidad de Cuenca](https://www.ucuenca.edu.ec/facultad/ciencias-economicas-y-administrativas/) (Sociología se excluye: no es del área) · [Unidad Académica de Ciencias Económicas y Empresariales — UCACUE](https://www.ucacue.edu.ec/pregrado/unidad-academica-de-ciencias-economicas-y-empresariales/). Para la UCACUE se toma la oferta de la matriz Cuenca.

**Derechos:** la lista de asignaturas es información factual publicada; se reproduce citando y enlazando la fuente. No se copian sílabos ni material de clase. Aviso visible en toda la app: *ÁBACO no está afiliado a ninguna universidad.*

## 2. Normativa ecuatoriana

| # | Fuente (oficial) | URL | Qué se tomó |
|---|---|---|---|
| N1 | SRI — Impuesto al Valor Agregado | https://www.sri.gob.ec/impuesto-al-valor-agregado-iva | Hecho generador y base (art. 52 LRTI); tabla de tarifas: Decreto Ejecutivo 198, **15 %** general desde el 01-04-2024; 5 % materiales de construcción; 0 % bienes de la lista oficial |
| N2 | SRI — Impuesto a la Renta | https://www.sri.gob.ec/impuesto-renta | Tarifa general de sociedades **25 %**; personas naturales liquidan con la tabla del ejercicio fiscal |
| N3 | SRI — PDF "Tablas de cálculo de Impuesto a la Renta" | https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/58a7f4f6-ab51-48b6-b9ff-a8e97e1a28ef/Tablas%20de%20c%c3%a1lculo%20de%20Impuesto%20a%20la%20Renta.pdf | Tabla 2026 completa (Res. NAC-DGERCGC25-00000043, 2.º Supl. R.O. 194, 30-12-2025): fracción básica desgravada USD 12 208; tramos 5 %…37 % |
| N4 | Ministerio del Trabajo — boletín SBU 2026 | https://www.trabajo.gob.ec/despues-de-casi-una-decada-hay-consenso-gobierno-empleadores-y-trabajadores-acuerdan-fijar-el-salario-basico-unificado-de-2026-en-usd-482-no-hay-imposicion-hay-union/ | Salario Básico Unificado 2026: USD 482 |
| N5 | Ley de Compañías (texto vigente compilado, publicado en el portal del SERCOP) | https://portal.compraspublicas.gob.ec/sercop/wp-content/uploads/2025/12/LEY_DE_COMPAN%CC%83I%CC%81AS.pdf | Contrato de compañía, especies de compañías, requisitos de constitución, administración, obligaciones de información a la Superintendencia |
| N6 | Código de Comercio (Asamblea Nacional) | https://www.asambleanacional.gob.ec/sites/default/files/codigo_de_comercio.pdf | Referencia general de actos de comercio y comerciantes (R.O. Supl. 497, 29-05-2019) |
| N7 | Superintendencia de Compañías — portal y consulta de compañías | https://www.supercias.gob.ec/portalscvs/ | App recomendada (consulta pública de compañías) |

**Tarifa de IVA 2026 — verificación parcial.** La página oficial del SRI muestra el 15 % por Decreto 198 (desde 01-04-2024) pero no menciona 2026 de forma expresa, y su texto general aún cita el 13 % de la ley base. La continuidad del 15 % en 2026 la confirman El Universo, Expreso y Bloomberg Tax citando la Circular NAC-DGECCGC25-00000006 (26-12-2025), cuyo texto oficial no pude abrir. Decisión: la fórmula del IVA trata la tarifa como **variable**; el ejemplo usa 15 % y la ficha muestra la advertencia "confirma la tarifa vigente en sri.gob.ec".

**SUPUESTO / PENDIENTE (no se publican):**
- Porcentajes de aportación al IESS (9,45 % personal y 11,15 % patronal): solo los encontré en fuentes secundarias; la página del IESS no los mostró. Quedan fuera del día 1.
- Décimo tercero, décimo cuarto y utilidades (Código del Trabajo arts. 97, 111, 113): el PDF oficial enlazado por el Ministerio del Trabajo respondió 404. Quedan fuera del día 1.

## 3. Bibliografía abierta para fórmulas y temas

Se cita y enlaza; el texto de ÁBACO es redacción propia. Licencias verificadas en cada libro.

| # | Fuente | URL | Licencia | Qué se tomó |
|---|---|---|---|---|
| B1 | OpenStax — *Principles of Financial Accounting* | https://openstax.org/details/books/principles-financial-accounting | CC BY-NC-SA 4.0 | Ecuación contable, partida doble, ciclo contable, balance de comprobación, mercaderías, inventarios PEPS/promedio, depreciación, razones de liquidez y de cuentas por cobrar |
| B2 | OpenStax — *Principles of Managerial Accounting* | https://openstax.org/details/books/principles-managerial-accounting | CC BY-NC-SA 4.0 | Margen de contribución, punto de equilibrio, margen de seguridad, apalancamiento operativo |
| B3 | OpenStax — *Principles of Finance* | https://openstax.org/details/books/principles-finance | CC BY-NC-SA 4.0 | Valor del dinero en el tiempo, anualidades, perpetuidades, amortización, tasas efectivas, VAN, TIR, periodo de recuperación, razones financieras y DuPont |
| B4 | OpenStax — *Introductory Statistics 2e* | https://openstax.org/details/books/introductory-statistics-2e | CC BY-NC-SA 4.0 | Medidas de centro, posición y dispersión; puntuación z; correlación |
| B5 | OpenStax — *Calculus Volume 1* | https://openstax.org/details/books/calculus-volume-1 | CC BY-NC-SA 4.0 | Funciones, límites, derivada, reglas de derivación, optimización |
| B6 | OpenStax — *Contemporary Mathematics* | https://openstax.org/details/books/contemporary-mathematics | CC BY-NC-SA 4.0 | Interés simple y compuesto |
| B7 | OpenStax — *Principles of Economics 3e* | https://openstax.org/details/books/principles-economics-3e | CC BY-NC-SA 4.0 | Elasticidad precio |
| B8 | IESBA — *International Code of Ethics for Professional Accountants* | https://www.ethicsboard.org/iesba-code | Uso de consulta | Principios fundamentales, marco conceptual, amenazas y salvaguardas |
| B9 | IFRS Foundation — lista de normas y NIIF para las PYMES | https://www.ifrs.org/issued-standards/list-of-standards/ | Uso de consulta | Referencia de normas (NIC 2, NIC 16) |

Las URLs de sección de OpenStax se tomaron del índice publicado de cada libro (`/books/<libro>/pages/<sección>`).

## 4. Excel (sintaxis y nombres de funciones en español)

| # | Fuente oficial | URL | Qué se tomó |
|---|---|---|---|
| X1 | Microsoft — Funciones financieras (referencia) | https://support.microsoft.com/es-es/office/funciones-financieras-referencia-5658d81e-6035-4f24-89c1-fbf124c2b1d8 | Equivalencias: PV→VA, FV→VF, PMT→PAGO, RATE→TASA, NPV→VNA, IRR→TIR, IPMT→PAGOINT, PPMT→PAGOPRIN, EFFECT→INT.EFECTIVO, NOMINAL→TASA.NOMINAL; SLN, SYD, DB, DDB y NPER no cambian |
| X2 | Microsoft — Funciones estadísticas (referencia) | https://support.microsoft.com/es-es/office/funciones-estad%C3%ADsticas-referencia-624dac86-a375-4435-bc25-76d659719ffd | AVERAGE→PROMEDIO, MEDIAN→MEDIANA, STDEV.S→DESVEST.M, STDEV.P→DESVEST.P, CORREL→COEF.DE.CORREL, COUNT→CONTAR… |
| X3 | Microsoft — Funciones lógicas (referencia) | https://support.microsoft.com/es-es/office/funciones-l%C3%B3gicas-referencia-e093c192-278b-43f6-8c3a-b6ce299931f5 | IF→SI, AND→Y, OR→O, NOT→NO, IFERROR→SI.ERROR |
| X4 | Microsoft — Funciones por orden alfabético | https://support.microsoft.com/es-es/office/funciones-de-excel-por-orden-alfab%C3%A9tico-b3944572-255d-4efb-bb96-c6d90033e188 | SUM→SUMA, SUMPRODUCT→SUMAPRODUCTO, ROUND→REDONDEAR, SQRT→RAIZ, MOD→RESIDUO. **Hallazgo:** esta página tiene errores de traducción automática (POWER aparece como "ALIMENTACIÓN", FACT como "HECHO"). Las funciones con nombre dudoso **no** se usan en el contenido; en su lugar se usa el operador `^` |
| X5 | Microsoft — Información general sobre fórmulas, referencias, SI, BUSCARX, SUMAR.SI, tablas dinámicas, validación, formato condicional, gráficos | ver `content/fuentes.json` | Temas de Informática Intermedia |

## 5. APIs académicas

Resumen en [docs/apis.md](apis.md). Directas: Crossref, OpenAlex, DOAJ, LA Referencia. Enlace profundo: Google Académico, Scribd, SciELO, Redalyc, Dialnet, BASE, arXiv, Semantic Scholar. Descartada: DataCite (calidad).

## 6. Dependencias y licencias

Detalle con versión, licencia y fecha en [docs/dependencias.md](dependencias.md). Decisión clave: **Formula.js (MIT) + SheetJS CE (Apache-2.0)** en lugar de HyperFormula (GPLv3) para que todo el proyecto quede bajo MIT.

## 7. Plataforma web (estándares)

| # | Fuente | URL | Qué se tomó |
|---|---|---|---|
| W1 | W3C — WCAG 2.2 | https://www.w3.org/TR/WCAG22/ | Contraste AA, foco visible, objetivo táctil mínimo, `prefers-reduced-motion` |
| W2 | MDN — Storage quotas and eviction criteria | https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria | Aislamiento por origen, cuotas, `navigator.storage.persist()` y `estimate()` |
| W3 | OWASP Top 10 (2021) | https://owasp.org/Top10/ | Revisión de inyección (evaluador de fórmulas sin `eval`), componentes vulnerables (SheetJS desde su CDN oficial), integridad |
| W4 | Ley Orgánica de Protección de Datos Personales (Ecuador) | https://www.asambleanacional.gob.ec/ | Minimización: la app no recolecta datos personales; todo queda en el dispositivo |
