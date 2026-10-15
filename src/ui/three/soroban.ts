/**
 * Pure soroban (Japanese abacus) logic, independent from Three.js so it can be unit-tested.
 * Each rod holds one decimal digit: one upper bead worth 5 and four lower beads worth 1.
 */
export const RODS = 5;

export function digitsOf(value: number, rods = RODS): number[] {
  const clamped = Math.max(0, Math.min(10 ** rods - 1, Math.trunc(value)));
  return String(clamped).padStart(rods, '0').split('').map(Number);
}

export function valueOf(digits: number[]): number {
  return digits.reduce((acc, d) => acc * 10 + d, 0);
}

export interface RodState {
  heaven: boolean;
  earth: number; // 0..4 lower beads pushed against the beam
}

export function rodFromDigit(digit: number): RodState {
  return { heaven: digit >= 5, earth: digit % 5 };
}

export function digitFromRod(rod: RodState): number {
  return (rod.heaven ? 5 : 0) + rod.earth;
}

/** Clicking the upper bead toggles 5. */
export function toggleHeaven(digit: number): number {
  const rod = rodFromDigit(digit);
  return digitFromRod({ ...rod, heaven: !rod.heaven });
}

/**
 * Clicking lower bead j (0 = closest to the beam). If it is active, it and the ones below drop;
 * if it is inactive, it and the ones above rise to the beam — exactly how fingers move real beads.
 */
export function pushEarth(digit: number, bead: number): number {
  const rod = rodFromDigit(digit);
  const earth = bead < rod.earth ? bead : bead + 1;
  return digitFromRod({ ...rod, earth });
}

export function stepDigit(digit: number, delta: number): number {
  return (((digit + delta) % 10) + 10) % 10;
}

/** Vertical layout in scene units. */
export const LAYOUT = {
  beadHalf: 0.17,
  beamTop: 0.68,
  beamBottom: 0.56,
  frameTopInner: 1.55,
  frameBottomInner: -1.55,
};

export function heavenY(active: boolean): number {
  return active ? LAYOUT.beamTop + LAYOUT.beadHalf : LAYOUT.frameTopInner - LAYOUT.beadHalf;
}

export function earthY(bead: number, active: boolean): number {
  const size = LAYOUT.beadHalf * 2;
  if (active) return LAYOUT.beamBottom - LAYOUT.beadHalf - bead * size;
  return LAYOUT.frameBottomInner + LAYOUT.beadHalf + (3 - bead) * size;
}

/** Critically-damped-ish spring step used by every bead (slight overshoot feels like a real "clack"). */
export function springStep(position: number, velocity: number, target: number, dt: number, stiffness = 320, damping = 24) {
  const force = -stiffness * (position - target) - damping * velocity;
  const v = velocity + force * dt;
  return { position: position + v * dt, velocity: v };
}
