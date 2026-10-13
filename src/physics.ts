// Dimensionless Newtonian gravity with Plummer softening. All coordinates are 3D.
import type {BodyState, InitialVectors, OrbitPreset, SimulationConfig, Vector3Tuple} from './types.ts';
export const SAMPLE_DT = 1 / 80;
export const MAX_TIME = 600;

const figureEight: BodyState = {
  positions: [[0.97000436, 0, -0.24308753], [-0.97000436, 0, 0.24308753], [0, 0, 0]],
  velocities: [[0.466203685, 0, 0.43236573], [0.466203685, 0, 0.43236573], [-0.93240737, 0, -0.86473146]],
  masses: [1, 1, 1],
};

function hierarchical(): BodyState {
  const masses = [1, 0.8, 0.12], innerMass = 1.8, total = 1.92;
  const omega = Math.sqrt(innerMass), outerSpeed = Math.sqrt(total / 5);
  const positions: Vector3Tuple[] = [[-0.8 / innerMass, 0, 0], [1 / innerMass, 0, 0], [5, 0, 0]];
  const velocities: Vector3Tuple[] = [[0, 0, -0.8 / innerMass * omega], [0, 0, 1 / innerMass * omega], [0, Math.sin(0.4) * outerSpeed, Math.cos(0.4) * outerSpeed]];
  return {positions, velocities, masses};
}

// Šuvakov & Dmitrašinović, PRL 110, 114301 (2013), Table I.
// Six-digit velocities where available: Hudomal's initial-condition catalogue
// and MSc thesis, Table 23 (https://www.scl.rs/theses/msc_ahudomal.pdf).
// The papers' xy plane is mapped to xz for the scene's y-up coordinates.
function planarOrbit(name: string, vx: number, vz: number, period: number): OrbitPreset & {period: number; softening: number} {
  return {name, category: 'Periodic', period, softening: 0, scale: 1.85, warmup: Math.min(period / 2, 8), initial: () => ({
    positions: [[-1, 0, 0], [1, 0, 0], [0, 0, 0]],
    velocities: [[vx, 0, vz], [vx, 0, vz], [-2 * vx, 0, -2 * vz]], masses: [1, 1, 1],
  })};
}

export const PRESETS = {
  figure8: {name: 'Figure-eight', category: 'Stable', initial: () => structuredClone(figureEight), scale: 1.65, warmup: 3.2},
  butterfly1: planarOrbit('Butterfly I', .306893, .125507, 6.2356),
  butterfly2: planarOrbit('Butterfly II', .392955, .097579, 7.0039),
  bumblebee: planarOrbit('Bumblebee', .184279, .587188, 63.5345),
  dragonfly: planarOrbit('Dragonfly', .080584, .588836, 21.2710),
  goggles: planarOrbit('Goggles', .08330, .12789, 10.4668),
  moth1: planarOrbit('Moth I', .464445, .396060, 14.8939),
  moth2: planarOrbit('Moth II', .439166, .452968, 28.6703),
  hierarchy: {name: 'Hierarchical orbit', category: 'Bounded', initial: hierarchical, scale: 6.5, warmup: 6},
  chaotic: {name: 'Chaotic encounter', category: 'Chaotic', initial: () => ({positions: [[-1.1, 0.25, 0.2], [1.05, -0.15, 0.3], [0.15, 0.65, -1.1]], velocities: [[0.17, 0.11, 0.35], [-0.25, 0.04, -0.22], [0.14, -0.18, 0.08]], masses: [1, 1.15, 0.85]}), scale: 2.4, warmup: 1.4},
  triangle: {name: 'Lagrange triangle', category: 'Periodic · unstable', initial: () => {
    const positions = Array.from({length: 3}, (_, i): Vector3Tuple => [Math.cos(i * Math.PI * 2 / 3), 0, Math.sin(i * Math.PI * 2 / 3)]);
    const omega = Math.sqrt(1 / Math.sqrt(3));
    return {positions, velocities: positions.map(p => [-p[2] * omega, 0, p[0] * omega]), masses: [1, 1, 1]};
  }, scale: 1.8, warmup: 3},
  collapse: {name: 'Pythagorean collapse', category: 'Chaotic', initial: () => ({positions: [[1, 0, 3], [-2, 0, -1], [1, 0, -1]], velocities: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], masses: [3, 4, 5]}), scale: 4.5, warmup: 1},
} satisfies Record<string, OrbitPreset>;

export type PresetKey = keyof typeof PRESETS;
export function isPresetKey(value: string): value is PresetKey {return Object.hasOwn(PRESETS, value);}

export function centerState(state: BodyState): BodyState {
  const total = state.masses.reduce((a, b) => a + b, 0);
  for (const key of ['positions', 'velocities'] as const) {
    const center = [0, 1, 2].map(k => state[key].reduce((a, p, i) => a + p[k] * state.masses[i], 0) / total);
    for (const p of state[key]) for (let k = 0; k < 3; k++) p[k] -= center[k];
  }
  return state;
}

export function createInitial(preset: PresetKey, config: SimulationConfig = {}): BodyState {
  const state = PRESETS[preset].initial();
  if (config.masses) state.masses = [...config.masses];
  const gravity = config.gravity ?? 1, velocity = config.velocity ?? 1;
  state.velocities.forEach(v => v.forEach((_, k) => {v[k] *= Math.sqrt(gravity) * velocity;}));
  const kick = config.perturbation ?? 0;
  state.velocities[0][1] += kick;
  state.velocities[1][1] -= kick * 0.6;
  if (config.custom) {
    state.positions = config.custom.positions.map(p => [...p]);
    state.velocities = config.custom.velocities.map(p => [...p]);
  }
  return centerState(state);
}

export function acceleration(positions: Vector3Tuple[], masses: number[], gravity = 1, softening = 0.001): Vector3Tuple[] {
  const a = Array.from({length: 3}, (): Vector3Tuple => [0, 0, 0]);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const d = positions[j].map((x, k) => x - positions[i][k]);
    const r2 = d.reduce((s, x) => s + x * x, softening * softening);
    const factor = gravity / (r2 * Math.sqrt(r2));
    for (let k = 0; k < 3; k++) {a[i][k] += d[k] * factor * masses[j]; a[j][k] -= d[k] * factor * masses[i];}
  }
  return a;
}

export function energy(state: BodyState, gravity = 1, softening = 0.001): number {
  let e = state.velocities.reduce((s, v, i) => s + 0.5 * state.masses[i] * v.reduce((t, x) => t + x * x, 0), 0);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const r2 = state.positions[i].reduce((s, x, k) => s + (x - state.positions[j][k]) ** 2, softening * softening);
    e -= gravity * state.masses[i] * state.masses[j] / Math.sqrt(r2);
  }
  return e;
}

export class Simulation {
  state: BodyState;
  gravity: number;
  softening: number;
  initialEnergy: number;
  history: InitialVectors[];
  time: number;
  accel: Vector3Tuple[];
  substeps: number;

  constructor(initial: BodyState, {gravity = 1, softening = 0.001}: SimulationConfig = {}) {
    this.state = structuredClone(initial);
    this.gravity = gravity; this.softening = softening;
    this.initialEnergy = energy(this.state, gravity, softening);
    this.history = [this.snapshot()]; this.time = 0;
    this.accel = acceleration(this.state.positions, this.state.masses, gravity, softening);
    this.substeps = 0;
  }
  snapshot(): InitialVectors {
    return {positions: this.state.positions.map(p => [...p]), velocities: this.state.velocities.map(v => [...v])};
  }
  advanceSample() {
    let remaining = SAMPLE_DT;
    // Symplectic velocity-Verlet, subdivided during close approaches.
    while (remaining > 1e-12) {
      let h = Math.min(remaining, 0.001);
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
        let r2 = this.softening ** 2, v2 = 0;
        for (let k = 0; k < 3; k++) {
          r2 += (this.state.positions[i][k] - this.state.positions[j][k]) ** 2;
          v2 += (this.state.velocities[i][k] - this.state.velocities[j][k]) ** 2;
        }
        const r = Math.sqrt(r2);
        h = Math.min(h, 0.002 * Math.sqrt(r * r * r / (this.gravity * (this.state.masses[i] + this.state.masses[j]))), 0.004 * r / (Math.sqrt(v2) + 1e-9));
      }
      // Keep the timestep positive at the numerical precision floor.
      h = Math.min(remaining, Math.max(h, 1e-7));
      const {positions: p, velocities: v} = this.state;
      for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) {v[i][k] += this.accel[i][k] * h / 2; p[i][k] += v[i][k] * h;}
      this.accel = acceleration(p, this.state.masses, this.gravity, this.softening);
      for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) v[i][k] += this.accel[i][k] * h / 2;
      remaining -= h; this.substeps++;
    }
    this.history.push(this.snapshot());
    this.time = (this.history.length - 1) * SAMPLE_DT;
  }
  advanceTo(time: number, budget = Infinity) {
    const target = Math.min(MAX_TIME, time);
    const start = performance.now();
    while (this.time < target - 1e-9 && performance.now() - start < budget) this.advanceSample();
  }
  at(time: number): BodyState {
    const index = Math.min(this.history.length - 1, Math.max(0, time / SAMPLE_DT));
    const lo = Math.floor(index), hi = Math.min(lo + 1, this.history.length - 1), t = index - lo;
    const a = this.history[lo], b = this.history[hi];
    return {
      positions: a.positions.map((p, i) => interpolate(p, b.positions[i], t)),
      velocities: a.velocities.map((v, i) => interpolate(v, b.velocities[i], t)),
      masses: this.state.masses,
    };
  }
  drift(time: number) {
    const e = energy(this.at(time), this.gravity, this.softening);
    return Math.abs(e - this.initialEnergy) / Math.max(Math.abs(this.initialEnergy), 1e-8) * 100;
  }
}

function interpolate(a: Vector3Tuple, b: Vector3Tuple, t: number): Vector3Tuple {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
