/**
 * Public identity of the site (legal notice, privacy policy, footer). One place to change before publishing.
 * Contact: the repository issues and the suggestion box, which opens the visitor's own mail app addressed to the
 * owner. The address is stored in two parts so that it does not appear verbatim in the built files.
 */
export const SITE = {
  nombre: 'ÁBACO',
  titular: 'Diego Francisco Granda Zhingre',
  naturaleza: 'persona natural',
  pais: 'Ecuador',
  repositorio: 'https://github.com/DiegoFranciscoG/abaco',
  contacto: 'https://github.com/DiegoFranciscoG/abaco/issues',
  buzon: { usuario: 'diegofgz2004', dominio: 'gmail.com' },
  /** Date the current legal texts took effect (ISO). */
  vigencia: '2026-10-26',
} as const;

/** Address of the suggestion box, assembled only when it is needed. */
export const suggestionAddress = (): string => `${SITE.buzon.usuario}@${SITE.buzon.dominio}`;
