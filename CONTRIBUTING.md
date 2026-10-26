# Cómo contribuir

Gracias por ayudar a mejorar ÁBACO. Hay dos caminos:

1. **Sin GitHub:** usa el buzón de sugerencias de la app (`#/sugerencias`).
2. **Con GitHub:** abre un issue con la plantilla «Proponer o corregir contenido» o envía un pull request.

## Reglas del contenido

- Cada subtema, fórmula o dato cita una fuente oficial (SRI, IESS, Ministerio del Trabajo, BCE, INEC, Supercias, NIIF) o un libro de licencia abierta, con la sección exacta y la fecha de consulta.
- Redacción propia: no se copia texto de libros, artículos ni apuntes de terceros. Las leyes y normas sí pueden citarse.
- No se publican mallas, nombres ni marcas de universidades.
- Los ejemplos numéricos deben recalcularse con las pruebas de contenido (`npm run content:check`).
- Nada de datos personales reales en ejemplos, pruebas ni capturas.
- Toda cifra que depende de la normativa (SBU, IESS, IVA, tabla de renta…) se toma de `content/normativa.json` y se declara en `cifras`; la prueba T-11 lo exige. Para cambiar una cifra, sigue [docs/revision-anual.md](docs/revision-anual.md).

## Escribir o completar una materia

El flujo rápido está en [docs/plantilla-ficha.md](docs/plantilla-ficha.md):

1. `npm run ficha -- -t <id-de-la-materia>` muestra qué unidades, subtemas y ejercicios faltan para el estándar de profundidad.
2. Escribe cada subtema y sus ejercicios con la plantilla, citando la sección exacta de la fuente.
3. Repite `npm run ficha -- -t <materia>` hasta que no haya errores (esquema, fuente, cifras no declaradas y aritmética de los ejemplos).
4. `npm run cobertura` actualiza `docs/cobertura.md`; si la materia ya cumple, cambia `cobertura.estado` a `"completa"` (la prueba T-17 no deja hacerlo antes).

## Antes de enviar un pull request

```bash
npm ci
npm run format:check && npm run lint
npm run build
npm run test:coverage
npx playwright test
```

Commits con Conventional Commits (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `build`, `perf`, `style`). Al contribuir aceptas publicar tu aporte con la licencia MIT del proyecto.

## Proceso para los PDF que llegan por el área de estudio

1. Revisar que el remitente declaró ser autor o tener permiso (viene en el correo).
2. Descomponer el PDF por materia y subtema: `npm run pdf:analizar -- archivo.pdf informe.md`. El informe indica qué materias y subtemas cubre, sus definiciones y cifras, y si tiene datos personales.
3. Verificar cada dato que se quiera usar en una fuente oficial o abierta y registrarla en `docs/investigacion.md`; lo que no se pueda verificar no se publica.
4. Redactar de nuevo (nunca copiar) el subtema, el ejemplo o el ejercicio, con su fuente, y correr `npm run content:check`.
5. Responder al remitente si pidió saber si se usará, y borrar el PDF y el correo al terminar (máximo 12 meses).
