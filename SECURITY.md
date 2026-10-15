# Política de seguridad

## Reportar una vulnerabilidad
No abras un issue público. Escríbeme por GitHub (perfil DiegoFranciscoG) con los pasos para reproducir el problema. Respondo en un máximo de 7 días.

## Prácticas aplicadas en este proyecto
- **Sin servidor y sin secretos:** ÁBACO es un sitio estático. No hay claves de API en el paquete publicado; las APIs académicas usadas no requieren clave.
- **Datos del estudiante solo en su dispositivo** (IndexedDB). Una prueba automática (T-04) registra todo el tráfico de red y falla si sale un apunte, una colección o el identificador local.
- **Evaluador de fórmulas propio, sin `eval` ni `new Function`:** las fórmulas que escribe el estudiante se tokenizan y se interpretan con una lista cerrada de funciones.
- **Archivos importados** (`.xlsx` y respaldos `.json`) se leen solo en el navegador, con límite de tamaño, tipo verificado y validación de esquema (Zod) antes de tocar la base local.
- **Content-Security-Policy** estricta: scripts solo del propio origen; conexiones solo a las APIs académicas declaradas.
- **Enlaces externos** con `rel="noopener noreferrer"`.
- Escaneo de secretos con gitleaks en cada push y pull request; dependencias con versión fija y revisadas con Dependabot.
