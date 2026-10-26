import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import GlossaryPage from '../../src/features/glossary/GlossaryPage';
import { freshDb, renderRoute } from './render';

beforeEach(() => {
  freshDb();
});

describe('glosario español-inglés', () => {
  it('searches in English, switches the leading language and filters by area', async () => {
    const user = userEvent.setup();
    renderRoute('/glosario', [{ path: '/glosario', element: <GlossaryPage /> }]);
    const search = await screen.findByRole('searchbox', { name: 'Buscar en el glosario' });
    // «Goodwill» and «Intangible assets other than goodwill».
    await user.type(search, 'goodwill');
    const card = (await screen.findByText('Plusvalía')).closest('div')!;
    expect(within(card).getByText('Goodwill')).toBeInTheDocument();
    expect(screen.getByText(/^2 de \d+ términos$/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'English → español' }));
    expect(screen.getByRole('button', { name: 'English → español' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Goodwill')).toHaveAttribute('lang', 'en');

    await user.clear(search);
    await user.click(screen.getByRole('button', { name: 'Tributario' }));
    expect(screen.getByText('Deferred tax')).toBeInTheDocument();
    expect(screen.queryByText('Goodwill')).not.toBeInTheDocument();
  });

  it('says so when nothing matches instead of showing an empty page', async () => {
    const user = userEvent.setup();
    renderRoute('/glosario', [{ path: '/glosario', element: <GlossaryPage /> }]);
    await user.type(await screen.findByRole('searchbox', { name: 'Buscar en el glosario' }), 'zzzz');
    expect(await screen.findByText('No hay términos con esa búsqueda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar en Excel/ })).toBeDisabled();
  });
});
