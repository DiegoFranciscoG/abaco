import { useId, useState } from 'react';
import { SITE, suggestionAddress } from '../../config/site';
import type { DocumentoPdf } from '../../data/types';
import type { Materia, Temario } from '../../domain/content/schemas';
import { subjectRelevance } from '../../domain/study/analyze';
import { buildPdfShareMail, validatePdfShare, type PdfShareErrors } from '../../domain/study/share';
import { Icon } from '../../ui/icons';
import { AppLink, Dialog, Notice } from '../../ui/primitives';
import { AuthorPanel } from '../about/AuthorPanel';
import { limitReason, recordSuggestion } from '../suggestions/limits';
import { openMailApp } from '../suggestions/open-mail';
import { copyText } from '../../ui/clipboard';

type Sent = { how: 'share' | 'mail'; nombre: string };

/**
 * Sends a PDF to the author for review. With the share sheet (phones) the file travels attached; otherwise the
 * mail app opens with the message ready and the student attaches the file. ÁBACO itself never uploads it.
 */
export function SharePdfDialog({
  pdf,
  file,
  materia,
  temario,
  onClose,
}: {
  pdf: DocumentoPdf;
  file: File | undefined;
  materia: Materia;
  temario: Temario;
  onClose: () => void;
}) {
  const id = useId();
  const [descripcion, setDescripcion] = useState('');
  const [derechos, setDerechos] = useState(false);
  const [consentimiento, setConsentimiento] = useState(false);
  const [avisarme, setAvisarme] = useState(true);
  const [errors, setErrors] = useState<PdfShareErrors & { form?: string }>({});
  const [sent, setSent] = useState<Sent | null>(null);
  const address = suggestionAddress();

  const submit = async () => {
    const found = validatePdfShare({
      descripcion,
      derechos,
      consentimiento,
      texto: pdf.texto,
      relevancia: subjectRelevance(pdf.texto, materia, temario),
    });
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    const fingerprintText = `pdf:${pdf.nombre}:${pdf.texto.length}`;
    const blocked = limitReason(fingerprintText);
    if (blocked) {
      setErrors({ form: blocked });
      return;
    }
    const mail = buildPdfShareMail({
      address,
      materiaNombre: materia.nombre,
      pdfNombre: pdf.nombre,
      paginas: pdf.paginas,
      descripcion,
      avisarme,
    });
    const canShareFile =
      file !== undefined && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    if (canShareFile && file) {
      try {
        await copyText(address).catch(() => undefined);
        await navigator.share({
          files: [file],
          title: mail.subject,
          text: `Para: ${address}\n\n${mail.body}`,
        });
        recordSuggestion(fingerprintText);
        setSent({ how: 'share', nombre: pdf.nombre });
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError')
          setErrors({ form: 'No se pudo abrir el menú para compartir. Intenta de nuevo.' });
      }
      return;
    }
    recordSuggestion(fingerprintText);
    setSent({ how: 'mail', nombre: pdf.nombre });
    openMailApp(
      `${mail.href}${encodeURIComponent(`\r\n\r\n(Adjunta el archivo «${pdf.nombre}» antes de enviar.)`)}`,
    );
  };

  return (
    <Dialog open onClose={onClose} title={sent ? '¡Gracias por compartir!' : 'Enviar el PDF al autor'} wide>
      <div className="max-h-[75dvh] space-y-4 overflow-y-auto p-5">
        {sent ? (
          <>
            {sent.how === 'share' ? (
              <p className="text-ink-2">
                Elige tu aplicación de correo y escribe <strong>{address}</strong> en «Para» (ya está
                copiado). El PDF va adjunto.
              </p>
            ) : (
              <Notice>
                Se abrió tu correo con el mensaje para <strong>{address}</strong>.{' '}
                <strong>Adjunta el archivo «{sent.nombre}»</strong> antes de enviar: el navegador no puede
                adjuntarlo por ti.
              </Notice>
            )}
            <p className="text-sm text-ink-2">
              El autor revisará el PDF y comprobará cada dato con fuentes oficiales; solo lo verificado se
              redacta de nuevo y se agrega a ÁBACO con su fuente.{' '}
              {avisarme ? 'Te responderá si se usará.' : ''}
            </p>
            <AuthorPanel headingLevel={3} />
          </>
        ) : (
          <>
            <p className="text-sm text-ink-2">
              «{pdf.nombre}» · {materia.nombre}. Antes de enviar, ÁBACO comprueba que el PDF se pueda leer,
              que trate de esta materia y que no tenga datos personales ni insultos.
            </p>
            {errors.pdf ? <Notice tone="warn">{errors.pdf}</Notice> : null}
            <label className="block" htmlFor={`${id}-d`}>
              <span className="mb-1 block text-sm font-semibold text-ink-2">
                ¿Qué contiene y por qué sería útil? *
              </span>
              <textarea
                id={`${id}-d`}
                className="field min-h-24"
                maxLength={500}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                aria-invalid={errors.descripcion ? true : undefined}
                aria-describedby={errors.descripcion ? `${id}-de` : undefined}
              />
              {errors.descripcion ? (
                <span id={`${id}-de`} className="mt-1 block text-sm font-semibold text-warn">
                  {errors.descripcion}
                </span>
              ) : null}
            </label>
            {(
              [
                [
                  'derechos',
                  derechos,
                  setDerechos,
                  'Soy autor del documento o tengo permiso para compartirlo, y autorizo que sus ideas, una vez verificadas y redactadas de nuevo, se usen en ÁBACO. *',
                ],
                [
                  'consentimiento',
                  consentimiento,
                  setConsentimiento,
                  `Acepto que ${SITE.titular} reciba el PDF y mi correo solo para revisarlo y responderme. *`,
                ],
                ['avisarme', avisarme, setAvisarme, 'Quiero que me respondan si el PDF se usará.'],
              ] as const
            ).map(([key, checked, set, label]) => (
              <div key={key}>
                <label className="flex items-start gap-3 text-sm text-ink-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--red)]"
                    checked={checked}
                    onChange={(e) => set(e.target.checked)}
                  />
                  <span>{label}</span>
                </label>
                {key !== 'avisarme' && errors[key] ? (
                  <p className="mt-1 ml-8 text-sm font-semibold text-warn">{errors[key]}</p>
                ) : null}
              </div>
            ))}
            <p className="text-xs text-muted">
              Cómo se tratan tus datos y el PDF:{' '}
              <AppLink to="/legal/privacidad" className="link-red">
                política de privacidad
              </AppLink>
              .
            </p>
            {errors.form ? <Notice tone="warn">{errors.form}</Notice> : null}
            <button type="button" className="btn btn-primary" onClick={() => void submit()}>
              <Icon name="arrow-right" size={18} /> Enviar al autor
            </button>
          </>
        )}
      </div>
    </Dialog>
  );
}
