import { isRouteErrorResponse, useRouteError } from 'react-router';
import { LogoMark } from '../ui/art';
import { Icon } from '../ui/icons';
import { AppLink } from '../ui/primitives';

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true">
      <div className="flex flex-col items-center gap-3 text-muted">
        <LogoMark size={44} />
        <span className="text-sm">Abriendo ÁBACO…</span>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="eyebrow mb-3">Error 404</p>
      <h1 className="font-display text-4xl font-semibold">Esta página no existe</h1>
      <p className="mt-3 text-muted">Revisa el enlace o vuelve al inicio.</p>
      <AppLink to="/" className="btn btn-primary mt-6">
        <Icon name="home" size={18} /> Ir al inicio
      </AppLink>
    </div>
  );
}

/** Never shows stack traces: a short explanation and a way back. */
export function ErrorPage() {
  const error = useRouteError();
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="eyebrow mb-3">{notFound ? 'No encontrado' : 'Algo salió mal'}</p>
      <h1 className="font-display text-3xl font-semibold">
        {offline ? 'Esta sección aún no está guardada en este dispositivo' : 'No pudimos abrir esta sección'}
      </h1>
      <p className="mt-3 text-muted">
        {offline
          ? 'Conéctate una vez a internet y ábrela: después funcionará sin conexión.'
          : 'Tus apuntes no se perdieron. Recarga la página o vuelve al inicio.'}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
          Recargar
        </button>
        <a href="#/" className="btn btn-primary">
          Ir al inicio
        </a>
      </div>
    </div>
  );
}
