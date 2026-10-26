import { useState } from 'react';
import type { ToolInfo } from '../../../domain/tools/catalog';
import { equilibrium, priceControl, taxEffect, type MarketInput } from '../../../domain/tools/market';
import { LineChart } from '../../../ui/charts';
import { ToolLayout } from '../ToolLayout';
import { money, num } from '../format';

function Slider({ id, label, value, min, max, step, onChange, hint }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; hint: string }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 flex items-baseline justify-between text-sm font-semibold text-ink-2">
        <span>{label}</span>
        <span className="tnum text-ink">{num(value)}</span>
      </span>
      <input id={id} type="range" className="w-full accent-[var(--red)]" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="block text-xs text-muted">{hint}</span>
    </label>
  );
}

export default function MarketTool({ tool }: { tool: ToolInfo }) {
  const [m, setM] = useState<MarketInput>({ g: 100, h: 1, e: 10, f: 0.5 });
  const [impuesto, setImpuesto] = useState(0);
  const [control, setControl] = useState<'ninguno' | 'maximo' | 'minimo'>('ninguno');
  const [precioControl, setPrecioControl] = useState(30);
  const set = (key: keyof MarketInput) => (v: number) => setM((prev) => ({ ...prev, [key]: v }));

  let error = '';
  let eq: ReturnType<typeof equilibrium> | null = null;
  try {
    eq = equilibrium(m);
  } catch (e) {
    error = (e as Error).message;
  }
  const tax = eq && impuesto > 0 ? taxEffect(m, impuesto) : null;
  const ctl = eq && control !== 'ninguno' ? priceControl(m, precioControl, control) : null;
  const qMax = m.g / m.h;
  const qs = Array.from({ length: 41 }, (_, i) => (qMax * i) / 40);

  return (
    <ToolLayout
      tool={tool}
      metodo={
        <>
          <p>Curvas lineales: demanda P = g − h·Q y oferta P = e + f·Q. El equilibrio está donde se cruzan: Q* = (g − e) ÷ (h + f). Los excedentes son las áreas de los triángulos entre las curvas y el precio de equilibrio; la elasticidad se mide en el punto de equilibrio, (ΔQ/ΔP)·(P/Q).</p>
          <p>Un impuesto por unidad cobrado al vendedor sube la oferta en esa cantidad; los precios máximos por debajo del equilibrio crean escasez y los mínimos por encima, excedente (OpenStax, Principles of Microeconomics 3e, capítulos 3 y 5).</p>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.7fr]">
        <div className="card space-y-5 p-5">
          <Slider id="mk-g" label="Demanda: precio máximo (g)" value={m.g} min={20} max={200} step={1} onChange={set('g')} hint="Más alto = la demanda se desplaza a la derecha (más ingreso, gustos)." />
          <Slider id="mk-h" label="Demanda: pendiente (h)" value={m.h} min={0.1} max={4} step={0.1} onChange={set('h')} hint="Más pequeña = demanda más plana (más elástica)." />
          <Slider id="mk-e" label="Oferta: precio mínimo (e)" value={m.e} min={0} max={90} step={1} onChange={set('e')} hint="Más alto = la oferta se desplaza hacia arriba (insumos más caros)." />
          <Slider id="mk-f" label="Oferta: pendiente (f)" value={m.f} min={0.1} max={4} step={0.1} onChange={set('f')} hint="Más grande = la oferta responde menos al precio." />
          <Slider id="mk-t" label="Impuesto por unidad" value={impuesto} min={0} max={40} step={1} onChange={setImpuesto} hint="Lo paga el vendedor; mira quién termina cargando el costo." />
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-ink-2">Control de precios</legend>
            <div className="flex flex-wrap gap-2">
              {(['ninguno', 'maximo', 'minimo'] as const).map((c) => (
                <label key={c} className={`chip min-h-10 cursor-pointer ${control === c ? 'border-red bg-red-soft text-red' : ''}`}>
                  <input type="radio" name="control" className="sr-only" checked={control === c} onChange={() => setControl(c)} />
                  {c === 'ninguno' ? 'Ninguno' : c === 'maximo' ? 'Precio máximo' : 'Precio mínimo'}
                </label>
              ))}
            </div>
            {control !== 'ninguno' ? <Slider id="mk-pc" label="Precio fijado" value={precioControl} min={0} max={Math.round(m.g)} step={1} onChange={setPrecioControl} hint="Compáralo con el precio de equilibrio." /> : null}
          </fieldset>
        </div>
        <div className="space-y-4" aria-live="polite">
          {error ? <p className="text-sm font-semibold text-warn">{error}</p> : null}
          {eq ? (
            <>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="card p-4">
                  <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Equilibrio</dt>
                  <dd className="tnum mt-1 font-display text-xl font-semibold">
                    P* = {money(eq.precio)} · Q* = {num(eq.cantidad)}
                  </dd>
                </div>
                <div className="card p-4">
                  <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Excedentes</dt>
                  <dd className="tnum mt-1 text-sm">
                    Consumidor {money(eq.excedenteConsumidor)} · Productor {money(eq.excedenteProductor)}
                  </dd>
                </div>
                <div className="card p-4">
                  <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Elasticidad de la demanda</dt>
                  <dd className="tnum mt-1 text-sm">
                    {num(eq.elasticidadDemanda, 3)} ({Math.abs(eq.elasticidadDemanda) > 1 ? 'elástica' : Math.abs(eq.elasticidadDemanda) < 1 ? 'inelástica' : 'unitaria'})
                  </dd>
                </div>
              </dl>
              {tax ? (
                <p className="rounded-xl bg-red-tint px-4 py-3 text-sm text-ink-2">
                  Con un impuesto de {money(impuesto)}: el comprador paga {money(tax.precioConsumidor)}, el vendedor recibe {money(tax.precioProductor)}, se
                  venden {num(tax.cantidad)} unidades, el Estado recauda {money(tax.recaudacion)} y se pierden {money(tax.perdidaEficiencia)} de eficiencia.
                </p>
              ) : null}
              {ctl?.tipo === 'escasez' ? (
                <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-ink-2">
                  Escasez: se demandan {num(ctl.cantidadDemandada)} unidades pero solo se ofrecen {num(ctl.cantidadOfrecida)}; faltan {num(ctl.faltante)}.
                </p>
              ) : null}
              {ctl?.tipo === 'excedente' ? (
                <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-ink-2">
                  Excedente: se ofrecen {num(ctl.cantidadOfrecida)} unidades pero solo se demandan {num(ctl.cantidadDemandada)}; sobran {num(ctl.sobrante)}.
                </p>
              ) : null}
              {ctl?.tipo === 'sin-efecto' ? <p className="text-sm text-muted">Ese control no tiene efecto: no limita el precio de equilibrio.</p> : null}
              <LineChart
                title="Mercado: oferta y demanda"
                summary={`El equilibrio está en un precio de ${num(eq.precio)} y una cantidad de ${num(eq.cantidad)}.`}
                xLabel="Cantidad"
                yLabel="Precio"
                series={[
                  { name: 'Demanda', points: qs.map((q) => ({ x: q, y: m.g - m.h * q })) },
                  { name: 'Oferta', points: qs.map((q) => ({ x: q, y: m.e + m.f * q })), color: 'var(--chart-2)' },
                  ...(tax ? [{ name: 'Oferta con impuesto', points: qs.map((q) => ({ x: q, y: m.e + impuesto + m.f * q })), color: 'var(--chart-2)', dashed: true }] : []),
                ]}
                references={control !== 'ninguno' ? [{ axis: 'y', value: precioControl, label: control === 'maximo' ? 'Precio máximo' : 'Precio mínimo' }] : []}
                markers={[{ x: eq.cantidad, y: eq.precio, label: 'E' }, ...(tax ? [{ x: tax.cantidad, y: tax.precioConsumidor, label: 'Et' }] : [])]}
                table={{ columns: ['Cantidad', 'Precio de demanda', 'Precio de oferta'], rows: qs.filter((_, i) => i % 4 === 0).map((q) => [q, m.g - m.h * q, m.e + m.f * q]) }}
              />
            </>
          ) : null}
        </div>
      </div>
    </ToolLayout>
  );
}
