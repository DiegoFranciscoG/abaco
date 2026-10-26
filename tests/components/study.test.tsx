import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDbForTesting, type AbacoDB } from '../../src/data/db';
import StudyPage from '../../src/features/study/StudyPage';
import { SUGGESTION_STORAGE_KEY } from '../../src/features/suggestions/limits';
import { freshDb, renderRoute } from './render';

const PDF_TEXT = [
  'Apuntes de contabilidad de costos para el examen parcial del curso.',
  'El costo variable es aquel que cambia en proporción al volumen producido en el período.',
  'El costo fijo es el que no cambia dentro del rango relevante de actividad de la empresa.',
  'El margen de contribución es la diferencia entre el precio de venta y el costo variable unitario.',
  'El punto de equilibrio es el volumen de ventas en el que la utilidad de la empresa es igual a cero.',
  'La razón de margen de contribución se define como el margen unitario dividido para el precio de venta.',
  'El costeo por procesos es un sistema que acumula costos por departamento y los reparte entre unidades iguales.',
]
  .join('\n')
  .repeat(3);

const extract = vi.hoisted(() => vi.fn());
vi.mock('../../src/features/study/pdf-extract', async (original) => ({
  ...(await original<typeof import('../../src/features/study/pdf-extract')>()),
  extractPdfText: extract,
}));
const openMailApp = vi.hoisted(() => vi.fn());
vi.mock('../../src/features/suggestions/open-mail', () => ({ openMailApp }));

let db: AbacoDB;
beforeEach(() => {
  db = freshDb();
  localStorage.removeItem(SUGGESTION_STORAGE_KEY);
  extract.mockReset();
  extract.mockResolvedValue({ paginas: 3, texto: PDF_TEXT });
  openMailApp.mockClear();
});
afterEach(() => {
  db.close();
  setDbForTesting(null);
});

const route = () =>
  renderRoute('/estudiar?materia=contabilidad-costos', [{ path: '/estudiar', element: <StudyPage /> }]);
const pdfFile = () => new File(['%PDF-1.7 fake'], 'apuntes-costos.pdf', { type: 'application/pdf' });

async function uploadPdf(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('tab', { name: /Mis PDF/ }));
  await user.upload(screen.getByLabelText('Agregar un PDF'), pdfFile());
  return within(await screen.findByRole('list', { name: 'PDF guardados' }));
}

describe('área de estudio', () => {
  it('reviews theory and a worked example of every subtopic of the chosen subject', async () => {
    const user = userEvent.setup();
    route();
    expect(await screen.findByLabelText('Materia')).toHaveValue('contabilidad-costos');
    await user.click(await screen.findByRole('button', { name: /Costo–volumen–utilidad/ }));
    expect(screen.getAllByText('Teoría.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ejemplo.').length).toBeGreaterThan(0);
    expect(screen.getByText(/USD 4\.500 al mes/)).toBeInTheDocument();
  });

  it('reads a PDF on the device and keeps only its text', async () => {
    const user = userEvent.setup();
    route();
    const list = await uploadPdf(user);
    expect(list.getByText('apuntes-costos.pdf')).toBeInTheDocument();
    expect(list.getByText(/definiciones encontradas/)).toBeInTheDocument();
    const stored = await db.pdfs.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      nombre: 'apuntes-costos.pdf',
      materiaId: 'contabilidad-costos',
      paginas: 3,
    });
    expect(Object.keys(stored[0]!)).not.toContain('archivo');
  });

  it('rejects a scanned PDF without text', async () => {
    extract.mockResolvedValue({ paginas: 2, texto: '   ' });
    const user = userEvent.setup();
    route();
    await user.click(await screen.findByRole('tab', { name: /Mis PDF/ }));
    await user.upload(screen.getByLabelText('Agregar un PDF'), pdfFile());
    expect(await screen.findByText(/casi no tiene texto/)).toBeInTheDocument();
    expect(await db.pdfs.count()).toBe(0);
  });

  it('builds a mixed exam, grades it and saves the result', async () => {
    const user = userEvent.setup();
    route();
    await uploadPdf(user);
    await user.click(screen.getByRole('tab', { name: 'Examen' }));
    await user.click(screen.getByLabelText('Mezclado'));
    await user.click(screen.getByLabelText('5'));
    await user.click(screen.getByRole('button', { name: /Empezar examen/ }));
    const questions = await screen.findAllByRole('group', { name: /Pregunta \d/ });
    expect(questions).toHaveLength(5);
    await user.click(screen.getByRole('button', { name: /Calificar/ }));
    expect(await screen.findByText(/de 5 correctas/)).toBeInTheDocument();
    await waitFor(async () => expect(await db.examenes.count()).toBe(1));
    expect(await screen.findByText(/Tus últimos exámenes/)).toBeInTheDocument();
  }, 45_000);

  it('creates flashcards from the subject and from the PDF definitions', async () => {
    const user = userEvent.setup();
    route();
    await uploadPdf(user);
    await user.click(screen.getByRole('tab', { name: 'Memorizar' }));
    await user.click(screen.getByRole('button', { name: /Crear tarjetas de Contabilidad de costos/ }));
    await waitFor(async () => expect(await db.tarjetas.count()).toBeGreaterThan(13));
    expect(
      await db.tarjetas.where('mazo').startsWith('Contabilidad de costos ·').count(),
    ).toBeGreaterThanOrEqual(4);
  }, 45_000);

  it('checks the PDF and the declarations before preparing the email to the author', async () => {
    const user = userEvent.setup();
    route();
    const list = await uploadPdf(user);
    await user.click(list.getByRole('button', { name: /Enviar al autor/ }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Enviar el PDF al autor' }));
    await user.click(dialog.getByRole('button', { name: /Enviar al autor/ }));
    expect(dialog.getByText(/Cuenta en una o dos frases/)).toBeInTheDocument();
    expect(dialog.getByText(/Confirma que eres autor/)).toBeInTheDocument();
    expect(openMailApp).not.toHaveBeenCalled();

    await user.type(
      dialog.getByLabelText(/Qué contiene/),
      'Resumen propio del capítulo de costo volumen utilidad con definiciones para el examen.',
    );
    await user.click(dialog.getByLabelText(/Soy autor del documento/));
    await user.click(dialog.getByLabelText(/Acepto que/));
    await user.click(dialog.getByRole('button', { name: /Enviar al autor/ }));
    await waitFor(() => expect(openMailApp).toHaveBeenCalledTimes(1));
    const href = decodeURIComponent(openMailApp.mock.calls[0]?.[0] as string);
    expect(href).toMatch(
      /^mailto:diegofgz2004@gmail\.com\?subject=\[ÁBACO\] PDF para Contabilidad de costos/,
    );
    expect(href).toContain('Adjunta el archivo «apuntes-costos.pdf»');
    expect(
      await screen.findByRole('heading', { name: 'Visita mis otras redes y mis otros trabajos' }),
    ).toBeInTheDocument();
  }, 45_000);

  it('blocks sharing a PDF with personal data', async () => {
    extract.mockResolvedValue({
      paginas: 1,
      texto: `${PDF_TEXT}\nContacto del autor: 0991234567, cédula 0102030405.`,
    });
    const user = userEvent.setup();
    route();
    const list = await uploadPdf(user);
    await user.click(list.getByRole('button', { name: /Enviar al autor/ }));
    const dialog = within(await screen.findByRole('dialog'));
    await user.type(
      dialog.getByLabelText(/Qué contiene/),
      'Resumen propio del capítulo de costo volumen utilidad con definiciones para el examen.',
    );
    await user.click(dialog.getByLabelText(/Soy autor del documento/));
    await user.click(dialog.getByLabelText(/Acepto que/));
    await user.click(dialog.getByRole('button', { name: /Enviar al autor/ }));
    expect(await dialog.findByText(/parece contener datos personales/)).toBeInTheDocument();
    expect(openMailApp).not.toHaveBeenCalled();
  }, 45_000);

  it('failed exam questions go to the error review, can be retried and are reviewed with spaced repetition', async () => {
    const user = userEvent.setup();
    route();
    await user.click(await screen.findByRole('tab', { name: 'Examen' }));
    await user.click(await screen.findByText('5'));
    await user.click(screen.getByRole('button', { name: /Empezar examen/ }));
    await user.click(await screen.findByRole('button', { name: /Calificar/ }));
    expect(
      await screen.findByText(/Las 5 preguntas que fallaste quedaron en tu repaso de errores/),
    ).toBeInTheDocument();
    await waitFor(async () => expect(await db.errores.count()).toBe(5));
    expect(await db.uso.count()).toBe(1);

    // «Repasar solo lo que fallé» starts a short exam with the same five questions.
    await user.click(screen.getByRole('button', { name: /Repasar solo lo que fallé/ }));
    expect(await screen.findAllByRole('group', { name: /Pregunta \d/ })).toHaveLength(5);

    await user.click(screen.getByRole('tab', { name: /Errores/ }));
    expect(await screen.findByRole('button', { name: 'Repasar ahora (5)' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Repasar ahora (5)' }));
    expect(await screen.findByText('Pregunta 1 de 5')).toBeInTheDocument();
    // Answer the first question right: the row moves to its next review in 1 day.
    const legend = screen.getByRole('group', { name: 'Pregunta 1' });
    const row = (await db.errores.toArray()).find((e) =>
      e.pregunta.tipo === 'opcion'
        ? e.pregunta.opciones.every((o) => within(legend).queryByLabelText(o) !== null)
        : within(legend).queryByText(e.pregunta.enunciado) !== null,
    );
    expect(row).toBeDefined();
    if (row!.pregunta.tipo === 'opcion') {
      await user.click(within(legend).getByLabelText(row!.pregunta.opciones[row!.pregunta.correcta]!));
    } else {
      await user.type(within(legend).getByRole('textbox'), String(row!.pregunta.respuesta).replace('.', ','));
    }
    await user.click(screen.getByRole('button', { name: /Comprobar/ }));
    expect(await within(legend).findByText('Correcto')).toBeInTheDocument();
    await waitFor(async () =>
      expect(await db.errores.get(row!.id)).toMatchObject({ aciertos: 1, repeticiones: 1 }),
    );
    expect(screen.getByRole('button', { name: /Siguiente pregunta/ })).toBeInTheDocument();
  }, 60_000);

  it('searches every saved PDF without caring about accents and opens the match in its context', async () => {
    const user = userEvent.setup();
    extract.mockResolvedValue({
      paginas: 2,
      texto: `${PDF_TEXT}\n\fSegunda página: el MARGEN DE CONTRIBUCIÓN unitario.`,
    });
    route();
    await uploadPdf(user);
    await user.type(screen.getByRole('searchbox'), 'margen de contribucion');
    const results = await screen.findAllByRole('button', { name: /apuntes-costos\.pdf/ });
    expect(results.length).toBeGreaterThan(1);
    expect(screen.getByText(/coincidencias en tus PDF/)).toBeInTheDocument();
    const last = results[results.length - 1]!;
    expect(last).toHaveTextContent('página 2');
    await user.click(last);
    const reader = await screen.findByRole('region', { name: 'Texto de «apuntes-costos.pdf»' });
    expect(within(reader).getByText('MARGEN DE CONTRIBUCIÓN')).toBeInTheDocument();
    expect(within(reader).getByText(/página 2/)).toBeInTheDocument();
  }, 45_000);
});
