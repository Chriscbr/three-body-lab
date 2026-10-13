export type Vector3Tuple = [number, number, number];

export interface InitialVectors {
  positions: Vector3Tuple[];
  velocities: Vector3Tuple[];
}

export interface BodyState extends InitialVectors {
  masses: number[];
}

export interface SimulationConfig {
  masses?: number[];
  gravity?: number;
  velocity?: number;
  perturbation?: number;
  softening?: number;
  custom?: InitialVectors | null;
}

export interface OrbitPreset {
  name: string;
  category: string;
  initial: () => BodyState;
  scale: number;
  warmup: number;
  period?: number;
  softening?: number;
}

export type VisualWorld = 'cosmic' | 'studio' | 'abstract';
export type TrailLength = number | string;

export interface ViewOptions {
  trails: boolean;
  trailLength: TrailLength;
  autoRotate: boolean;
  forceTrails: boolean;
  labels?: boolean;
  follow?: boolean;
}

export interface TrailHistory {
  time: number;
  history: {positions: Vector3Tuple[]}[];
  at: (time: number) => {positions: Vector3Tuple[]};
}

export interface TrailSamples {
  positions: number[];
  opacityPairs: Float32Array;
}
