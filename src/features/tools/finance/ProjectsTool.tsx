import { useState } from 'react';
import type { ToolInfo } from '../../../domain/tools/catalog';
import {
  irr,
  npv,
  npvProfile,
  payback,
  profitabilityIndex,
  signChanges,
} from '../../../domain/tools/finance';
import { parseData } from '../../../domain/tools/parse';
import { LineChart } from '../../../ui/charts';
import { NumberField, Stat, ToolLayout } from '../ToolLayout';
import { money, num, pct, readNumber } from '../format';

export default function ProjectsTool({ tool }: { tool: ToolInfo }) {
  const [flujosText, setFlujosText] = useState('-10000\n3000\n4000\n4000\n3500');
  const [tasaText, setTasaText] = useState('12');
  const { values: flujos, ignored } = parseData(flujosText);
  const tasa = readNumber(tasaText);

  let error = '';
  if (flujos.length < 2) error = 'Escribe al menos dos flujos: la inversión (negativa) y un flujo futuro.';
  else if (flujos.length > 60) error = 'Máximo 60 períodos.';
  else if (tasa === null || tasa <= -100) error = 'Escribe una tasa válida.';
  const ready = !error && tasa !== null;
  const i = (tasa ?? 0) / 100;
  const van = ready ? npv(i, flujos) : 0;
  const tir = ready ? irr(flujos) : null;
  const ir = ready ? profitabilityIndex(i, flujos) : null;
  const pb = ready ? payback(flujos) : null;
  const pbd = ready ? payback(flujos, i) : null;
  const profile = ready ? npvProfile(flujos, 0, Math.max(0.3, (tir ?? 0) * 1.6, i * 2)) : [];

  return (
    <ToolLayout
      tool={tool}
      metodo={
        <>
          <p>
            VAN = Σ F<sub>t</sub> ÷ (1 + i)<sup>t</sup>, con el flujo 0 sin descontar (OpenStax, Principles of
            Finance 2e, 16.2). TIR: la tasa que hace cero el VAN, hallada por bisección (16.3). Índice de
            rentabilidad: valor presente de los flujos futuros ÷ inversión. Período de recuperación simple y
            descontado (16.1), suponiendo que cada flujo llega de manera uniforme dentro de su período.
          </p>
          <p>
            Con más de un cambio de signo en los flujos puede haber varias TIR o ninguna; en ese caso el VAN
            es el criterio que manda.
          </p>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="card space-y-4 p-5">
          <label className="block" htmlFor="pj-flujos">
            <span className="mb-1 block text-sm font-semibold text-ink-2">
              Flujos de caja, uno por línea (el primero es hoy)
            </span>
            <textarea
              id="pj-flujos"
              className="field tnum min-h-44"
              value={flujosText}
              onChange={(e) => setFlujosText(e.target.value)}
              maxLength={2000}
            />
            <span className="mt-1 block text-xs text-muted">
              La inversión inicial va en negativo. Puedes pegar una columna desde la hoja de cálculo.
            </span>
          </label>
          {ignored.length > 0 ? (
            <p className="text-xs text-warn">Se ignoraron: {ignored.join(', ')}</p>
          ) : null}
          <NumberField
            id="pj-tasa"
            label="Tasa de descuento"
            value={tasaText}
            onChange={setTasaText}
            suffix="% por período"
          />
        </div>
        <div className="space-y-4" aria-live="polite">
          {error ? <p className="text-sm font-semibold text-warn">{error}</p> : null}
          {ready ? (
            <>
              <dl className="grid gap-3 sm:grid-cols-3">
                <Stat
                  label="VAN"
                  value={money(van)}
                  tone={van >= 0 ? 'good' : 'bad'}
                  hint={van >= 0 ? 'Crea valor a esa tasa' : 'Destruye valor a esa tasa'}
                />
                <Stat
                  label="TIR"
                  value={tir === null ? 'No existe' : pct(tir)}
                  hint={signChanges(flujos) > 1 ? 'Flujos no convencionales: revisa' : undefined}
                />
                <Stat label="Índice de rentabilidad" value={ir === null ? '—' : num(ir, 3)} />
                <Stat label="Recuperación" value={pb === null ? 'No se recupera' : `${num(pb)} períodos`} />
                <Stat
                  label="Recuperación descontada"
                  value={pbd === null ? 'No se recupera' : `${num(pbd)} períodos`}
                />
              </dl>
              <LineChart
                title="Perfil del VAN según la tasa de descuento"
                summary={
                  tir === null
                    ? 'El VAN no cruza cero en el rango mostrado.'
                    : `El VAN cae a medida que sube la tasa y cruza cero en la TIR, ${pct(tir)}.`
                }
                xLabel="Tasa de descuento"
                yLabel="VAN (USD)"
                formatX={(x) => `${num(x * 100, 0)} %`}
                series={[{ name: 'VAN', points: profile.map((p) => ({ x: p.tasa, y: p.van })) }]}
                references={[{ axis: 'x', value: i, label: `Tasa ${num(i * 100)} %` }]}
                markers={tir === null ? [] : [{ x: tir, y: 0, label: 'TIR' }]}
                table={{
                  columns: ['Tasa', 'VAN'],
                  rows: profile
                    .filter((_, k) => k % 5 === 0)
                    .map((p) => [`${num(p.tasa * 100, 1)} %`, p.van]),
                }}
              />
            </>
          ) : null}
        </div>
      </div>
    </ToolLayout>
  );
}
