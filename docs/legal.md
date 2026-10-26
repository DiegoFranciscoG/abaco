# Revisión legal de ÁBACO

Fecha de la revisión: 2026-10-26. Fuentes primarias en [investigacion.md](investigacion.md), secciones 9 (normas), 10 (repositorios y estándares) y 12 (aplicaciones externas). Esta revisión explica las decisiones del proyecto; no es asesoría jurídica profesional. Los puntos marcados como **SUPUESTO** no pudieron verificarse en el texto oficial y conviene confirmarlos con un abogado antes de crecer el proyecto.

## 1. Quién responde y qué es el sitio

- Titular: Diego Francisco Granda Zhingre, persona natural, Ecuador (`src/config/site.ts`). Proyecto educativo, gratuito y sin fines comerciales.
- La app no tiene cuentas, servidor propio, analítica, publicidad ni pagos. Toda la información de cada estudiante vive en su navegador.
- Aviso visible en el pie de cada página: ÁBACO no está afiliado a ninguna universidad y no es asesoría profesional.

## 2. Universidades y planes de estudio

- **No se publican mallas** ni nombres, logos o marcas de universidades (prueba de integridad con lista de términos prohibidos).
- La organización **carrera → ciclo → materia** usa carreras genéricas y un ciclo habitual calculado sobre 13 planes públicos (método en investigacion.md, sección 1b). Que una materia se curse en cierto ciclo es un dato, y los datos, ideas y métodos no se protegen (Código Ingenios, art. 102). No se reproduce la estructura completa de ningún plan.
- La app dice siempre de cuántos planes sale cada dato y que cada universidad puede ubicar la materia en otro ciclo: así no se induce a error (publicidad engañosa, ver punto 6).

## 3. Derechos de autor del contenido

| Material | Decisión | Base |
|---|---|---|
| Explicaciones, ejercicios, glosario, fórmulas | Redacción propia, licencia MIT | Titularidad del autor |
| Leyes, reglamentos, resoluciones del SRI, IESS y Ministerio del Trabajo | Se citan y enlazan | Código Ingenios, art. 107: los textos oficiales no se protegen |
| Libros OpenStax (CC BY-NC-SA 4.0) | Solo se citan con la sección exacta y se enlazan; no se copia texto ni figuras | Arts. 211–212 (cita con fines docentes); evitar obligaciones *share-alike* |
| Resúmenes de artículos científicos | Retirados: solo se muestran metadatos (título, autores, año, DOI, enlace) | Los *abstracts* pueden tener derechos del editor |
| Business Model Canvas (Strategyzer) | Se enlaza la plantilla oficial; no se reproduce | Investigación, sección 9, L7 |
| Bibliotecas de software | Lista y texto de cada licencia en `/licencias-terceros.txt`; la compilación falla si aparece una licencia fuera de la lista permitida | `scripts/licenses.ts`, `tests/unit/licenses.test.ts` |
| PDF enviados por estudiantes | No se publican tal cual: quien envía declara ser autor o tener permiso; lo que se use se verifica con una fuente oficial y se redacta de nuevo | Código Ingenios, arts. 102 (ideas) y 211–212 (citas) |
| Archivos del repositorio | Licencia y autoría declaradas por archivo (REUSE 3.3, `reuse lint` en la CI) | `REUSE.toml`, `LICENSES/MIT.txt` |
| Ilustraciones e íconos | Originales del proyecto (los íconos de la app se generan desde el logotipo propio con `scripts/build-icons.ts`) | Titularidad del autor |

Las marcas de terceros (Excel, Google, Trello, OpenStax, etc.) solo se nombran para identificar el producto (uso nominativo).

## 4. Protección de datos personales (LOPDP)

| Tema | Decisión | Artículo verificado |
|---|---|---|
| Datos dentro de la app | No se tratan: todo queda en el dispositivo y la prueba T-04 lo comprueba con el tráfico de red real | Art. 39 (privacidad desde el diseño y por defecto) |
| Área de estudio | Los PDF se leen en el navegador; solo su texto queda en el dispositivo y se borra con un botón o con «Empezar de cero» | Art. 39 |
| PDF enviados al autor | Consentimiento expreso y declaración de derechos; ÁBACO revisa antes que no haya cédulas, teléfonos, correos ni insultos; se conservan como máximo 12 meses | Arts. 7.1, 8, 10 e) e i) |
| Buzón de sugerencias | La app no envía nada: abre la aplicación de correo de quien escribe con el mensaje listo. Si se envía, el titular recibe el mensaje y la dirección de correo | — |
| Base legal del buzón | Consentimiento expreso: casilla obligatoria, informada y específica, y el acto de enviar el correo; revocable en cualquier momento | Art. 7.1 y art. 8 |
| Minimización | El formulario no pide nombre, cédula ni teléfono y **rechaza** mensajes que contengan cédulas, RUC, teléfonos o correos | Art. 10 e) |
| Conservación | Hasta atender la sugerencia y como máximo 12 meses | Art. 10 i) |
| Derechos | Acceso, rectificación, eliminación, oposición y portabilidad escribiendo al mismo correo; respuesta en máximo 15 días | Arts. 13 a 17 (art. 13 fija los 15 días para el acceso) |
| Menores de edad | Desde los 15 años consienten por sí mismos; menores de 15, con su representante (se recomienda en la política) | Arts. 21 y 24 |
| Delegado de protección de datos | No designado: el único tratamiento son los correos del buzón, sin datos sensibles ni gran escala | Art. 48 (**SUPUESTO**: el numeral 4 del artículo tiene una redacción amplia y la Superintendencia puede fijar nuevos casos; revisar si el proyecto crece) |
| Proveedor del correo | El buzón del titular está en Gmail (Google); se informa en la política | Transparencia, art. 10 c) |
| Derecho a ser informado | La política de privacidad cubre identidad y contacto del responsable, finalidad, base legal, conservación, destinatarios y derechos | Art. 12 |

## 5. Cookies y almacenamiento local

ÁBACO no crea cookies. Usa IndexedDB y dos claves de `localStorage` (`abaco:pantalla`, `abaco:buzon`) estrictamente necesarias para lo que el estudiante pide. No hay rastreo, por eso no hay banner de consentimiento: no hay nada que aceptar. La política «Cookies y almacenamiento local» lista cada elemento y cómo borrarlo. **SUPUESTO**: Ecuador no tiene una norma específica de cookies verificada en esta revisión; el criterio aplicado es el de la LOPDP (minimización y transparencia).

## 6. Consumidores y publicidad

- Gratis, sin cobros ocultos ni suscripciones; por eso no hay política de reembolsos (se dice expresamente en el Aviso legal).
- Sin reseñas, testimonios ni contadores inventados: las cifras de la portada se calculan del contenido al compilar (`scripts/build-search-index.ts`).
- Cada afirmación técnica (tarifas, tablas, porcentajes) cita su fuente oficial y la fecha de consulta; los valores que cambian (IVA, SBU, divisor de horas) son editables y muestran advertencia.
- Ley Orgánica de Defensa del Consumidor: **SUPUESTO** en la numeración exacta (investigacion.md, L4); la práctica aplicada es no hacer ninguna afirmación sin respaldo.

## 7. Accesibilidad

Objetivo WCAG 2.2 AA (más exigente que NTE INEN-ISO/IEC 40500, que adopta WCAG 2.0; vigencia del RTE INEN 288 como **SUPUESTO**). Pruebas automáticas con axe en 26 vistas en tema claro y oscuro, navegación con teclado probada y textos alternativos en gráficos (tabla de datos o resumen).

## 8. Lista de comprobación pedida (imagen de requisitos)

| Requisito | Estado | Dónde |
|---|---|---|
| Política de privacidad | Hecho | `/legal/privacidad` |
| Términos y condiciones | Hecho | `/legal/terminos` |
| Política de reembolsos | No aplica: no hay pagos (dicho expresamente) | `/legal/aviso` → Gratuidad |
| Política de cookies | Hecho | `/legal/almacenamiento` |
| Banner de consentimiento de cookies | No aplica: no hay cookies ni rastreo (justificado en la política) | `/legal/almacenamiento` |
| Consentimiento en formularios | Hecho: casilla obligatoria en el buzón | `/sugerencias` |
| Recolección de datos innecesarios | Ninguna; el buzón bloquea datos personales | `src/domain/suggestions/validate.ts` |
| Auditoría de SDKs de terceros | No hay SDKs: solo APIs públicas listadas en la CSP y en la política | `csp.config.ts`, prueba T-04 |
| Patrones oscuros | Ninguno: sin casillas premarcadas, sin ventanas que impidan seguir y sin pedir datos para usar la app | revisión de interfaz y pruebas e2e |
| Cobros ocultos | Ninguno | `/legal/aviso` |
| Reseñas falsas | Ninguna | — |
| Afirmaciones sin respaldo | Cada dato con fuente; cifras calculadas | `docs/verificacion-contenido.md` |
| Texto alternativo | Hecho y probado con axe | `tests/e2e/a11y.spec.ts` |
| Contraste de colores | AA en ambos temas, probado con axe | `tests/e2e/a11y.spec.ts` |
| Navegación con teclado | Hecho y probado | `tests/e2e/a11y.spec.ts` |
| Datos del responsable | Hecho | `/legal/aviso` |
| Consentimiento parental | Informado (LOPDP arts. 21 y 24) | `/legal/privacidad`, `/legal/terminos` |
| Enlace de baja | No aplica: no hay boletines ni correos automáticos; quien escribió al buzón puede pedir la eliminación | `/legal/privacidad` |
| Licencias de imágenes | Todas originales del proyecto | `/legal/licencias` |
| Eliminación de datos | «Empezar de cero» en Ajustes (base local, preferencias y registro del buzón) y solicitud por correo para el buzón | `/ajustes`, `/legal/privacidad` |

## 9. Riesgos que quedan

1. Si se agrega un formulario que envíe datos a un servidor o servicio (por ejemplo, Formspree), habría un encargado del tratamiento y posible transferencia internacional: actualizar la política, la CSP y la prueba T-04 antes de activarlo.
2. Revisar cada año las tablas tributarias y laborales (las fichas muestran la fecha de consulta).
3. Confirmar con un abogado los puntos marcados como SUPUESTO.
