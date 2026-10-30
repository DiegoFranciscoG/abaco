# Investigación y fuentes

Todo se consultó el **2026-10-14** salvo que se indique otra fecha. Regla aplicada: si dos fuentes se contradicen, gana la oficial y más reciente. Lo que no se pudo verificar queda marcado como **SUPUESTO** o **PENDIENTE** y no se publica en la app.

## 1. Catálogo de materias (sin mallas universitarias)

**Decisión (2026-10-25):** ÁBACO **no publica mallas ni planes de estudio** de ninguna universidad, ni usa sus nombres o marcas. Solo ofrece un catálogo de **materias → temas → subtemas** con redacción propia y una fuente citada en cada subtema.

**Cómo se eligieron las materias (método reproducible):** el 2026-10-14 se revisaron 13 planes de estudio públicos de carreras del área económica y administrativa de universidades de Cuenca (390 nombres de asignatura distintos). Se normalizaron los nombres (minúsculas, sin tildes ni numeración I/II) y se contó en cuántos planes aparece cada materia. Entraron al catálogo las materias que aparecen en **3 o más planes**, agrupando sinónimos, más cálculo diferencial (2 planes), que las fórmulas de marginalidad y optimización necesitan. Quedaron fuera las prácticas preprofesionales, la vinculación con la sociedad y las unidades de titulación, porque no tienen un temario disciplinar común. Los planes no se guardan en el repositorio: solo queda este conteo.

| Materia del catálogo | Planes en los que aparece (de 13) | Nombres agrupados (normalizados) |
|---|---|---|
| Microeconomía | 12 | microeconomía, microeconomía I/II/III, introducción a la microeconomía, microeconomía aplicada (a la empresa / al emprendimiento) |
| Matemática financiera | 11 | matemática(s) financiera(s) |
| Macroeconomía | 10 | macroeconomía, macroeconomía I/II/III |
| Estadística descriptiva | 10 | estadística, estadística descriptiva, estadística I/II |
| Matemática para la gestión | 9 | matemática(s), matemática(s) I/II, básica, aplicada, empresarial, para el análisis de los negocios |
| Metodología de la investigación | 9 | metodología de (la) investigación (científica) |
| Formulación y evaluación de proyectos | 9 | (formulación / formación y) evaluación (financiera / económica y social) de proyectos |
| Contabilidad general | 8 | contabilidad general |
| Estadística inferencial | 8 | estadística inferencial |
| Economía internacional y comercio exterior | 8 | economía internacional, comercio exterior (exportaciones / importaciones / y negocios internacionales), negocios internacionales y comercio exterior |
| Fundamentos de administración | 8 | administración, (teorías y) fundamentos de (la) administración |
| Investigación de mercados | 7 | investigación de mercado(s) (aplicada / internacionales), marketing e investigación de mercados, comportamiento del consumidor |
| Derecho empresarial y societario | 7 | derecho empresarial (y financiero), legislación mercantil y societaria |
| Finanzas corporativas | 6 | finanzas corporativas (I/II, a corto y a largo plazo) |
| Contabilidad de costos | 6 | contabilidad de costos (para la gestión) |
| Gestión del talento humano | 6 | gestión (estratégica) de(l) talento humano, organización y gestión del talento humano, administración y planificación de talento humano |
| Marketing | 6 | fundamentos de marketing, marketing estratégico |
| Emprendimiento | 6 | emprendimiento (e innovación / social / organizacional) |
| Ética profesional | 6 | ética del IFAC, ética y responsabilidad social (empresarial / corporativa), filosofía empresarial y ética financiera, habilidades blandas: ética y toma de decisiones |
| Finanzas internacionales | 4 | finanzas internacionales |
| Comportamiento organizacional | 4 | (diseño y) comportamiento organizacional |
| Tributación | 4 | legislación, administración, planificación, aplicación y práctica tributaria, gestión contable y tributaria |
| Legislación laboral | 4 | derecho laboral (y seguridad social), legislación laboral y seguridad social |
| Informática para la gestión | 4 | herramientas informáticas (y sistemas de información gerencial), informática aplicada, intermedia, informática, redes y programación |
| Contabilidad financiera (NIIF) | 3 | contabilidad financiera (I/II) |
| Cálculo diferencial | 2 | cálculo diferencial, cálculo integral — entra porque las fórmulas de marginalidad y optimización lo necesitan |

**Derechos:** los nombres de materias y de temas son datos e ideas (Código Ingenios, art. 102: no se protegen las ideas ni los métodos). La explicación de cada subtema es redacción propia y cita su fuente. Aviso visible en toda la app: *ÁBACO no está afiliado a ninguna universidad.*

## 1b. Carrera → ciclo → materia (sin universidades)

**Decisión (2026-10-25):** las materias se organizan por **carrera genérica** y **ciclo habitual**, sin nombres de universidades. El archivo `content/carreras.json` guarda solo el resultado agregado; los planes no se publican ni se versionan.

**Método (reproducible con los 13 planes revisados el 2026-10-14):**

1. Cada plan se asigna a una carrera genérica según su disciplina: Administración de empresas (4 planes, incluye la modalidad dual), Contabilidad y auditoría (2), Economía (2), Mercadotecnia (2: mercadotecnia y marketing e inteligencia de mercados), Finanzas (1: finanzas, banca y seguros), Negocios internacionales (1) y Emprendimiento e innovación (1).
2. Cada asignatura del plan se asigna a una materia del catálogo con la misma agrupación de nombres de la tabla de la sección 1.
3. Para cada carrera y materia: *planes* = cuántos planes de esa carrera la incluyen; *ciclo habitual* = mediana inferior del primer ciclo en que aparece en cada plan; *ciclos* = todos los ciclos en que aparece (materias divididas en I, II, III).
4. Se muestra una materia en una carrera solo si aparece en **al menos la mitad** de sus planes. La app indica siempre «en X de N planes revisados» y advierte que cada universidad puede ubicarla en otro ciclo.
5. Las carreras con un solo plan muestran el dato de ese plan; la app lo dice expresamente («1 plan de estudios público»).

**Resultado** (también verificado por `tests/content/integrity.test.ts`: materias existentes, ciclos coherentes, umbral de la mitad y ninguna materia sin carrera):

| Carrera | Planes | Materias del catálogo por ciclo habitual |
|---|---|---|
| Administración de empresas | 4 | **1.º** Contabilidad general, Fundamentos de administración, Matemática para la gestión, Metodología de la investigación; **2.º** Contabilidad de costos, Derecho empresarial y societario, Estadística descriptiva, Legislación laboral; **3.º** Estadística inferencial, Marketing, Matemática financiera, Microeconomía; **4.º** Comportamiento organizacional, Investigación de mercados, Macroeconomía, Gestión del talento humano; **5.º** Emprendimiento, Informática para la gestión; **6.º** Economía internacional y comercio exterior; **7.º** Ética profesional, Formulación y evaluación de proyectos |
| Contabilidad y auditoría | 2 | **1.º** Cálculo diferencial, Contabilidad general, Derecho empresarial y societario, Estadística descriptiva, Ética profesional, Informática para la gestión, Matemática para la gestión, Metodología de la investigación; **2.º** Estadística inferencial, Legislación laboral, Microeconomía, Tributación; **3.º** Contabilidad de costos, Macroeconomía, Matemática financiera; **4.º** Contabilidad financiera (NIIF), Economía internacional y comercio exterior, Finanzas corporativas, Fundamentos de administración; **5.º** Emprendimiento, Gestión del talento humano; **7.º** Formulación y evaluación de proyectos |
| Economía | 2 | **1.º** Contabilidad financiera (NIIF), Contabilidad general, Estadística descriptiva, Informática para la gestión, Matemática para la gestión; **2.º** Contabilidad de costos, Microeconomía; **3.º** Estadística inferencial, Investigación de mercados, Macroeconomía, Matemática financiera; **5.º** Emprendimiento, Finanzas corporativas; **6.º** Economía internacional y comercio exterior; **7.º** Formulación y evaluación de proyectos, Finanzas internacionales, Metodología de la investigación; **8.º** Fundamentos de administración |
| Mercadotecnia | 2 | **1.º** Contabilidad general, Fundamentos de administración, Marketing, Matemática para la gestión; **2.º** Estadística descriptiva, Investigación de mercados; **3.º** Comportamiento organizacional, Emprendimiento, Matemática financiera, Microeconomía; **5.º** Metodología de la investigación |
| Finanzas | 1 | **1.º** Contabilidad financiera (NIIF), Fundamentos de administración, Metodología de la investigación; **2.º** Derecho empresarial y societario, Estadística descriptiva; **3.º** Estadística inferencial, Finanzas corporativas, Microeconomía; **4.º** Macroeconomía |
| Negocios internacionales | 1 | **1.º** Contabilidad general, Derecho empresarial y societario, Matemática para la gestión; **2.º** Contabilidad de costos, Microeconomía; **3.º** Estadística descriptiva, Macroeconomía, Matemática financiera; **4.º** Economía internacional y comercio exterior, Estadística inferencial, Investigación de mercados; **5.º** Finanzas corporativas; **6.º** Finanzas internacionales, Metodología de la investigación; **7.º** Formulación y evaluación de proyectos |
| Emprendimiento e innovación | 1 | **1.º** Tributación; **2.º** Matemática financiera, Microeconomía; **5.º** Emprendimiento, Ética profesional, Marketing, Gestión del talento humano |

**Derechos:** que una materia se curse en cierto ciclo es un dato (Código Ingenios, art. 102); no se reproduce la estructura completa de ningún plan ni se usa la marca de ninguna institución.

## 2. Normativa ecuatoriana

| # | Fuente (oficial) | URL | Qué se tomó |
|---|---|---|---|
| N1 | SRI — Impuesto al Valor Agregado | https://www.sri.gob.ec/impuesto-al-valor-agregado-iva | Hecho generador y base (art. 52 LRTI); tabla de tarifas: Decreto Ejecutivo 198, **15 %** general desde el 01-04-2024; 5 % materiales de construcción; 0 % bienes de la lista oficial |
| N2 | SRI — Impuesto a la Renta | https://www.sri.gob.ec/impuesto-renta | Tarifa general de sociedades **25 %**; personas naturales liquidan con la tabla del ejercicio fiscal |
| N3 | SRI — PDF "Tablas de cálculo de Impuesto a la Renta" | https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/58a7f4f6-ab51-48b6-b9ff-a8e97e1a28ef/Tablas%20de%20c%c3%a1lculo%20de%20Impuesto%20a%20la%20Renta.pdf | Tabla 2026 completa (Res. NAC-DGERCGC25-00000043, 2.º Supl. R.O. 194, 30-12-2025): fracción básica desgravada USD 12 208; tramos 5 %…37 % |
| N4 | Ministerio del Trabajo — boletín SBU 2026 | https://www.trabajo.gob.ec/despues-de-casi-una-decada-hay-consenso-gobierno-empleadores-y-trabajadores-acuerdan-fijar-el-salario-basico-unificado-de-2026-en-usd-482-no-hay-imposicion-hay-union/ | Salario Básico Unificado 2026: USD 482 |
| N5 | Ley de Compañías (texto vigente compilado, publicado en el portal del SERCOP) | https://portal.compraspublicas.gob.ec/sercop/wp-content/uploads/2025/12/LEY_DE_COMPAN%CC%83I%CC%81AS.pdf | Contrato de compañía, especies de compañías, requisitos de constitución, administración, obligaciones de información a la Superintendencia |
| N6 | Código de Comercio (Asamblea Nacional) | https://www.asambleanacional.gob.ec/sites/default/files/codigo_de_comercio.pdf | **No usado**: el PDF oficial es una imagen escaneada y no permite verificar artículos; se cita solo a través del art. 1 de la Ley de Compañías |
| N7 | Superintendencia de Compañías — portal y consulta de compañías | https://www.supercias.gob.ec/portalscvs/ | App recomendada (consulta pública de compañías) |

**Tarifa de IVA 2026 — verificación parcial.** La página oficial del SRI muestra el 15 % por Decreto 198 (desde 01-04-2024) pero no menciona 2026 de forma expresa, y su texto general aún cita el 13 % de la ley base. La continuidad del 15 % en 2026 la confirman El Universo, Expreso y Bloomberg Tax citando la Circular NAC-DGECCGC25-00000006 (26-12-2025), cuyo texto oficial no pude abrir. Decisión: la fórmula del IVA trata la tarifa como **variable**; el ejemplo usa 15 % y la ficha muestra la advertencia "confirma la tarifa vigente en sri.gob.ec".

**Verificado el 2026-10-25 (antes PENDIENTE):**

| # | Fuente (oficial) | URL | Qué se tomó |
|---|---|---|---|
| N8 | IESS — "Tasas de aportación" (tabla oficial, sector privado en relación de dependencia) | https://www.iess.gob.ec/documents/13718/54965/Tasasdeaportacion.pdf | **9,45 % personal y 11,15 % patronal (20,60 % total)**, con el desglose por seguro (IVM 6,64/3,10; LOD 0,10/0; salud 0/5,71; riesgos 0/0,55; cesantía 2/1; SSC 0,35/0,35; administración 0,36/0,44) |
| N9 | Código del Trabajo (Codificación 2005-017, R.O. Supl. 167, 16-12-2005; última reforma 09-04-2026), copia íntegra publicada en el portal del SERCOP | https://portal.compraspublicas.gob.ec/sercop/wp-content/uploads/2026/08/CODIGO-DEL-TRABAJO.pdf | Art. 69 vacaciones (15 días; +1 por año después del 5.º, tope 15 adicionales; pago por adelantado); art. 97 utilidades 15 % (10 % por igual + 5 % por cargas); art. 111 décima tercera (doceava parte de lo percibido en el año, mensual o acumulada hasta el 24-dic); art. 113 décima cuarta (doceava parte del SBU, acumulada hasta 15-mar Costa/Insular o 15-ago Sierra/Amazonía); art. 196 fondo de reserva (un mes de sueldo por cada año completo después del primero) |

**SUPUESTO (no se aplica por defecto):** las contribuciones patronales de 0,5 % al IECE y 0,5 % al SECAP aparecen en guías privadas pero no en la tabla oficial del IESS consultada. El rol de pagos de ÁBACO no las suma; ofrece un campo "otras contribuciones patronales (%)" en 0 para que el estudiante lo ajuste.

## 3. Bibliografía abierta para fórmulas y temas

Se cita y enlaza; el texto de ÁBACO es redacción propia. Licencias verificadas en cada libro.

| # | Fuente | URL | Licencia | Qué se tomó |
|---|---|---|---|---|
| B1 | OpenStax — *Principles of Financial Accounting* | https://openstax.org/details/books/principles-financial-accounting | CC BY-NC-SA 4.0 | Ecuación contable, partida doble, ciclo contable, balance de comprobación, mercaderías, inventarios PEPS/promedio, depreciación, razones de liquidez y de cuentas por cobrar |
| B2 | OpenStax — *Principles of Managerial Accounting* | https://openstax.org/details/books/principles-managerial-accounting | CC BY-NC-SA 4.0 | Margen de contribución, punto de equilibrio, margen de seguridad, apalancamiento operativo |
| B3 | OpenStax — *Principles of Finance* | https://openstax.org/details/books/principles-finance | CC BY-NC-SA 4.0 | Valor del dinero en el tiempo, anualidades, perpetuidades, amortización, tasas efectivas, VAN, TIR, periodo de recuperación, razones financieras y DuPont |
| B4b | OpenStax — *Introductory Business Statistics 2e* | https://openstax.org/details/books/introductory-business-statistics-2e | CC BY-NC-SA 4.0 | Coeficiente de variación (sección 2.7); *Introductory Statistics 2e* no lo incluye |
| B4 | OpenStax — *Introductory Statistics 2e* | https://openstax.org/details/books/introductory-statistics-2e | CC BY-NC-SA 4.0 | Medidas de centro, posición y dispersión; puntuación z; correlación |
| B5 | OpenStax — *Calculus Volume 1* | https://openstax.org/details/books/calculus-volume-1 | CC BY-NC-SA 4.0 | Funciones, límites, derivada, reglas de derivación, optimización |
| B6 | OpenStax — *Contemporary Mathematics* | https://openstax.org/details/books/contemporary-mathematics | CC BY-NC-SA 4.0 | Interés simple y compuesto |
| B7 | OpenStax — *Principles of Economics 3e* | https://openstax.org/details/books/principles-economics-3e | CC BY-NC-SA 4.0 | Elasticidad precio |
| B8 | IESBA — *International Code of Ethics for Professional Accountants* | https://www.ethicsboard.org/iesba-code | Uso de consulta | Cinco principios, los tres pasos del marco conceptual, las cinco categorías de amenazas y la prueba del tercero razonable e informado, leídos en la página oficial el 2026-10-15 |
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
| W4 | Ley Orgánica de Protección de Datos Personales (Ecuador) | ver sección 9 (L1) | Minimización: la app no recolecta datos personales; todo queda en el dispositivo |

## 8. Verificación de contenido por sección (2026-10-15)

Antes de citar una sección de OpenStax se comprobó, descargando la página, que contiene el concepto citado (por ejemplo: «IFRS does not permit the use of LIFO» en 10.1; «growing perpetuity» en 8.1; «correlation does not imply causation» en 12.3; «marginal cost» en *Calculus* 3.4). Dos hallazgos cambiaron el contenido:

- El **margen operativo** no aparece en *Principles of Finance* 6.6 → se excluyó esa fórmula.
- La **media ponderada** no aparece en *Introductory Statistics* 2.5 → se cita *Principles of Finance* 13.1, donde sí está.

Los artículos de la Ley de Compañías usados en Legislación Mercantil (1, 2, 3, 4, 5, 20, 36, 37, 59, 74, 92–96, 102, 116–118, 143, 144, 147, 160, 168, 308, 431, 433 y la sección de las S.A.S.) se leyeron en el texto vigente compilado; la redacción de ÁBACO es propia.

## 9. Marco legal aplicado (consultado 2026-10-25)

Lectura hecha sobre los textos oficiales o sus copias íntegras publicadas por entidades públicas. Las conclusiones están en [docs/legal.md](legal.md).

| # | Norma o fuente | URL | Qué se tomó |
|---|---|---|---|
| L1 | Ley Orgánica de Protección de Datos Personales (LOPDP), 5.º Supl. R.O. 459, 26-05-2021 | https://faolex.fao.org/docs/pdf/ecu213345.pdf (copia íntegra del R.O.) · ficha oficial: https://www.gob.ec/regulaciones/ley-organica-proteccion-datos-personales | Art. 2: ámbito y exclusiones (a: actividades familiares o domésticas de personas naturales). Art. 12: los 17 contenidos del derecho a ser informado. Art. 21: los adolescentes **desde los 15 años** pueden consentir por sí mismos. Art. 24: los menores de 15 ejercen sus derechos con su representante. Art. 39: protección desde el diseño y por defecto |
| L2 | Reglamento General a la LOPDP, Decreto Ejecutivo 904, R.O. Supl. 435, 13-11-2023 | https://www.gob.ec/regulaciones/ley-organica-proteccion-datos-personales | Vigencia del régimen y de la Superintendencia de Protección de Datos Personales (SPDP) |
| L3 | Código Orgánico de la Economía Social de los Conocimientos, Creatividad e Innovación (Código Ingenios), R.O. Supl. 899, 09-12-2016 | https://www.wipo.int/wipolex/en/text/439750 | **Art. 102**: no se protegen las ideas, los procedimientos, los métodos de operación ni los conceptos matemáticos. **Art. 107**: no se protegen las leyes, reglamentos, resoluciones y demás textos oficiales. **Arts. 211–212.1**: se permite incluir fragmentos breves de obras ajenas a título de cita, con fines docentes, indicando fuente y autor |
| L4 | Ley Orgánica de Defensa del Consumidor (2000) | https://derechoecuador.com/analisis-de-la-ley-organica-de-la-defensa-del-consumidor/ | Prohibición de la publicidad engañosa (arts. 2, 6 y 7 según la doctrina). **SUPUESTO** en la numeración exacta: no se abrió el texto oficial. Consecuencia práctica: ninguna afirmación de la app sin respaldo comprobable |
| L5 | NTE INEN-ISO/IEC 40500 y RTE INEN 288 "Accesibilidad para el contenido web" | https://scielo.senescyt.gob.ec/pdf/catedra/v2n2/2631-2875-catedra-2-02-00055.pdf | Ecuador adopta WCAG 2.0 (A y AA) para sitios que prestan servicios públicos. ÁBACO apunta más alto: WCAG 2.2 AA. **SUPUESTO** sobre la vigencia actual del reglamento (fuente académica) |
| L6 | OpenStax — información de licencias | https://help.openstax.org/s/article/Licensing-information-of-OpenStax-textbooks | Los libros vigentes son CC BY-NC-SA 4.0 y las marcas OpenStax/Rice no se licencian. Decisión: **solo se citan y enlazan**; no se copia texto ni figuras |
| L7 | Business Model Canvas (Strategyzer AG) | https://www.strategyzer.com/canvas/business-model-canvas | CC BY-SA 3.0: reproducirlo obligaría a licenciar la herramienta igual. Decisión: no se reproduce; se enlaza como app externa. ÁBACO implementa FODA y matriz de decisión ponderada (métodos sin titular) |
| L8 | SuperMemo — Algorithm SM-2 (P. Woźniak, 1990) | https://super-memory.com/english/ol/sm2.htm | Repetición espaciada de las tarjetas: I(1)=1, I(2)=6, I(n)=I(n−1)·EF, EF inicial 2,5, mínimo 1,3, reinicio si q<3. Se implementa desde la descripción publicada (art. 102: los métodos no se protegen) |
| L9 | SRI — página del IVA y Circular NAC-DGECCGC25-00000006 (26-12-2025) | https://www.sri.gob.ec/impuesto-al-valor-agregado-iva | La página oficial muestra a la vez "0 % y 13 %" (texto de la ley) y la tabla del Decreto 198 con **15 %** desde 01-04-2024; la circular mantiene el 15 % mientras no haya otro decreto. Decisión: la tarifa es un dato editable con 15 % por defecto y advertencia visible |

## 10. Repositorios y estándares para cumplimiento (consultado 2026-10-25)

| # | Repositorio / estándar | URL | Licencia verificada | Uso en ÁBACO |
|---|---|---|---|---|
| R1 | REUSE Specification 3.3 (FSFE) | https://reuse.software/spec-3.3/ | Especificación pública | `REUSE.toml` + `LICENSES/` declaran la licencia y autoría de cada archivo; `reuse lint` (paquete `reuse` 6.2.0 en PyPI) corre en la CI |
| R2 | github/site-policy | https://github.com/github/site-policy | CC0-1.0 | Estructura de referencia para términos y privacidad (sin copiar texto) |
| R3 | LINCnil/GDPR-Developer-Guide (CNIL) | https://github.com/LINCnil/GDPR-Developer-Guide | GPL-3.0 | Lista de comprobación de privacidad por diseño (se sigue, no se copia) |
| R4 | OWASP ASVS 5.0.0 (publicado el 30-05-2025) | https://asvs.owasp.org/ | CC BY-SA 4.0 | Requisitos de verificación usados en [docs/seguridad.md](seguridad.md) |
| R5 | public-apis/public-apis | https://github.com/public-apis/public-apis | MIT | Punto de partida para elegir APIs; cada API elegida se verificó en su sitio oficial (sección 11) |

## 11. APIs públicas nuevas (verificadas 2026-10-25 con peticiones reales)

| # | API | URL base | Licencia / términos | CORS | Uso |
|---|---|---|---|---|---|
| A1 | Banco Mundial — Indicators API v2 (World Development Indicators) | https://api.worldbank.org/v2/ | WDI: **CC BY 4.0** (https://datacatalog.worldbank.org/search/dataset/0037712/World-Development-Indicators); condiciones: https://datacatalog.worldbank.org/public-licenses | `Access-Control-Allow-Origin: *` | Herramienta "Datos macro": PIB, inflación, desempleo y comercio de Ecuador y países de comparación, con "Fuente: Banco Mundial, WDI (CC BY 4.0)" |
| A2 | Frankfurter v2 (código MIT) con proveedor **ECB** | https://api.frankfurter.dev/v2/ | Código MIT (https://github.com/lineofflight/frankfurter). Datos del BCE: uso libre citando al BCE (https://www.ecb.europa.eu/services/disclaimer/html/index.en.html). Se fuerza `providers=ECB` para no mezclar datos de otros bancos con otras condiciones | `access-control-allow-origin: *` | Herramienta "Divisas": tipos de referencia diarios del BCE (unas 30 monedas; COP y PEN no están en el BCE) |
| A3 | Open Library Search API | https://openlibrary.org/search.json | El Internet Archive no reclama derechos nuevos sobre la base (https://openlibrary.org/developers/licensing); pide no descargar en masa; 1 petición/s sin identificar (https://openlibrary.org/developers/api) | `access-control-allow-origin: *` | Quinta fuente del buscador académico (solo metadatos de libros), con límite de 1 petición por segundo en el cliente |
| A4 | OpenAlex (ya usada) | https://api.openalex.org | Datos CC0 | `*` | **Cambio detectado:** sin clave, las peticiones comparten un presupuesto diario por IP. Cada estudiante consulta desde su propia IP, así que sigue funcionando; no se incrusta ninguna clave en el navegador (regla de seguridad) |

## 12. Tecnología externa por materia (verificada 2026-10-26)

Cada materia tiene al menos una herramienta propia de ÁBACO (`materias.json → herramientas`) y al menos una aplicación externa real (`apps.json`); `tests/content/integrity.test.ts` lo comprueba. Las nuevas se verificaron en su sitio oficial:

| App | URL oficial | Qué se verificó | Materias |
|---|---|---|---|
| GnuCash | https://www.gnucash.org/ | «freely licensed under the GNU GPL»; Linux, BSD, macOS, Windows; contabilidad por partida doble | Contabilidad general, Contabilidad financiera |
| GanttProject | https://www.ganttproject.biz/ | «free to use», Windows/macOS/Linux, recursos y costos, archivos de Microsoft Project; licencia GPL-3.0 en https://github.com/bardsoftware/ganttproject | Evaluación de proyectos, Emprendimiento |
| draw.io | https://www.drawio.com/ | «Free forever», «No sign-up required», código Apache 2.0, editor web y de escritorio, diagramas BPMN con carriles | Fundamentos de administración, Comportamiento organizacional, Informática |
| Trello | https://trello.com/pricing | Plan gratuito: hasta 10 colaboradores y 10 tableros por espacio de trabajo | Comportamiento organizacional, Emprendimiento, Fundamentos de administración |
| Ministerio del Trabajo (SUT) | https://sut.trabajo.gob.ec/ | Calculadoras de décimos, liquidaciones y compensaciones; sistema de contratos con usuario | Talento humano, Legislación laboral |
| IESS | https://www.iess.gob.ec/ | Aplicaciones en línea para empleadores y afiliados, trámites virtuales | Talento humano, Legislación laboral |
| BCE — estadísticas | https://www.bce.fin.ec/estadisticas-economicas/ | «Series Estadísticas y Datos» (BCEData), calendario; tasas de interés 2025–2026 en la sección de la Junta | Macroeconomía, Finanzas, Matemática financiera |
| INEC | https://www.ecuadorencifras.gob.ec/ | Páginas oficiales del IPC, empleo y desempleo, y Registro Estadístico de Empresas | Macroeconomía, Investigación de mercados, Estadística, Emprendimiento |
| WITS (Banco Mundial) | https://wits.worldbank.org/ | Perfil de Ecuador visible sin cuenta (exportaciones, importaciones, aranceles); las consultas personalizadas requieren registro | Economía internacional, Finanzas internacionales |
| LimeSurvey | https://www.limesurvey.org/ | «Get started - free»; «self-hosted, open source survey tool» | Investigación de mercados, Metodología |
| Business Model Canvas | https://www.strategyzer.com/library/the-business-model-canvas | «Free to download and to share»; se enlaza, no se reproduce (sección 9, L7) | Emprendimiento, Marketing |

**Descartadas por no poder verificarse hoy:** Canva (el sitio bloquea la consulta automática), Google Trends (error 429 al probar la consulta), UN Comtrade (la página solo carga con sesión de JavaScript) y FRED (la portada no indica condiciones de uso). Se pueden agregar cuando se verifiquen.

## 13. Fórmulas y ejercicios agregados (verificados 2026-10-26)

Cada fórmula se comprobó contra el texto de la sección citada (copia descargada del archivo oficial de OpenStax) y su ejemplo se recalcula de tres formas en `tests/content/t02-examples.test.ts`. Las cifras de los ejemplos son ficticias y lo dicen cuando se trata de cotizaciones o tasas.

| Fórmula | Fuente y sección | Evidencia en el texto |
|---|---|---|
| PIB por el enfoque del gasto | *Principles of Macroeconomics 3e*, 6.1 | «GDP = C + I + G + (X – M)» |
| PIB real | ídem, 6.2 | «Real GDP = Nominal GDP / Price Index / 100» |
| Tasa de desempleo | ídem, 8.1 | «Unemployment rate = Unemployed people / Total labor force × 100» |
| Tasa de inflación | ídem, 9.1 | cambio porcentual: (nivel nuevo − nivel anterior) / nivel anterior × 100 |
| Dinero creado con el multiplicador | ídem, 14.4 | multiplicador = 1 / reserva requerida, por el cambio en el exceso de reservas |
| Balanza de mercancías | ídem, 10.1 | «difference between exports of goods and imports of goods» |
| Identidad ahorro–inversión | ídem, 10.4 | «(X – M) = S + (T – G) – I» |
| Conversión de divisas y tipo de cambio inverso | *Principles of Finance 2e*, 3.5 | precio de una moneda en otra y su inverso (1 ÷ cotización) |

Se agregaron 24 ejercicios con respuesta verificable para las materias cuantitativas que no tenían práctica: contabilidad financiera, contabilidad de costos, tributación (con la tabla 2026 del SRI), matemática financiera, finanzas corporativas, evaluación de proyectos, matemática para la gestión, estadística inferencial, microeconomía, macroeconomía, economía internacional y finanzas internacionales. Las materias sin cálculo se practican con tarjetas armadas desde sus subtemas.

## 14. Área de estudio y PDF (verificado 2026-10-26)

| # | Fuente | URL | Qué se tomó |
|---|---|---|---|
| A5 | pdf.js (Mozilla), paquete `pdfjs-dist` 6.4.299 | https://www.npmjs.com/package/pdfjs-dist | Licencia Apache-2.0 en el registro oficial; publicado el 2026-10-03. Extrae el texto de cada página (`getTextContent`) sin renderizar; la versión 6 no evalúa código (se buscó `eval` y `new Function` en el worker) |
| — | Ejemplos de los 349 subtemas | `content/temarios/*.json` | Redacción propia a partir de la teoría ya verificada de cada subtema; las cifras de cada ejemplo se calcularon antes de escribirlo y las normas usadas (IVA 15 %, SBU 2026, IESS 9,45 % y 11,15 %, tabla de renta 2026, RIMPE) son las mismas de las secciones 2 y 9 |

**Lo que no se puede automatizar:** que un PDF sea «verídico». La app solo comprueba que tenga texto, que trate de la materia y que no tenga datos personales ni insultos; la verificación del contenido la hace el autor contra fuentes oficiales (CONTRIBUTING.md).

## 15. Vigencia de las cifras normativas (verificado 2026-10-26)

Cada cifra que depende de la normativa ecuatoriana se movió a `content/normativa.json` con su vigencia. Antes de fecharlas se volvió a abrir cada fuente oficial:

| # | Fuente | URL | Qué se comprobó |
|---|---|---|---|
| V1 | Ministerio del Trabajo, boletín del SBU 2026, y Registro Oficial, Suplemento 187 (18-12-2025) | https://www.registroficial.gob.ec/suplemento-no-187/ | Acuerdo MDT-2025-195: SBU 2026 de **USD 482** |
| V2 | SRI, «Tablas de cálculo de Impuesto a la Renta» (PDF oficial) | sección 2, N3 | La tabla 2026 de `normativa.json` coincide tramo por tramo con la Res. NAC-DGERCGC25-00000043 |
| V3 | SRI, Circular NAC-DGECCGC25-00000006 (26-12-2025) | https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar?id=236482f4-6125-42fd-b073-62c99d08233d&nombre=NAC-DGECCGC25-00000006.pdf | **Corrección.** La LRTI (art. 65) fija el IVA en 13 % y permite al Presidente fijarlo entre 13 % y 15 %. El Decreto 198 lo subió a 15 % «durante el año 2024» y el Decreto 470 (R.O. 700, 10-12-2024) lo mantuvo en 2025. El art. 141 del Reglamento, reformado por el Decreto 213 (R.O. 166, 18-11-2025), dispone que sin nuevo decreto se mantiene la última tarifa. Por eso el 15 % sigue vigente en 2026. La página del IVA del SRI muestra «0 % y 13 %» porque cita el texto de la ley. Se corrigieron la teoría del subtema `tr-iva-tarifas`, las notas de 4 fórmulas y la calculadora de impuestos. |
| V4 | IESS, «Tasas de aportación» (PDF oficial) | sección 2, N8 | 9,45 % personal y 11,15 % patronal, sin cambios |
| V5 | SRI, página del RIMPE | https://www.sri.gob.ec/rimpe | Cuotas de negocios populares (ejercicios desde 2024), tabla de emprendedores y límites de USD 20 000 y USD 300 000, sin cambios |
| V6 | SRI, página del impuesto a la renta | https://www.sri.gob.ec/impuesto-renta | Tarifa de sociedades de 25 % y plazos por noveno dígito, sin cambios |
| V7 | Código del Trabajo, texto vigente (última reforma 09-04-2026) | sección 2, N9 | Arts. 47, 55, 69, 97, 185, 188 y 196 leídos en el PDF: coinciden con el contenido |
| V8 | Ley de Compañías, texto vigente | sección 2, N5 | Art. 102 (limitada: 50 % de cada participación) y art. 147 (anónima: una cuarta parte), sin cambios |

**Regla para el futuro:** ninguna cifra normativa entra al contenido sin pasar antes por `normativa.json`. La prueba T-11 lo hace cumplir: detecta la cifra en el texto y exige que la ficha la declare. La lista de qué revisar cada enero está en [revision-anual.md](revision-anual.md).

## 16. ÁBACO v2: herramientas de todos los días (verificado 2026-10-26)

### Fuentes nuevas

| # | Fuente | URL | Qué regla o dato sale de ahí |
|---|---|---|---|
| W1 | SRI, Res. NAC-DGERCGC26-00000009 | https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/272ca6a9-d679-4b4e-8da0-fb4671cf5f8f/NAC-DGERCGC26-00000009_Ret_IR.pdf | Porcentajes de retención en la fuente de renta desde el 01-03-2026: 0 %, 1 %, 1,75 %, 2 %, 3 %, 5 % y 10 % (`retenciones-renta` en `normativa.json`) |
| W2 | INEC, boletín técnico del IPC de septiembre de 2026 | https://www.ecuadorencifras.gob.ec/documentos/web-inec/Inflacion/2026/septiembre/BOLETIN_TECNICO_IPC_2026_09.pdf | Inflación anual 1,34 %, mensual 0,30 %, acumulada 1,65 % y canasta familiar básica USD 833,82 (`indicadores.json`) |
| W3 | BCE, tasas de interés de octubre de 2026 | https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm | Pasiva referencial 4,93 %; consumo 15,75 % referencial y 16,77 % máxima; PYMES 8,99 %; microcrédito minorista máxima 28,23 %; inmobiliario 8,37 % |
| W4 | IASB, *Overview of the 2018 Conceptual Framework* (WSS, octubre de 2018), diapositiva 11 | https://www.ifrs.org/content/dam/ifrs/meetings/2018/october/wss/wss4-conceptual-framework-overview.pdf | Características cualitativas (relevancia, representación fiel y las de mejora) para el subtema `cg-fundamentos-cualidades` |
| W5 | OpenStax, *Principles of Accounting 1*, 3.2 | https://openstax.org/books/principles-financial-accounting/pages/3-2-define-and-describe-the-expanded-accounting-equation-and-its-relationship-to-analyzing-transactions | Ecuación contable ampliada y plan de cuentas para el subtema `cg-ecuacion-plan-cuentas`. Las secciones 3.1, 3.3 y 3.4 no tratan esos temas y se descartaron |
| W6 | Fundación IFRS, *Taxonomía NIIF Ilustrada 2020: una visión de la Norma NIIF para las PYMES* (traducción oficial al español) | https://www.ifrs.org/content/dam/ifrs/standards/taxonomy/translations/spanish/2020/spanish-ifrs-taxonomy-2020-iti-smes.pdf | Nombre oficial en español y párrafo de 31 términos NIIF del glosario (propiedades, planta y equipo, 17.31; plusvalía; ingresos de actividades ordinarias, 23.30; impuesto diferido, 29.40; costo amortizado, 11.41…) |
| W7 | Fundación IFRS, estados financieros ilustrativos para PYMES (taxonomía 2020) | https://www.ifrs.org/content/dam/ifrs/standards/taxonomy/2020/illustrative-examples/ixbrl-example1-2020-03-16.xhtml | Equivalentes en inglés de las mismas partidas (*Property, plant and equipment*, *Trade and other receivables*, *Revenue*, *Gross profit*, *Carrying amount*, *Amortised cost*…) |
| W8 | Fundación IFRS, página de la NIIF para las PYMES | https://www.ifrs.org/issued-standards/ifrs-for-smes/ | La edición 2025 se publicó en febrero de 2025 y rige para periodos desde el 01-01-2027; hasta entonces se puede seguir con la edición 2015 o adoptar la nueva antes |
| W9 | OpenStax, *Introductory Statistics 2e*, 8.1 y 8.3 | https://openstax.org/books/introductory-statistics-2e/pages/8-1-a-single-population-mean-using-the-normal-distribution | Intervalo de confianza con σ conocida (EBM = z·σ/√n) y tamaño de muestra para una proporción (n = z²·p′q′/EBP², con p′ = 0,5 sin estudio previo) para las plantillas `intervalo-confianza` y `tamano-muestra` |

Las demás plantillas nuevas de Excel citan secciones que el contenido ya usaba y que se verificaron antes: elasticidad por el punto medio (*Principles of Microeconomics 3e*, 5.1), inflación con el IPC (*Principles of Macroeconomics 3e*, 9.1), tipo de cambio (*Principles of Finance 2e*, 3.5), costo marginal (*Calculus Volume 1*, 3.4), regresión (*Introductory Statistics 2e*, 12.3) y SUMAR.SI (referencia de funciones de Microsoft). Sus valores esperados se calcularon aparte con Python antes de que la prueba T-02 los compare con el motor de fórmulas.

### Mediciones propias

- **T-16, «Pega tu enunciado»:** 34 de 34 en el conjunto guía, 16 de 16 en el de control y 13 de 16 (81,3 %) en el ciego, que no se usó para ajustar reglas. El objetivo del plan era más de 70 %. El conjunto de 5 enunciados fuera del catálogo verifica que la app diga «no estoy seguro» en vez de adivinar.
- **Mapa de repetición:** los 588 nombres de materia de los 13 planes públicos revisados forman 329 grupos; 26 grupos aparecen en tres carreras o más y 23 de ellos ya están en el catálogo (los otros tres son prácticas y unidades de titulación). Resultado en `content/repeticion.json` y `docs/cobertura.md`.
- **Verificador aritmético:** recalcula 212 de las 833 igualdades escritas en el contenido (las que tienen la forma «a operación b = c» con números completos); las demás son fórmulas simbólicas o resultados redondeados que no se pueden comprobar sin contexto.

### SUPUESTOS y pendientes

- **SUPUESTO:** los enunciados de la prueba T-16 los redacté yo imitando deberes reales; no se recogieron de estudiantes. La precisión real con estudiantes puede ser menor.
- **SUPUESTO:** 6 unidades por materia (`unidades_objetivo`) y «al menos 2 ejercicios por subtema de cálculo» son metas de ÁBACO para el estándar de profundidad, no una regla académica.
- **SUPUESTO:** «materia dominada» en el avance por malla (examen de práctica de 70 % o más y 80 % de los ejercicios resueltos) es un criterio propio de la app y la pantalla lo dice así.
- **Pendiente:** los porcentajes de retención del IVA no se publican hasta confirmar que la NAC-DGERCGC20-00000061 no tiene reformas posteriores a 2023 (ver [revision-anual.md](revision-anual.md)).
- **No se encontró** en la taxonomía oficial el término «importe recuperable»; el glosario lo usa dentro de la definición de deterioro porque aparece en el texto en español de la Sección 27 publicado por la Fundación IFRS (proyecto de norma de 2013), pero no tiene ficha propia.

## 17. Materias nuevas, evidencias y recursos para aprender más (verificado 2026-10-30)

### Cobertura de las mallas

Las 61 materias del catálogo cubren todos los nombres de los 13 planes públicos revisados: `content/carreras.json` ya no tiene materias «Aún no está en ÁBACO» en ninguna de las 7 carreras. Las materias nuevas de esta etapa y sus fuentes principales son:

| Materia | Fuentes principales (todas en `content/fuentes.json`) |
|---|---|
| Desarrollo económico, sistema financiero, mercado de valores, seguros | COMF, Ley de Mercado de Valores y Ley General de Seguros dentro del COMF, FSB (fintech), SSA (tabla de vida), OpenStax |
| Finanzas públicas y presupuestos | COPLAFIP (R.O. 142 de 2025) y OpenStax |
| Economía popular y solidaria | LOEPS y su reglamento |
| Auditoría | LOCGE, Normas de Control Interno de la CGE (2023), Reglamento PLA (Decreto 298) |
| Contratación pública | Reglamento General de la LOSNCP (Decreto 193) |
| Aduanas | COPCI, guía de importación del SENAE, OMA (Sistema Armonizado) y OMC (valoración) |
| Econometría, organización industrial, responsabilidad social, programación y datos | OpenStax, Stanford Encyclopedia of Philosophy, Premios Nobel 2002 y 2017, NIIF S1 y S2, ODS de la ONU |
| Investigación de operaciones | MIT OCW 15.053 (notas de clase, CC BY-NC-SA) |
| Matemáticas para economistas | OpenStax *Precálculo 2ed*, *Calculus Volume 1, 2 y 3* |
| Propiedad intelectual | Código Ingenios (R.O. 899 de 2016, texto en WIPO Lex) y páginas temáticas de la OMPI |
| Inglés de negocios | *Business Communication for Success* (SAIT, CC BY-NC-SA) y directriz de la EPN que cita el art. 80 del Reglamento de Régimen Académico de 2019 |
| Gestión de riesgos financieros | BCBS: nota explicativa IRB (2005), LCR (2013) y principios de riesgo operativo (2021); COMF art. 190 |
| Diseño y evaluación de políticas públicas | Banco Mundial, *Impact Evaluation in Practice* 2.ª ed. (CC BY 3.0 IGO), y COPLAFIP |
| Marco legal del marketing y protección de datos | Ley Orgánica de Defensa del Consumidor (WIPO Lex, reformas a 2015) y LOPDP (R.O. 459 de 2021) |
| Modelos de simulación | MIT OCW 6.0002, clases 4 a 8 |
| Contabilidad gubernamental | COPLAFIP arts. 148 a 160, acuerdos ministeriales 045 (2024) y 014 (2023) del MEF, instructivo de bienes e inventarios (2025) |
| Contabilidad de instituciones financieras | Catálogo Único de Cuentas de la SEPS (codificado 2023) y COMF |
| Gestión y auditoría de la calidad | IAF MD 5:2023, grupo APG de ISO 9001, OpenStax y R.O. 342 de 2026 (Sistema Ecuatoriano de la Calidad) |

### Evidencias

Los 1356 subtemas tienen palabras de evidencia en `content/evidencias.json` y `node scripts/verificar-fuentes.ts` las encontró todas en la sección citada (informe en [verificacion-contenido.md](verificacion-contenido.md)). Una prueba de integridad exige ahora que ningún subtema quede sin evidencia. Dos ajustes en esta revisión:

- `ed-dispersion-posicion` cita la sección 2.3 de *Introductory Statistics 2e* para percentiles y cuartiles; la puntuación z está en la sección 2.7, y la cita lo dice.
- En ética profesional, cinco subtemas pasaron de la página general del Código IESBA a los documentos de la IFAC que tratan su tema: la visión general de la edición 2025 (estructura), la base de conclusiones de *Role and Mindset*, el artículo de cambios clave (incentivos y presión) y las preguntas y respuestas sobre NOCLAR para contadores en la empresa.

### Cursos, videos y guías («Para aprender más»)

`content/recursos.json` recomienda 90 recursos gratuitos, al menos uno por materia: 61 cursos (MIT OpenCourseWare, Open Yale Courses, SRI, SERCOP, Superintendencia de Bancos, SEPS, MEF, Ministerio del Trabajo, IESS, J-PAL, BID, OMA, SDG Academy, Microsoft Learn, Python, Kaggle y FUN MOOC), 28 videos y 1 guía oficial (constitución electrónica de compañías). `node scripts/verificar-recursos.ts` los comprueba en línea: cada video debe devolver por el endpoint público oEmbed de YouTube el mismo título y canal registrados, y cada curso o guía debe responder con estado 200 y contener su frase. Resultado: 90 de 90 ([verificacion-recursos.md](verificacion-recursos.md)).

Regla de selección: solo canales institucionales o académicos (MIT OpenCourseWare, YaleCourses, KhanAcademyEspañol, Banco Central del Ecuador, DANE Colombia, la oficina de licencias del MIT y TEDx). Se descartaron canales de creadores independientes sobre impuestos y contabilidad aunque fueran populares, porque sus cifras no se pueden verificar y algunas ya estaban desactualizadas.

### Límites y SUPUESTOS de esta etapa

- **Copias no oficiales de la norma:** no se encontró en un sitio oficial accesible el texto de la Ley Fintech, de la LOSNCP ni de la Ley de prevención de lavado de activos; se usaron el FSB, el Reglamento de la LOSNCP y el Reglamento PLA, que sí están publicados. La Ley Orgánica de Defensa del Consumidor se tomó de WIPO Lex, con reformas hasta el 16-01-2015, y el Código Ingenios en su texto de 2016: **SUPUESTO**, sin reformas posteriores que cambien los artículos citados.
- **Sitios que bloquean el acceso automático:** ISO, ASQ y el Consejo de Europa (MCER) respondieron con desafíos anti-bots, y la página de cursos de Khan Academy también. No se intentó esquivarlos: la materia de calidad se apoya en el IAF y OpenStax, el nivel B1 en la directriz de la EPN y los videos de Khan se verifican por oEmbed.
- **Cursos con cupos o requisitos:** los cursos del SERCOP, del SRI y del Ministerio del Trabajo abren por convocatorias; los del MEF son para servidores de entidades del Presupuesto General del Estado. La ficha lo dice; la disponibilidad de cada convocatoria no se puede verificar con anticipación.
- **Idioma:** 22 de los 90 recursos están en español; los demás, sobre todo cursos y clases del MIT y de Yale, están en inglés. La página de cada materia muestra primero los recursos en español.
