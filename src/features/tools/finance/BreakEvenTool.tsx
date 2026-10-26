import { useState } from 'react';
import type { ToolInfo } from '../../../domain/tools/catalog';
import { cvp } from '../../../domain/tools/finance';
import { LineChart } from '../../../ui/charts';
import { NumberField, Stat, ToolLayout } from '../ToolLayout';
import { money, num, pct, readNumber } from '../format';

export default function BreakEvenTool({ tool }: { tool: ToolInfo }) {
  const [precio, setPrecio] = useState('50');
  const [cv, setCv] = useState('30');
  const [cf, setCf] = useState('10000');
  const [ventas, setVentas] = useState('700');
  const p = readNumber(precio);
  const v = readNumber(cv);
  const f = readNumber(cf);
  const q = readNumber(ventas);
  let error = '';
  let r: ReturnType<typeof cvp> | null = null;
  if (p === null || v === null || f === null || q === null)
    error = 'Completa los cuatro valores con números.';
  else {
    try {
      r = cvp({ precio: p, costoVariable: v, costosFijos: f, ventasUnidades: q });
    } catch (e) {
      error = (e as Error).message;
    }
  }

  const maxQ = r ? Math.max(q ?? 0, r.equilibrioUnidades) * 1.5 || 10 : 10;
  const steps = 30;
  const xs = Array.from({ length: steps + 1 }, (_, i) => (maxQ * i) / steps);

  return (
    <ToolLayout
      tool={tool}
      metodo={
        <p>
          Margen de contribución unitario = precio − costo variable; punto de equilibrio = costos fijos ÷
          margen unitario; margen de seguridad = ventas − ventas de equilibrio; apalancamiento operativo =
          margen de contribución total ÷ utilidad operativa. Definiciones de OpenStax, Principles of
          Managerial Accounting, capítulo 3 (secciones 3.1, 3.2 y 3.5), las mismas de las fórmulas verificadas
          de ÁBACO.
        </p>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="card space-y-4 p-5">
          <NumberField
            id="pe-precio"
            label="Precio de venta"
            value={precio}
            onChange={setPrecio}
            suffix="USD por unidad"
          />
          <NumberField
            id="pe-cv"
            label="Costo variable"
            value={cv}
            onChange={setCv}
            suffix="USD por unidad"
          />
          <NumberField id="pe-cf" label="Costos fijos del período" value={cf} onChange={setCf} suffix="USD" />
          <NumberField
            id="pe-ventas"
            label="Ventas esperadas"
            value={ventas}
            onChange={setVentas}
            suffix="unidades"
          />
        </div>
        <div className="space-y-4" aria-live="polite">
          {error ? <p className="text-sm font-semibold text-warn">{error}</p> : null}
          {r && q !== null && p !== null && v !== null && f !== null ? (
            <>
              <dl className="grid gap-3 sm:grid-cols-3">
                <Stat
                  label="Punto de equilibrio"
                  value={`${num(r.equilibrioUnidades)} u`}
                  hint={money(r.equilibrioDolares)}
                />
                <Stat
                  label="Utilidad con esas ventas"
                  value={money(r.utilidad)}
                  tone={r.utilidad >= 0 ? 'good' : 'bad'}
                />
                <Stat
                  label="Margen de seguridad"
                  value={pct(r.margenSeguridadPct, 1)}
                  tone={r.margenSeguridadPct >= 0 ? 'good' : 'bad'}
                  hint={`${num(r.margenSeguridadUnidades)} unidades`}
                />
                <Stat
                  label="Margen de contribución"
                  value={money(r.margenUnitario)}
                  hint={`${pct(r.razonMargen, 1)} del precio`}
                />
                <Stat
                  label="Apalancamiento operativo"
                  value={r.apalancamientoOperativo === null ? '—' : num(r.apalancamientoOperativo)}
                  hint="Solo con utilidad positiva"
                />
              </dl>
              <LineChart
                title="Ingresos y costos según el volumen"
                summary={`Las rectas de ingreso y costo total se cruzan en ${num(r.equilibrioUnidades)} unidades, el punto de equilibrio.`}
                xLabel="Unidades vendidas"
                yLabel="USD"
                series={[
                  { name: 'Ingreso total', points: xs.map((x) => ({ x, y: p * x })) },
                  { name: 'Costo total', points: xs.map((x) => ({ x, y: f + v * x })) },
                  { name: 'Costos fijos', points: xs.map((x) => ({ x, y: f })), dashed: true },
                ]}
                references={[
                  { axis: 'x', value: r.equilibrioUnidades, label: 'Equilibrio' },
                  { axis: 'x', value: q, label: 'Ventas' },
                ]}
                markers={[{ x: r.equilibrioUnidades, y: r.equilibrioDolares, label: 'Equilibrio' }]}
                table={{
                  columns: ['Unidades', 'Ingreso total', 'Costo total', 'Utilidad'],
                  rows: xs.filter((_, i) => i % 3 === 0).map((x) => [x, p * x, f + v * x, (p - v) * x - f]),
                }}
              />
            </>
          ) : null}
        </div>
      </div>
    </ToolLayout>
  );
}
