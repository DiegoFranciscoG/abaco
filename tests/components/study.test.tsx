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
    expect(screen.getByText(/Tus últimos exámenes/)).toBeInTheDocument();
  });

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
  });

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
  });

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
  });
});
