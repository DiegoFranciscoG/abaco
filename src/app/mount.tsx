import { startTransition, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { router } from './router';

/** The first render runs as a transition: React yields to the browser every few milliseconds (no long task). */
export function mount(container: HTMLElement): void {
  const root = createRoot(container);
  startTransition(() => {
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
  });
}
