import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AbacoDB } from '../../src/data/db';
import DeliverablePage from '../../src/features/deliverables/DeliverablePage';
import DeliverablesPage from '../../src/features/deliverables/DeliverablesPage';
import { freshDb, renderRoute } from './render';

const download = vi.hoisted(() => vi.fn());
vi.mock('../../src/ui/utils', async (original) => ({
  ...(await original<typeof import('../../src/ui/utils')>()),
  downloadFile: download,
}));

let db: AbacoDB;
beforeEach(() => {
  db = freshDb();
  download.mockReset();
});

const routes = [
  { path: '/entregables', element: <DeliverablesPage /> },
  { path: '/entregables/:entregableId', element: <DeliverablePage /> },
];

describe('motor de entregables', () => {
  it('lists the eight deliverables', async () => {
    renderRoute('/entregables', routes);
    expect(await screen.findByRole('heading', { name: 'Entregables paso a paso' })).toBeInTheDocument();
    for (const name of [
      'Libro diario, mayor y balance de comprobación',
      'Kardex de inventarios',
      'Rol de pagos',
      'Tabla de amortización',
    ]) {
      expect(screen.getByRole('link', { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it('solves the amortization table step by step, exports it and saves it to resume later', async () => {
    const user = userEvent.setup();
    renderRoute('/entregables/amortizacion', routes);
    expect(
      await screen.findByRole('heading', { name: 'Tabla de amortización', level: 1 }),
    ).toBeInTheDocument();
    // The example loads already solved: 10 000 at 15 % for 12 months.
    expect(
      screen.getByText('Cuota = P × i ÷ (1 − (1 + i)^−n) = 10.000 × 0,0125 ÷ (1 − 1,0125^−12) = 902,58'),
    ).toBeInTheDocument();
    const table = screen.getByRole('region', { name: /Tabla: Tabla de amortización, sistema francés/ });
    expect(within(table).getAllByRole('row')).toHaveLength(15);

    await user.selectOptions(screen.getByLabelText('Sistema'), 'aleman');
    expect(await screen.findByText('Capital = 10.000 ÷ 12 = 833,33')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Excel \(\.xlsx\)/ }));
    await waitFor(() => expect(download).toHaveBeenCalledTimes(1));
    const [name, bytes] = download.mock.calls[0]!;
    expect(name).toBe('abaco-amortizacion.xlsx');
    expect((bytes as Uint8Array).byteLength).toBeGreaterThan(1000);

    await user.click(screen.getByRole('button', { name: /^Guardar$/ }));
    await waitFor(async () => expect(await db.entregables.count()).toBe(1));
    const [row] = await db.entregables.toArray();
    expect(row).toMatchObject({ tipo: 'amortizacion', titulo: 'Préstamo de consumo' });
    expect((row!.entradas as { sistema: string }).sistema).toBe('aleman');
    await waitFor(async () => expect((await db.uso.toArray())[0]?.eventos.entregable ?? 0).toBe(1));
  }, 45_000);

  it('reopens a saved deliverable with its data', async () => {
    await db.entregables.put({
      id: 'e1',
      tipo: 'punto-equilibrio',
      titulo: 'Heladería',
      entradas: {
        producto: 'Heladería',
        precio: 15,
        costoVariable: 9.5,
        costosFijos: 10_000,
        ventasEsperadas: 0,
        utilidadObjetivo: 0,
      },
      creadoEn: '2026-10-26T10:00:00.000Z',
      actualizadoEn: '2026-10-26T10:00:00.000Z',
    });
    renderRoute('/entregables', routes);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('link', { name: /Heladería/ }));
    expect(await screen.findByText(/Se redondea hacia arriba: 1819 unidades/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
  }, 45_000);

  it('does not compute an unbalanced journal entry and says which one is wrong', async () => {
    const user = userEvent.setup();
    renderRoute('/entregables/libro-diario', routes);
    const haber = (await screen.findAllByLabelText('Haber'))[1]!;
    await user.clear(haber);
    await user.type(haber, '4000');
    expect(await screen.findByText('Revisa estos datos')).toBeInTheDocument();
    expect(screen.getByText(/Asiento 1:/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Excel/ })).not.toBeInTheDocument();
  }, 45_000);
});
