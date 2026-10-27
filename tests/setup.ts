import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Pages load the content catalog lazily; with the whole suite running in parallel the first render can take
// longer than the default 1 s that findBy* queries wait.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
});

if (!globalThis.crypto?.randomUUID) {
  throw new Error('crypto.randomUUID no está disponible en el entorno de pruebas');
}

// jsdom does not implement matchMedia; components read reduced-motion and color-scheme preferences.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom does not implement scrolling or the observers used by the 3D scene.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

// jsdom has <dialog> but not its modal methods.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
