import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import PracticePage from '../../src/features/practice/PracticePage';
import TeacherPage from '../../src/features/teacher/TeacherPage';
import { freshDb, renderRoute } from './render';

beforeEach(() => {
  freshDb();
});

describe('modo profesor', () => {
  it('the student sheet has no answers and the answer key has them, with the procedure', async () => {
    const user = userEvent.setup();
    renderRoute('/profesor?materia=contabilidad-general', [{ path: '/profesor', element: <TeacherPage /> }]);
    const exercise = await screen.findByRole('checkbox', {
      name: /activos por USD 52\.000 y pasivos por USD 19\.300/,
    });
    await user.click(exercise);
    expect(screen.getByText('1 de 22 elegidos')).toBeInTheDocument();

    const sheet = screen.getByRole('article', { name: 'Hoja del estudiante' });
    expect(within(sheet).getByText(/activos por USD 52\.000/)).toBeInTheDocument();
    expect(within(sheet).getByText('Respuesta (USD): ____________________')).toBeInTheDocument();
    expect(within(sheet).queryByText(/32\.700/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Solucionario' }));
    const key = screen.getByRole('article', { name: 'Solucionario' });
    expect(within(key).getByText('32.700 USD')).toBeInTheDocument();
    expect(within(key).getByText('Pt = 52.000 − 19.300 = 32.700,00')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Probar el enlace' })).toHaveAttribute(
      'href',
      '/practica?titulo=Taller+de+Contabilidad+general&ejercicios=ej-cg-patrimonio',
    );
  });

  it('a student who opens the link sees only the worksheet, in the teacher’s order', async () => {
    renderRoute('/practica?titulo=Taller+1&ejercicios=ej-cg-pasivo,no-existe,ej-cg-patrimonio', [
      { path: '/practica', element: <PracticePage /> },
    ]);
    expect(await screen.findByRole('heading', { name: 'Taller 1' })).toBeInTheDocument();
    expect(screen.getByText('0/2')).toBeInTheDocument();
    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/practica/'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/practica/ej-cg-pasivo',
      '/practica/ej-cg-patrimonio',
    ]);
  });
});
