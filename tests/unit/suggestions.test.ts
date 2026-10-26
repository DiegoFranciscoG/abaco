import { describe, expect, it } from 'vitest';
import { buildSuggestionMail, MAILTO_MAX } from '../../src/domain/suggestions/mail';
import { findOffensive } from '../../src/domain/suggestions/profanity';
import { nonsenseReason, personalDataReason, validateSuggestion, type SuggestionInput } from '../../src/domain/suggestions/validate';
import { clearSuggestionLedger, fingerprint, limitReason, recordSuggestion, SUGGESTION_STORAGE_KEY } from '../../src/features/suggestions/limits';

const IDS = new Set(['tributacion', 'contabilidad-costos']);
const GOOD = 'En Contabilidad de costos faltan ejercicios de costeo por procesos con producción equivalente y su informe de costos.';

const input = (over: Partial<SuggestionInput> = {}): SuggestionInput => ({
  tipo: 'materia',
  materia: 'contabilidad-costos',
  mensaje: GOOD,
  fuente: '',
  consentimiento: true,
  trampa: '',
  ...over,
});

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe('palabras ofensivas', () => {
  it.each([
    'Esta app es una mierda',
    'qué pendejos los que hicieron esto',
    'eres un hijueputa',
    'M1ERD4 de página',
    'p.u.t.a madre',
    'vergaaa, no funciona',
    'chucha, se borró todo',
    'huevón, arregla esto',
    'GONORREA',
  ])('detects «%s»', (text) => {
    expect(findOffensive(text)).not.toEqual([]);
  });

  it.each([
    'La computadora se congela al exportar a Excel',
    'Una disputa entre socios en derecho societario',
    'El cálculo del costo marginal no cuadra',
    'El cono de demanda y la concha acústica',
    'La reputación de la empresa y la imputación de costos',
    'Pero el perro del ejemplo de estadística',
    'Ley Orgánica de Régimen Tributario Interno, numeral 1',
    'variable sexo en la encuesta de investigación de mercados',
    'Uso una laptop HP con Windows',
    'IVA 15 % en 2026 y 12 208 de fracción básica',
  ])('does not flag «%s»', (text) => {
    expect(findOffensive(text)).toEqual([]);
  });
});

describe('mensajes sin sentido', () => {
  it.each([
    'asdfghjkl qwertyuiop zxcvbnm asdf qwer zxcv',
    'jajajajajaja jajajaja jajajaja jaja jaja jaja jaja',
    'hola hola hola hola hola hola hola hola hola hola',
    'sdkfjh sdkjfh wekjrh sdkjfh qwlekj zxmcnb lkjsdf',
    'aaaaaaaa buenas tardes en la materia de costos',
    'xkcd plmn trsv bcdf gh jk lm np qr st vw xz',
  ])('rejects «%s»', (text) => {
    expect(nonsenseReason(text)).not.toBeNull();
  });

  it.each([
    GOOD,
    'Sería útil una calculadora del décimo cuarto sueldo para la región Sierra con la fecha de pago.',
    'El ejemplo de VAN usa una tasa del 12 % y el resultado no coincide con la función VNA de Excel.',
    'Agreguen un tema sobre NIIF 16 de arrendamientos en Contabilidad financiera, por favor.',
    'FALTA LA MATERIA DE AUDITORÍA FINANCIERA CON NORMAS INTERNACIONALES DE AUDITORÍA',
  ])('accepts «%s»', (text) => {
    expect(nonsenseReason(text)).toBeNull();
  });
});

describe('datos personales', () => {
  it.each([
    'mi cédula es 0102030405 por si acaso',
    'el RUC 0102030405001 de mi negocio',
    'llámame al 099 123 4567',
    'escríbeme al +593 98 765 4321',
    'mi correo es alguien@example.com',
    'cédula 010203040-5',
  ])('blocks «%s»', (text) => {
    expect(personalDataReason(text)).not.toBeNull();
  });

  it.each(['La fracción básica es USD 12 208 en 2026', 'Un capital de 1.000.000.000 al 8 %', 'Los años 2019 2020 2021 y 2022'])('allows «%s»', (text) => {
    expect(personalDataReason(text)).toBeNull();
  });
});

describe('validación del buzón', () => {
  it('accepts a clear, respectful suggestion', () => {
    const result = validateSuggestion(input(), IDS);
    expect(result).toEqual({ ok: true, value: { tipo: 'materia', materia: 'contabilidad-costos', mensaje: GOOD, fuente: null } });
  });

  it('requires a kind, enough text and consent', () => {
    const result = validateSuggestion(input({ tipo: '', mensaje: 'muy corto', consentimiento: false }), IDS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['consentimiento', 'mensaje', 'tipo']);
  });

  it('asks corrections for the subject and the source that backs them', () => {
    const result = validateSuggestion(input({ tipo: 'correccion', materia: '' }), IDS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.materia).toMatch(/materia/);
      expect(result.errors.fuente).toMatch(/norma, el libro o la página oficial/);
    }
    const ok = validateSuggestion(input({ tipo: 'correccion', materia: 'tributacion', fuente: 'https://www.sri.gob.ec/impuesto-renta' }), IDS);
    expect(ok.ok).toBe(true);
  });

  it('rejects unknown subjects, links in the message, insecure sources and the honeypot', () => {
    expect(validateSuggestion(input({ materia: 'no-existe' }), IDS)).toMatchObject({ ok: false, errors: { materia: expect.any(String) } });
    expect(validateSuggestion(input({ mensaje: `${GOOD} https://spam.example` }), IDS)).toMatchObject({ ok: false, errors: { mensaje: expect.stringMatching(/Fuente/) } });
    expect(validateSuggestion(input({ fuente: 'http://inseguro.example' }), IDS)).toMatchObject({ ok: false, errors: { fuente: expect.stringMatching(/https/) } });
    expect(validateSuggestion(input({ trampa: 'https://bot.example' }), IDS)).toMatchObject({ ok: false, errors: { form: expect.any(String) } });
  });

  it('rejects insults with a respectful message', () => {
    const result = validateSuggestion(input({ mensaje: 'Esta materia de costos está hecha una mierda, arreglen los ejercicios ya' }), IDS);
    expect(result).toMatchObject({ ok: false, errors: { mensaje: expect.stringMatching(/ofensivas/) } });
  });
});

describe('correo preparado', () => {
  it('builds a mailto link with subject, body and CRLF line breaks', () => {
    const mail = buildSuggestionMail({ tipo: 'materia', materia: 'contabilidad-costos', mensaje: GOOD, fuente: null }, { address: 'buzon@example.com', materiaNombre: 'Contabilidad de costos' });
    expect(mail.subject).toBe('[ÁBACO] Agregar una materia, tema o subtema · Contabilidad de costos');
    expect(mail.href.startsWith('mailto:buzon@example.com?subject=')).toBe(true);
    expect(mail.href).toContain('%0D%0A');
    expect(mail.href).not.toMatch(/%0D%0D/);
    expect(decodeURIComponent(mail.href.split('&body=')[1] ?? '')).toContain(GOOD);
    expect(mail.tooLong).toBe(false);
  });

  it('flags messages too long for a mailto link', () => {
    const long = 'á'.repeat(900);
    const mail = buildSuggestionMail({ tipo: 'otra', materia: null, mensaje: long, fuente: null }, { address: 'buzon@example.com' });
    expect(mail.href.length).toBeGreaterThan(MAILTO_MAX);
    expect(mail.tooLong).toBe(true);
  });
});

describe('límites por dispositivo', () => {
  it('allows three messages a day, two minutes apart, never the same text twice', () => {
    const storage = new MemoryStorage();
    const t0 = Date.UTC(2026, 9, 25, 15);
    expect(limitReason('uno', t0, storage)).toBeNull();
    recordSuggestion('uno', t0, storage);
    expect(limitReason('uno', t0 + 10 * 60_000, storage)).toMatch(/mismo mensaje/);
    expect(limitReason('dos', t0 + 30_000, storage)).toMatch(/minutos/);
    recordSuggestion('dos', t0 + 3 * 60_000, storage);
    recordSuggestion('tres', t0 + 6 * 60_000, storage);
    expect(limitReason('cuatro', t0 + 9 * 60_000, storage)).toMatch(/3 sugerencias al día/);
    expect(limitReason('cuatro', t0 + 25 * 60 * 60_000, storage)).toBeNull();
  });

  it('stores fingerprints, not the text, and can be cleared', () => {
    const storage = new MemoryStorage();
    recordSuggestion(GOOD, Date.now(), storage);
    const raw = storage.getItem(SUGGESTION_STORAGE_KEY) ?? '';
    expect(raw).not.toContain('costeo');
    expect(raw).toContain(fingerprint(GOOD));
    clearSuggestionLedger(storage);
    expect(storage.getItem(SUGGESTION_STORAGE_KEY)).toBeNull();
  });

  it('survives corrupt or blocked storage', () => {
    const storage = new MemoryStorage();
    storage.setItem(SUGGESTION_STORAGE_KEY, '{no es json');
    expect(limitReason('hola', Date.now(), storage)).toBeNull();
    expect(limitReason('hola', Date.now(), undefined)).toBeNull();
    expect(() => recordSuggestion('hola', Date.now(), undefined)).not.toThrow();
  });
});
