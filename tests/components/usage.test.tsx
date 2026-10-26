import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AbacoDB } from '../../src/data/db';
import { countUsage, recordOpening } from '../../src/data/everyday-repositories';
import { UsagePanel } from '../../src/features/settings/UsagePanel';
import { freshDb, renderRoute } from './render';

let db: AbacoDB;
beforeEach(() => {
  db = freshDb();
});

describe('Tu uso', () => {
  it('shows the local counters and copies an anonymous summary only when the student asks', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await recordOpening(db);
    await countUsage('entregable', db);
    renderRoute('/ajustes', [{ path: '/ajustes', element: <UsagePanel /> }]);
    expect(await screen.findByRole('heading', { name: 'Tu uso' })).toBeInTheDocument();
    expect(await screen.findByText('Días de uso este mes')).toBeInTheDocument();
    expect(screen.getByText('Cifras normativas vencidas').nextElementSibling).toHaveTextContent('0');
    expect(writeText).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Copiar resumen anónimo/ }));
    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0]![0] as string;
    expect(text).toContain('Entregables resueltos en el mes: 1');
    expect(text).not.toMatch(/\d{4}-\d\d-\d\d/);
  });
});
