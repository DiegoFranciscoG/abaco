import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AbacoDB } from '../../src/data/db';
import { recordAttempt, updateProfile } from '../../src/data/repositories';
import { saveExam } from '../../src/data/study-repositories';
import MyPage from '../../src/features/me/MyPage';
import { freshDb, renderRoute } from './render';

let db: AbacoDB;
beforeEach(() => {
  db = freshDb();
});

const open = () => renderRoute('/mi-espacio?tab=avance', [{ path: '/mi-espacio', element: <MyPage /> }]);

describe('avance por malla', () => {
  it('invites the student to choose a career when the profile has none', async () => {
    open();
    expect(await screen.findByRole('link', { name: 'Elegir carrera' })).toHaveAttribute('href', '/materias');
  });

  it('colors the career map with what the student did, and says what ÁBACO does not cover yet', async () => {
    await updateProfile({ carrera: 'contabilidad-auditoria', ciclo: 1 }, db);
    await recordAttempt(
      { ejercicioId: 'ej-cg-patrimonio', respuesta: 32700, correcto: true, segundos: 40 },
      db,
    );
    await saveExam(
      { materiaId: 'etica-profesional', fuentes: 'abaco', total: 10, correctas: 9, segundos: 300 },
      db,
    );
    open();
    const map = await screen.findByRole('region', { name: /Tu malla: Contabilidad y auditoría/ });
    expect(within(map).getByText('1.º ciclo · tu ciclo')).toBeInTheDocument();
    const general = within(map).getByRole('link', { name: /Contabilidad general/ });
    expect(general).toHaveAttribute('href', '/materia/contabilidad-general');
    expect(within(general).getByText('En curso')).toBeInTheDocument();
    expect(within(general).getByText(/1\/22 ejercicios · sin examen/)).toBeInTheDocument();
    // An ethics exam of 90 % masters a subject that has no calculation exercises.
    expect(
      within(within(map).getByRole('link', { name: /Ética profesional/ })).getByText('Dominada'),
    ).toBeInTheDocument();
    expect(within(map).getAllByText('Aún no está en ÁBACO').length).toBeGreaterThan(0);
  });
});
