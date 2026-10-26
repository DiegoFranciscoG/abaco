/**
 * Author of ÁBACO and the author's public profiles. Every link was opened on 2026-10-25: the LinkedIn address is the
 * one published on the author's portfolio and GitHub profile; projects are public repositories of that profile,
 * described with the author's own repository descriptions.
 */
export interface AuthorLink {
  id: 'github' | 'linkedin' | 'instagram' | 'portafolio';
  nombre: string;
  usuario: string;
  url: string;
}

export interface AuthorProject {
  nombre: string;
  descripcion: string;
  tecnologias: string;
  repositorio: string;
  demo?: string;
}

export const AUTHOR = {
  nombre: 'Diego Francisco Granda Zhingre',
  rol: 'Desarrollador de software · backend y full-stack',
  redes: [
    { id: 'github', nombre: 'GitHub', usuario: 'DiegoFranciscoG', url: 'https://github.com/DiegoFranciscoG' },
    { id: 'linkedin', nombre: 'LinkedIn', usuario: 'Diego Francisco G.', url: 'https://www.linkedin.com/in/diego-francisco-g-61b793254/' },
    { id: 'instagram', nombre: 'Instagram', usuario: '@diego.granda.z', url: 'https://www.instagram.com/diego.granda.z/' },
    { id: 'portafolio', nombre: 'Portafolio', usuario: 'diegofranciscog.github.io', url: 'https://diegofranciscog.github.io/' },
  ] satisfies AuthorLink[],
  repositorios: 'https://github.com/DiegoFranciscoG?tab=repositories',
  proyectos: [
    {
      nombre: 'nomina-ec',
      descripcion: 'Rol de pagos ecuatoriano 2026: IESS, décimos, fondos de reserva e impuesto a la renta con parámetros legales versionados por fecha.',
      tecnologias: 'Java 21 · Spring Boot · Angular · PostgreSQL',
      repositorio: 'https://github.com/DiegoFranciscoG/nomina-ec',
    },
    {
      nombre: 'contabilidad-api',
      descripcion: 'Motor de contabilidad por partida doble para pymes: plan de cuentas, asientos que solo se guardan si cuadran y estados financieros NIIF para las PYMES.',
      tecnologias: 'Spring Boot 4 · PostgreSQL',
      repositorio: 'https://github.com/DiegoFranciscoG/contabilidad-api',
    },
    {
      nombre: 'facturador-sri',
      descripcion: 'Punto de venta con inventario que emite facturas y notas de crédito electrónicas según el esquema offline del SRI.',
      tecnologias: 'Java',
      repositorio: 'https://github.com/DiegoFranciscoG/facturador-sri',
    },
    {
      nombre: 'inventario-multibodega',
      descripcion: 'Kárdex valorizado con costo promedio (NIC 2), lotes, transferencias entre bodegas y conteo cíclico.',
      tecnologias: 'Spring Boot 4 · PostgreSQL',
      repositorio: 'https://github.com/DiegoFranciscoG/inventario-multibodega',
    },
    {
      nombre: 'crm-ventas',
      descripcion: 'CRM para ventas entre empresas: embudo kanban, cotizaciones en PDF con IVA y pronóstico de ventas.',
      tecnologias: 'Spring Boot 4 · Angular · PostgreSQL',
      repositorio: 'https://github.com/DiegoFranciscoG/crm-ventas',
    },
    {
      nombre: 'skillscope',
      descripcion: 'Buscador estático que descubre, analiza y puntúa herramientas para agentes de código publicadas en GitHub.',
      tecnologias: 'Python · sitio estático',
      repositorio: 'https://github.com/DiegoFranciscoG/skillscope',
      demo: 'https://diegofranciscog.github.io/skillscope/',
    },
  ] satisfies AuthorProject[],
} as const;
