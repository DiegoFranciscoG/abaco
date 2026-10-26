import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AbacoDB } from '../../src/data/db';
import { getTool } from '../../src/domain/tools/catalog';
import StatementPage from '../../src/features/statement/StatementPage';
import GradesTool from '../../src/features/tools/grades/GradesTool';
import { freshDb, renderRoute } from './render';

let db: AbacoDB;
beforeEach(() => {
  db = freshDb();
});

describe('everyday tools', () => {
  it('the grade calculator tells how much is needed and saves the plan on the device', async () => {
    const user = userEvent.setup();
    renderRoute('/herramientas/notas', [
      { path: '/herramientas/:toolId', element: <GradesTool tool={getTool('notas')!} /> },
    ]);
    const names = await screen.findAllByRole('textbox', { name: /Componente \d/ });
    await user.type(names[0]!, 'Primer parcial');
    await user.type(screen.getByRole('textbox', { name: 'Peso del componente 1' }), '60');
    await user.type(screen.getByRole('textbox', { name: 'Nota del componente 1' }), '6');
    await user.type(names[1]!, 'Examen final');
    await user.type(screen.getByRole('textbox', { name: 'Peso del componente 2' }), '40');
    // 6 × 60 % = 3,6; (7 − 3,6) ÷ 40 % = 8,5.
    expect(await screen.findByText('8,5')).toBeInTheDocument();
    expect(
      screen.getByText('Promedio necesario en lo pendiente = (7 − 3,6) ÷ 40 % = 8,5'),
    ).toBeInTheDocument();
    await waitFor(async () => expect(await db.calificaciones.count()).toBe(1), { timeout: 3000 });
    expect((await db.calificaciones.toArray())[0]?.componentes).toHaveLength(2);
  }, 30_000);

  it('warns when the weights do not add up to 100 % instead of giving a number', async () => {
    const user = userEvent.setup();
    renderRoute('/herramientas/notas', [
      { path: '/herramientas/:toolId', element: <GradesTool tool={getTool('notas')!} /> },
    ]);
    await user.type(await screen.findByRole('textbox', { name: 'Peso del componente 1' }), '30');
    await user.type(screen.getByRole('textbox', { name: 'Peso del componente 2' }), '50');
    expect(await screen.findByText('Los pesos suman 80 %; tienen que sumar 100 %.')).toBeInTheDocument();
  }, 30_000);

  it('pega tu enunciado: names the topic and links to it, or says it is not sure', async () => {
    const user = userEvent.setup();
    renderRoute('/enunciado', [{ path: '/enunciado', element: <StatementPage /> }]);
    const box = await screen.findByRole('textbox', { name: 'Enunciado de tu deber' });
    await user.type(box, 'Elabore la tabla de amortización de un préstamo de 5000 a 12 meses');
    await user.click(screen.getByRole('button', { name: /¿Qué tema es\?/ }));
    expect(await screen.findByText('Es un ejercicio de este tema')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PAGO y tablas de amortización' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cuota fija (sistema francés)' })).toHaveAttribute(
      'href',
      '/materia/matematica-financiera/tema/mf-amortizacion?s=mf-cuota',
    );
    await user.clear(box);
    await user.type(box, 'Escribe un poema sobre la primavera');
    await user.click(screen.getByRole('button', { name: /¿Qué tema es\?/ }));
    expect(await screen.findByText('No estoy seguro de qué tema es')).toBeInTheDocument();
    await waitFor(async () => expect((await db.uso.toArray())[0]?.eventos.enunciado).toBe(2));
  }, 30_000);
});
