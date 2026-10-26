import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDbForTesting, type AbacoDB } from '../../src/data/db';
import { getProfile, listNotes, listStars } from '../../src/data/repositories';
import { listDocuments, listJournals } from '../../src/data/tool-repositories';
import { getTool } from '../../src/domain/tools/catalog';
import MateriasPage from '../../src/features/subjects/MateriasPage';
import SubjectPage from '../../src/features/subjects/SubjectPage';
import TopicPage from '../../src/features/subjects/TopicPage';
import EditorTool from '../../src/features/tools/editor/EditorTool';
import { MarkdownView } from '../../src/features/tools/editor/MarkdownView';
import JournalTool from '../../src/features/tools/journal/JournalTool';
import PayrollTool from '../../src/features/tools/payroll/PayrollTool';
import TaxTool from '../../src/features/tools/tax/TaxTool';
import LegalPage from '../../src/features/legal/LegalPage';
import { parseMarkdown } from '../../src/domain/tools/markdown';
import { computeSheet } from '../../src/domain/sheet/sheet';
import ExercisePage from '../../src/features/practice/ExercisePage';
import FormulaPage from '../../src/features/formulas/FormulaPage';
import { Grid } from '../../src/features/lab/Grid';
import { NotesPanel } from '../../src/features/me/NotesPanel';
import SettingsPage from '../../src/features/settings/SettingsPage';
import { Accordion, CopyButton, Tabs } from '../../src/ui/primitives';
import { StarButton } from '../../src/ui/StarButton';
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
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Quitar estrella de TIR' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
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
    renderWithProviders(
      <Tabs
        label="Secciones"
        value="a"
        onChange={onChange}
        tabs={[
          { id: 'a', label: 'Uno' },
          { id: 'b', label: 'Dos', count: 3 },
        ]}
      />,
    );
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
    renderRoute('/formulas/punto-equilibrio-unidades', [
      { path: '/formulas/:formulaId', element: <FormulaPage /> },
    ]);
    expect(
      await screen.findByRole('heading', { name: /Punto de equilibrio en unidades/ }),
    ).toBeInTheDocument();
    const fixed = await screen.findByLabelText(/Costos fijos del período/);
    await user.clear(fixed);
    await user.type(fixed, '20000');
    expect(await screen.findByText('2.000')).toBeInTheDocument();
  });

  it('MateriasPage filters the catalog and marks subjects as mine', async () => {
    const user = userEvent.setup();
    renderRoute('/materias', [{ path: '/materias', element: <MateriasPage /> }]);
    expect(await screen.findAllByRole('link', { name: /Microeconomía/ })).not.toHaveLength(0);
    await user.type(screen.getByLabelText('Filtrar materias'), 'tributacion');
    expect(screen.getByRole('link', { name: /^Tributación/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Microeconomía/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'La llevo: Tributación' }));
    await waitFor(async () => expect((await getProfile(db)).materias).toEqual(['tributacion']));
  });

  it('MateriasPage organizes subjects by career and cycle and remembers the choice on this device', async () => {
    const user = userEvent.setup();
    renderRoute('/materias', [{ path: '/materias', element: <MateriasPage /> }]);
    await user.click(
      within(await screen.findByRole('group', { name: 'Carrera' })).getByRole('button', { name: 'Economía' }),
    );
    await user.click(screen.getByRole('button', { name: '3.º ciclo' }));
    const cycle = screen.getByRole('region', { name: '3.º ciclo' });
    expect(within(cycle).getByRole('link', { name: /^Macroeconomía/ })).toHaveAttribute(
      'href',
      '/materia/macroeconomia',
    );
    expect(within(cycle).getByRole('link', { name: /^Matemática financiera/ })).toBeInTheDocument();
    expect(within(cycle).queryByRole('link', { name: /^Microeconomía/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Ciclo habitual calculado con 2 planes/)).toBeInTheDocument();
    await waitFor(async () => expect(await getProfile(db)).toMatchObject({ carrera: 'economia', ciclo: 3 }));
    await user.click(screen.getByRole('button', { name: /Agregar las de este ciclo/ }));
    await waitFor(async () => expect((await getProfile(db)).materias).toHaveLength(4));
  });

  it('a shared link opens a career and cycle directly', async () => {
    renderRoute('/materias?carrera=contabilidad-auditoria&ciclo=2', [
      { path: '/materias', element: <MateriasPage /> },
    ]);
    const cycle = await screen.findByRole('region', { name: '2.º ciclo' });
    expect(within(cycle).getByRole('link', { name: /^Tributación/ })).toBeInTheDocument();
    expect(within(cycle).getByRole('link', { name: /^Legislación laboral/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contabilidad y auditoría' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('SubjectPage shows the syllabus, the tools and the sources of the subject', async () => {
    renderRoute('/materia/legislacion-laboral', [{ path: '/materia/:materiaId', element: <SubjectPage /> }]);
    expect(await screen.findByRole('heading', { name: /Legislación laboral/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /El contrato de trabajo/ })).toHaveAttribute(
      'href',
      '/materia/legislacion-laboral/tema/ll-contrato',
    );
    expect(screen.getByRole('link', { name: /Rol de pagos/ })).toHaveAttribute(
      'href',
      '/herramientas/rol-pagos',
    );
    expect(screen.getByRole('link', { name: /Codificación 2005-017/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\//),
    );
    expect(screen.getByRole('link', { name: 'Contabilidad y auditoría · 2.º ciclo' })).toHaveAttribute(
      'href',
      '/materias?carrera=contabilidad-auditoria&ciclo=2',
    );
  });

  it('TopicPage opens the requested subtopic and cites its source', async () => {
    renderRoute('/materia/tributacion/tema/tr-renta?s=tr-renta-personas', [
      { path: '/materia/:materiaId/tema/:temaId', element: <TopicPage /> },
    ]);
    expect(await screen.findByRole('heading', { name: /Impuesto a la renta/ })).toBeInTheDocument();
    expect(screen.getByText(/USD 12 208 en 2026/)).toBeVisible();
    expect(screen.getAllByText(/Fuente:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Teoría').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ejemplo').length).toBeGreaterThan(0);
  });

  it('an unknown subject shows the not-found page', async () => {
    renderRoute('/materia/no-existe', [{ path: '/materia/:materiaId', element: <SubjectPage /> }]);
    expect(await screen.findByRole('heading', { name: 'Esta página no existe' })).toBeInTheDocument();
  });

  it('LegalPage renders the privacy policy with the external services table', async () => {
    renderRoute('/legal/privacidad', [{ path: '/legal/:docId', element: <LegalPage /> }]);
    expect(
      await screen.findByRole('heading', { name: 'Política de privacidad', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Servicios externos/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'www.spdp.gob.ec/' })).toHaveAttribute(
      'href',
      'https://www.spdp.gob.ec/',
    );
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

describe('study tools', () => {
  it('TaxTool computes IVA from a base and splits a final price', async () => {
    const user = userEvent.setup();
    renderRoute('/herramientas/impuestos', [
      { path: '/herramientas/:toolId', element: <TaxTool tool={getTool('impuestos')!} /> },
    ]);
    const amount = await screen.findByLabelText(/Precio sin IVA/);
    await user.clear(amount);
    await user.type(amount, '200');
    // 15 % of 200 = 30
    expect(screen.getAllByText(/30[,.]00/).length).toBeGreaterThan(0);
    await user.click(screen.getByLabelText('El precio ya incluye IVA'));
    await user.clear(screen.getByLabelText(/Precio final/));
    await user.type(screen.getByLabelText(/Precio final/), '115');
    expect(screen.getAllByText(/100[,.]00/).length).toBeGreaterThan(0);
  });

  it('PayrollTool shows net pay with the IESS personal contribution', async () => {
    const user = userEvent.setup();
    renderRoute('/herramientas/rol-pagos', [
      { path: '/herramientas/:toolId', element: <PayrollTool tool={getTool('rol-pagos')!} /> },
    ]);
    const salary = await screen.findByLabelText(/Sueldo mensual/);
    await user.clear(salary);
    await user.type(salary, '1000');
    // 1000 − 9.45 % = 905.50
    expect(await screen.findAllByText(/905[,.]50/)).not.toHaveLength(0);
    expect(screen.getAllByText(/Código del Trabajo, art\. 113/).length).toBeGreaterThan(0);
  });

  it('JournalTool only records balanced entries and builds the trial balance', async () => {
    const user = userEvent.setup();
    renderRoute('/herramientas/diario', [
      { path: '/herramientas/:toolId', element: <JournalTool tool={getTool('diario')!} /> },
    ]);
    await user.click(await screen.findByRole('button', { name: /Crear libro/ }));
    await waitFor(async () => expect(await listJournals(db)).toHaveLength(1));
    await user.type(await screen.findByLabelText('Cuenta de la línea 1'), 'Caja');
    await user.type(screen.getByLabelText('Debe de la línea 1'), '500');
    await user.type(screen.getByLabelText('Cuenta de la línea 2'), 'Capital');
    await user.selectOptions(screen.getByLabelText('Tipo de cuenta de la línea 2'), 'patrimonio');
    await user.type(screen.getByLabelText('Haber de la línea 2'), '400');
    expect(screen.getByRole('button', { name: /Registrar/ })).toBeDisabled();
    await user.clear(screen.getByLabelText('Haber de la línea 2'));
    await user.type(screen.getByLabelText('Haber de la línea 2'), '500');
    await user.click(screen.getByRole('button', { name: /Registrar/ }));
    await waitFor(async () => expect((await listJournals(db))[0]?.asientos).toHaveLength(1));
    await user.click(screen.getByRole('tab', { name: /Balance de comprobación/ }));
    expect(await screen.findByText(/El balance cuadra/)).toBeInTheDocument();
  });

  it('EditorTool creates a document from a template and autosaves it', async () => {
    const user = userEvent.setup();
    renderRoute('/herramientas/editor', [
      { path: '/herramientas/:toolId', element: <EditorTool tool={getTool('editor')!} /> },
    ]);
    await user.click(await screen.findByRole('button', { name: 'Informe académico' }));
    await waitFor(async () => expect(await listDocuments(db)).toHaveLength(1));
    expect(await screen.findByRole('heading', { name: '1. Introducción' })).toBeInTheDocument();
  });

  it('MarkdownView never turns student text into HTML (XSS payloads stay text)', () => {
    const payload = [
      '<img src=x onerror="window.__xss=1">',
      '<script>window.__xss=1</script>',
      '[clic](javascript:window.__xss=1)',
      '[clic2](data:text/html,<script>1</script>)',
      '**<b onmouseover=alert(1)>negrita</b>**',
    ].join('\n\n');
    const { container } = renderWithProviders(<MarkdownView blocks={parseMarkdown(payload)} />);
    expect(container.querySelector('script, img, b[onmouseover]')).toBeNull();
    expect(
      [...container.querySelectorAll('a')].every((a) => /^https?:/.test(a.getAttribute('href') ?? '')),
    ).toBe(true);
    expect(container.textContent).toContain('<script>window.__xss=1</script>');
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });
});
