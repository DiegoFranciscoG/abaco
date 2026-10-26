/**
 * Linear market model for the "Oferta y demanda" tool (OpenStax Principles of Microeconomics 3e, ch. 3 and 5).
 * Inverse curves: demand P = g − h·Q, supply P = e + f·Q, with g > e ≥ 0 and h, f > 0.
 */
export interface MarketInput {
  /** Demand: price at which quantity demanded is zero. */
  g: number;
  /** Demand: price drop per extra unit. */
  h: number;
  /** Supply: lowest price at which someone sells. */
  e: number;
  /** Supply: price increase per extra unit. */
  f: number;
}

export interface Equilibrium {
  precio: number;
  cantidad: number;
  excedenteConsumidor: number;
  excedenteProductor: number;
  /** Point price elasticity of demand at equilibrium (negative number). */
  elasticidadDemanda: number;
}

function validate({ g, h, e, f }: MarketInput): void {
  if (![g, h, e, f].every(Number.isFinite)) throw new RangeError('Todos los valores deben ser números.');
  if (h <= 0 || f <= 0) throw new RangeError('Las pendientes deben ser mayores que cero.');
  if (e < 0) throw new RangeError('El precio mínimo de la oferta no puede ser negativo.');
  if (g <= e) throw new RangeError('El precio máximo de la demanda debe superar el precio mínimo de la oferta.');
}

export function equilibrium(input: MarketInput): Equilibrium {
  validate(input);
  const { g, h, e, f } = input;
  const cantidad = (g - e) / (h + f);
  const precio = g - h * cantidad;
  return {
    precio,
    cantidad,
    excedenteConsumidor: 0.5 * cantidad * (g - precio),
    excedenteProductor: 0.5 * cantidad * (precio - e),
    elasticidadDemanda: (-1 / h) * (precio / cantidad),
  };
}

export interface TaxEffect {
  cantidad: number;
  precioConsumidor: number;
  precioProductor: number;
  recaudacion: number;
  perdidaEficiencia: number;
}

/** Per-unit tax paid by sellers: supply shifts up by `t`. */
export function taxEffect(input: MarketInput, t: number): TaxEffect {
  validate(input);
  if (!Number.isFinite(t) || t < 0) throw new RangeError('El impuesto debe ser un número mayor o igual a cero.');
  const base = equilibrium(input);
  const { g, h, e, f } = input;
  const cantidad = Math.max(0, (g - e - t) / (h + f));
  const precioConsumidor = g - h * cantidad;
  return {
    cantidad,
    precioConsumidor,
    precioProductor: precioConsumidor - t,
    recaudacion: t * cantidad,
    perdidaEficiencia: 0.5 * t * (base.cantidad - cantidad),
  };
}

export type ControlEffect =
  | { tipo: 'sin-efecto' }
  | { tipo: 'escasez'; cantidadDemandada: number; cantidadOfrecida: number; faltante: number }
  | { tipo: 'excedente'; cantidadDemandada: number; cantidadOfrecida: number; sobrante: number };

/** A price ceiling below equilibrium creates a shortage; a floor above it, a surplus (OpenStax 3.4). */
export function priceControl(input: MarketInput, precio: number, tipo: 'maximo' | 'minimo'): ControlEffect {
  const eq = equilibrium(input);
  const { g, h, e, f } = input;
  const demandada = Math.max(0, (g - precio) / h);
  const ofrecida = Math.max(0, (precio - e) / f);
  if (tipo === 'maximo' && precio < eq.precio) {
    return { tipo: 'escasez', cantidadDemandada: demandada, cantidadOfrecida: ofrecida, faltante: demandada - ofrecida };
  }
  if (tipo === 'minimo' && precio > eq.precio) {
    return { tipo: 'excedente', cantidadDemandada: demandada, cantidadOfrecida: ofrecida, sobrante: ofrecida - demandada };
  }
  return { tipo: 'sin-efecto' };
}
