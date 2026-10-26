import { useState } from 'react';
import type { ToolInfo } from '../../../domain/tools/catalog';
import {
  incomeTaxPersonas,
  incomeTaxSociedades,
  IR_PERSONAS_2026,
  ivaFromBase,
  ivaFromTotal,
  IVA_TARIFA_GENERAL,
  rimpeTax,
} from '../../../domain/tools/tax';
import { Tabs } from '../../../ui/primitives';
import { NumberField, Stat, ToolLayout } from '../ToolLayout';
import { money, num, pct, readNumber } from '../format';

type Mode = 'iva' | 'renta' | 'rimpe';

function IvaPanel() {
  const [monto, setMonto] = useState('100');
  const [tarifa, setTarifa] = useState(String(IVA_TARIFA_GENERAL * 100));
  const [incluye, setIncluye] = useState(false);
  const m = readNumber(monto);
  const t = readNumber(tarifa);
  let result: ReturnType<typeof ivaFromBase> | null = null;
  let error = '';
  try {
    if (m !== null && t !== null) result = incluye ? ivaFromTotal(m, t / 100) : ivaFromBase(m, t / 100);
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
      <div className="card space-y-4 p-5">
        <NumberField
          id="iva-monto"
          label={incluye ? 'Precio final (incluye IVA)' : 'Precio sin IVA (base)'}
          value={monto}
          onChange={setMonto}
          suffix="USD"
        />
        <NumberField
          id="iva-tarifa"
          label="Tarifa del IVA"
          value={tarifa}
          onChange={setTarifa}
          suffix="%"
          hint="15 % es la tarifa general desde el 1 de abril de 2024 (Decreto Ejecutivo 198). Confírmala en sri.gob.ec."
        />
        <label className="flex items-center gap-3 text-sm font-semibold text-ink-2">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--red)]"
            checked={incluye}
            onChange={(e) => setIncluye(e.target.checked)}
          />
          El precio ya incluye IVA
        </label>
      </div>
      <div aria-live="polite">
        {error ? <p className="text-sm font-semibold text-warn">{error}</p> : null}
        {result ? (
          <dl className="grid gap-3 sm:grid-cols-3">
            <Stat label="Base imponible" value={money(result.base)} />
            <Stat label="IVA" value={money(result.iva)} />
            <Stat label="Total" value={money(result.total)} />
          </dl>
        ) : null}
      </div>
    </div>
  );
}

function RentaPanel() {
  const [base, setBase] = useState('18000');
  const [tipo, setTipo] = useState<'persona' | 'sociedad'>('persona');
  const b = readNumber(base);
  let error = '';
  let persona: ReturnType<typeof incomeTaxPersonas> | null = null;
  let sociedad: number | null = null;
  try {
    if (b !== null) {
      if (tipo === 'persona') persona = incomeTaxPersonas(b);
      else sociedad = incomeTaxSociedades(b);
    }
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <div className="card space-y-4 p-5">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink-2">Contribuyente</legend>
            <div className="flex flex-wrap gap-2">
              {(['persona', 'sociedad'] as const).map((v) => (
                <label
                  key={v}
                  className={`chip min-h-10 cursor-pointer ${tipo === v ? 'border-red bg-red-soft text-red' : ''}`}
                >
                  <input
                    type="radio"
                    name="contribuyente"
                    className="sr-only"
                    checked={tipo === v}
                    onChange={() => setTipo(v)}
                  />
                  {v === 'persona' ? 'Persona natural' : 'Sociedad'}
                </label>
              ))}
            </div>
          </fieldset>
          <NumberField
            id="renta-base"
            label="Base imponible anual"
            value={base}
            onChange={setBase}
            suffix="USD"
            hint="Ingresos gravados menos costos, gastos y deducciones; en relación de dependencia, menos el aporte personal al IESS."
          />
        </div>
        <div aria-live="polite" className="space-y-3">
          {error ? <p className="text-sm font-semibold text-warn">{error}</p> : null}
          {persona ? (
            <>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Stat label="Impuesto causado" value={money(persona.impuesto)} />
                <Stat
                  label="Tarifa del tramo"
                  value={pct(persona.tramo.porcentaje, 0)}
                  hint={`Sobre el excedente de ${money(persona.tramo.desde)}`}
                />
              </dl>
              <p className="text-sm text-ink-2">
                {money(persona.tramo.impuestoFraccion)} de la fracción básica +{' '}
                {pct(persona.tramo.porcentaje, 0)} × {money(persona.excedente)} de excedente ={' '}
                <strong>{money(persona.impuesto)}</strong>. La rebaja por gastos personales se resta después,
                sobre este impuesto.
              </p>
            </>
          ) : null}
          {sociedad !== null ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <Stat
                label="Impuesto (tarifa general 25 %)"
                value={money(sociedad)}
                hint="La ley prevé aumentos o reducciones en casos específicos."
              />
            </dl>
          ) : null}
        </div>
      </div>
      {tipo === 'persona' ? (
        <div
          className="card overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Tabla 2026 del impuesto a la renta"
        >
          <table className="tnum w-full text-left text-sm">
            <caption className="px-4 pt-3 text-left text-sm font-semibold">
              Tabla 2026, personas naturales (Res. NAC-DGERCGC25-00000043)
            </caption>
            <thead className="border-b border-line text-xs text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-2">
                  Fracción básica
                </th>
                <th scope="col" className="px-4 py-2">
                  Exceso hasta
                </th>
                <th scope="col" className="px-4 py-2">
                  Impuesto fracción básica
                </th>
                <th scope="col" className="px-4 py-2">
                  % sobre el excedente
                </th>
              </tr>
            </thead>
            <tbody>
              {IR_PERSONAS_2026.map((r) => (
                <tr
                  key={r.desde}
                  className={`border-b border-line last:border-0 ${persona?.tramo === r ? 'bg-red-tint font-semibold' : ''}`}
                >
                  <td className="px-4 py-1.5">{num(r.desde, 0)}</td>
                  <td className="px-4 py-1.5">{r.hasta === null ? 'en adelante' : num(r.hasta, 0)}</td>
                  <td className="px-4 py-1.5">{num(r.impuestoFraccion, 0)}</td>
                  <td className="px-4 py-1.5">{pct(r.porcentaje, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function RimpePanel() {
  const [ingresos, setIngresos] = useState('12000');
  const [popular, setPopular] = useState(true);
  const i = readNumber(ingresos);
  let error = '';
  let result: ReturnType<typeof rimpeTax> | null = null;
  try {
    if (i !== null) result = rimpeTax(i, popular);
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
      <div className="card space-y-4 p-5">
        <NumberField
          id="rimpe-ingresos"
          label="Ingresos brutos del año anterior"
          value={ingresos}
          onChange={setIngresos}
          suffix="USD"
        />
        <label className="flex items-center gap-3 text-sm font-semibold text-ink-2">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--red)]"
            checked={popular}
            onChange={(e) => setPopular(e.target.checked)}
          />
          Es negocio popular (persona natural con ingresos de hasta USD 20 000)
        </label>
      </div>
      <div aria-live="polite" className="space-y-3">
        {error ? <p className="text-sm font-semibold text-warn">{error}</p> : null}
        {result?.regimen === 'negocio-popular' ? (
          <dl className="grid gap-3">
            <Stat
              label="Cuota anual (negocio popular)"
              value={money(result.impuesto)}
              hint="La cuota incluye el IVA; se declara entre el 10 y el 28 de mayo según el noveno dígito del RUC."
            />
          </dl>
        ) : null}
        {result?.regimen === 'emprendedor' ? (
          <dl className="grid gap-3">
            <Stat
              label="Impuesto a la renta (emprendedor)"
              value={money(result.impuesto)}
              hint={`${money(result.tramo.impuestoFraccion)} + ${pct(result.tramo.porcentaje)} sobre lo que excede ${money(result.tramo.desde)}. Se calcula sobre ingresos brutos.`}
            />
          </dl>
        ) : null}
        {result?.regimen === 'fuera' ? (
          <p className="text-sm font-semibold text-warn">
            Con más de USD 300 000 de ingresos no se aplica el RIMPE.
          </p>
        ) : null}
        {result?.regimen === 'sin-tramo' ? (
          <p className="text-sm font-semibold text-warn">
            La tabla publicada para emprendedores empieza en USD 20 000; para un monto menor consulta
            directamente al SRI.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function TaxTool({ tool }: { tool: ToolInfo }) {
  const [mode, setMode] = useState<Mode>('iva');
  return (
    <ToolLayout
      tool={tool}
      aviso="Cálculo educativo con la normativa vigente al 25 de octubre de 2026. No reemplaza la información oficial del SRI ni la asesoría de un profesional; las tarifas y tablas cambian."
      metodo={
        <>
          <p>
            IVA: base × tarifa; para separar un precio final se divide para (1 + tarifa). La tarifa general de
            15 % rige desde el 1 de abril de 2024 (Decreto Ejecutivo 198, página del IVA del SRI).
          </p>
          <p>
            Renta de personas naturales: impuesto de la fracción básica + porcentaje del tramo sobre el
            excedente, con la tabla 2026 del SRI (Res. NAC-DGERCGC25-00000043, 2.º Supl. R.O. 194,
            30-12-2025). Sociedades: tarifa general de 25 %.
          </p>
          <p>
            RIMPE: cuota fija para negocios populares y fracción básica más tipo marginal sobre ingresos
            brutos para emprendedores, según la página oficial del RIMPE del SRI.
          </p>
        </>
      }
    >
      <Tabs<Mode>
        label="Cálculo"
        value={mode}
        onChange={setMode}
        tabs={[
          { id: 'iva', label: 'IVA' },
          { id: 'renta', label: 'Impuesto a la renta' },
          { id: 'rimpe', label: 'RIMPE' },
        ]}
      />
      {mode === 'iva' ? <IvaPanel /> : mode === 'renta' ? <RentaPanel /> : <RimpePanel />}
    </ToolLayout>
  );
}
