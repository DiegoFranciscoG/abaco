import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { SITE, suggestionAddress } from '../../config/site';
import { getMateria, materias } from '../../data/content';
import { buildSuggestionMail, type SuggestionMail } from '../../domain/suggestions/mail';
import {
  MESSAGE_MAX,
  SOURCE_MAX,
  SUGGESTION_KINDS,
  validateSuggestion,
  type SuggestionErrors,
  type SuggestionInput,
} from '../../domain/suggestions/validate';
import { useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, Notice, PageHeader } from '../../ui/primitives';
import { useToast } from '../../ui/use-toast';
import { AuthorPanel } from '../about/AuthorPanel';
import { limitReason, recordSuggestion } from './limits';
import { openMailApp } from './open-mail';
import { copyText } from '../../ui/clipboard';

const MATERIA_IDS = new Set(materias.map((m) => m.id));
const FIELD_ORDER = ['tipo', 'materia', 'mensaje', 'fuente', 'consentimiento'] as const;

function initialInput(params: URLSearchParams): SuggestionInput {
  const tipo = params.get('tipo') ?? '';
  const materia = params.get('materia') ?? '';
  return {
    tipo: SUGGESTION_KINDS.some((k) => k.id === tipo) ? tipo : '',
    materia: MATERIA_IDS.has(materia) ? materia : '',
    mensaje: '',
    fuente: '',
    consentimiento: false,
    trampa: '',
  };
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-warn">
      <Icon name="info" size={16} className="mt-0.5 shrink-0" /> {message}
    </p>
  );
}

function Sent({ mail, onAgain }: { mail: SuggestionMail; onAgain: () => void }) {
  const toast = useToast();
  const heading = useRef<HTMLHeadingElement>(null);
  const address = suggestionAddress();
  useEffect(() => heading.current?.focus(), []);
  const copy = async () => {
    try {
      await copyText(`Para: ${address}\nAsunto: ${mail.subject}\n\n${mail.body}`);
      toast.show('Mensaje copiado');
    } catch {
      toast.show('Tu navegador no permitió copiar. Selecciona el texto y cópialo a mano.', 'error');
    }
  };
  return (
    <div className="space-y-10">
      <section aria-labelledby="gracias" className="card space-y-4 p-6 sm:p-8">
        <span className="tile">
          <Icon name="check" />
        </span>
        <h2
          ref={heading}
          id="gracias"
          className="font-display text-3xl font-semibold outline-none"
          tabIndex={-1}
        >
          ¡Gracias por ayudar a mejorar ÁBACO!
        </h2>
        {mail.tooLong ? (
          <p className="text-ink-2">
            Tu mensaje es largo para abrirlo directo en el correo. Cópialo y envíalo a{' '}
            <strong>{address}</strong>.
          </p>
        ) : (
          <p className="text-ink-2">
            Se abrió tu aplicación de correo con el mensaje listo: solo pulsa <strong>Enviar</strong>. Si no
            se abrió, cópialo y envíalo a <strong>{address}</strong>.
          </p>
        )}
        <details className="rounded-2xl border border-line p-4">
          <summary className="cursor-pointer text-sm font-semibold text-red">Ver el mensaje</summary>
          <pre className="mt-3 text-sm whitespace-pre-wrap text-ink-2">{`Asunto: ${mail.subject}\n\n${mail.body}`}</pre>
        </details>
        <div className="flex flex-wrap gap-2">
          {!mail.tooLong ? (
            <a href={mail.href} className="btn btn-primary">
              <Icon name="external" size={18} /> Abrir mi correo otra vez
            </a>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={() => void copy()}>
            <Icon name="copy" size={18} /> Copiar el mensaje
          </button>
          <button type="button" className="btn btn-ghost" onClick={onAgain}>
            <Icon name="plus" size={18} /> Otra sugerencia
          </button>
        </div>
      </section>
      <AuthorPanel />
    </div>
  );
}

export default function SuggestionsPage() {
  useDocumentTitle('Buzón de sugerencias');
  const [params] = useSearchParams();
  const [input, setInput] = useState<SuggestionInput>(() => initialInput(params));
  const [errors, setErrors] = useState<SuggestionErrors>({});
  const [sent, setSent] = useState<SuggestionMail | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  const ids = Object.fromEntries(FIELD_ORDER.map((f) => [f, `${id}-${f}`])) as Record<
    (typeof FIELD_ORDER)[number],
    string
  >;

  const set = <K extends keyof SuggestionInput>(key: K, value: SuggestionInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as keyof SuggestionErrors];
      return next;
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateSuggestion(input, MATERIA_IDS);
    if (!result.ok) {
      setErrors(result.errors);
      const first = FIELD_ORDER.find((f) => result.errors[f]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
      return;
    }
    const blocked = limitReason(result.value.mensaje);
    if (blocked) {
      setErrors({ form: blocked });
      return;
    }
    const materiaNombre = result.value.materia ? getMateria(result.value.materia)?.nombre : undefined;
    const mail = buildSuggestionMail(result.value, {
      address: suggestionAddress(),
      ...(materiaNombre ? { materiaNombre } : {}),
    });
    recordSuggestion(result.value.mensaje);
    setSent(mail);
    if (!mail.tooLong) openMailApp(mail.href);
  };

  const again = () => {
    setSent(null);
    setInput(initialInput(new URLSearchParams()));
    setErrors({});
  };

  const correction = input.tipo === 'correccion';
  const described = (field: (typeof FIELD_ORDER)[number], hint?: string) =>
    [hint, errors[field] ? `${ids[field]}-error` : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Buzón de sugerencias"
        title="¿Qué le falta a ÁBACO?"
        subtitle="Tu idea me llega directo al correo. Leo cada mensaje; lo que se puede verificar con una fuente y ayuda a estudiar entra en las próximas versiones."
      />

      {sent ? (
        <Sent mail={sent} onAgain={again} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <form
            ref={formRef}
            noValidate
            onSubmit={submit}
            className="card space-y-6 p-5 sm:p-7"
            aria-label="Enviar una sugerencia"
          >
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink-2">¿De qué trata? *</legend>
              <div className="flex flex-wrap gap-2" aria-describedby={described('tipo')}>
                {SUGGESTION_KINDS.map((k, i) => (
                  <label
                    key={k.id}
                    className={`chip min-h-10 cursor-pointer ${input.tipo === k.id ? 'border-red bg-red-soft text-red' : ''}`}
                  >
                    <input
                      type="radio"
                      name="tipo"
                      className="sr-only"
                      value={k.id}
                      checked={input.tipo === k.id}
                      onChange={() => set('tipo', k.id)}
                      {...(i === 0 ? { 'data-field': 'tipo' } : {})}
                    />
                    {k.label}
                  </label>
                ))}
              </div>
              <FieldError id={`${ids.tipo}-error`} message={errors.tipo} />
            </fieldset>

            <div>
              <label htmlFor={ids.materia} className="mb-1 block text-sm font-semibold text-ink-2">
                Materia {correction ? '*' : '(opcional)'}
              </label>
              <select
                id={ids.materia}
                data-field="materia"
                className="field"
                value={input.materia}
                onChange={(e) => set('materia', e.target.value)}
                aria-invalid={errors.materia ? true : undefined}
                aria-describedby={described('materia')}
              >
                <option value="">Ninguna en particular</option>
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
              <FieldError id={`${ids.materia}-error`} message={errors.materia} />
            </div>

            <div>
              <label htmlFor={ids.mensaje} className="mb-1 block text-sm font-semibold text-ink-2">
                Tu sugerencia *
              </label>
              <textarea
                id={ids.mensaje}
                data-field="mensaje"
                className="field min-h-40"
                value={input.mensaje}
                maxLength={MESSAGE_MAX}
                onChange={(e) => set('mensaje', e.target.value)}
                placeholder="Por ejemplo: en Contabilidad de costos faltan ejercicios de costeo por procesos con producción equivalente."
                aria-invalid={errors.mensaje ? true : undefined}
                aria-describedby={described('mensaje', `${ids.mensaje}-hint`)}
              />
              <p id={`${ids.mensaje}-hint`} className="mt-1 flex justify-between gap-3 text-xs text-muted">
                <span>
                  Sé concreto: qué falta o qué está mal, y dónde. Sin cédulas, teléfonos ni correos.
                </span>
                <span className="tnum shrink-0">
                  {input.mensaje.length}/{MESSAGE_MAX}
                </span>
              </p>
              <FieldError id={`${ids.mensaje}-error`} message={errors.mensaje} />
            </div>

            <div>
              <label htmlFor={ids.fuente} className="mb-1 block text-sm font-semibold text-ink-2">
                Fuente {correction ? '*' : '(opcional)'}
              </label>
              <input
                id={ids.fuente}
                data-field="fuente"
                className="field"
                value={input.fuente}
                maxLength={SOURCE_MAX}
                onChange={(e) => set('fuente', e.target.value)}
                placeholder="Norma, libro o enlace oficial: p. ej. https://www.sri.gob.ec/…"
                aria-invalid={errors.fuente ? true : undefined}
                aria-describedby={described('fuente', `${ids.fuente}-hint`)}
              />
              <p id={`${ids.fuente}-hint`} className="mt-1 text-xs text-muted">
                {correction
                  ? 'Obligatoria para correcciones: así puedo comprobar el cambio.'
                  : 'Ayuda a verificar tu propuesta más rápido.'}
              </p>
              <FieldError id={`${ids.fuente}-error`} message={errors.fuente} />
            </div>

            {/* Honeypot: hidden from people and assistive technology. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label>
                No llenes este campo
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={input.trampa}
                  onChange={(e) => set('trampa', e.target.value)}
                  name="sitio-web"
                />
              </label>
            </div>

            <div>
              <label className="flex items-start gap-3 text-sm text-ink-2">
                <input
                  type="checkbox"
                  data-field="consentimiento"
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--red)]"
                  checked={input.consentimiento}
                  onChange={(e) => set('consentimiento', e.target.checked)}
                  aria-invalid={errors.consentimiento ? true : undefined}
                  aria-describedby={described('consentimiento')}
                />
                <span>
                  Acepto que {SITE.titular} reciba mi mensaje y la dirección de correo desde la que lo envíe,
                  solo para atender esta sugerencia y responderme, como explica la{' '}
                  <AppLink to="/legal/privacidad" className="link-red">
                    política de privacidad
                  </AppLink>
                  . *
                </span>
              </label>
              <FieldError id={`${ids.consentimiento}-error`} message={errors.consentimiento} />
            </div>

            {errors.form ? <Notice tone="warn">{errors.form}</Notice> : null}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn btn-primary">
                <Icon name="arrow-right" size={18} /> Enviar sugerencia
              </button>
              <span className="text-xs text-muted">
                * Obligatorio. Se abrirá tu aplicación de correo con el mensaje listo.
              </span>
            </div>
          </form>

          <aside className="space-y-4" aria-label="Cómo funciona el buzón">
            <div className="card space-y-3 p-5 text-sm text-ink-2">
              <h2 className="font-display text-xl font-semibold text-ink">Cómo funciona</h2>
              <ol className="list-decimal space-y-2 pl-5">
                <li>Escribes tu idea y, si es una corrección, la fuente que la respalda.</li>
                <li>ÁBACO revisa que el mensaje se entienda, sea respetuoso y no tenga datos personales.</li>
                <li>
                  Se abre tu correo con el mensaje listo para {suggestionAddress()}. ÁBACO no lo envía por ti
                  ni lo guarda.
                </li>
                <li>
                  Leo cada sugerencia; las que se verifican con una fuente oficial se publican en la siguiente
                  versión.
                </li>
              </ol>
              <p className="text-xs text-muted">Límite por dispositivo: tres sugerencias al día.</p>
            </div>
            <div className="card space-y-2 p-5 text-sm text-ink-2">
              <h2 className="font-display text-xl font-semibold text-ink">¿Usas GitHub?</h2>
              <p>
                También puedes proponer cambios en público en el{' '}
                <a href={SITE.contacto} target="_blank" rel="noopener noreferrer" className="link-red">
                  repositorio de ÁBACO
                </a>
                .
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
