# Plantilla para escribir una materia

Objetivo: completar una materia al estándar en una sesión de trabajo, sin perder la verificación. El estándar y el estado de cada materia están en [cobertura.md](cobertura.md).

## Flujo

1. **Ver qué falta:** `npm run ficha -- -t <id-de-la-materia>`. Imprime las unidades, los subtemas y los ejercicios que faltan para el estándar.
2. **Elegir la fuente:** un libro abierto o una norma oficial. Anota en `content/fuentes.json` la URL, la licencia y la fecha de consulta. Los hechos y las fórmulas se usan para verificar; la redacción es siempre propia (nunca se copia ni se traduce el texto de la fuente).
3. **Escribir cada subtema** con la plantilla de abajo, dentro de `content/temarios/<materia>.json`.
4. **Escribir los ejercicios** de cada subtema de cálculo (al menos 2) en `content/ejercicios.json`.
5. **Validar:** `npm run ficha -- -t <materia>` hasta que no haya errores, y luego `npm run content:check`.
6. **Actualizar la cobertura:** `npm run cobertura`. Si la materia ya cumple, cambia `cobertura.estado` a `"completa"` en `content/materias.json` (la prueba T-17 no deja hacerlo antes).

El validador revisa en cada ficha:

- el esquema completo, incluida la teoría (al menos 80 caracteres) y el ejemplo (al menos 60);
- que la fuente y las fórmulas existan;
- que toda cifra de la normativa que aparezca (SBU, IESS, IVA, tabla de renta…) esté declarada en `cifras`, para que su vigencia se controle cada año;
- que la aritmética escrita en el ejemplo, la teoría y los procedimientos cuadre (cada «a × b = c» se recalcula).

## Plantilla de subtema

```json
{
  "id": "prefijo-de-la-materia-nombre-corto",
  "nombre": "Nombre del subtema",
  "explicacion": "Teoría con redacción propia: qué es, para qué sirve y cómo se calcula o se aplica. Al menos 80 caracteres.",
  "ejemplo": "Un caso concreto con cifras de Ecuador, con cada operación escrita (12.000 × 15 % = 1.800) para que el validador la recalcule.",
  "puntos_clave": ["Idea que el estudiante tiene que recordar.", "Otra idea clave."],
  "errores_frecuentes": ["Error típico de los estudiantes en este tema."],
  "formulas": ["id-de-una-formula-de-formulas-json"],
  "cifras": ["id-de-content/normativa.json, solo si el texto usa una cifra de la normativa"],
  "fuente": { "ref": "id-de-fuentes-json", "url": "https://enlace-a-la-seccion-exacta", "seccion": "Número y nombre de la sección" }
}
```

- `formulas` va vacío (`[]`) en los subtemas conceptuales; `cifras` se omite si el texto no usa cifras de la normativa.
- Una unidad (tema) tiene de 4 a 6 subtemas; una materia, de 5 a 7 unidades.

## Plantilla de ejercicio

```json
{
  "id": "ej-prefijo-nombre-corto",
  "materia": "id-de-la-materia",
  "subtema": "id-del-subtema",
  "formula": "id-de-la-formula",
  "enunciado": "Enunciado con todos los datos que necesita el estudiante.",
  "datos": { "P": 10000, "i": 0.0125, "n": 12 },
  "calculo": "expresión con los nombres de datos, la evalúa el motor de fórmulas",
  "respuesta": 902.58,
  "unidad": "USD",
  "tolerancia": 0.01,
  "procedimiento": ["Paso 1 con sus números = resultado", "Paso 2 = respuesta"],
  "pistas": ["Una pista que no da la respuesta."],
  "dificultad": 2,
  "fuente": { "ref": "id-de-fuentes-json", "seccion": "Sección" },
  "actualizado_en": "AAAA-MM-DD"
}
```

La prueba T-02 recalcula cada ejercicio con el motor de fórmulas: si `respuesta` no coincide con `calculo` dentro de `tolerancia`, no se publica.
