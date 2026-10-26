import { findOffensive } from '../suggestions/profanity';
import { nonsenseReason, personalDataReason } from '../suggestions/validate';
import { personalDataCounts, type Relevance } from './analyze';

/**
 * Checks before a student shares a PDF with the author. ÁBACO cannot prove that a document is true; it can make
 * sure it is readable, belongs to the chosen subject, carries no personal data or insults, and that the sender
 * declares the right to share it. The author then verifies the content against official sources by hand.
 */
export interface PdfShareInput {
  descripcion: string;
  derechos: boolean;
  consentimiento: boolean;
  texto: string;
  relevancia: Relevance;
}

export type PdfShareErrors = Partial<Record<'descripcion' | 'derechos' | 'consentimiento' | 'pdf', string>>;

export function validatePdfShare(input: PdfShareInput): PdfShareErrors {
  const errors: PdfShareErrors = {};
  const d = input.descripcion.trim();
  const dError =
    d.length < 20
      ? 'Cuenta en una o dos frases qué contiene el PDF (al menos 20 caracteres).'
      : d.length > 500
        ? 'La descripción puede tener hasta 500 caracteres.'
        : findOffensive(d).length > 0
          ? 'La descripción tiene palabras ofensivas.'
          : (personalDataReason(d) ?? (d.split(/\s+/).length >= 6 ? nonsenseReason(d) : null));
  if (dError) errors.descripcion = dError;

  const datos = personalDataCounts(input.texto);
  const totalDatos = datos.cedulas + datos.telefonos + datos.correos;
  const pdfError =
    input.texto.replace(/\s/g, '').length < 1000
      ? 'El PDF tiene muy poco texto para revisarlo (quizá es una imagen escaneada).'
      : totalDatos > 0
        ? `El PDF parece contener datos personales (${totalDatos}: cédulas, teléfonos o correos). Quítalos antes de compartirlo.`
        : findOffensive(input.texto).length > 0
          ? 'El PDF contiene palabras ofensivas; no se puede usar como material de estudio.'
          : input.relevancia.subtemas.length < 2
            ? 'El PDF casi no trata los temas de esta materia. Elige la materia correcta o comparte otro documento.'
            : null;
  if (pdfError) errors.pdf = pdfError;

  if (!input.derechos)
    errors.derechos = 'Confirma que eres autor del documento o que tienes permiso para compartirlo.';
  if (!input.consentimiento)
    errors.consentimiento = 'Para enviar, acepta que el titular reciba el PDF y tu correo.';
  return errors;
}

export function buildPdfShareMail(input: {
  address: string;
  materiaNombre: string;
  pdfNombre: string;
  paginas: number;
  descripcion: string;
  avisarme: boolean;
}): { subject: string; body: string; href: string } {
  const subject = `[ÁBACO] PDF para ${input.materiaNombre}`;
  const body = [
    'Comparto un PDF para revisar e incluir en ÁBACO si su información se verifica.',
    `Materia: ${input.materiaNombre}`,
    `Archivo: ${input.pdfNombre} (${input.paginas} ${input.paginas === 1 ? 'página' : 'páginas'})`,
    `Qué contiene: ${input.descripcion.trim()}`,
    'Declaro que soy autor del documento o que tengo permiso para compartirlo.',
    `Quiero que me respondan si se usará: ${input.avisarme ? 'Sí' : 'No'}`,
    '',
    '—',
    'Enviado desde el área de estudio de ÁBACO.',
  ].join('\n');
  const href = `mailto:${input.address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body).replace(/%0A/g, '%0D%0A')}`;
  return { subject, body, href };
}
