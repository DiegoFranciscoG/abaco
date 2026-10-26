import { useState } from 'react';
import type { ToolInfo } from '../../../domain/tools/catalog';
import { computePayroll, DEFAULT_PAYROLL, type PayrollLine } from '../../../domain/tools/payroll';
import { NumberField, Stat, ToolLayout } from '../ToolLayout';
import { money, readNumber } from '../format';

function Lines({ title, lines }: { title: string; lines: PayrollLine[] }) {
  return (
    <div className="card overflow-x-auto" tabIndex={0} role="region" aria-label={title}>
      <table className="tnum w-full text-left text-sm">
        <caption className="px-4 pt-3 text-left text-sm font-semibold">{title}</caption>
        <thead className="border-b border-line text-xs text-muted uppercase">
          <tr>
            <th scope="col" className="px-4 py-2">
              Concepto
            </th>
            <th scope="col" className="px-4 py-2 text-right">
              Valor
            </th>
            <th scope="col" className="px-4 py-2">
              Base legal
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.concepto} className="border-b border-line align-top last:border-0">
              <td className="px-4 py-2 font-semibold">{l.concepto}</td>
              <td className="px-4 py-2 text-right">{money(l.valor)}</td>
              <td className="px-4 py-2 text-muted">{l.base}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PayrollTool({ tool }: { tool: ToolInfo }) {
  const [form, setForm] = useState({
    sueldo: String(DEFAULT_PAYROLL.sueldo),
    horasSuplementarias: '0',
    horasNocturnas: '0',
    comisiones: '0',
    mesesAntiguedad: '0',
    sbu: String(DEFAULT_PAYROLL.sbu),
    horasMes: String(DEFAULT_PAYROLL.horasMes),
    otrasPatronales: '0',
  });
  const [mensualizados, setMensualizados] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const values = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, readNumber(v)])) as Record<
    keyof typeof form,
    number | null
  >;
  let error = '';
  let result: ReturnType<typeof computePayroll> | null = null;
  if (Object.values(values).some((v) => v === null)) error = 'Completa todos los campos con números.';
  else {
    try {
      result = computePayroll({
        ...(values as Record<keyof typeof form, number>),
        decimosMensualizados: mensualizados,
      });
    } catch (e) {
      error = (e as Error).message;
    }
  }

  return (
    <ToolLayout
      tool={tool}
      aviso="Simulación educativa para un trabajador del sector privado en relación de dependencia. No reemplaza la planilla del IESS ni la asesoría de un profesional; revisa siempre las tasas y el salario básico vigentes."
      metodo={
        <>
          <p>
            Aportes: tabla oficial de tasas del IESS para el sector privado, 9,45 % personal y 11,15 %
            patronal sobre la materia gravada (sueldo, horas extra y comisiones). La décima tercera no forma
            parte de esa base (Código del Trabajo, art. 112).
          </p>
          <p>
            Horas extra: art. 55, con 50 % de recargo hasta las 24:00 y 100 % entre las 24:00 y las 06:00,
            sobre el valor de la hora. El divisor de 240 horas al mes (30 días × 8 horas) es el habitual y el
            que el Código fija para la contratación colectiva del sector público; puedes cambiarlo.
          </p>
          <p>
            Décimos y fondo de reserva: art. 111 (doceava parte de lo percibido), art. 113 (doceava parte del
            salario básico unificado, USD 482 en 2026) y art. 196 (un mes por cada año completo después del
            primero, es decir 8,33 % mensual desde el mes 13).
          </p>
          <p>
            Las contribuciones de 0,5 % al IECE y 0,5 % al SECAP que citan algunas guías no constan en la
            tabla oficial del IESS consultada; si tu caso las tiene, súmalas en «otras contribuciones».
          </p>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="card space-y-4 p-5">
          <NumberField
            id="rp-sueldo"
            label="Sueldo mensual"
            value={form.sueldo}
            onChange={set('sueldo')}
            suffix="USD"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="rp-sup"
              label="Horas al 50 %"
              value={form.horasSuplementarias}
              onChange={set('horasSuplementarias')}
              suffix="horas"
            />
            <NumberField
              id="rp-noc"
              label="Horas al 100 %"
              value={form.horasNocturnas}
              onChange={set('horasNocturnas')}
              suffix="horas"
            />
          </div>
          <NumberField
            id="rp-com"
            label="Comisiones del mes"
            value={form.comisiones}
            onChange={set('comisiones')}
            suffix="USD"
          />
          <NumberField
            id="rp-ant"
            label="Meses trabajados antes de este mes"
            value={form.mesesAntiguedad}
            onChange={set('mesesAntiguedad')}
            suffix="meses"
            hint="Con 12 o más empieza el fondo de reserva."
          />
          <label className="flex items-center gap-3 text-sm font-semibold text-ink-2">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--red)]"
              checked={mensualizados}
              onChange={(e) => setMensualizados(e.target.checked)}
            />
            Recibe los décimos cada mes
          </label>
          <details className="rounded-xl border border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold">Parámetros</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <NumberField
                id="rp-sbu"
                label="Salario básico unificado"
                value={form.sbu}
                onChange={set('sbu')}
                suffix="USD"
              />
              <NumberField
                id="rp-horas"
                label="Horas del mes"
                value={form.horasMes}
                onChange={set('horasMes')}
                suffix="horas"
              />
              <NumberField
                id="rp-otras"
                label="Otras contribuciones patronales"
                value={form.otrasPatronales}
                onChange={set('otrasPatronales')}
                suffix="%"
              />
            </div>
          </details>
        </div>
        <div className="space-y-4" aria-live="polite">
          {error ? <p className="text-sm font-semibold text-warn">{error}</p> : null}
          {result ? (
            <>
              <dl className="grid gap-3 sm:grid-cols-3">
                <Stat label="Total ingresos" value={money(result.totalIngresos)} />
                <Stat label="Neto a recibir" value={money(result.netoAPagar)} tone="good" />
                <Stat label="Costo para el empleador" value={money(result.costoTotalEmpleador)} />
              </dl>
              {result.advertencias.map((a) => (
                <p key={a} className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-ink-2">
                  {a}
                </p>
              ))}
              <Lines title="Ingresos del trabajador" lines={result.ingresos} />
              <Lines title="Descuentos" lines={result.descuentos} />
              <Lines title="Costos adicionales del empleador" lines={result.costosEmpleador} />
            </>
          ) : null}
        </div>
      </div>
    </ToolLayout>
  );
}
