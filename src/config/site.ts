/**
 * Public identity of the site (legal notice, privacy policy, footer). One place to change before publishing.
 * The repository URL is also the contact channel: ÁBACO does not publish a phone number or a personal email.
 */
export const SITE = {
  nombre: 'ÁBACO',
  titular: 'Diego Francisco Granda Zhingre',
  naturaleza: 'persona natural',
  pais: 'Ecuador',
  repositorio: 'https://github.com/DiegoFranciscoG/abaco',
  contacto: 'https://github.com/DiegoFranciscoG/abaco/issues',
  /** Date the current legal texts took effect (ISO). */
  vigencia: '2026-10-25',
} as const;
