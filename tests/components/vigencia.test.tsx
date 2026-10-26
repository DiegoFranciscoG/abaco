import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTool } from '../../src/domain/tools/catalog';
import FormulaPage from '../../src/features/formulas/FormulaPage';
import TopicPage from '../../src/features/subjects/TopicPage';
import PayrollTool from '../../src/features/tools/payroll/PayrollTool';
import { VigenciaNote } from '../../src/ui/Vigencia';
import { freshDb, renderRoute, renderWithProviders } from './render';

beforeEach(() => {
  freshDb();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('validity of the normative figures in the interface', () => {
  it('labels each figure with the fiscal year it is in force', () => {
    renderWithProviders(<VigenciaNote cifras={['sbu', 'iess-aporte-personal']} today="2026-10-26" />);
    const list = screen.getByRole('list', { name: 'Cifras de la normativa usadas aquí' });
    expect(within(list).getAllByText(/vigente 2026/)).toHaveLength(2);
    expect(within(list).getByText('USD 482 al mes')).toBeInTheDocument();
    expect(screen.queryByText('Cifra por verificar')).not.toBeInTheDocument();
    expect(screen.getByText('Base legal y vigencia')).toBeInTheDocument();
    expect(screen.getByText(/Acuerdo Ministerial MDT-2025-195/)).toBeInTheDocument();
  });

  it('turns into a visible warning once the fiscal year is over', () => {
    renderWithProviders(<VigenciaNote cifras={['sbu']} today="2027-01-02" />);
    const note = screen.getByRole('note', { name: 'Cifras por verificar' });
    expect(within(note).getByText('Cifra por verificar')).toBeInTheDocument();
    expect(note).toHaveTextContent(
      'Salario básico unificado (USD 482 al mes): esta cifra corresponde al ejercicio 2026; verifica la vigente en',
    );
    expect(within(note).getByRole('link')).toHaveAttribute('href', expect.stringContaining('trabajo.gob.ec'));
    expect(screen.queryByText(/vigente 2026/)).not.toBeInTheDocument();
  });

  it('renders nothing for records without normative figures', () => {
    renderWithProviders(<VigenciaNote cifras={undefined} />);
    expect(
      screen.queryByRole('list', { name: 'Cifras de la normativa usadas aquí' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('a subtopic that uses the SBU shows its validity next to the theory', async () => {
    renderRoute('/materia/legislacion-laboral/tema/ll-jornada?s=ll-sbu', [
      { path: '/materia/:materiaId/tema/:temaId', element: <TopicPage /> },
    ]);
    expect((await screen.findAllByText(/USD 482 al mes/)).length).toBeGreaterThan(0);
  });

  it('the payroll tool shows the figures it calculates with', async () => {
    renderRoute('/herramientas/rol-pagos', [
      { path: '/herramientas/:toolId', element: <PayrollTool tool={getTool('rol-pagos')!} /> },
    ]);
    const list = await screen.findByRole('list', { name: 'Cifras de la normativa usadas aquí' });
    expect(within(list).getByText('9,45 % de la remuneración')).toBeInTheDocument();
    expect(within(list).getByText('11,15 % de la remuneración')).toBeInTheDocument();
  });

  it('in January 2027 a formula with the 2026 IVA rate loses its verified seal', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2027, 0, 5, 10));
    renderRoute('/formulas/iva-causado', [{ path: '/formulas/:formulaId', element: <FormulaPage /> }]);
    expect(await screen.findByRole('heading', { name: /IVA causado en una venta/ })).toBeInTheDocument();
    expect(screen.getAllByText('Cifra por verificar').length).toBeGreaterThan(0);
    expect(screen.queryByText('Verificado automáticamente')).not.toBeInTheDocument();
  });
});
