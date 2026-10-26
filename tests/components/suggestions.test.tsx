import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDbForTesting, type AbacoDB } from '../../src/data/db';
import SuggestionsPage from '../../src/features/suggestions/SuggestionsPage';
import { SUGGESTION_STORAGE_KEY } from '../../src/features/suggestions/limits';
import { freshDb, renderRoute } from './render';

const openMailApp = vi.hoisted(() => vi.fn());
vi.mock('../../src/features/suggestions/open-mail', () => ({ openMailApp }));

let db: AbacoDB;
beforeEach(() => {
  db = freshDb();
  localStorage.removeItem(SUGGESTION_STORAGE_KEY);
  openMailApp.mockClear();
});
afterEach(() => {
  db.close();
  setDbForTesting(null);
});

const route = (path = '/sugerencias') => renderRoute(path, [{ path: '/sugerencias', element: <SuggestionsPage /> }]);

describe('buzón de sugerencias', () => {
  it('explains every problem next to its field and opens nothing', async () => {
    const user = userEvent.setup();
    route();
    await user.type(await screen.findByLabelText('Tu sugerencia *'), 'asdf qwer zxcv asdf qwer zxcv asdf qwer zxcv');
    await user.click(screen.getByRole('button', { name: 'Enviar sugerencia' }));
    expect(screen.getByText('Elige de qué trata tu sugerencia.')).toBeInTheDocument();
    expect(screen.getByText(/No logro entender el mensaje/)).toBeInTheDocument();
    expect(screen.getByText(/acepta que el titular reciba/)).toBeInTheDocument();
    expect(screen.getByLabelText('Tu sugerencia *')).toHaveAttribute('aria-invalid', 'true');
    expect(openMailApp).not.toHaveBeenCalled();
  });

  it('rejects insults', async () => {
    const user = userEvent.setup();
    route();
    await user.click(await screen.findByLabelText('Algo no funciona'));
    await user.type(screen.getByLabelText('Tu sugerencia *'), 'La calculadora de impuestos es una mierda y no sirve para nada en la materia');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Enviar sugerencia' }));
    expect(screen.getByText(/palabras ofensivas/)).toBeInTheDocument();
    expect(openMailApp).not.toHaveBeenCalled();
  });

  it('prepares the mail and then invites to visit the author profiles and projects', async () => {
    const user = userEvent.setup();
    route('/sugerencias?tipo=materia&materia=contabilidad-costos');
    expect(await screen.findByLabelText('Materia (opcional)')).toHaveValue('contabilidad-costos');
    expect(screen.getByLabelText('Agregar una materia, tema o subtema')).toBeChecked();
    await user.type(screen.getByLabelText('Tu sugerencia *'), 'Faltan ejercicios de costeo por procesos con producción equivalente en esta materia.');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Enviar sugerencia' }));

    await waitFor(() => expect(openMailApp).toHaveBeenCalledTimes(1));
    const href = openMailApp.mock.calls[0]?.[0] as string;
    expect(href).toMatch(/^mailto:diegofgz2004@gmail\.com\?subject=/);
    expect(decodeURIComponent(href)).toContain('Materia: Contabilidad de costos');

    expect(screen.getByRole('heading', { name: '¡Gracias por ayudar a mejorar ÁBACO!' })).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Visita mis otras redes y mis otros trabajos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Instagram/ })).toHaveAttribute('href', 'https://www.instagram.com/diego.granda.z/');
    expect(screen.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://www.linkedin.com/in/diego-francisco-g-61b793254/');
    expect(screen.getByRole('link', { name: /^GitHub/ })).toHaveAttribute('href', 'https://github.com/DiegoFranciscoG');
    const projects = screen.getByRole('region', { name: 'Estos son mis proyectos' });
    expect(within(projects).getAllByRole('link', { name: /Ver el código/ }).length).toBeGreaterThanOrEqual(5);
    for (const link of within(projects).getAllByRole('link')) {
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link.getAttribute('href')).toMatch(/^https:\/\/(github\.com|diegofranciscog\.github\.io)\//);
    }
  });

  it('does not let the same device send the same text twice', async () => {
    const user = userEvent.setup();
    const text = 'Sería útil una calculadora del décimo cuarto sueldo para la región Sierra.';
    const { unmount } = route();
    await user.click(await screen.findByLabelText('Una herramienta o función nueva'));
    await user.type(screen.getByLabelText('Tu sugerencia *'), text);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Enviar sugerencia' }));
    await waitFor(() => expect(openMailApp).toHaveBeenCalledTimes(1));
    unmount();

    route();
    await user.click(await screen.findByLabelText('Una herramienta o función nueva'));
    await user.type(screen.getByLabelText('Tu sugerencia *'), text);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Enviar sugerencia' }));
    expect(await screen.findByText(/Ya enviaste este mismo mensaje/)).toBeInTheDocument();
    expect(openMailApp).toHaveBeenCalledTimes(1);
  });
});
