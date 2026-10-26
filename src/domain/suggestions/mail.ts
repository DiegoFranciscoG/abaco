import { SUGGESTION_KINDS, type Suggestion } from './validate';

/** Longest mailto: link that every common mail app opens without cutting it (some desktop clients stop near 2 000). */
export const MAILTO_MAX = 1900;

export interface SuggestionMail {
  subject: string;
  body: string;
  href: string;
  /** True when the link is too long to open safely; the page then offers to copy the text instead. */
  tooLong: boolean;
}

export function buildSuggestionMail(
  suggestion: Suggestion,
  options: { address: string; materiaNombre?: string },
): SuggestionMail {
  const kind = SUGGESTION_KINDS.find((k) => k.id === suggestion.tipo)?.label ?? 'Sugerencia';
  const subject = `[ÁBACO] ${kind}${options.materiaNombre ? ` · ${options.materiaNombre}` : ''}`;
  const lines = [
    `Tipo: ${kind}`,
    ...(options.materiaNombre ? [`Materia: ${options.materiaNombre}`] : []),
    '',
    suggestion.mensaje,
    ...(suggestion.fuente ? ['', `Fuente: ${suggestion.fuente}`] : []),
    '',
    '—',
    'Enviado desde el buzón de sugerencias de ÁBACO.',
  ];
  const body = lines.join('\n');
  const href = `mailto:${options.address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body).replace(/%0A/g, '%0D%0A')}`;
  return { subject, body, href, tooLong: href.length > MAILTO_MAX };
}
