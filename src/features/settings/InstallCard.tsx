import { useSyncExternalStore } from 'react';
import { installState, promptInstall, subscribeInstall } from '../../app/install-prompt';
import { Icon } from '../../ui/icons';
import { useToast } from '../../ui/use-toast';

/** Offers to install ÁBACO on the home screen or desktop, or explains how to do it on iPhone. */
export function InstallCard() {
  const state = useSyncExternalStore(subscribeInstall, installState, () => 'unsupported' as const);
  const toast = useToast();

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') toast.show('ÁBACO quedó instalada en tu dispositivo');
  };

  return (
    <section className="card space-y-3 p-5" aria-labelledby="instalar">
      <h2 id="instalar" className="font-display text-xl font-semibold">
        Usar ÁBACO como app
      </h2>
      {state === 'installed' ? (
        <p className="flex items-center gap-2 text-sm text-ink-2">
          <Icon name="check" size={18} className="text-ok" /> Ya la estás usando como app instalada.
        </p>
      ) : state === 'available' ? (
        <>
          <p className="text-sm text-ink-2">Instálala en tu teléfono o computadora: se abre en su propia ventana y funciona sin internet.</p>
          <button type="button" className="btn btn-primary" onClick={() => void install()}>
            <Icon name="download" size={18} /> Instalar ÁBACO
          </button>
        </>
      ) : state === 'ios' ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-2">
          <li>Abre ÁBACO en Safari.</li>
          <li>Toca el botón Compartir (el cuadrado con una flecha hacia arriba).</li>
          <li>Elige «Agregar a inicio» y confirma.</li>
        </ol>
      ) : (
        <p className="text-sm text-ink-2">
          En Chrome o Edge, usa el ícono de instalar de la barra de direcciones o el menú «Instalar ÁBACO». En el teléfono, el menú del navegador
          ofrece «Agregar a la pantalla principal». No ocupa espacio extra: es la misma web, guardada para usarla sin conexión.
        </p>
      )}
    </section>
  );
}
