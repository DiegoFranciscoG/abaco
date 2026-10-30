# Verificación de cursos y videos recomendados

Generado por `node scripts/verificar-recursos.ts` el 2026-10-30.

Cada video se consultó en el endpoint público oEmbed de YouTube y debía devolver el mismo título y canal
registrados en `content/recursos.json`. Cada curso o guía debía responder con estado 200 y contener su frase.

Resultado: 90 de 90 recursos verificados.
