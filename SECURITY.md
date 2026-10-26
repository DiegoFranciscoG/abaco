# Política de seguridad

## Reportar una vulnerabilidad
No abras un issue público. Escribe a diegofgz2004@gmail.com con el asunto «[ÁBACO] Seguridad» y los pasos para reproducir el problema. Respondo en un máximo de 7 días. No incluyas datos personales de terceros.

## Prácticas aplicadas en este proyecto
El detalle (modelo de amenazas y correspondencia con OWASP ASVS 5.0) está en [docs/seguridad.md](docs/seguridad.md).

- **Sin servidor y sin secretos:** sitio estático sin claves de API; las APIs usadas son públicas y no requieren clave.
- **Datos del estudiante solo en su dispositivo** (IndexedDB). La prueba T-04 registra todo el tráfico de red y falla si sale un apunte, un documento, una colección o el identificador local, o si aparece un origen fuera de la lista.
- **Sin ejecución de código del usuario:** fórmulas con analizador propio y lista cerrada de funciones (sin `eval` ni `new Function`); el Markdown del editor se pinta como elementos de React, sin `innerHTML`.
- **Content-Security-Policy** estricta (`script-src 'self'`, `connect-src` con la lista exacta de APIs, `object-src 'none'`, `form-action 'none'`), idéntica en `<meta>` y en nginx.
- **Anti-clickjacking:** `frame-ancestors 'none'` y `X-Frame-Options: DENY` en nginx; en GitHub Pages, `boot.js` oculta la app si otra página la enmarca.
- **Archivos importados** (`.xlsx` y respaldos `.json`) se leen en el navegador con límite de tamaño, tipo verificado y validación de esquema (Zod).
- **Buzón de sugerencias:** no envía datos a ningún servidor; valida el contenido, bloquea datos personales y limita los envíos por dispositivo.
- **Enlaces externos** con `rel="noopener noreferrer"` y `Referrer-Policy: no-referrer`.
- **CI:** gitleaks sobre todo el historial, `npm audit` de producción, acciones fijadas por SHA con permisos mínimos, licencias de dependencias en lista permitida y Dependabot semanal.
- **Docker:** nginx sin privilegios, solo lectura, sin capacidades, solo GET/HEAD y *healthcheck*.
