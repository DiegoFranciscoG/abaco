import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDbForTesting, type AbacoDB } from '../../src/data/db';
import { listNotes, listStars } from '../../src/data/repositories';
import { computeSheet } from '../../src/domain/sheet/sheet';
import CareerPage from '../../src/features/careers/CareerPage';
import ExercisePage from '../../src/features/practice/ExercisePage';
import FormulaPage from '../../src/features/formulas/FormulaPage';
import { Grid } from '../../src/features/lab/Grid';
import { NotesPanel } from '../../src/features/me/NotesPanel';
import SettingsPage from '../../src/features/settings/SettingsPage';
import { Accordion, CopyButton, StarButton, Tabs } from '../../src/ui/primitives';
import { freshDb, renderRoute, renderWithProviders } from './render';

let db: AbacoDB;
beforeEach(() => {
  db = freshDb();
});
afterEach(async () => {
  db.close();
  setDbForTesting(null);
});

function GridHarness({ initial = {} }: { initial?: Record<string, string> }) {
  const [cells, setCells] = useState(initial);
  const [selected, setSelected] = useState('A1');
  return (
    <Grid
      cells={cells}
      results={computeSheet(cells, 'es')}
      formats={{}}
      locale="es"
      selected={selected}
      onSelect={setSelected}
      onCommit={(key, raw) => setCells((c) => ({ ...c, [key]: raw }))}
    />
  );
}

describe('Grid (laboratorio)', () => {
  it('computes a Spanish formula typed in the formula bar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GridHarness initial={{ A1: '100', A2: '250' }} />);
    await user.click(screen.getByRole('gridcell', { name: 'A3' }));
    const bar = screen.getByLabelText('Contenido de la celda A3');
    await user.click(bar);
    await user.type(bar, '=SUMA(A1:A2)*10%{Enter}');
    expect(screen.getByRole('gridcell', { name: 'A3: 35' })).toBeInTheDocument();
  });

  it('suggests functions in Spanish while typing and inserts them with Tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GridHarness />);
    const bar = screen.getByLabelText('Contenido de la celda A1');
    await user.click(bar);
    await user.type(bar, '=VN');
    const list = screen.getByRole('listbox', { name: 'Funciones sugeridas' });
    expect(within(list).getAllByRole('option')[0]).toHaveTextContent('VNA');
    await user.keyboard('{Tab}');
    expect(bar).toHaveValue('=VNA(');
  });

  it('shows the Spanish error label and a hint', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GridHarness initial={{ A1: '=1/0' }} />);
    expect(screen.getByRole('gridcell', { name: 'A1: #¡DIV/0!' })).toBeInTheDocument();
    await user.click(screen.getByRole('gridcell', { name: 'A1: #¡DIV/0!' }));
    expect(screen.getByText(/división entre cero/)).toBeInTheDocument();
  });

  it('moves with the arrow keys and types directly into a cell', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GridHarness />);
    const grid = screen.getByRole('grid', { name: 'Hoja de cálculo' });
    grid.focus();
    await user.keyboard('{ArrowDown}{ArrowRight}');
    expect(screen.getByLabelText('Celda seleccionada')).toHaveTextContent('B2');
    await user.keyboard('7{Enter}');
    expect(screen.getByRole('gridcell', { name: 'B2: 7' })).toBeInTheDocument();
  });
});

describe('NotesPanel', () => {
  it('saves a note on this device and lists it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotesPanel refTipo="formula" refId="van" />);
    expect(await screen.findByText('Aún no tienes apuntes aquí')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Contenido del apunte'), 'VNA descuenta desde el período 1');
    await user.type(screen.getByLabelText('Etiquetas'), 'parcial, excel');
    await user.click(screen.getByRole('button', { name: 'Guardar apunte' }));
    expect(await screen.findByText('VNA descuenta desde el período 1')).toBeInTheDocument();
    expect(screen.getByText('#parcial')).toBeInTheDocument();
    expect(await listNotes({ refTipo: 'formula', refId: 'van' }, db)).toHaveLength(1);
  });

  it('keeps the save button disabled while the note is empty', () => {
    renderWithProviders(<NotesPanel refTipo="libre" refId="x" />);
    expect(screen.getByRole('button', { name: 'Guardar apunte' })).toBeDisabled();
  });
});

describe('primitives', () => {
  it('Accordion toggles aria-expanded', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Accordion title="¿Qué es?">Contenido</Accordion>);
    const button = screen.getByRole('button', { name: '¿Qué es?' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText('Contenido')).toBeInTheDocument();
  });

  it('StarButton marks and unmarks', async () => {
    const user = userEvent.setup();
    renderWithProviders(<StarButton star={{ tipo: 'formula', refId: 'tir', titulo: 'TIR' }} />);
    const button = await screen.findByRole('button', { name: 'Marcar con estrella TIR' });
    await user.click(button);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Quitar estrella de TIR' })).toHaveAttribute('aria-pressed', 'true'));
    expect(await listStars(db)).toHaveLength(1);
  });

  it('CopyButton copies to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderWithProviders(<CopyButton text="=VA(1%;12;-100)" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Copiar/ }));
    });
    expect(writeText).toHaveBeenCalledWith('=VA(1%;12;-100)');
    expect(await screen.findByText('Copiado')).toBeInTheDocument();
  });

  it('Tabs report the selected tab', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<Tabs label="Secciones" value="a" onChange={onChange} tabs={[{ id: 'a', label: 'Uno' }, { id: 'b', label: 'Dos', count: 3 }]} />);
    expect(screen.getByRole('tab', { name: 'Uno' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: /Dos/ }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('pages', () => {
  it('ExercisePage accepts a correct answer written with a decimal comma', async () => {
    const user = userEvent.setup();
    renderRoute('/practica/ej-ed-mediana', [{ path: '/practica/:ejercicioId', element: <ExercisePage /> }]);
    const input = await screen.findByLabelText(/Tu respuesta/);
    await user.type(input, '6,5');
    await user.click(screen.getByRole('button', { name: 'Comprobar' }));
    expect(await screen.findByText(/¡Correcto!/)).toBeInTheDocument();
  });

  it('ExercisePage reveals hints one at a time', async () => {
    const user = userEvent.setup();
    renderRoute('/practica/ej-cg-peps', [{ path: '/practica/:ejercicioId', element: <ExercisePage /> }]);
    await user.click(await screen.findByRole('button', { name: /Una pista más/ }));
    expect(screen.getByText('PEPS: primero salen las más antiguas.')).toBeInTheDocument();
    expect(screen.queryByText(/Del segundo lote solo tomas/)).not.toBeInTheDocument();
  });

  it('FormulaPage recalculates with the student data', async () => {
    const user = userEvent.setup();
    renderRoute('/formulas/punto-equilibrio-unidades', [{ path: '/formulas/:formulaId', element: <FormulaPage /> }]);
    expect(await screen.findByRole('heading', { name: /Punto de equilibrio en unidades/ })).toBeInTheDocument();
    const fixed = screen.getByLabelText(/Costos fijos del período/);
    await user.clear(fixed);
    await user.type(fixed, '20000');
    expect(await screen.findByText('2.000')).toBeInTheDocument();
  });

  it('CareerPage lists the cycles and flags the published discrepancy', async () => {
    renderRoute('/carrera/ucacue-contabilidad-auditoria', [{ path: '/carrera/:carreraId', element: <CareerPage /> }]);
    expect(await screen.findByRole('heading', { name: 'Ciclo 1' })).toBeInTheDocument();
    expect(screen.getByText(/declara/)).toHaveTextContent('40');
    expect(screen.getAllByRole('heading', { name: /Ciclo \d/ })).toHaveLength(8);
  });

  it('SettingsPage only allows wiping after typing BORRAR', async () => {
    const user = userEvent.setup();
    renderRoute('/ajustes', [{ path: '/ajustes', element: <SettingsPage /> }]);
    const wipe = await screen.findByRole('button', { name: 'Borrar todo' });
    expect(wipe).toBeDisabled();
    await user.type(screen.getByLabelText('Escribe BORRAR para confirmar'), 'borrar');
    expect(wipe).toBeEnabled();
  });
});
