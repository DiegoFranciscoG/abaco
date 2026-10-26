import { amortizacion } from './amortizacion';
import { depreciacion } from './depreciacion';
import { evaluacionProyecto } from './evaluacion-proyecto';
import { kardex } from './kardex';
import { libroDiario } from './libro-diario';
import { puntoEquilibrio } from './punto-equilibrio';
import { razonesFinancieras } from './razones-financieras';
import { rolPagos } from './rol-pagos';
import type { DeliverableDefinition } from './types';

/** Every deliverable with its calculation and spreadsheet; the catalog (catalog.ts) holds only their names. */
export const DEFINITIONS: Record<string, DeliverableDefinition<unknown>> = Object.fromEntries(
  [
    libroDiario,
    kardex,
    rolPagos,
    amortizacion,
    depreciacion,
    puntoEquilibrio,
    evaluacionProyecto,
    razonesFinancieras,
  ].map((d) => [d.id, d as unknown as DeliverableDefinition<unknown>]),
);
