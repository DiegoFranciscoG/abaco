import { SITE, suggestionAddress } from '../../config/site';

/**
 * Legal texts of the site. Plain, short Spanish; each claim matches what the app actually does (the e2e privacy
 * test checks the network side). Legal basis: see docs/legal.md.
 */
export interface LegalSection {
  titulo: string;
  parrafos?: string[];
  lista?: string[];
}

export interface LegalDoc {
  id: string;
  titulo: string;
  resumen: string;
  secciones: LegalSection[];
}

const CONTACTO = `escribe a ${suggestionAddress()} (también desde el buzón de sugerencias) o abre un reporte en ${SITE.contacto}`;

/** Third-party services the browser talks to, and only when the student uses the feature. */
export const SERVICIOS_EXTERNOS = [
  { nombre: 'GitHub Pages (GitHub, Inc.)', uso: 'Aloja los archivos de la app. Registra la dirección IP de cada visita por seguridad, según su propia documentación.', url: 'https://docs.github.com/es/pages/getting-started-with-github-pages/about-github-pages' },
  { nombre: 'Crossref', uso: 'Buscador académico: recibe el texto que buscas.', url: 'https://www.crossref.org/' },
  { nombre: 'OpenAlex (OurResearch)', uso: 'Buscador académico: recibe el texto que buscas.', url: 'https://openalex.org/' },
  { nombre: 'DOAJ', uso: 'Buscador académico: recibe el texto que buscas.', url: 'https://doaj.org/' },
  { nombre: 'LA Referencia', uso: 'Buscador académico: recibe el texto que buscas.', url: 'https://www.lareferencia.info/' },
  { nombre: 'Open Library (Internet Archive)', uso: 'Buscador académico (libros): recibe el texto que buscas.', url: 'https://openlibrary.org/' },
  { nombre: 'Banco Mundial', uso: 'Herramienta de datos macro: recibe el país y el indicador elegidos.', url: 'https://data.worldbank.org/' },
  { nombre: 'Frankfurter (datos del Banco Central Europeo)', uso: 'Herramienta de tipos de cambio: recibe las monedas y fechas elegidas.', url: 'https://frankfurter.dev/' },
] as const;

export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: 'aviso',
    titulo: 'Aviso legal',
    resumen: 'Quién está detrás de ÁBACO, qué es y qué no es.',
    secciones: [
      {
        titulo: 'Responsable del sitio',
        lista: [
          `Titular: ${SITE.titular}, ${SITE.naturaleza}, ${SITE.pais}.`,
          `Contacto: ${CONTACTO}.`,
          'ÁBACO es un proyecto personal y educativo. No es una empresa, no vende nada y no tiene fines comerciales.',
        ],
      },
      {
        titulo: 'Qué es ÁBACO',
        parrafos: [
          'Una aplicación web gratuita de estudio para carreras económicas y administrativas: materias explicadas tema por tema, fórmulas verificadas, herramientas de cálculo y práctica, y un buscador de fuentes académicas abiertas.',
          'ÁBACO no está afiliado a ninguna universidad, colegio profesional ni entidad pública. No reproduce planes de estudio. Las menciones a leyes, entidades públicas, libros o programas sirven solo para citar la fuente o explicar un tema.',
        ],
      },
      {
        titulo: 'No es asesoría profesional',
        parrafos: [
          'El contenido y los cálculos tienen fines educativos. No reemplazan la asesoría de un contador, abogado, auditor o asesor financiero, ni la información oficial del SRI, del IESS, del Ministerio del Trabajo o de la Superintendencia de Compañías. Las tarifas y tablas legales cambian: confirma siempre la versión vigente en la fuente oficial que cita cada ficha.',
        ],
      },
      {
        titulo: 'Gratuidad',
        parrafos: [
          'ÁBACO es gratis. No hay pagos, suscripciones, compras dentro de la app, publicidad ni cobros ocultos. Como no se cobra nada, no existe una política de reembolsos.',
        ],
      },
    ],
  },
  {
    id: 'terminos',
    titulo: 'Términos de uso',
    resumen: 'Las reglas para usar ÁBACO, en lenguaje claro.',
    secciones: [
      {
        titulo: '1. Aceptación',
        parrafos: [
          `Al usar ÁBACO aceptas estos términos. Están vigentes desde el ${SITE.vigencia}. Si cambian, la fecha se actualiza en esta página; los cambios no se aplican hacia atrás.`,
        ],
      },
      {
        titulo: '2. Uso permitido',
        lista: [
          'Puedes usar ÁBACO para estudiar, enseñar y practicar, de forma personal o en grupo.',
          'No uses ÁBACO para actividades ilícitas, para intentar vulnerar su seguridad, para sobrecargar los servicios externos que consulta ni para extraer contenido de forma masiva y automatizada.',
          'Si compartes una colección o un documento hecho en ÁBACO, eres responsable de lo que escribiste en él.',
        ],
      },
      {
        titulo: '3. Contenido educativo y responsabilidad',
        parrafos: [
          'El contenido se revisa con fuentes oficiales y académicas, y los ejemplos numéricos se recalculan con pruebas automáticas. Aun así puede haber errores u omisiones, y la normativa cambia. ÁBACO se ofrece "tal cual", sin garantía de que el contenido esté libre de errores ni actualizado en todo momento.',
          'En la medida que permite la ley ecuatoriana, el titular no responde por decisiones tomadas solo con base en ÁBACO. Para trámites, declaraciones o decisiones con efectos legales o económicos, usa la fuente oficial y, si hace falta, un profesional.',
        ],
      },
      {
        titulo: '4. Tus datos y tus respaldos',
        parrafos: [
          'Lo que escribes se guarda solo en tu navegador. El titular no puede verlo, recuperarlo ni borrarlo por ti. Si borras los datos del navegador o cambias de dispositivo sin un respaldo, se pierden: descarga un respaldo desde Ajustes de vez en cuando.',
        ],
      },
      {
        titulo: '5. Propiedad intelectual',
        lista: [
          'El código y los textos propios de ÁBACO se publican con licencia MIT.',
          'Las leyes, reglamentos y resoluciones citados son textos oficiales, que no son objeto de protección por derecho de autor (Código Ingenios, art. 107).',
          'Los libros y artículos de terceros se citan y enlazan; ÁBACO no reproduce su texto (Código Ingenios, arts. 211 y 212).',
          'Las marcas mencionadas (por ejemplo, Excel, Google Sheets u OpenStax) pertenecen a sus titulares y se nombran solo para identificarlas.',
        ],
      },
      {
        titulo: '5 bis. Sugerencias',
        lista: [
          'El buzón de sugerencias prepara un correo en tu propia aplicación de correo; tú decides si lo envías.',
          'Al enviar una sugerencia permites que el titular use la idea para mejorar ÁBACO, sin pago ni obligación de publicarla. Si se publica, el texto se redacta de nuevo y se verifica con una fuente oficial.',
          'No envíes textos copiados de libros u otras obras, ni datos personales tuyos o de otras personas. El buzón rechaza insultos, mensajes sin sentido y datos como cédulas o teléfonos.',
        ],
      },
      {
        titulo: '6. Servicios externos',
        parrafos: [
          'Algunas funciones consultan servicios públicos de terceros (ver la política de privacidad). Su disponibilidad y sus condiciones dependen de ellos, no de ÁBACO.',
        ],
      },
      {
        titulo: '7. Menores de edad',
        parrafos: [
          'ÁBACO está pensado para estudiantes de educación superior. No recoge datos de nadie; aun así, recomendamos que los menores de 15 años lo usen con su representante legal.',
        ],
      },
      {
        titulo: '8. Ley aplicable y contacto',
        parrafos: [`Estos términos se rigen por las leyes de la República del Ecuador. Para dudas o reclamos, ${CONTACTO}.`],
      },
    ],
  },
  {
    id: 'privacidad',
    titulo: 'Política de privacidad',
    resumen: 'Qué datos existen, dónde están y qué derechos tienes (LOPDP, art. 12).',
    secciones: [
      {
        titulo: 'En resumen',
        lista: [
          'ÁBACO no tiene cuentas, ni servidores propios, ni analítica, ni publicidad, ni cookies.',
          'El titular no recibe, no ve y no guarda ningún dato personal tuyo, salvo que tú le escribas por el buzón de sugerencias: entonces recibe tu mensaje y tu dirección de correo, solo para atenderte.',
          'Lo que escribes (apuntes, colecciones, hojas, documentos, tarjetas, recordatorios) queda solo en tu navegador.',
        ],
      },
      {
        titulo: 'Responsable',
        parrafos: [
          `${SITE.titular}, ${SITE.naturaleza}, ${SITE.pais}. Contacto: ${CONTACTO}. El único tratamiento que hace el titular es el de los correos del buzón de sugerencias, sin datos sensibles. No hay un delegado de protección de datos designado; para cualquier asunto sobre tus datos, escribe directamente al titular.`,
        ],
      },
      {
        titulo: 'Qué datos existen y para qué',
        lista: [
          'Lo que tú escribes o eliges en la app, para que puedas usarlo después. Se guarda en tu propio navegador (IndexedDB) y nunca se envía al titular. La única excepción es lo que tú mismo envíes por correo desde el buzón de sugerencias.',
          'Tu preferencia de tema claro u oscuro y de animaciones, en el almacenamiento local del navegador, para aplicarla antes de mostrar la página.',
          'Un identificador aleatorio generado en tu dispositivo que solo sirve para nombrar tus archivos de respaldo. No sale del dispositivo.',
          'No hay otras finalidades: no se crean perfiles, no hay decisiones automatizadas y nada se vende ni se comparte.',
        ],
      },
      {
        titulo: 'Buzón de sugerencias',
        lista: [
          'Qué se trata: el tipo de sugerencia, la materia, tu mensaje, la fuente que indiques y la dirección de correo desde la que envíes. Nada más: el formulario no pide nombre, cédula ni teléfono, y rechaza mensajes que los contengan (minimización, LOPDP art. 10 e).',
          'Cómo llega: ÁBACO no envía nada. Prepara el mensaje y abre tu aplicación de correo; el correo sale desde tu cuenta, con tu proveedor, cuando tú pulsas Enviar.',
          'Para qué: leer la sugerencia, verificarla, responderte si hace falta y mejorar ÁBACO. No se usa para publicidad ni se comparte con nadie.',
          'Base legal: tu consentimiento, que das al marcar la casilla del formulario y al enviar el correo (LOPDP arts. 7.1 y 8). Puedes retirarlo cuando quieras escribiendo al mismo correo; lo tratado antes sigue siendo lícito.',
          'Cuánto tiempo: el correo se conserva mientras se atiende la sugerencia y como máximo 12 meses; después se elimina (LOPDP art. 10 i).',
          'Dónde: en el buzón del titular, en el servicio de correo Gmail (Google), que también conoce la dirección desde la que escribes, según sus propias condiciones.',
          `Tus derechos: puedes pedir acceso, rectificación, eliminación, oposición o portabilidad de tus correos escribiendo a ${suggestionAddress()}; la respuesta llega en un máximo de 15 días (LOPDP arts. 13 a 17).`,
          'En este dispositivo, el buzón guarda solo la hora de tus envíos y una huella corta de cada texto para limitar a tres sugerencias al día; no guarda el texto.',
        ],
      },
      {
        titulo: 'Conservación',
        parrafos: [
          'Los datos permanecen en tu navegador hasta que tú los borres: en Ajustes → «Empezar de cero», o borrando los datos del sitio en tu navegador.',
        ],
      },
      {
        titulo: 'Comunicaciones con terceros',
        parrafos: [
          'ÁBACO no transfiere datos personales. Algunas funciones hacen que tu navegador se conecte directamente con servicios públicos; como en cualquier conexión a internet, esos servicios reciben tu dirección IP y datos técnicos del navegador, según sus propias políticas. ÁBACO no añade tu nombre, correo ni identificadores a esas consultas.',
        ],
      },
      {
        titulo: 'Tus derechos',
        parrafos: [
          'Como los datos de la app están solo en tu dispositivo, ejerces tus derechos directamente, sin pedir nada a nadie: acceso (Mi espacio), rectificación y actualización (editar), eliminación (borrar o «Empezar de cero»), portabilidad (descargar el respaldo en formato JSON) y oposición o suspensión (dejar de usar la función). No hace falta entregar datos para usar ÁBACO, así que no hay consecuencias por no hacerlo. Para los correos del buzón, mira la sección «Buzón de sugerencias».',
          'Si consideras que se vulneraron tus derechos, puedes escribir al titular y presentar una denuncia ante la Superintendencia de Protección de Datos Personales (https://www.spdp.gob.ec/).',
        ],
      },
      {
        titulo: 'Menores de edad',
        parrafos: [
          'La app no recoge datos de nadie, tampoco de menores. Si tienes menos de 15 años, usa el buzón de sugerencias con tu representante legal. Según la LOPDP (art. 21), los adolescentes desde los 15 años pueden consentir por sí mismos el tratamiento de sus datos; los menores de 15 ejercen sus derechos con su representante legal (art. 24).',
        ],
      },
      {
        titulo: 'Seguridad',
        parrafos: [
          'El sitio se sirve por HTTPS, con una política de seguridad de contenido que solo permite código del propio sitio y conexiones a los servicios listados. No se cargan scripts, fuentes ni imágenes de terceros. Los archivos que importas (respaldos, hojas de cálculo) se validan antes de guardarse.',
        ],
      },
      {
        titulo: 'Cambios',
        parrafos: [`Vigente desde el ${SITE.vigencia}. Si cambia, se actualizará esta fecha y el cambio se explicará en esta página.`],
      },
    ],
  },
  {
    id: 'almacenamiento',
    titulo: 'Cookies y almacenamiento local',
    resumen: 'ÁBACO no usa cookies. Esto es lo que guarda tu navegador y cómo borrarlo.',
    secciones: [
      {
        titulo: 'Cookies',
        parrafos: [
          'ÁBACO no crea cookies propias ni permite cookies de terceros: no hay analítica, publicidad ni botones de redes sociales. Por eso no ves un banner para aceptar cookies: no hay nada que aceptar ni rechazar.',
        ],
      },
      {
        titulo: 'Lo que sí se guarda en tu navegador',
        lista: [
          'Base de datos local «abaco» (IndexedDB): tus apuntes, estrellas, colecciones, recordatorios, intentos de práctica, hojas, búsquedas recientes, documentos, libros diarios, tarjetas y tableros, y una caché temporal de respuestas del buscador académico.',
          'Almacenamiento local «abaco:pantalla»: tu preferencia de tema y animaciones.',
          'Almacenamiento local «abaco:buzon»: la hora de tus últimas sugerencias y una huella corta de cada texto (no el texto), para limitar los envíos a tres por día.',
          'Caché de la app (service worker): los archivos de ÁBACO, para que funcione sin internet.',
        ],
      },
      {
        titulo: 'Por qué no se pide consentimiento',
        parrafos: [
          'Todo lo anterior es estrictamente necesario para la función que tú pides (guardar tus apuntes, recordar tu tema, funcionar sin conexión, evitar envíos repetidos), no se usa para seguirte ni para conocerte, y no sale de tu dispositivo. Al entrar por primera vez, un aviso te explica dónde viven tus datos.',
        ],
      },
      {
        titulo: 'Cómo borrarlo',
        lista: [
          'Dentro de ÁBACO: Ajustes → «Empezar de cero» borra la base local, tus preferencias y el registro del buzón.',
          'En el navegador: configuración del sitio → borrar datos. Esto también elimina la caché de la app.',
        ],
      },
    ],
  },
  {
    id: 'licencias',
    titulo: 'Licencias y créditos',
    resumen: 'Licencia del código, bibliotecas usadas, datos abiertos y marcas.',
    secciones: [
      {
        titulo: 'ÁBACO',
        parrafos: [
          `Código y textos propios con licencia MIT, © ${SITE.titular}. Las ilustraciones (ábaco, íconos y gráficos) son originales del proyecto.`,
          'La lista completa de bibliotecas de terceros incluidas en la app, con sus licencias y avisos, se genera en cada compilación y se publica en /licencias-terceros.txt.',
        ],
      },
      {
        titulo: 'Bibliotecas principales',
        lista: [
          'React, React Router, Motion, Dexie, Zod, MiniSearch, Workbox, Three.js, KaTeX y Formula.js — licencias MIT o Apache-2.0.',
          'SheetJS Community Edition — Apache-2.0.',
          'Tipografías Inter, Fraunces y JetBrains Mono — SIL Open Font License 1.1.',
        ],
      },
      {
        titulo: 'Datos y servicios abiertos',
        lista: [
          'Banco Mundial, World Development Indicators — CC BY 4.0. Se cita la fuente en cada gráfico.',
          'Tipos de cambio de referencia del Banco Central Europeo, vía Frankfurter (código MIT) — uso libre citando al BCE.',
          'Crossref — según Crossref, casi ningún metadato está sujeto a derechos de autor. ÁBACO no muestra resúmenes, que sí pueden tenerlos.',
          'DOAJ — metadatos con renuncia CC0.',
          'OpenAlex, LA Referencia y Open Library — ÁBACO solo muestra datos bibliográficos (título, autores, año, fuente, DOI o enlace) y enlaza al original.',
        ],
      },
      {
        titulo: 'Bibliografía y normas',
        parrafos: [
          'Los libros de OpenStax (Rice University) tienen licencia CC BY-NC-SA 4.0; ÁBACO los cita y enlaza a la sección exacta, sin copiar su texto ni sus figuras. OpenStax es una marca de Rice University, que no respalda a ÁBACO.',
          'Las leyes, reglamentos y resoluciones ecuatorianas citadas son textos oficiales de libre uso (Código Ingenios, art. 107).',
        ],
      },
      {
        titulo: 'Marcas',
        parrafos: [
          'Microsoft Excel, Google Sheets, GeoGebra, Desmos, Overleaf y las demás marcas mencionadas pertenecen a sus titulares. Se nombran solo para identificar productos; ninguno patrocina ni respalda a ÁBACO.',
        ],
      },
    ],
  },
  {
    id: 'accesibilidad',
    titulo: 'Declaración de accesibilidad',
    resumen: 'El objetivo es WCAG 2.2 nivel AA. Qué se prueba y cómo reportar barreras.',
    secciones: [
      {
        titulo: 'Compromiso',
        parrafos: [
          'ÁBACO busca cumplir las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.2 en nivel AA, por encima de la norma ecuatoriana NTE INEN-ISO/IEC 40500, que adopta WCAG 2.0.',
        ],
      },
      {
        titulo: 'Cómo se comprueba',
        lista: [
          'Pruebas automáticas con axe en todas las vistas, en tema claro y oscuro, en cada cambio del código.',
          'Navegación completa con teclado: enlace para saltar al contenido, foco visible, diálogos que atrapan el foco y se cierran con Escape.',
          'Contraste de color AA en ambos temas, texto ampliable y objetivos táctiles de al menos 24 × 24 px (criterio 2.5.8 de WCAG 2.2); los botones principales miden 44 px de alto.',
          'Respeto de la preferencia «reducir movimiento»: sin animaciones ni 3D si la activas.',
          'Los gráficos de las herramientas muestran también sus datos en una tabla o en texto.',
        ],
      },
      {
        titulo: 'Limitaciones conocidas',
        lista: [
          'El ábaco en 3D es decorativo; su versión estática dice el número que marca.',
          'Las fórmulas complejas se leen mejor con el nombre y la descripción que las acompañan que con el lector de pantalla sobre la notación.',
        ],
      },
      {
        titulo: 'Reportar una barrera',
        parrafos: [`Si algo te impide usar ÁBACO, ${CONTACTO}. Indica la página y qué tecnología de apoyo usas.`],
      },
    ],
  },
  {
    id: 'seguridad',
    titulo: 'Seguridad',
    resumen: 'Cómo se protege la app y cómo reportar una vulnerabilidad.',
    secciones: [
      {
        titulo: 'Medidas aplicadas',
        lista: [
          'Sin servidor propio ni base de datos central: no hay cuentas que robar ni datos de estudiantes que filtrar.',
          'Política de seguridad de contenido estricta: solo código del propio sitio, sin scripts en línea ni evaluación dinámica de código.',
          'El editor y las fórmulas que escribes se interpretan sin ejecutar código: el texto se escapa y las fórmulas pasan por un analizador con una lista cerrada de funciones.',
          'Los archivos importados se limitan en tamaño y tipo y se validan con un esquema antes de tocar tus datos.',
          'Protección contra el enmarcado del sitio por páginas ajenas.',
          'Dependencias con versión fija, revisión automática de vulnerabilidades y escaneo de secretos en cada cambio.',
        ],
      },
      {
        titulo: 'Reportar una vulnerabilidad',
        parrafos: [
          `No publiques el detalle de una vulnerabilidad antes de que se corrija. ${CONTACTO} pidiendo un canal privado, o usa el reporte privado de vulnerabilidades del repositorio. Se responde en un máximo de 7 días.`,
        ],
      },
    ],
  },
];

export function getLegalDoc(id: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.id === id);
}
