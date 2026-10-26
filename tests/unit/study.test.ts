import { describe, expect, it } from 'vitest';
import {
  cleanPdfText,
  findDefinitions,
  personalDataCounts,
  splitSentences,
  subjectRelevance,
} from '../../src/domain/study/analyze';
import {
  abacoQuestions,
  buildExam,
  gradeExam,
  isCorrect,
  parseAnswerNumber,
  pdfQuestions,
  seededRng,
  studyCards,
  type Question,
} from '../../src/domain/study/quiz';
import { loadAllContent } from '../content/load-content';

const content = loadAllContent();
const materia = content.materias.find((m) => m.id === 'contabilidad-costos')!;
const temario = content.temarios.find((t) => t.data.materia === 'contabilidad-costos')!.data;

const PDF_TEXT = `Apuntes de costos. El costo variable es aquel que cambia en proporción al volumen producido en el período.
El costo fijo es el que no cambia dentro del rango relevante de actividad de la empresa.
El margen de contribución es la diferencia entre el precio de venta y el costo variable unitario.
El punto de equilibrio es el volumen de ventas en el que la utilidad de la empresa es igual a cero.
Esto es importante porque permite planificar. La contabi-
lidad de costos se define como el sistema que mide y asigna los costos a los productos y servicios.`;

describe('análisis del texto de un PDF', () => {
  it('joins hyphenated words and splits sentences', () => {
    expect(cleanPdfText('contabi-\nlidad   de\tcostos')).toBe('contabilidad de costos');
    const sentences = splitSentences(PDF_TEXT);
    expect(sentences.length).toBeGreaterThanOrEqual(5);
    expect(sentences.some((s) => s.includes('contabilidad de costos se define'))).toBe(true);
  });

  it('finds definitions and ignores vague subjects such as «Esto»', () => {
    const defs = findDefinitions(splitSentences(PDF_TEXT));
    const terms = defs.map((d) => d.termino);
    expect(terms).toEqual(
      expect.arrayContaining([
        'Costo variable',
        'Costo fijo',
        'Margen de contribución',
        'Punto de equilibrio',
        'Contabilidad de costos',
      ]),
    );
    expect(terms.some((t) => /^esto/i.test(t))).toBe(false);
    expect(defs.find((d) => d.termino === 'Costo fijo')?.definicion).toMatch(/^es el que no cambia/);
  });

  it('measures how much a text belongs to a subject', () => {
    const own = subjectRelevance(PDF_TEXT, materia, temario);
    const other = subjectRelevance(
      'La fotosíntesis transforma la energía luminosa en energía química en las plantas verdes.',
      materia,
      temario,
    );
    expect(own.puntaje).toBeGreaterThan(other.puntaje);
    expect(own.subtemas.length).toBeGreaterThan(0);
    expect(other.subtemas).toEqual([]);
  });

  it('counts personal data patterns', () => {
    expect(personalDataCounts('cédula 0102030405, tel. 099 123 4567, correo ana@example.com')).toEqual({
      cedulas: 1,
      telefonos: 1,
      correos: 1,
    });
    expect(personalDataCounts(PDF_TEXT)).toEqual({ cedulas: 0, telefonos: 0, correos: 0 });
  });
});

describe('exámenes y tarjetas', () => {
  const ejercicios = content.ejercicios;

  it('builds verified multiple-choice and numeric questions from ÁBACO content', () => {
    const qs = abacoQuestions(materia, temario, ejercicios, seededRng(1));
    expect(qs.length).toBeGreaterThan(30);
    for (const q of qs) {
      if (q.tipo === 'opcion') {
        expect(q.opciones).toHaveLength(4);
        expect(new Set(q.opciones).size).toBe(4);
        expect(q.correcta).toBeGreaterThanOrEqual(0);
        expect(q.ruta).toMatch(/^\/materia\/contabilidad-costos\/tema\//);
      } else {
        expect(Number.isFinite(q.respuesta)).toBe(true);
      }
    }
    // An example question never shows the name of the subtopic it asks for.
    for (const q of qs.filter((x) => x.id.startsWith('ej:'))) {
      const answer = (q as Extract<Question, { tipo: 'opcion' }>).opciones[
        (q as Extract<Question, { tipo: 'opcion' }>).correcta
      ]!;
      expect(q.contexto?.toLowerCase()).not.toContain(answer.toLowerCase());
    }
    expect(qs.some((q) => q.tipo === 'numero')).toBe(true);
  });

  it('every subject of the catalog can produce an exam of 20 questions from its own content', () => {
    for (const m of content.materias) {
      const t = content.temarios.find((x) => x.data.materia === m.id)!.data;
      const qs = abacoQuestions(m, t, ejercicios, seededRng(3));
      const subtopics = t.temas.reduce((n, tema) => n + tema.subtemas.length, 0);
      expect(qs.length, m.id).toBeGreaterThanOrEqual(Math.min(20, subtopics * 2));
    }
  });

  it('builds questions from the definitions of a PDF', () => {
    const defs = findDefinitions(splitSentences(PDF_TEXT));
    const qs = pdfQuestions(defs, 'apuntes.pdf', seededRng(2));
    expect(qs.length).toBe(defs.length);
    for (const q of qs) {
      expect(q.origen).toBe('pdf');
      expect(q.tipo === 'opcion' && q.opciones[q.correcta]).toBeTruthy();
    }
  });

  it('mixes sources, keeps the requested size and is reproducible with a seed', () => {
    const pdf = { nombre: 'apuntes.pdf', definiciones: findDefinitions(splitSentences(PDF_TEXT)) };
    const a = buildExam({
      materia,
      temario,
      ejercicios,
      pdf,
      fuente: 'mixto',
      cantidad: 10,
      rng: seededRng(7),
    });
    const b = buildExam({
      materia,
      temario,
      ejercicios,
      pdf,
      fuente: 'mixto',
      cantidad: 10,
      rng: seededRng(7),
    });
    expect(a).toHaveLength(10);
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    expect(a.some((q) => q.origen === 'pdf')).toBe(true);
    expect(a.some((q) => q.origen === 'abaco')).toBe(true);
    const onlyPdf = buildExam({
      materia,
      temario,
      ejercicios,
      pdf,
      fuente: 'pdf',
      cantidad: 20,
      rng: seededRng(7),
    });
    expect(onlyPdf.every((q) => q.origen === 'pdf')).toBe(true);
  });

  it('grades choices and numbers written the Ecuadorian way', () => {
    expect(parseAnswerNumber('3.189,91')).toBe(3189.91);
    expect(parseAnswerNumber('733,44')).toBe(733.44);
    expect(parseAnswerNumber('180')).toBe(180);
    expect(parseAnswerNumber('abc')).toBeNull();
    const num: Question = {
      id: 'n',
      tipo: 'numero',
      enunciado: '',
      respuesta: 180,
      tolerancia: 0.005,
      unidad: 'u',
      explicacion: '',
      origen: 'abaco',
    };
    const opt: Question = {
      id: 'o',
      tipo: 'opcion',
      enunciado: '',
      opciones: ['a', 'b', 'c', 'd'],
      correcta: 2,
      explicacion: '',
      origen: 'abaco',
    };
    expect(isCorrect(num, '180')).toBe(true);
    expect(isCorrect(num, '181')).toBe(false);
    expect(isCorrect(opt, 2)).toBe(true);
    expect(gradeExam([num, opt], { n: '180', o: 1 })).toMatchObject({
      correctas: 1,
      total: 2,
      porcentaje: 50,
    });
  });

  it('creates one card per subtopic and one per PDF definition', () => {
    const defs = findDefinitions(splitSentences(PDF_TEXT));
    const cards = studyCards(materia, temario, { id: 'p1', nombre: 'apuntes.pdf', definiciones: defs });
    const subtopics = temario.temas.reduce((n, t) => n + t.subtemas.length, 0);
    expect(cards.filter((c) => c.origen === 'subtema')).toHaveLength(subtopics);
    expect(cards.filter((c) => c.origen === 'pdf')).toHaveLength(defs.length);
    expect(cards.every((c) => c.reverso.length <= 2000 && c.frente.length <= 500)).toBe(true);
    expect(cards.find((c) => c.origen === 'subtema')?.reverso).toContain('Ejemplo:');
  });
});

describe('definiciones: frases que no son definiciones', () => {
  it('ignores conditional clauses and demonstratives', () => {
    const text = [
      'Si ese aporte es pequeño, hace falta vender muchas unidades para no perder dinero en el mes.',
      'Este método es útil cuando los productos usan los recursos de forma muy distinta entre sí.',
      'Cuando la empresa crece es necesario revisar la estructura de costos de cada línea.',
      'El capital de trabajo es la diferencia entre el activo corriente y el pasivo corriente de la empresa.',
    ].join(' ');
    expect(findDefinitions(splitSentences(text)).map((d) => d.termino)).toEqual(['Capital de trabajo']);
  });
});
