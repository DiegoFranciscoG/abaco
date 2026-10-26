import { useState } from 'react';
import { ACCOUNT_KINDS } from '../../data/types';
import { MAX_PERIODOS, type AmortizacionInput } from '../../domain/deliverables/amortizacion';
import { MAX_ANIOS, type DepreciacionInput } from '../../domain/deliverables/depreciacion';
import { MAX_FLUJOS, type EvaluacionInput } from '../../domain/deliverables/evaluacion-proyecto';
import { MAX_MOVIMIENTOS, type KardexInput } from '../../domain/deliverables/kardex';
import { MAX_ASIENTOS, type LibroDiarioInput } from '../../domain/deliverables/libro-diario';
import type { PuntoEquilibrioInput } from '../../domain/deliverables/punto-equilibrio';
import type { RazonesInput } from '../../domain/deliverables/razones-financieras';
import { MAX_TRABAJADORES, type RolPagosInput } from '../../domain/deliverables/rol-pagos';
import { KIND_LABEL, SUGGESTED_ACCOUNTS } from '../../domain/tools/journal';
import { AddButton, CheckInput, NumInput, RowCard, SelectInput, TextInput } from './fields';
import { newId } from '../../domain/id';

export interface FormProps<I> {
  value: I;
  onChange: (next: I) => void;
}

const grid = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3';

/**
 * Stable keys for rows that can be removed from the middle: the inputs are uncontrolled, so a key by position would
 * show the values of the row that moved up.
 */
function useRowKeys(length: number) {
  const [keys, setKeys] = useState(() => Array.from({ length }, () => newId()));
  return {
    keys,
    add: () => setKeys((k) => [...k, newId()]),
    remove: (i: number) => setKeys((k) => k.filter((_, j) => j !== i)),
  };
}

export function AmortizacionForm({ value: v, onChange }: FormProps<AmortizacionInput>) {
  const set =
    <K extends keyof AmortizacionInput>(k: K) =>
    (x: AmortizacionInput[K]) =>
      onChange({ ...v, [k]: x });
  return (
    <div className={grid}>
      <TextInput label="Título" value={v.titulo} onChange={set('titulo')} maxLength={120} />
      <NumInput label="Monto del préstamo" suffix="USD" value={v.monto} onChange={set('monto')} />
      <NumInput label="Tasa nominal anual" suffix="%" value={v.tasaAnual} onChange={set('tasaAnual')} />
      <NumInput
        label="Plazo"
        suffix="períodos"
        value={v.plazo}
        onChange={set('plazo')}
        hint={`De 1 a ${MAX_PERIODOS}.`}
      />
      <SelectInput
        label="Pagos"
        value={v.periodicidad}
        onChange={set('periodicidad')}
        options={[
          { value: 'mensual', label: 'Mensuales' },
          { value: 'trimestral', label: 'Trimestrales' },
          { value: 'semestral', label: 'Semestrales' },
          { value: 'anual', label: 'Anuales' },
        ]}
      />
      <SelectInput
        label="Sistema"
        value={v.sistema}
        onChange={set('sistema')}
        options={[
          { value: 'frances', label: 'Francés (cuota fija)' },
          { value: 'aleman', label: 'Alemán (capital constante)' },
          { value: 'americano', label: 'Americano (capital al final)' },
        ]}
      />
    </div>
  );
}

export function DepreciacionForm({ value: v, onChange }: FormProps<DepreciacionInput>) {
  const set =
    <K extends keyof DepreciacionInput>(k: K) =>
    (x: DepreciacionInput[K]) =>
      onChange({ ...v, [k]: x });
  return (
    <div className="space-y-4">
      <div className={grid}>
        <TextInput label="Activo" value={v.activo} onChange={set('activo')} maxLength={120} />
        <NumInput label="Costo" suffix="USD" value={v.costo} onChange={set('costo')} />
        <NumInput
          label="Valor residual"
          suffix="USD"
          value={v.valorResidual}
          onChange={set('valorResidual')}
        />
        <SelectInput
          label="Método"
          value={v.metodo}
          onChange={set('metodo')}
          options={[
            { value: 'linea-recta', label: 'Línea recta' },
            { value: 'suma-digitos', label: 'Suma de dígitos de los años' },
            { value: 'doble-saldo', label: 'Doble saldo decreciente' },
            { value: 'unidades', label: 'Unidades de producción' },
          ]}
        />
        {v.metodo === 'unidades' ? (
          <NumInput
            label="Unidades de toda la vida útil"
            value={v.unidadesTotales}
            onChange={set('unidadesTotales')}
          />
        ) : (
          <NumInput label="Vida útil" suffix="años" value={v.vidaUtil} onChange={set('vidaUtil')} />
        )}
      </div>
      {v.metodo === 'unidades' ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {v.unidadesPorAnio.map((u, i) => (
              <NumInput
                key={i}
                label={`Unidades del año ${i + 1}`}
                value={u}
                onChange={(x) => set('unidadesPorAnio')(v.unidadesPorAnio.map((y, j) => (j === i ? x : y)))}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <AddButton
              label="Agregar año"
              disabled={v.unidadesPorAnio.length >= MAX_ANIOS}
              onClick={() => set('unidadesPorAnio')([...v.unidadesPorAnio, 0])}
            />
            {v.unidadesPorAnio.length > 0 ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => set('unidadesPorAnio')(v.unidadesPorAnio.slice(0, -1))}
              >
                Quitar el último año
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PuntoEquilibrioForm({ value: v, onChange }: FormProps<PuntoEquilibrioInput>) {
  const set =
    <K extends keyof PuntoEquilibrioInput>(k: K) =>
    (x: PuntoEquilibrioInput[K]) =>
      onChange({ ...v, [k]: x });
  return (
    <div className={grid}>
      <TextInput label="Producto" value={v.producto} onChange={set('producto')} maxLength={120} />
      <NumInput label="Precio de venta unitario" suffix="USD" value={v.precio} onChange={set('precio')} />
      <NumInput
        label="Costo variable unitario"
        suffix="USD"
        value={v.costoVariable}
        onChange={set('costoVariable')}
      />
      <NumInput
        label="Costos fijos del período"
        suffix="USD"
        value={v.costosFijos}
        onChange={set('costosFijos')}
      />
      <NumInput
        label="Ventas esperadas"
        suffix="unidades"
        value={v.ventasEsperadas}
        onChange={set('ventasEsperadas')}
        hint="Opcional: 0 si no aplica."
      />
      <NumInput
        label="Utilidad deseada"
        suffix="USD"
        value={v.utilidadObjetivo}
        onChange={set('utilidadObjetivo')}
        hint="Opcional: 0 si no aplica."
      />
    </div>
  );
}

export function EvaluacionForm({ value: v, onChange }: FormProps<EvaluacionInput>) {
  const set =
    <K extends keyof EvaluacionInput>(k: K) =>
    (x: EvaluacionInput[K]) =>
      onChange({ ...v, [k]: x });
  return (
    <div className="space-y-4">
      <div className={grid}>
        <TextInput label="Proyecto" value={v.proyecto} onChange={set('proyecto')} maxLength={120} />
        <NumInput label="Inversión inicial" suffix="USD" value={v.inversion} onChange={set('inversion')} />
        <NumInput label="Tasa de descuento" suffix="% anual" value={v.tasa} onChange={set('tasa')} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {v.flujos.map((f, i) => (
          <NumInput
            key={i}
            label={`Flujo del año ${i + 1}`}
            suffix="USD"
            value={f}
            onChange={(x) => set('flujos')(v.flujos.map((y, j) => (j === i ? x : y)))}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <AddButton
          label="Agregar año"
          disabled={v.flujos.length >= MAX_FLUJOS}
          onClick={() => set('flujos')([...v.flujos, 0])}
        />
        {v.flujos.length > 1 ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => set('flujos')(v.flujos.slice(0, -1))}
          >
            Quitar el último año
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function RazonesForm({ value: v, onChange }: FormProps<RazonesInput>) {
  const set =
    <K extends keyof RazonesInput>(k: K) =>
    (x: RazonesInput[K]) =>
      onChange({ ...v, [k]: x });
  const n = (k: keyof Omit<RazonesInput, 'empresa'>, label: string, hint?: string) => (
    <NumInput label={label} suffix="USD" value={v[k]} onChange={set(k)} {...(hint ? { hint } : {})} />
  );
  return (
    <div className="space-y-4">
      <TextInput
        label="Empresa"
        value={v.empresa}
        onChange={set('empresa')}
        maxLength={120}
        className="max-w-md"
      />
      <h3 className="eyebrow">Estado de situación financiera (al cierre)</h3>
      <div className={grid}>
        {n('activoCorriente', 'Activo corriente')}
        {n('inventarioFinal', 'Inventarios')}
        {n('cuentasPorCobrarFinal', 'Cuentas por cobrar')}
        {n('activoTotal', 'Activo total')}
        {n('pasivoCorriente', 'Pasivo corriente')}
        {n('pasivoTotal', 'Pasivo total')}
        {n('patrimonio', 'Patrimonio')}
      </div>
      <h3 className="eyebrow">Estado de resultados del año</h3>
      <div className={grid}>
        {n('ventas', 'Ventas', 'Si conoces las ventas a crédito, úsalas para la rotación de cartera.')}
        {n('costoVentas', 'Costo de ventas')}
        {n('utilidadNeta', 'Utilidad neta')}
      </div>
      <h3 className="eyebrow">Saldos al inicio del año (opcional, para los promedios)</h3>
      <div className={grid}>
        {n('inventarioInicial', 'Inventarios iniciales')}
        {n('cuentasPorCobrarInicial', 'Cuentas por cobrar iniciales')}
      </div>
    </div>
  );
}

export function KardexForm({ value: v, onChange }: FormProps<KardexInput>) {
  const rows = useRowKeys(v.movimientos.length);
  const setMov = (i: number, patch: Partial<KardexInput['movimientos'][number]>) =>
    onChange({ ...v, movimientos: v.movimientos.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  return (
    <div className="space-y-4">
      <div className={grid}>
        <TextInput
          label="Producto"
          value={v.producto}
          onChange={(x) => onChange({ ...v, producto: x })}
          maxLength={120}
        />
        <SelectInput
          label="Método"
          value={v.metodo}
          onChange={(x) => onChange({ ...v, metodo: x })}
          options={[
            { value: 'promedio', label: 'Promedio ponderado' },
            { value: 'peps', label: 'PEPS (primeras entradas, primeras salidas)' },
          ]}
        />
      </div>
      <RowCard title="Inventario inicial">
        <div className="grid grid-cols-3 gap-3">
          <TextInput
            label="Fecha"
            value={v.inicial.fecha}
            onChange={(x) => onChange({ ...v, inicial: { ...v.inicial, fecha: x } })}
            maxLength={20}
          />
          <NumInput
            label="Cantidad"
            value={v.inicial.cantidad}
            onChange={(x) => onChange({ ...v, inicial: { ...v.inicial, cantidad: x } })}
          />
          <NumInput
            label="Costo unitario"
            value={v.inicial.costoUnitario}
            onChange={(x) => onChange({ ...v, inicial: { ...v.inicial, costoUnitario: x } })}
          />
        </div>
      </RowCard>
      {v.movimientos.map((m, i) => (
        <RowCard
          key={rows.keys[i] ?? i}
          title={`Movimiento ${i + 1}`}
          onRemove={() => {
            rows.remove(i);
            onChange({ ...v, movimientos: v.movimientos.filter((_, j) => j !== i) });
          }}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <TextInput
              label="Fecha"
              value={m.fecha}
              onChange={(x) => setMov(i, { fecha: x })}
              maxLength={20}
            />
            <TextInput label="Detalle" value={m.detalle} onChange={(x) => setMov(i, { detalle: x })} />
            <SelectInput
              label="Tipo"
              value={m.tipo}
              onChange={(x) => setMov(i, { tipo: x })}
              options={[
                { value: 'compra', label: 'Compra (entrada)' },
                { value: 'venta', label: 'Venta (salida)' },
              ]}
            />
            <NumInput label="Cantidad" value={m.cantidad} onChange={(x) => setMov(i, { cantidad: x })} />
            {m.tipo === 'compra' ? (
              <NumInput
                label="Costo unitario"
                value={m.costoUnitario}
                onChange={(x) => setMov(i, { costoUnitario: x })}
              />
            ) : null}
          </div>
        </RowCard>
      ))}
      <AddButton
        label="Agregar movimiento"
        disabled={v.movimientos.length >= MAX_MOVIMIENTOS}
        onClick={() => {
          rows.add();
          onChange({
            ...v,
            movimientos: [
              ...v.movimientos,
              { fecha: '', detalle: '', tipo: 'venta', cantidad: 0, costoUnitario: 0 },
            ],
          });
        }}
      />
    </div>
  );
}

export function RolPagosForm({ value: v, onChange }: FormProps<RolPagosInput>) {
  const rows = useRowKeys(v.trabajadores.length);
  const setT = (i: number, patch: Partial<RolPagosInput['trabajadores'][number]>) =>
    onChange({ ...v, trabajadores: v.trabajadores.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  return (
    <div className="space-y-4">
      <div className={grid}>
        <TextInput
          label="Empresa"
          value={v.empresa}
          onChange={(x) => onChange({ ...v, empresa: x })}
          maxLength={120}
        />
        <TextInput
          label="Mes"
          value={v.periodo}
          onChange={(x) => onChange({ ...v, periodo: x })}
          maxLength={40}
        />
      </div>
      {v.trabajadores.map((t, i) => (
        <RowCard
          key={rows.keys[i] ?? i}
          title={`Trabajador ${i + 1}`}
          onRemove={
            v.trabajadores.length > 1
              ? () => {
                  rows.remove(i);
                  onChange({ ...v, trabajadores: v.trabajadores.filter((_, j) => j !== i) });
                }
              : undefined
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TextInput label="Nombre" value={t.nombre} onChange={(x) => setT(i, { nombre: x })} />
            <NumInput
              label="Sueldo mensual"
              suffix="USD"
              value={t.sueldo}
              onChange={(x) => setT(i, { sueldo: x })}
            />
            <NumInput
              label="Horas suplementarias"
              value={t.horasSuplementarias}
              onChange={(x) => setT(i, { horasSuplementarias: x })}
              hint="Hasta las 24:00."
            />
            <NumInput
              label="Horas extraordinarias"
              value={t.horasExtraordinarias}
              onChange={(x) => setT(i, { horasExtraordinarias: x })}
              hint="De 24:00 a 06:00 y fines de semana."
            />
            <NumInput
              label="Comisiones"
              suffix="USD"
              value={t.comisiones}
              onChange={(x) => setT(i, { comisiones: x })}
            />
            <NumInput
              label="Meses de antigüedad"
              value={t.mesesAntiguedad}
              onChange={(x) => setT(i, { mesesAntiguedad: x })}
            />
            <NumInput
              label="Otros descuentos"
              suffix="USD"
              value={t.otrosDescuentos}
              onChange={(x) => setT(i, { otrosDescuentos: x })}
              hint="Anticipos, préstamos…"
            />
          </div>
          <CheckInput
            label="Cobra los décimos cada mes"
            checked={t.decimosMensualizados}
            onChange={(x) => setT(i, { decimosMensualizados: x })}
          />
        </RowCard>
      ))}
      <AddButton
        label="Agregar trabajador"
        disabled={v.trabajadores.length >= MAX_TRABAJADORES}
        onClick={() => {
          rows.add();
          onChange({
            ...v,
            trabajadores: [
              ...v.trabajadores,
              {
                nombre: '',
                cargo: '',
                sueldo: 0,
                horasSuplementarias: 0,
                horasExtraordinarias: 0,
                comisiones: 0,
                mesesAntiguedad: 0,
                decimosMensualizados: false,
                otrosDescuentos: 0,
              },
            ],
          });
        }}
      />
    </div>
  );
}

type AsientoInput = LibroDiarioInput['asientos'][number];
type LineaInput = AsientoInput['lineas'][number];
const emptyLine = (): LineaInput => ({ cuenta: '', tipo: 'activo', debe: 0, haber: 0 });

function AsientoCard({
  index,
  asiento: a,
  onChange,
  onRemove,
}: {
  index: number;
  asiento: AsientoInput;
  onChange: (next: AsientoInput) => void;
  onRemove?: () => void;
}) {
  const lines = useRowKeys(a.lineas.length);
  const setL = (k: number, patch: Partial<LineaInput>) =>
    onChange({ ...a, lineas: a.lineas.map((l, j) => (j === k ? { ...l, ...patch } : l)) });
  return (
    <RowCard title={`Asiento ${index + 1}`} onRemove={onRemove}>
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          label="Fecha"
          value={a.fecha}
          onChange={(x) => onChange({ ...a, fecha: x })}
          maxLength={20}
        />
        <TextInput
          label="Concepto (P/R)"
          value={a.concepto}
          onChange={(x) => onChange({ ...a, concepto: x })}
          maxLength={120}
        />
      </div>
      {a.lineas.map((l, k) => (
        <div
          key={lines.keys[k] ?? k}
          className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto]"
        >
          <TextInput
            label={`Cuenta ${k + 1}`}
            value={l.cuenta}
            onChange={(x) => setL(k, { cuenta: x })}
            maxLength={60}
            list="cuentas-sugeridas"
          />
          <SelectInput
            label="Tipo"
            value={l.tipo}
            onChange={(x) => setL(k, { tipo: x })}
            options={ACCOUNT_KINDS.map((kind) => ({ value: kind, label: KIND_LABEL[kind] }))}
          />
          <NumInput label="Debe" value={l.debe} onChange={(x) => setL(k, { debe: x })} />
          <NumInput label="Haber" value={l.haber} onChange={(x) => setL(k, { haber: x })} />
          <button
            type="button"
            className="btn btn-ghost min-h-11 px-3"
            aria-label={`Quitar la cuenta ${k + 1} del asiento ${index + 1}`}
            disabled={a.lineas.length <= 2}
            onClick={() => {
              lines.remove(k);
              onChange({ ...a, lineas: a.lineas.filter((_, j) => j !== k) });
            }}
          >
            ×
          </button>
        </div>
      ))}
      <AddButton
        label="Agregar cuenta"
        disabled={a.lineas.length >= 20}
        onClick={() => {
          lines.add();
          onChange({ ...a, lineas: [...a.lineas, emptyLine()] });
        }}
      />
    </RowCard>
  );
}

export function LibroDiarioForm({ value: v, onChange }: FormProps<LibroDiarioInput>) {
  const rows = useRowKeys(v.asientos.length);
  return (
    <div className="space-y-4">
      <datalist id="cuentas-sugeridas">
        {SUGGESTED_ACCOUNTS.map((c) => (
          <option key={c.cuenta} value={c.cuenta} />
        ))}
      </datalist>
      <TextInput
        label="Empresa"
        value={v.empresa}
        onChange={(x) => onChange({ ...v, empresa: x })}
        maxLength={120}
        className="max-w-md"
      />
      {v.asientos.map((a, i) => (
        <AsientoCard
          key={rows.keys[i] ?? i}
          index={i}
          asiento={a}
          onChange={(next) => onChange({ ...v, asientos: v.asientos.map((x, j) => (j === i ? next : x)) })}
          onRemove={
            v.asientos.length > 1
              ? () => {
                  rows.remove(i);
                  onChange({ ...v, asientos: v.asientos.filter((_, j) => j !== i) });
                }
              : undefined
          }
        />
      ))}
      <AddButton
        label="Agregar asiento"
        disabled={v.asientos.length >= MAX_ASIENTOS}
        onClick={() => {
          rows.add();
          onChange({
            ...v,
            asientos: [...v.asientos, { fecha: '', concepto: '', lineas: [emptyLine(), emptyLine()] }],
          });
        }}
      />
    </div>
  );
}
