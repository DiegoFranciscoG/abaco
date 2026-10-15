# Modelo de datos

ÁBACO tiene dos modelos separados a propósito:

1. **Contenido académico** — archivos JSON versionados en `content/`, validados con Zod en cada build y en CI. Es igual para todos y nunca se modifica desde la app.
2. **Datos del estudiante** — IndexedDB (Dexie) dentro del navegador. Nunca salen del dispositivo, salvo en el archivo de respaldo que el propio estudiante descarga.

## 1. Contenido académico

```mermaid
erDiagram
  FUENTE ||--o{ UNIVERSIDAD : "cita"
  FUENTE ||--o{ CARRERA : "cita"
  FUENTE ||--o{ MALLA : "cita"
  FUENTE ||--o{ SUBTEMA : "cita"
  FUENTE ||--o{ FORMULA : "cita"
  FUENTE ||--o{ EJERCICIO : "cita"
  FUENTE ||--o{ APP : "cita"
  FUENTE ||--o{ TERMINO : "cita"
  FUENTE ||--o{ PLANTILLA : "cita"
  UNIVERSIDAD ||--o{ CARRERA : "oferta"
  CARRERA ||--|| MALLA : "publica"
  MALLA ||--o{ ASIGNATURA : "lista por ciclo"
  ASIGNATURA ||--o| TEMARIO : "contenido profundo"
  TEMARIO ||--o{ TEMA : "agrupa"
  TEMA ||--o{ SUBTEMA : "divide"
  SUBTEMA }o--o{ FORMULA : "usa"
  FORMULA ||--o{ VARIABLE : "define"
  FORMULA ||--|| EJEMPLO : "verifica"
  SUBTEMA ||--o{ EJERCICIO : "practica"
  FORMULA ||--o{ EJERCICIO : "aplica"
  ASIGNATURA }o--o{ APP : "recomienda (por nombre clave)"
  ASIGNATURA }o--o{ PLANTILLA : "sugiere (por nombre clave)"

  FUENTE {
    string id PK
    string titulo
    string autor_editor
    enum tipo "norma|ley|libro|articulo|pagina_oficial|documentacion"
    url url "https obligatorio"
    string licencia
    date fecha_consulta
  }
  UNIVERSIDAD {
    string id PK "ucuenca | ucacue"
    string nombre
    string siglas
    string ciudad
    url sitio
  }
  CARRERA {
    string id PK "universidad-slug"
    string universidad FK
    string nombre
    string nombre_oficial
    string titulo_otorgado
    int num_ciclos
    string_list modalidad
    int creditos "nullable"
    int horas "nullable"
    int asignaturas_declaradas "nullable"
    url url_malla
    date fecha_consulta
  }
  ASIGNATURA {
    string id PK "carrera-cN-slug"
    string carrera FK
    int ciclo "1..10"
    int orden
    string nombre
    string nombre_oficial "texto tal cual"
    string_list areas
  }
  TEMA {
    string id PK
    string asignatura FK
    string nombre
    int orden
    string descripcion
    int dificultad "1..3"
  }
  SUBTEMA {
    string id PK
    string tema FK
    string nombre
    string explicacion "redaccion propia"
    string_list puntos_clave
    string_list errores_frecuentes
    string_list formulas FK
  }
  FORMULA {
    string id PK
    string nombre
    string categoria
    string latex
    string calculo "expresion evaluable"
    string excel_es
    string excel_en
    string_list aparece_en "nombres clave de asignatura"
  }
  EJEMPLO {
    json entradas
    string_list pasos
    number resultado
    number tolerancia
    string excel_es "con numeros"
    string excel_en "con numeros"
  }
  EJERCICIO {
    string id PK
    string subtema FK "nullable"
    string formula FK "nullable"
    string enunciado
    json datos
    string calculo
    number respuesta
    number tolerancia
    string_list pistas
  }
```

### Reglas de negocio del contenido (se hacen cumplir con código)

| Regla | Dónde se valida | Prueba |
|---|---|---|
| Toda ficha resuelve a una fuente con URL `https://` y `fecha_consulta` válida | `src/domain/content/schemas.ts` + `tests/content/t01-sources.test.ts` | **T-01** |
| Cada ejemplo numérico se recalcula con el motor de fórmulas (expresión algebraica **y** sintaxis Excel en inglés **y** en español) y debe coincidir con el resultado publicado dentro de la tolerancia | `tests/content/t02-examples.test.ts` | **T-02** |
| Cada ejercicio se recalcula y debe dar la respuesta publicada | `tests/content/t02-examples.test.ts` | T-02 |
| Identificadores únicos en todo el contenido | `tests/content/integrity.test.ts` | integridad |
| Toda referencia (`formula`, `subtema`, `asignatura`, `aparece_en`, `ref` de fuente) existe | `tests/content/integrity.test.ts` | integridad |
| El número de asignaturas cargadas por carrera coincide con el conteo extraído de la página oficial | `tests/content/integrity.test.ts` | integridad |
| Una ficha con `estado: "pendiente"` nunca se muestra | `src/data/content-repository.ts` | unitaria |

`fuente` en cada ficha es `{ ref, url?, seccion? }`: `ref` apunta al catálogo `content/fuentes.json` (título, tipo, licencia, fecha) y `url` permite citar la sección exacta (por ejemplo, el capítulo 8.3 de OpenStax).

### Áreas (identidad visual por área)

`contabilidad` · `finanzas` · `tributario` · `cuantitativo` (matemática y estadística) · `derecho` · `gestion` (administración, marketing, talento humano) · `economia` · `tecnologia` · `formacion` (investigación, ética, prácticas, titulación, idiomas). La clasificación de cada asignatura se hace con reglas por palabra clave en el script de importación y se revisa a mano.

## 2. Datos del estudiante (IndexedDB, solo en el dispositivo)

```mermaid
erDiagram
  META {
    string clave PK "deviceId | lastBackupAt | onboardingAt"
    any valor
  }
  PERFIL {
    string id PK "siempre 'yo'"
    string universidad "nullable"
    string carrera "nullable"
    int ciclo "nullable"
    enum tema "system|light|dark"
    enum movimiento "system|reduce|full"
  }
  APUNTE {
    string id PK "uuid"
    enum refTipo "asignatura|tema|subtema|formula|libre"
    string refId
    string titulo
    string contenido
    string_list etiquetas
    datetime creadoEn
    datetime actualizadoEn
  }
  ESTRELLA {
    string id PK "tipo:refId"
    enum tipo "formula|subtema|ejercicio|articulo|asignatura"
    string refId
    string titulo
    json snapshot "solo articulos externos"
    datetime creadoEn
  }
  COLECCION {
    string id PK "uuid"
    string nombre
    string descripcion
    string color
    json items "tipo, refId, titulo, snapshot, orden"
    datetime actualizadoEn
  }
  RECORDATORIO {
    string id PK
    string titulo
    string asignaturaId "nullable"
    datetime fecha
    int avisoMinutos
    enum estado "pendiente|hecho"
  }
  INTENTO {
    string id PK
    string ejercicioId
    number respuesta
    bool correcto
    int segundos
    datetime fecha
  }
  HOJA {
    string id PK
    string nombre
    string plantillaId "nullable"
    json celdas "A1 -> entrada"
    json formatos
    datetime actualizadoEn
  }
  BUSQUEDA {
    string id PK
    string consulta
    datetime fecha
    int total
  }
  CACHE_API {
    string clave PK "fuente + consulta normalizada"
    datetime expiraEn
    json datos
  }
  COLECCION ||--o{ ESTRELLA : "puede contener lo marcado"
```

### Versiones del esquema y migraciones (Dexie)

| Versión | Cambio | Migración |
|---|---|---|
| 1 | Apuntes ligados solo a asignatura (`asignaturaId`), sin etiquetas | — |
| 2 | Apuntes ligados a cualquier nivel (`refTipo` + `refId`), con `etiquetas`; nuevas tablas `hojas`, `busquedas`, `cacheApi`, `meta` | `upgrade()` copia `asignaturaId` → `refTipo='asignatura'`, `refId`; `etiquetas=[]` (prueba **T-05**) |

El archivo de respaldo (`abaco-respaldo-<id-local>-<fecha>.json`) declara `formato` y `version`; al restaurar se valida con Zod y, si viene de una versión anterior, pasa por la misma migración (prueba **T-06**).

### Privacidad (LOPDP — minimización)

- No hay cuentas, ni servidor, ni analítica. No se pide nombre, cédula, correo ni teléfono.
- El identificador local es aleatorio (`crypto.randomUUID()`), se genera en el dispositivo y **solo** se usa en el nombre del archivo de respaldo. La prueba **T-04** registra todo el tráfico de red y falla si aparece.
- Lo único que sale a la red son las consultas del buscador académico (el texto buscado) hacia las APIs listadas en `docs/apis.md`.
