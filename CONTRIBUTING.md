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

## Antes de enviar un pull request

```bash
npm ci
npm run format:check && npm run lint
npm run build
npm run test:coverage
npx playwright test
```

Commits con Conventional Commits (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `build`, `perf`, `style`). Al contribuir aceptas publicar tu aporte con la licencia MIT del proyecto.
