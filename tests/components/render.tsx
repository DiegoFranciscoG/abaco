import { render } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { AbacoDB, setDbForTesting } from '../../src/data/db';
import { ToastProvider } from '../../src/ui/toast';

export function freshDb(): AbacoDB {
  const db = new AbacoDB(`abaco-ui-${crypto.randomUUID()}`);
  setDbForTesting(db);
  return db;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <ToastProvider>{children}</ToastProvider>
    </LazyMotion>
  );
}

export function renderWithProviders(ui: ReactNode) {
  return render(<Providers>{ui}</Providers>);
}

/** Renders one route as the app would, inside a memory router. */
export function renderRoute(path: string, routes: RouteObject[]) {
  const router = createMemoryRouter(
    routes.map((r) => ({ ...r, element: <Providers>{r.element}</Providers> })),
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}
