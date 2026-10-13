import {SAMPLE_DT} from './physics.ts';
import type {TrailHistory, TrailLength, TrailSamples} from './types.ts';

export const TRAIL_DURATIONS = {short: 5, medium: 12.5, long: 50};
export const MAX_TRAIL_SEGMENTS = 2000;

// Fade by simulation age, not by the length of the currently recorded history.
export function trailOpacity(sampleTime: number, currentTime: number, duration: number): number {
  return Math.max(0, Math.min(1, 1 - (currentTime - sampleTime) / duration));
}

export function sampleTrail(simulation: TrailHistory, time: number, length: TrailLength, body: number, maxSegments = MAX_TRAIL_SEGMENTS): TrailSamples {
  const currentTime = Math.max(0, Math.min(time, simulation.time));
  const duration = length === 'full' ? Math.max(currentTime, SAMPLE_DT) : Number(length);
  const startTime = Math.max(0, currentTime - duration);
  const first = Math.floor((startTime + 1e-9) / SAMPLE_DT) + 1;
  const last = Math.min(simulation.history.length - 1, Math.ceil((currentTime - 1e-9) / SAMPLE_DT) - 1);
  const stride = Math.max(1, Math.ceil((last - first + 1) / (maxSegments - 1)));
  const positions = [...simulation.at(startTime).positions[body]];
  const alphas = [trailOpacity(startTime, currentTime, duration)];
  for (let index = first; index <= last; index += stride) {
    positions.push(...simulation.history[index].positions[body]);
    alphas.push(trailOpacity(index * SAMPLE_DT, currentTime, duration));
  }
  if (currentTime > startTime) {
    positions.push(...simulation.at(currentTime).positions[body]);
    alphas.push(1);
  }
  const opacityPairs = new Float32Array(Math.max(0, alphas.length - 1) * 2);
  for (let i = 0; i < alphas.length - 1; i++) {opacityPairs[i * 2] = alphas[i]; opacityPairs[i * 2 + 1] = alphas[i + 1];}
  return {positions, opacityPairs};
}
