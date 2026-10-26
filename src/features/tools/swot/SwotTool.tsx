import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { deleteBoard, listBoards, saveBoard } from '../../../data/tool-repositories';
import type { Tablero } from '../../../data/types';
import type { ToolInfo } from '../../../domain/tools/catalog';
import { rankOptions } from '../../../domain/tools/decision';
import { Icon } from '../../../ui/icons';
import { Tabs } from '../../../ui/primitives';
import { useToast } from '../../../ui/use-toast';
import { ToolLayout } from '../ToolLayout';
import { num, readNumber } from '../format';

type Quadrant = 'fortalezas' | 'debilidades' | 'oportunidades' | 'amenazas';
const QUADRANTS: { id: Quadrant; label: string; hint: string; tone: string }[] = [
  { id: 'fortalezas', label: 'Fortalezas', hint: 'Internas, a favor', tone: 'bg-ok-soft' },
  { id: 'debilidades', label: 'Debilidades', hint: 'Internas, en contra', tone: 'bg-warn-soft' },
  { id: 'oportunidades', label: 'Oportunidades', hint: 'Externas, a favor', tone: 'bg-ok-soft' },
  { id: 'amenazas', label: 'Amenazas', hint: 'Externas, en contra', tone: 'bg-warn-soft' },
];
const EMPTY_SWOT = { fortalezas: [] as string[], oportunidades: [] as string[], debilidades: [] as string[], amenazas: [] as string[] };

function SwotBoard() {
  const toast = useToast();
  const boards = useLiveQuery(() => listBoards(), [], []);
  const saved = (boards ?? []).filter((b) => b.tipo === 'foda');
  const [titulo, setTitulo] = useState('FODA de mi emprendimiento');
  const [foda, setFoda] = useState(EMPTY_SWOT);
  const [id, setId] = useState<string | undefined>();
  const [drafts, setDrafts] = useState<Record<Quadrant, string>>({ fortalezas: '', debilidades: '', oportunidades: '', amenazas: '' });

  const add = (q: Quadrant) => {
    const value = drafts[q].trim();
    if (!value || foda[q].length >= 30) return;
    setFoda((prev) => ({ ...prev, [q]: [...prev[q], value.slice(0, 200)] }));
    setDrafts((d) => ({ ...d, [q]: '' }));
  };
  const remove = (q: Quadrant, i: number) => setFoda((prev) => ({ ...prev, [q]: prev[q].filter((_, j) => j !== i) }));
  const save = async () => {
    try {
      const b = await saveBoard({ id, tipo: 'foda', titulo, foda });
      setId(b.id);
      toast.show('Tablero guardado en este dispositivo');
    } catch (e) {
      toast.error(e);
    }
  };
  const load = (b: Tablero) => {
    setId(b.id);
    setTitulo(b.titulo);
    setFoda(b.foda ?? EMPTY_SWOT);
  };

  const strategies = [
    { k: 'FO', t: 'Usar fortalezas para aprovechar oportunidades', a: foda.fortalezas, b: foda.oportunidades },
    { k: 'DO', t: 'Superar debilidades aprovechando oportunidades', a: foda.debilidades, b: foda.oportunidades },
    { k: 'FA', t: 'Usar fortalezas para reducir amenazas', a: foda.fortalezas, b: foda.amenazas },
    { k: 'DA', t: 'Reducir debilidades y evitar amenazas', a: foda.debilidades, b: foda.amenazas },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-56 flex-1">
          <span className="mb-1 block text-sm font-semibold text-ink-2">Título</span>
          <input className="field" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => void save()}>
          <Icon name="check" size={18} /> Guardar
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setId(undefined);
            setFoda(EMPTY_SWOT);
            setTitulo('Nuevo FODA');
          }}
        >
          <Icon name="plus" size={18} /> Nuevo
        </button>
      </div>
      {saved.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="FODA guardados">
          {saved.map((b) => (
            <li key={b.id} className="flex items-center gap-1">
              <button type="button" className={`chip min-h-9 ${b.id === id ? 'border-red text-red' : ''}`} onClick={() => load(b)}>
                {b.titulo}
              </button>
              <button type="button" className="btn btn-icon btn-ghost border-0" aria-label={`Borrar ${b.titulo}`} onClick={() => void deleteBoard(b.id)}>
                <Icon name="trash" size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {QUADRANTS.map((q) => (
          <section key={q.id} aria-labelledby={`q-${q.id}`} className={`rounded-2xl p-4 ${q.tone}`}>
            <h3 id={`q-${q.id}`} className="font-semibold">
              {q.label} <span className="text-xs font-normal text-muted">· {q.hint}</span>
            </h3>
            <ul className="mt-2 space-y-1.5">
              {foda[q.id].map((item, i) => (
                <li key={`${item}-${i}`} className="flex items-start justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
                  <span>{item}</span>
                  <button type="button" className="text-muted hover:text-red" aria-label={`Quitar «${item}»`} onClick={() => remove(q.id, i)}>
                    <Icon name="close" size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                add(q.id);
              }}
            >
              <label className="flex-1">
                <span className="sr-only">Agregar a {q.label}</span>
                <input className="field" value={drafts[q.id]} onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))} placeholder="Escribe y presiona Enter" maxLength={200} />
              </label>
              <button type="submit" className="btn btn-icon btn-ghost" aria-label={`Agregar a ${q.label}`}>
                <Icon name="plus" size={18} />
              </button>
            </form>
          </section>
        ))}
      </div>
      <section aria-labelledby="estrategias" className="card space-y-3 p-5">
        <h3 id="estrategias" className="font-semibold">
          Estrategias cruzadas
        </h3>
        <p className="text-sm text-muted">Cruza cada factor interno con uno externo y escribe la estrategia en tu informe.</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {strategies.map((s) => (
            <li key={s.k} className="rounded-xl border border-line p-3 text-sm">
              <p className="font-semibold">
                {s.k} · {s.t}
              </p>
              <p className="mt-1 text-muted">{s.a.length && s.b.length ? `${s.a.length} × ${s.b.length} combinaciones posibles, por ejemplo: «${s.a[0]}» con «${s.b[0]}».` : 'Completa ambos cuadrantes para ver combinaciones.'}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function DecisionBoard() {
  const [criterios, setCriterios] = useState([
    { nombre: 'Costo', peso: '40' },
    { nombre: 'Calidad', peso: '35' },
    { nombre: 'Plazo de entrega', peso: '25' },
  ]);
  const [opciones, setOpciones] = useState(['Proveedor A', 'Proveedor B', 'Proveedor C']);
  const [puntajes, setPuntajes] = useState<string[][]>([
    ['7', '8', '6'],
    ['9', '6', '7'],
    ['6', '9', '8'],
  ]);
  const ranking = rankOptions({
    criterios: criterios.map((c) => ({ nombre: c.nombre, peso: readNumber(c.peso) ?? 0 })),
    opciones,
    puntajes: puntajes.map((row) => row.map((v) => readNumber(v) ?? 0)),
  });
  const totalPeso = criterios.reduce((s, c) => s + (readNumber(c.peso) ?? 0), 0);
  const setScore = (i: number, j: number, v: string) => setPuntajes((prev) => prev.map((row, a) => (a === i ? row.map((x, b) => (b === j ? v : x)) : row)));

  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto p-0" tabIndex={0} role="region" aria-label="Matriz de decisión">
        <table className="w-full text-sm">
          <caption className="sr-only">Matriz de decisión ponderada: puntajes de 0 a 10</caption>
          <thead className="border-b border-line">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs text-muted uppercase">Opción</th>
              {criterios.map((c, j) => (
                <th key={j} scope="col" className="px-2 py-2">
                  <input aria-label={`Nombre del criterio ${j + 1}`} className="field mb-1 min-w-28" value={c.nombre} maxLength={60} onChange={(e) => setCriterios((p) => p.map((x, k) => (k === j ? { ...x, nombre: e.target.value } : x)))} />
                  <input aria-label={`Peso de ${c.nombre} (%)`} className="field tnum" inputMode="decimal" value={c.peso} maxLength={5} onChange={(e) => setCriterios((p) => p.map((x, k) => (k === j ? { ...x, peso: e.target.value } : x)))} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {opciones.map((o, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <th scope="row" className="px-2 py-2">
                  <input aria-label={`Nombre de la opción ${i + 1}`} className="field min-w-32" value={o} maxLength={60} onChange={(e) => setOpciones((p) => p.map((x, k) => (k === i ? e.target.value : x)))} />
                </th>
                {criterios.map((c, j) => (
                  <td key={j} className="px-2 py-2">
                    <input aria-label={`Puntaje de ${o} en ${c.nombre} (0 a 10)`} className="field tnum" inputMode="decimal" value={puntajes[i]?.[j] ?? ''} maxLength={4} onChange={(e) => setScore(i, j, e.target.value)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={criterios.length >= 8}
          onClick={() => {
            setCriterios((p) => [...p, { nombre: `Criterio ${p.length + 1}`, peso: '10' }]);
            setPuntajes((p) => p.map((row) => [...row, '5']));
          }}
        >
          <Icon name="plus" size={18} /> Criterio
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={opciones.length >= 8}
          onClick={() => {
            setOpciones((p) => [...p, `Opción ${p.length + 1}`]);
            setPuntajes((p) => [...p, criterios.map(() => '5')]);
          }}
        >
          <Icon name="plus" size={18} /> Opción
        </button>
      </div>
      {totalPeso !== 100 ? <p className="text-sm text-muted">Los pesos suman {num(totalPeso)}; se normalizan a 100 % automáticamente.</p> : null}
      <ol className="space-y-2" aria-live="polite" aria-label="Ranking">
        {ranking.map((r) => (
          <li key={r.opcion} className={`card flex items-center justify-between p-4 ${r.posicion === 1 ? 'border-red' : ''}`}>
            <span className="font-semibold">
              {r.posicion}. {r.opcion}
            </span>
            <span className="tnum font-display text-xl font-semibold">{num(r.total)} / 10</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function SwotTool({ tool }: { tool: ToolInfo }) {
  const [mode, setMode] = useState<'foda' | 'decision'>('foda');
  return (
    <ToolLayout
      tool={tool}
      metodo={
        <>
          <p>FODA: fortalezas y debilidades son internas; oportunidades y amenazas, externas. Su valor está en cruzarlas para formular estrategias (OpenStax, Principles of Management, 8.2).</p>
          <p>Matriz de decisión: cada opción recibe un puntaje de 0 a 10 por criterio; el total es la suma de puntaje × peso, con los pesos llevados a 100 %. El resultado ordena las opciones según tus criterios: revisa que los pesos reflejen lo que de verdad importa.</p>
        </>
      }
    >
      <Tabs
        label="Herramienta"
        value={mode}
        onChange={setMode}
        tabs={[
          { id: 'foda', label: 'FODA' },
          { id: 'decision', label: 'Matriz de decisión' },
        ]}
      />
      {mode === 'foda' ? <SwotBoard /> : <DecisionBoard />}
    </ToolLayout>
  );
}
