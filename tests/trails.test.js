import test from 'node:test';
import assert from 'node:assert/strict';
import {SAMPLE_DT} from '../src/physics.js';
import {TRAIL_DURATIONS, sampleTrail, trailOpacity} from '../src/trails.js';

// A straight trajectory makes retained times directly observable as x positions.
function straightHistory(time) {
  const history = Array.from({length: Math.round(time / SAMPLE_DT) + 1}, (_, i) => ({positions: [[i * SAMPLE_DT, 0, 0]]}));
  return {time, history, at: t => ({positions: [[t, 0, 0]]})};
}
const xs = trail => trail.positions.filter((_, i) => i % 3 === 0);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} differs from ${b}`);

test('trails retain five times the previous durations and fade linearly by age', () => {
  assert.deepEqual(TRAIL_DURATIONS, {short: 5, medium: 12.5, long: 50});
  for (const duration of Object.values(TRAIL_DURATIONS)) {
    for (const age of [0, duration / 4, duration / 2, duration * 3 / 4, duration]) {
      near(trailOpacity(100 - age, 100, duration), 1 - age / duration);
    }
    assert.equal(trailOpacity(0, duration + 1, duration), 0);
  }
});
test('a finite trail expires at its exact cutoff and ends at the displayed position', () => {
  const sim = straightHistory(25), trail = sampleTrail(sim, 20.007, 5, 0);
  const points = xs(trail);
  near(points[0], 15.007); near(points.at(-1), 20.007);
  assert.ok(points.every((t, i) => i === 0 || t > points[i - 1]));
  near(trail.opacityPairs[0], 0); near(trail.opacityPairs.at(-1), 1);
  for (let i = 0; i < points.length - 1; i++) {
    near(trail.opacityPairs[i * 2], trailOpacity(points[i], 20.007, 5));
    near(trail.opacityPairs[i * 2 + 1], trailOpacity(points[i + 1], 20.007, 5));
  }
});
test('scrubbing hides future paths and keeps young history at its correct opacity', () => {
  const sim = straightHistory(20), trail = sampleTrail(sim, 2, 12.5, 0);
  const points = xs(trail);
  assert.equal(points[0], 0); assert.equal(points.at(-1), 2);
  assert.ok(points.every(t => t <= 2));
  near(trail.opacityPairs[0], .84);
  assert.equal(sim.history.length, 1601);
});
test('full history spans the run while long trails stay within the rendering budget', () => {
  const sim = straightHistory(600);
  const full = sampleTrail(sim, 600, 'full', 0);
  assert.equal(xs(full)[0], 0); assert.equal(xs(full).at(-1), 600);
  assert.ok(xs(full).length <= 2001);
  near(full.opacityPairs[0], 0); near(full.opacityPairs.at(-1), 1);
  const long = sampleTrail(sim, 600, 50, 0);
  assert.equal(xs(long)[0], 550); assert.equal(xs(long).at(-1), 600);
  assert.ok(xs(long).length <= 2001);
});
test('sample boundaries do not create duplicate zero-length segments', () => {
  const sim = straightHistory(10);
  for (const time of [0, SAMPLE_DT / 4, SAMPLE_DT, .3, 3.2, 10]) {
    const points = xs(sampleTrail(sim, time, 5, 0));
    assert.equal(points.at(-1), time);
    assert.ok(points.every((t, i) => i === 0 || t > points[i - 1]));
  }
});
