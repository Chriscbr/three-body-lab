import test from 'node:test';
import type {BodyState} from '../src/types.ts';
import assert from 'node:assert/strict';
import {Simulation, PRESETS, createInitial, energy, SAMPLE_DT} from '../src/physics.ts';

test('the figure-eight returns near its initial state after a full period', () => {
  const initial = createInitial('figure8'); const sim = new Simulation(initial);
  sim.advanceTo(6.325);
  const state = sim.at(6.325);
  const error = Math.max(...state.positions.flatMap((p,i) => p.map((x,k) => Math.abs(x - initial.positions[i][k]))));
  assert.ok(error < .003, `position error ${error}`);
  assert.ok(sim.drift(sim.time) < .005, `energy drift ${sim.drift(sim.time)}%`);
});
for (const key of ['butterfly1', 'butterfly2', 'bumblebee', 'dragonfly', 'goggles', 'moth1', 'moth2'] as const) {
  test(`${PRESETS[key].name} reproduces its published period`, () => {
    const preset = PRESETS[key], initial = createInitial(key);
    const sim = new Simulation(initial, {softening: preset.softening});
    sim.advanceTo(preset.period);
    const state = sim.at(preset.period);
    for (const field of ['positions', 'velocities'] as const) {
      const error = Math.max(...state[field].flatMap((p, i) => p.map((x, k) => Math.abs(x - initial[field][i][k]))));
      assert.ok(error < .003, `${field} return error ${error}`);
    }
    assert.ok(sim.drift(sim.time) < .001, `energy drift ${sim.drift(sim.time)}%`);
    assert.ok(state.positions.every(p => p[1] === 0), 'published orbits remain planar');
  });
}
test('long-running periodic motion remains bounded and conserves momentum', () => {
  const sim = new Simulation(createInitial('figure8')); sim.advanceTo(63.25);
  assert.ok(sim.drift(sim.time) < .01);
  assert.ok(Math.max(...sim.state.positions.flat().map(Math.abs)) < 1.2);
  for (let k = 0; k < 3; k++) {
    const momentum = sim.state.velocities.reduce((a,v,i) => a + v[k] * sim.state.masses[i], 0);
    assert.ok(Math.abs(momentum) < 1e-10);
  }
});
test('history restores earlier states without modifying the simulation or recording future positions', () => {
  const sim = new Simulation(createInitial('chaotic')); sim.advanceTo(2);
  const before = JSON.stringify(sim.state), historyLength = sim.history.length;
  const past = sim.at(.5); past.positions[0][0] = 999;
  assert.equal(JSON.stringify(sim.state), before); assert.equal(sim.history.length, historyLength);
  assert.notEqual(sim.at(.5).positions[0][0], 999);
  assert.deepEqual(sim.at(0).positions, sim.history[0].positions);
  assert.deepEqual(sim.at(sim.time).positions, sim.history[sim.history.length - 1].positions);
});
test('hierarchical and chaotic presets are finite three-dimensional trajectories', () => {
  for (const preset of ['hierarchy', 'chaotic', 'collapse', 'triangle'] as const) {
    const sim = new Simulation(createInitial(preset)); sim.advanceTo(10);
    assert.ok(sim.state.positions.flat().every(Number.isFinite));
    assert.ok(sim.state.velocities.flat().every(Number.isFinite));
    if (preset === 'hierarchy' || preset === 'chaotic') assert.ok(sim.state.positions.some(p => Math.abs(p[1]) > .001));
  }
});
test('mass changes and perturbations preserve a stationary center of mass', () => {
  const state = createInitial('figure8', {masses: [2, .5, 3], perturbation: .1});
  for (const key of ['positions','velocities'] as const) for (let k = 0; k < 3; k++) assert.ok(Math.abs(state[key].reduce((a,v,i) => a + v[k] * state.masses[i], 0)) < 1e-12);
});
test('softened coincident starts remain finite', () => {
  const state: BodyState = {positions: [[0,0,0],[0,0,0],[1,0,0]], velocities: [[0,0,0],[0,0,0],[0,0,0]], masses:[1,1,1]};
  const sim = new Simulation(state, {softening:.01}); sim.advanceSample();
  assert.ok(sim.state.positions.flat().every(Number.isFinite)); assert.ok(Number.isFinite(energy(sim.state,1,.01)));
});
test('sub-sample advances retain enough history for smooth high-refresh playback', () => {
  const sim = new Simulation(createInitial('figure8'));
  sim.advanceTo(SAMPLE_DT / 4);
  assert.ok(sim.time >= SAMPLE_DT / 4);
  const state = sim.at(SAMPLE_DT / 4);
  assert.notDeepEqual(state.positions, sim.history[0].positions);
});
