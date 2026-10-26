import type { ComponentType } from 'react';
import {
  AmortizacionForm,
  DepreciacionForm,
  EvaluacionForm,
  KardexForm,
  LibroDiarioForm,
  PuntoEquilibrioForm,
  RazonesForm,
  RolPagosForm,
  type FormProps,
} from './forms';

/** The input form of each deliverable, by id. */
export const FORMS: Record<string, ComponentType<FormProps<unknown>>> = {
  amortizacion: AmortizacionForm as unknown as ComponentType<FormProps<unknown>>,
  depreciacion: DepreciacionForm as unknown as ComponentType<FormProps<unknown>>,
  'punto-equilibrio': PuntoEquilibrioForm as unknown as ComponentType<FormProps<unknown>>,
  'evaluacion-proyecto': EvaluacionForm as unknown as ComponentType<FormProps<unknown>>,
  'razones-financieras': RazonesForm as unknown as ComponentType<FormProps<unknown>>,
  kardex: KardexForm as unknown as ComponentType<FormProps<unknown>>,
  'rol-pagos': RolPagosForm as unknown as ComponentType<FormProps<unknown>>,
  'libro-diario': LibroDiarioForm as unknown as ComponentType<FormProps<unknown>>,
};
