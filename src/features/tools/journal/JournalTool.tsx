import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import {
  addEntry,
  createJournal,
  deleteEntry,
  deleteJournal,
  listJournals,
} from '../../../data/tool-repositories';
import { ACCOUNT_KINDS, type AccountKind, type Diario, type LineaAsiento } from '../../../data/types';
import type { ToolInfo } from '../../../domain/tools/catalog';
import {
  checkEntry,
  KIND_LABEL,
  postToLedger,
  statements,
  SUGGESTED_ACCOUNTS,
  trialBalance,
} from '../../../domain/tools/journal';
import { Icon } from '../../../ui/icons';
import { EmptyState, Tabs } from '../../../ui/primitives';
import { useToast } from '../../../ui/use-toast';
import { ToolLayout } from '../ToolLayout';
import { money, readNumber } from '../format';

type Draft = { cuenta: string; tipo: AccountKind; debe: string; haber: string };
const emptyLine = (): Draft => ({ cuenta: '', tipo: 'activo', debe: '', haber: '' });
const today = () => new Date().toISOString().slice(0, 10);

function EntryForm({ diario }: { diario: Diario }) {
  const toast = useToast();
  const [fecha, setFecha] = useState(today);
  const [glosa, setGlosa] = useState('');
  const [lines, setLines] = useState<Draft[]>([emptyLine(), emptyLine()]);
  const parsed: LineaAsiento[] = lines.map((l) => ({
    cuenta: l.cuenta,
    tipo: l.tipo,
    debe: readNumber(l.debe) ?? 0,
    haber: readNumber(l.haber) ?? 0,
  }));
  const check = checkEntry(parsed);
  const touched = lines.some((l) => l.cuenta || l.debe || l.haber);

  const update = (i: number, patch: Partial<Draft>) =>
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const pickAccount = (i: number, cuenta: string) => {
    const known = SUGGESTED_ACCOUNTS.find((a) => a.cuenta.toLowerCase() === cuenta.trim().toLowerCase());
    update(i, known ? { cuenta, tipo: known.tipo } : { cuenta });
  };

  const save = async () => {
    try {
      await addEntry(diario.id, { fecha, glosa, lineas: parsed });
      setLines([emptyLine(), emptyLine()]);
      setGlosa('');
      toast.show('Asiento registrado');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <section aria-labelledby="nuevo-asiento" className="card space-y-4 p-5">
      <h3 id="nuevo-asiento" className="font-semibold">
        Nuevo asiento
      </h3>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-2">Fecha</span>
          <input type="date" className="field" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-2">Glosa (detalle)</span>
          <input
            className="field"
            value={glosa}
            onChange={(e) => setGlosa(e.target.value)}
            maxLength={200}
            placeholder="Ej.: Compra de mercadería a crédito"
          />
        </label>
      </div>
      <datalist id="cuentas-sugeridas">
        {SUGGESTED_ACCOUNTS.map((a) => (
          <option key={a.cuenta} value={a.cuenta} />
        ))}
      </datalist>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <fieldset
            key={i}
            className="grid grid-cols-2 gap-2 rounded-xl border border-line p-2 sm:grid-cols-[1.6fr_1fr_0.8fr_0.8fr_auto]"
          >
            <legend className="sr-only">Línea {i + 1}</legend>
            <label className="col-span-2 sm:col-span-1">
              <span className="sr-only">Cuenta de la línea {i + 1}</span>
              <input
                className="field"
                list="cuentas-sugeridas"
                value={l.cuenta}
                onChange={(e) => pickAccount(i, e.target.value)}
                placeholder="Cuenta"
                maxLength={80}
              />
            </label>
            <label>
              <span className="sr-only">Tipo de cuenta de la línea {i + 1}</span>
              <select
                className="field"
                value={l.tipo}
                onChange={(e) => update(i, { tipo: e.target.value as AccountKind })}
              >
                {ACCOUNT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Debe de la línea {i + 1}</span>
              <input
                className="field tnum"
                inputMode="decimal"
                value={l.debe}
                onChange={(e) => update(i, { debe: e.target.value, haber: e.target.value ? '' : l.haber })}
                placeholder="Debe"
                maxLength={16}
              />
            </label>
            <label>
              <span className="sr-only">Haber de la línea {i + 1}</span>
              <input
                className="field tnum"
                inputMode="decimal"
                value={l.haber}
                onChange={(e) => update(i, { haber: e.target.value, debe: e.target.value ? '' : l.debe })}
                placeholder="Haber"
                maxLength={16}
              />
            </label>
            <button
              type="button"
              className="btn btn-icon btn-ghost border-0"
              aria-label={`Quitar la línea ${i + 1}`}
              disabled={lines.length <= 2}
              onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
            >
              <Icon name="close" size={18} />
            </button>
          </fieldset>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setLines((prev) => (prev.length < 40 ? [...prev, emptyLine()] : prev))}
        >
          <Icon name="plus" size={18} /> Agregar línea
        </button>
        <p className={`tnum text-sm font-semibold ${check.ok ? 'text-ok' : 'text-muted'}`} aria-live="polite">
          Debe {money(check.totalDebe)} · Haber {money(check.totalHaber)} {check.ok ? '· cuadra' : ''}
        </p>
        <button type="button" className="btn btn-primary" disabled={!check.ok} onClick={() => void save()}>
          <Icon name="check" size={18} /> Registrar
        </button>
      </div>
      {touched && !check.ok ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-warn">
          {check.errores.slice(0, 3).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Books({ diario }: { diario: Diario }) {
  const [view, setView] = useState<'diario' | 'mayor' | 'balance'>('diario');
  const ledger = postToLedger(diario.asientos);
  const tb = trialBalance(ledger);
  const st = statements(ledger);
  if (diario.asientos.length === 0) {
    return (
      <EmptyState icon="ledger" title="Todavía no hay asientos">
        Registra el primero arriba. Cada asiento debe cuadrar: el debe y el haber suman lo mismo.
      </EmptyState>
    );
  }
  return (
    <div>
      <Tabs
        label="Libros"
        value={view}
        onChange={setView}
        tabs={[
          { id: 'diario', label: 'Libro diario', count: diario.asientos.length },
          { id: 'mayor', label: 'Mayor (cuentas T)', count: ledger.length },
          { id: 'balance', label: 'Balance de comprobación' },
        ]}
      />
      {view === 'diario' ? (
        <div className="card overflow-x-auto" tabIndex={0} role="region" aria-label="Libro diario">
          <table className="tnum w-full text-left text-sm">
            <caption className="sr-only">Libro diario</caption>
            <thead className="border-b border-line text-xs text-muted uppercase">
              <tr>
                <th scope="col" className="px-3 py-2">
                  N.º
                </th>
                <th scope="col" className="px-3 py-2">
                  Fecha
                </th>
                <th scope="col" className="px-3 py-2">
                  Cuenta y glosa
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Debe
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Haber
                </th>
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {diario.asientos.map((a, n) => (
                <tr key={a.id} className="border-b border-line align-top last:border-0">
                  <td className="px-3 py-2 font-semibold">{n + 1}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{a.fecha}</td>
                  <td className="px-3 py-2">
                    {a.lineas.map((l, i) => (
                      <div key={i} className={l.haber > 0 ? 'pl-6' : ''}>
                        {l.cuenta}
                      </div>
                    ))}
                    {a.glosa ? <div className="mt-1 text-xs text-muted italic">{a.glosa}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {a.lineas.map((l, i) => (
                      <div key={i}>{l.debe > 0 ? money(l.debe) : ''}&nbsp;</div>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {a.lineas.map((l, i) => (
                      <div key={i}>{l.haber > 0 ? money(l.haber) : ''}&nbsp;</div>
                    ))}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="btn btn-icon btn-ghost border-0"
                      aria-label={`Borrar el asiento ${n + 1}`}
                      onClick={() => void deleteEntry(diario.id, a.id)}
                    >
                      <Icon name="trash" size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {view === 'mayor' ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ledger.map((acc) => (
            <li key={acc.cuenta} className="card p-4">
              <h4 className="text-center font-semibold">{acc.cuenta}</h4>
              <p className="mb-2 text-center text-xs text-muted">{KIND_LABEL[acc.tipo]}</p>
              <div className="tnum grid grid-cols-2 border-t-2 border-ink text-sm">
                <div className="border-r-2 border-ink pt-1 pr-2 text-right">
                  <span className="sr-only">Debe:</span>
                  {acc.debe.map((m, i) => (
                    <div key={i}>{money(m.valor)}</div>
                  ))}
                </div>
                <div className="pt-1 pl-2">
                  <span className="sr-only">Haber:</span>
                  {acc.haber.map((m, i) => (
                    <div key={i}>{money(m.valor)}</div>
                  ))}
                </div>
              </div>
              <p
                className={`tnum mt-2 border-t border-line pt-2 text-center text-sm font-semibold ${acc.saldo < 0 ? 'text-warn' : ''}`}
              >
                Saldo{' '}
                {acc.saldo < 0
                  ? 'contrario a su naturaleza'
                  : acc.ladoSaldo === 'debe'
                    ? 'deudor'
                    : 'acreedor'}
                : {money(Math.abs(acc.saldo))}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {view === 'balance' ? (
        <div className="space-y-4">
          <div
            className="card overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Balance de comprobación"
          >
            <table className="tnum w-full text-left text-sm">
              <caption className="sr-only">Balance de comprobación de saldos</caption>
              <thead className="border-b border-line text-xs text-muted uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    Cuenta
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Saldo deudor
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Saldo acreedor
                  </th>
                </tr>
              </thead>
              <tbody>
                {tb.filas.map((f) => (
                  <tr key={f.cuenta} className="border-b border-line">
                    <td className="px-3 py-1.5">{f.cuenta}</td>
                    <td className="px-3 py-1.5 text-right">{f.deudor ? money(f.deudor) : ''}</td>
                    <td className="px-3 py-1.5 text-right">{f.acreedor ? money(f.acreedor) : ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="px-3 py-2">Totales</td>
                  <td className="px-3 py-2 text-right">{money(tb.totalDeudor)}</td>
                  <td className="px-3 py-2 text-right">{money(tb.totalAcreedor)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className={`text-sm font-semibold ${tb.cuadra ? 'text-ok' : 'text-warn'}`}>
            {tb.cuadra
              ? 'El balance cuadra: la suma de saldos deudores es igual a la de saldos acreedores.'
              : 'El balance no cuadra: revisa los asientos.'}
          </p>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="card p-4">
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                Estado de resultados
              </dt>
              <dd className="tnum mt-1 text-sm">
                Ingresos {money(st.ingresos)} − Gastos {money(st.gastos)} ={' '}
                <strong>{money(st.utilidad)}</strong>
              </dd>
            </div>
            <div className="card p-4 sm:col-span-2">
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Ecuación contable</dt>
              <dd className="tnum mt-1 text-sm">
                Activo {money(st.activo)} = Pasivo {money(st.pasivo)} + Patrimonio {money(st.patrimonio)} +
                Utilidad del período {money(st.utilidad)}
                {Math.abs(st.diferencia) < 0.005 ? ' ✓' : ` (diferencia ${money(st.diferencia)})`}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}

export default function JournalTool({ tool }: { tool: ToolInfo }) {
  const toast = useToast();
  const journals = useLiveQuery(() => listJournals(), [], undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');
  const current = journals?.find((j) => j.id === selected) ?? journals?.[0];

  const create = async () => {
    try {
      const j = await createJournal(name || 'Ejercicio de práctica');
      setSelected(j.id);
      setName('');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <ToolLayout
      tool={tool}
      metodo={
        <p>
          Partida doble: cada asiento debe tener débitos y créditos iguales; activos y gastos aumentan por el
          debe, pasivos, patrimonio e ingresos por el haber (OpenStax, Principles of Financial Accounting,
          capítulo 3). Los asientos se trasladan al mayor y el balance de comprobación compara saldos deudores
          y acreedores. Los cálculos se hacen en centavos para evitar errores de redondeo. Tus libros se
          guardan solo en este dispositivo.
        </p>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        {journals && journals.length > 0 ? (
          <label className="block min-w-48 flex-1">
            <span className="mb-1 block text-sm font-semibold text-ink-2">Libro</span>
            <select className="field" value={current?.id ?? ''} onChange={(e) => setSelected(e.target.value)}>
              {journals.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre} ({j.asientos.length} asientos)
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block min-w-48 flex-1">
          <span className="mb-1 block text-sm font-semibold text-ink-2">Nuevo libro</span>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej.: Ejercicio 3 — Comercial XYZ"
            maxLength={60}
          />
        </label>
        <button type="button" className="btn btn-ghost" onClick={() => void create()}>
          <Icon name="plus" size={18} /> Crear libro
        </button>
        {current ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void deleteJournal(current.id).then(() => setSelected(null))}
          >
            <Icon name="trash" size={18} /> Borrar este libro
          </button>
        ) : null}
      </div>
      {current ? (
        <>
          <EntryForm key={current.id} diario={current} />
          <Books diario={current} />
        </>
      ) : journals ? (
        <EmptyState icon="ledger" title="Crea tu primer libro diario">
          Ponle el nombre del ejercicio y empieza a registrar asientos.
        </EmptyState>
      ) : null}
    </ToolLayout>
  );
}
