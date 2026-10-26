# Revisión anual de las cifras normativas

Las cifras de la normativa ecuatoriana que usa ÁBACO viven en un solo archivo, [`content/normativa.json`](../content/normativa.json). Cada una tiene su base legal, su fuente oficial y una **vigencia** (`desde`, `hasta`, `ejercicio_fiscal`). Las fichas que las mencionan las declaran en `cifras`, y la rol de pagos y la calculadora de impuestos leen sus tasas y tablas de ese archivo.

Mientras una cifra está vigente, la app la muestra con la etiqueta «vigente 2026». Desde el día siguiente a su `hasta`, en su lugar aparece un aviso visible: «esta cifra corresponde al ejercicio 2026; verifica la vigente», con el enlace a la fuente. Las fórmulas afectadas pierden el sello «Verificado automáticamente».

## Cuándo se revisa

| Momento | Qué pasa | Qué hacer |
|---|---|---|
| Desde el 2 de noviembre | La prueba T-11 avisa, sin fallar, de cada cifra que vence en menos de 60 días. En GitHub Actions el aviso aparece como anotación. | Preparar la revisión: el SBU se fija en diciembre y la tabla de renta se publica a fines de diciembre. |
| Primera semana de enero | El 1 de enero las cifras de 2026 vencen: T-11 falla, el CI se pone en rojo y no se despliega nada hasta revisar. | Hacer la revisión completa con la lista de abajo. |
| El día 1 de cada mes | El flujo `vigencia.yml` corre T-11 aunque nadie haya subido cambios; si falla, GitHub avisa por correo al dueño del repositorio. | Revisar la cifra que indique el aviso. |
| Cuando sale un decreto, una resolución o una reforma | La app no se entera sola: el IVA, por ejemplo, puede cambiar por decreto en cualquier momento. | Revisar la cifra afectada el mismo día, aunque falten meses para enero. |

## Cómo se revisa una cifra

1. Abrir la fuente oficial de la tabla de abajo y comparar el valor, el porcentaje o la tabla con `content/normativa.json`.
2. Si **no cambió**: actualizar `vigencia` al nuevo ejercicio (`2027-01-01` a `2027-12-31`, `ejercicio_fiscal: 2027`), `verificado_en` con la fecha de hoy y `base_legal` si hay una norma nueva que la confirma.
3. Si **cambió**: además del paso anterior, cambiar `valor`, `tramos` o `cuotas`, `texto` y los patrones de `detectar` (por ejemplo, el SBU nuevo en lugar de `482`).
4. Correr `npm run content:check`. T-11 exige dos cosas:
   - toda ficha que menciona una cifra la declara en `cifras`;
   - toda ficha que declara una cifra la menciona con su valor actual.

   Si el valor cambió, la prueba señala cada ficha que todavía dice el número viejo.
5. Reescribir esas fichas y recalcular a mano cada ejemplo afectado. Por ejemplo, la décima cuarta proporcional cambia si cambia el SBU. Volver a correr `npm test`: las pruebas de las calculadoras usan el valor nuevo.
6. Actualizar `fecha_consulta` de la fuente en `content/fuentes.json` y, si la norma es nueva, agregarla a `docs/investigacion.md`.
7. Anotar la revisión en el registro del final y hacer un commit `docs(normativa): revisión anual AAAA`.

## Lista de cifras

### Laboral (Código del Trabajo y Ministerio del Trabajo)

| Cifra (`id`) | Qué revisar | Fuente oficial | Cuándo cambia | Última revisión |
|---|---|---|---|---|
| `sbu` | Salario básico unificado: USD 482 al mes en 2026 | Ministerio del Trabajo, boletín del SBU 2026: https://www.trabajo.gob.ec/despues-de-casi-una-decada-hay-consenso-gobierno-empleadores-y-trabajadores-acuerdan-fijar-el-salario-basico-unificado-de-2026-en-usd-482-no-hay-imposicion-hay-union/ — Acuerdo MDT-2025-195 en el Registro Oficial: https://www.registroficial.gob.ec/suplemento-no-187/ | Cada diciembre, para el año siguiente | 2026-10-26 |
| `jornada-maxima` | 8 horas diarias y 40 semanales (art. 47) | Código del Trabajo, texto vigente: https://portal.compraspublicas.gob.ec/sercop/wp-content/uploads/2026/08/CODIGO-DEL-TRABAJO.pdf | Solo por reforma legal | 2026-10-26 |
| `recargo-suplementarias` | 50 % de recargo hasta las 24:00 (art. 55) | Código del Trabajo (mismo enlace) | Solo por reforma legal | 2026-10-26 |
| `recargo-extraordinarias` | 100 % de recargo entre 24:00 y 06:00 y en fines de semana (art. 55) | Código del Trabajo (mismo enlace) | Solo por reforma legal | 2026-10-26 |
| `limite-horas-suplementarias` | 4 horas al día y 12 a la semana (art. 55) | Código del Trabajo (mismo enlace) | Solo por reforma legal | 2026-10-26 |
| `vacaciones-anuales` | 15 días, más 1 por año después del quinto, hasta 15 adicionales (art. 69) | Código del Trabajo (mismo enlace) | Solo por reforma legal | 2026-10-26 |
| `participacion-utilidades` | 15 % de las utilidades: 10 % por igual y 5 % por cargas (art. 97) | Código del Trabajo (mismo enlace) | Solo por reforma legal | 2026-10-26 |
| `fondo-reserva` | Un mes por año desde el segundo año; 8,33 % mensual (arts. 196 y 197) | Código del Trabajo (mismo enlace) | Solo por reforma legal | 2026-10-26 |
| `bonificacion-desahucio` | 25 % de la última remuneración por año de servicio (art. 185) | Código del Trabajo (mismo enlace) | Solo por reforma legal | 2026-10-26 |
| `indemnizacion-despido` | 3 meses hasta 3 años; luego 1 mes por año, máximo 25 (art. 188) | Código del Trabajo (mismo enlace) | Solo por reforma legal | 2026-10-26 |

Fuente para revisar si hubo reformas: la cabecera del PDF indica la fecha de la «ÚLTIMA REFORMA» (la copia consultada dice 2026-04-09). Si hay una más reciente, releer los artículos de la tabla.

### Seguridad social (IESS)

| Cifra (`id`) | Qué revisar | Fuente oficial | Cuándo cambia | Última revisión |
|---|---|---|---|---|
| `iess-aporte-personal` | 9,45 %, sector privado en relación de dependencia | IESS, «Tasas de aportación»: https://www.iess.gob.ec/documents/13718/54965/Tasasdeaportacion.pdf | Por resolución del IESS o reforma de la Ley de Seguridad Social, sin fecha fija | 2026-10-26 |
| `iess-aporte-patronal` | 11,15 %, sector privado en relación de dependencia | IESS (mismo enlace) | Igual que el anterior | 2026-10-26 |

### Tributario (SRI)

| Cifra (`id`) | Qué revisar | Fuente oficial | Cuándo cambia | Última revisión |
|---|---|---|---|---|
| `iva-tarifa-general` | 15 %. Revisar si hay un decreto ejecutivo nuevo: la ley permite fijarla entre 13 % y 15 %, y sin decreto sigue la última | Circular del SRI NAC-DGECCGC25-00000006: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar?id=236482f4-6125-42fd-b073-62c99d08233d&nombre=NAC-DGECCGC25-00000006.pdf — página del IVA: https://www.sri.gob.ec/impuesto-al-valor-agregado-iva | Por decreto, en cualquier momento | 2026-10-26 |
| `iva-tarifa-construccion` | 5 % para materiales de construcción | SRI, página del IVA: https://www.sri.gob.ec/impuesto-al-valor-agregado-iva | Por reforma de la LRTI | 2026-10-26 |
| `ir-personas-tabla` | Tabla completa de 10 tramos; en 2026 la fracción básica desgravada es USD 12 208 | SRI, «Tablas de cálculo de Impuesto a la Renta»: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/58a7f4f6-ab51-48b6-b9ff-a8e97e1a28ef/Tablas%20de%20c%c3%a1lculo%20de%20Impuesto%20a%20la%20Renta.pdf | Cada diciembre: resolución del SRI para el ejercicio siguiente | 2026-10-26 |
| `retenciones-renta` | Porcentajes de retención en la fuente de renta (0 %, 1 %, 1,75 %, 2 %, 3 %, 5 % y 10 %) desde el 01-03-2026 | SRI, Res. NAC-DGERCGC26-00000009: https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/272ca6a9-d679-4b4e-8da0-fb4671cf5f8f/NAC-DGERCGC26-00000009_Ret_IR.pdf | Por resolución del SRI, sin fecha fija | 2026-10-26 |
| `ir-sociedades` | Tarifa general de 25 % | SRI, impuesto a la renta: https://www.sri.gob.ec/impuesto-renta | Por reforma de la LRTI | 2026-10-26 |
| `rimpe-limites` | Hasta USD 300 000 (emprendedores) y USD 20 000 (negocios populares) | SRI, RIMPE: https://www.sri.gob.ec/rimpe | Por reforma de la LRTI | 2026-10-26 |
| `rimpe-negocios-populares` | Cuotas de USD 0, 5, 15, 35 y 60 | SRI, RIMPE: https://www.sri.gob.ec/rimpe | Por reforma o resolución del SRI | 2026-10-26 |
| `rimpe-emprendedores` | Tabla de 5 tramos, del 1 % al 2 % | SRI, RIMPE: https://www.sri.gob.ec/rimpe | Por reforma o resolución del SRI | 2026-10-26 |

### Societario (Ley de Compañías)

| Cifra (`id`) | Qué revisar | Fuente oficial | Cuándo cambia | Última revisión |
|---|---|---|---|---|
| `capital-pagado-limitada` | 50 % de cada participación al constituirse (art. 102) | Ley de Compañías, texto vigente publicado por el SERCOP: https://portal.compraspublicas.gob.ec/sercop/wp-content/uploads/2025/12/LEY_DE_COMPAN%CC%83I%CC%81AS.pdf | Solo por reforma legal | 2026-10-26 |
| `capital-pagado-anonima` | 25 % del capital, una vez inscrita (art. 147) | Ley de Compañías (mismo enlace) | Solo por reforma legal | 2026-10-26 |

## Indicadores mensuales (`content/indicadores.json`)

No son normas: son datos que el INEC y el Banco Central publican cada mes. No vencen, pero desde la fecha de `actualizar_desde` la pantalla «Ecuador en cifras» avisa que puede haber un dato más reciente, y la prueba de indicadores lo anuncia sin fallar. Para actualizarlos:

| Indicadores | Fuente oficial | Cuándo se publica |
|---|---|---|
| `inflacion-anual`, `inflacion-mensual`, `inflacion-acumulada`, `canasta-familiar-basica` | INEC, boletín técnico del IPC del mes (por ejemplo https://www.ecuadorencifras.gob.ec/documentos/web-inec/Inflacion/2026/septiembre/BOLETIN_TECNICO_IPC_2026_09.pdf) | Primeros días del mes siguiente |
| `tasa-pasiva-referencial` y tasas de crédito | Banco Central del Ecuador, tasas de interés vigentes: https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm | Antes de empezar cada mes |

## Reglas con fecha que no son cifras

No llevan etiqueta de vigencia, pero se releen en la misma revisión:

- Plazos de la declaración de renta según el noveno dígito: 10 a 28 de marzo para personas naturales y 10 a 28 de abril para sociedades. Fuente: https://www.sri.gob.ec/impuesto-renta. Subtema `tr-renta-plazos`: su ejemplo habla de la renta de 2025 declarada en 2026 y hay que actualizarlo al nuevo año.
- Fechas de pago de la décima tercera (24 de diciembre) y de la décima cuarta (15 de marzo en Costa e Insular; 15 de agosto en Sierra y Amazonía): Código del Trabajo, arts. 111 y 113.
- Ejemplos que mencionan el año (`2026`): buscarlos con `rg -n "2026" content/temarios` y decidir si se actualizan o se dejan como ejemplo fechado.

## Cifras que ÁBACO todavía no publica

Si se agregan, entran primero a `content/normativa.json`, con vigencia, y después al contenido:

- Los porcentajes de retención del IVA (30 %, 70 %, 100 % y los de contribuyentes especiales). La resolución base es la NAC-DGERCGC20-00000061, reformada en 2023 por la NAC-DGERCGC23-00000026. No se pudo confirmar que no tenga reformas posteriores, así que queda pendiente de verificar antes de publicarla.
- Los gastos personales deducibles y su límite, basado en la canasta familiar básica.
- Las tarifas temporales de IVA para turismo en feriados.

## Registro de revisiones

| Fecha | Ejercicio revisado | Quién | Cambios |
|---|---|---|---|
| 2026-10-26 | 2026 | Diego Francisco Granda Zhingre | Primera revisión completa. Se crea el catálogo y se corrige la base legal del IVA: el 15 % de 2026 se sostiene en la circular NAC-DGECCGC25-00000006, no solo en el Decreto 198. Las demás cifras coinciden con sus fuentes oficiales. |
| | | | |
