import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { loadGlosario, loadTemario, materias } from '../../../data/content';
import { addCards, deleteDeck, dueCards, listDecks, reviewCard } from '../../../data/tool-repositories';
import type { Tarjeta } from '../../../data/types';
import type { ToolInfo } from '../../../domain/tools/catalog';
import { ANSWER_BUTTONS } from '../../../domain/tools/sm2';
import { areaLabel } from '../../../ui/areas';
import { Icon } from '../../../ui/icons';
import { EmptyState } from '../../../ui/primitives';
import { useToast } from '../../../ui/use-toast';
import { ToolLayout } from '../ToolLayout';

function Review({ mazo, onExit }: { mazo: string; onExit: () => void }) {
  const toast = useToast();
  const cards = useLiveQuery(() => dueCards(mazo), [mazo], undefined);
  const [showBack, setShowBack] = useState(false);
  const card: Tarjeta | undefined = cards?.[0];

  if (!cards) return null;
  if (!card) {
    return (
      <EmptyState icon="check" title="¡Listo por hoy!">
        No quedan tarjetas pendientes en «{mazo}». Vuelve mañana: el repaso espaciado funciona cuando estás a punto de olvidar.
        <button type="button" className="btn btn-ghost mt-4" onClick={onExit}>
          Volver a los mazos
        </button>
      </EmptyState>
    );
  }
  return (
    <section aria-label={`Repaso de ${mazo}`} className="mx-auto max-w-xl space-y-4">
      <p className="text-center text-sm text-muted">
        {mazo} · {cards.length} pendientes
      </p>
      <div className="card min-h-56 space-y-4 p-6 text-center">
        <p className="font-display text-2xl leading-snug font-semibold">{card.frente}</p>
        {showBack ? <p className="border-t border-line pt-4 text-left leading-relaxed text-ink-2">{card.reverso}</p> : null}
      </div>
      {showBack ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="¿Qué tan bien la recordaste?">
          {ANSWER_BUTTONS.map((b) => (
            <button
              key={b.q}
              type="button"
              className={`btn ${b.q < 3 ? 'btn-ghost' : 'btn-soft'}`}
              onClick={async () => {
                try {
                  await reviewCard(card.id, b.q);
                  setShowBack(false);
                } catch (e) {
                  toast.error(e);
                }
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className="btn btn-primary w-full" onClick={() => setShowBack(true)}>
          Mostrar respuesta
        </button>
      )}
      <button type="button" className="link-red block w-full text-center text-sm" onClick={onExit}>
        Terminar por ahora
      </button>
    </section>
  );
}

export default function CardsTool({ tool }: { tool: ToolInfo }) {
  const toast = useToast();
  const decks = useLiveQuery(() => listDecks(), [], undefined);
  const [active, setActive] = useState<string | null>(null);
  const [materiaId, setMateriaId] = useState(materias[0]?.id ?? '');
  const [frente, setFrente] = useState('');
  const [reverso, setReverso] = useState('');
  const [mazoPropio, setMazoPropio] = useState('Mis tarjetas');
  const [busy, setBusy] = useState(false);

  const importGlossary = async () => {
    setBusy(true);
    try {
      const terms = await loadGlosario();
      const added = await addCards(
        terms.map((t) => ({ id: `glosario:${t.id}`, mazo: `Glosario · ${areaLabel(t.areas[0] ?? 'gestion')}`, frente: t.termino, reverso: t.definicion, origen: 'glosario' as const })),
      );
      toast.show(added > 0 ? `${added} tarjetas del glosario listas para repasar` : 'El glosario ya estaba en tus tarjetas');
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const importSubject = async () => {
    const materia = materias.find((m) => m.id === materiaId);
    if (!materia) return;
    setBusy(true);
    try {
      const temario = await loadTemario(materia.id);
      const cards = (temario?.temas ?? []).flatMap((t) =>
        t.subtemas.map((s) => ({ id: `subtema:${s.id}`, mazo: materia.nombre, frente: s.nombre, reverso: s.puntos_clave.join(' · '), origen: 'subtema' as const })),
      );
      const added = await addCards(cards);
      toast.show(added > 0 ? `${added} tarjetas de ${materia.nombre}` : 'Esas tarjetas ya estaban en tu mazo');
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const addOwn = async () => {
    try {
      await addCards([{ mazo: mazoPropio, frente, reverso, origen: 'propia' }]);
      setFrente('');
      setReverso('');
      toast.show('Tarjeta agregada');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <ToolLayout
      tool={tool}
      metodo={
        <p>
          Repetición espaciada con el algoritmo SM-2 (P. Woźniak, 1990): una tarjeta bien recordada vuelve en 1 día, luego en 6 y después en intervalos que crecen
          según qué tan fácil te resultó; si no la recordaste, vuelve a empezar. Las tarjetas del glosario y de las materias se arman con el contenido de ÁBACO; tu
          progreso se guarda solo en este dispositivo.
        </p>
      }
    >
      {active ? (
        <Review mazo={active} onExit={() => setActive(null)} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section aria-labelledby="mazos" className="space-y-3">
            <h2 id="mazos" className="font-display text-xl font-semibold">
              Tus mazos
            </h2>
            {decks && decks.length > 0 ? (
              <ul className="space-y-2">
                {decks.map((d) => (
                  <li key={d.mazo} className="card flex flex-wrap items-center gap-3 p-4">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{d.mazo}</span>
                      <span className="text-sm text-muted">
                        {d.total} tarjetas · {d.pendientes} para hoy
                      </span>
                    </span>
                    <button type="button" className="btn btn-primary" disabled={d.pendientes === 0} onClick={() => setActive(d.mazo)}>
                      Repasar
                    </button>
                    <button type="button" className="btn btn-icon btn-ghost border-0" aria-label={`Borrar el mazo ${d.mazo}`} onClick={() => void deleteDeck(d.mazo)}>
                      <Icon name="trash" size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : decks ? (
              <EmptyState icon="cards" title="Aún no tienes tarjetas">
                Importa el glosario o los subtemas de una materia, o escribe las tuyas.
              </EmptyState>
            ) : null}
          </section>
          <div className="space-y-4">
            <section className="card space-y-3 p-5">
              <h2 className="font-semibold">Importar de ÁBACO</h2>
              <button type="button" className="btn btn-ghost w-full" disabled={busy} onClick={() => void importGlossary()}>
                <Icon name="download" size={18} /> Glosario completo
              </button>
              <label className="block" htmlFor="tj-materia">
                <span className="mb-1 block text-sm font-semibold text-ink-2">Subtemas de una materia</span>
                <select id="tj-materia" className="field" value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
                  {materias.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn btn-ghost w-full" disabled={busy} onClick={() => void importSubject()}>
                <Icon name="download" size={18} /> Importar subtemas
              </button>
            </section>
            <form
              className="card space-y-3 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                void addOwn();
              }}
            >
              <h2 className="font-semibold">Escribir una tarjeta</h2>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-2">Mazo</span>
                <input className="field" value={mazoPropio} onChange={(e) => setMazoPropio(e.target.value)} maxLength={80} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-2">Pregunta (frente)</span>
                <input className="field" value={frente} onChange={(e) => setFrente(e.target.value)} maxLength={500} required />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-2">Respuesta (reverso)</span>
                <textarea className="field min-h-24" value={reverso} onChange={(e) => setReverso(e.target.value)} maxLength={2000} required />
              </label>
              <button type="submit" className="btn btn-primary w-full">
                <Icon name="plus" size={18} /> Agregar
              </button>
            </form>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
