import test from 'node:test';
import assert from 'node:assert/strict';
import {bindTimeline} from '../src/timeline.js';
import {Simulation, createInitial} from '../src/physics.js';

function fixture() {
  const input = new EventTarget(), releaseTarget = new EventTarget();
  const sim = new Simulation(createInitial('figure8')); sim.advanceTo(4);
  let currentTime = sim.time, playing = true, isScrubbing = false;
  input.value = String(currentTime);
  bindTimeline(input, {
    pause: () => {playing = false; input.value = String(currentTime);},
    seek: time => {currentTime = Math.max(0, Math.min(sim.time, time)); input.value = String(currentTime);},
    scrubbing: active => {isScrubbing = active;}, releaseTarget,
  });
  return {input, releaseTarget, sim, get currentTime() {return currentTime;}, get playing() {return playing;}, get isScrubbing() {return isScrubbing;}};
}

test('scrubbing preserves the selected time when pausing refreshes the slider', () => {
  const f = fixture(), historyLength = f.sim.history.length;
  f.input.dispatchEvent(new Event('pointerdown'));
  for (const time of [1, 2.5, .25, 0, 4]) {
    f.input.value = String(time); f.input.dispatchEvent(new Event('input'));
    assert.equal(f.currentTime, time);
    assert.deepEqual(f.sim.at(f.currentTime).positions, f.sim.at(time).positions);
  }
  f.releaseTarget.dispatchEvent(new Event('pointerup'));
  assert.equal(f.playing, false); assert.equal(f.isScrubbing, false);
  assert.equal(f.sim.history.length, historyLength);
});
test('keyboard slider input also captures the time before pausing', () => {
  const f = fixture(); f.input.value = '1.75'; f.input.dispatchEvent(new Event('input'));
  assert.equal(f.currentTime, 1.75); assert.equal(f.playing, false);
});
test('a cancelled touch drag leaves playback paused and exits scrubbing', () => {
  const f = fixture(); f.input.dispatchEvent(new Event('pointerdown'));
  f.input.value = '.5'; f.input.dispatchEvent(new Event('input'));
  f.releaseTarget.dispatchEvent(new Event('pointercancel'));
  assert.equal(f.currentTime, .5); assert.equal(f.isScrubbing, false); assert.equal(f.playing, false);
});
