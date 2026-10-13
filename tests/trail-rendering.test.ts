import test from 'node:test';
import type {TrailHistory, TrailLength, Vector3Tuple, ViewOptions} from '../src/types.ts';
import type {TrailGeometry} from '../src/trail-geometry.ts';
import assert from 'node:assert/strict';
import {Color, Vector3, Object3D, LineBasicMaterial} from 'three';
import type {BufferAttribute} from 'three';
import type {WebGLAttributes} from 'three/src/renderers/webgl/WebGLAttributes.js';
import type {WebGLProgram} from 'three/src/renderers/webgl/WebGLProgram.js';
import {WebGLBindingStates} from 'three/src/renderers/webgl/WebGLBindingStates.js';
import {Simulation, createInitial} from '../src/physics.ts';
import {GravityScene} from '../src/scene.ts';
import {sampleTrail, MAX_TRAIL_SEGMENTS} from '../src/trails.ts';
import {createTrailGeometry, updateTrailGeometry} from '../src/trail-geometry.ts';

// Use Three.js's actual binding/capacity logic, with the GL calls stubbed.
function bindingFixture() {
  const noop = () => {};
  const gl = {
    getParameter: () => 16, createVertexArray: () => ({}), FLOAT: 5126, INT: 5124, UNSIGNED_INT: 5125,
    bindVertexArray: noop, bindBuffer: noop, enableVertexAttribArray: noop,
    vertexAttribDivisor: noop, vertexAttribPointer: noop, disableVertexAttribArray: noop, deleteVertexArray: noop,
  };
  // The mock implements only the transport methods read by the real binder.
  const bindings = new WebGLBindingStates(gl as unknown as WebGLRenderingContext, {get: () => ({buffer: {}, type: gl.FLOAT, bytesPerElement: 4})} as unknown as WebGLAttributes);
  const program = {id: 1, getAttributes: () => Object.fromEntries(['instanceStart', 'instanceEnd', 'instanceOpacityStart', 'instanceOpacityEnd'].map((name, location) => [name, {location, locationSize: 1}]))};
  const object = new Object3D(), material = new LineBasicMaterial();
  // Three.js accepts a null index for unindexed geometry; its internal typings do not.
  return {bind: (geometry: TrailGeometry) => bindings.setup(object, material, program as unknown as WebGLProgram, geometry, null as unknown as BufferAttribute), dispose: () => {bindings.dispose(); material.dispose();}};
}
function lastDrawnPoint(geometry: TrailGeometry) {
  const count = Math.min(geometry.instanceCount, geometry._maxInstanceCount ?? Infinity);
  return new Vector3().fromBufferAttribute(geometry.attributes.instanceEnd, count - 1);
}
function assertEndpoint(geometry: TrailGeometry, position: Vector3Tuple) {
  const gap = lastDrawnPoint(geometry).distanceTo(new Vector3(...position));
  assert.ok(gap < 1e-5, `visible trail endpoint is ${gap} units from the body`);
}

test('growing collapse trails draw their newest segments after the first GPU binding', () => {
  const sim = new Simulation(createInitial('collapse')); sim.advanceTo(16);
  const geometry = createTrailGeometry(), bindings = bindingFixture();
  const positionBuffer = geometry.attributes.instanceStart.data;
  const opacityBuffer = geometry.attributes.instanceOpacityStart.data;
  for (const time of [1, 3, 8, 16]) {
    updateTrailGeometry(geometry, sampleTrail(sim, time, 12.5, 0)); bindings.bind(geometry);
    assert.equal(geometry._maxInstanceCount, MAX_TRAIL_SEGMENTS);
    assert.equal(Math.min(geometry.instanceCount, geometry._maxInstanceCount ?? Infinity), geometry.instanceCount);
    assertEndpoint(geometry, sim.at(time).positions[0]);
    assert.equal(geometry.attributes.instanceStart.data, positionBuffer);
    assert.equal(geometry.attributes.instanceOpacityStart.data, opacityBuffer);
  }
  assert.ok(geometry.instanceCount > 80, 'the trail grows beyond its initial segment count');
  bindings.dispose(); geometry.dispose();
});

function sceneFixture() {
  // Exercise the scene's real frame updates without creating a browser renderer.
  const scene = Object.create(GravityScene.prototype) as GravityScene;
  Object.assign(scene, {
    scale: 4.5, style: 'abstract',
    bodies: [0, 1, 2].map(() => ({body: {position: new Vector3(), scale: new Vector3()}, halo: {scale: new Vector3()}, aura: {scale: new Vector3()}, solarMaterial: {uniforms: {time: {value: 0}}}})),
    trails: [0, 1, 2].map(() => ({color: new Color('white'), line: {geometry: createTrailGeometry(), material: {color: new Color()}, visible: false}})),
    controls: {update() {}}, renderer: {render() {}}, camera: {position: new Vector3()}, cosmos: {position: new Vector3()},
  });
  return scene;
}
const options = (): ViewOptions => ({trails: true, trailLength: '12.5', autoRotate: false, forceTrails: false});

test('trail endpoints follow collapse bodies on every rendered frame and while scrubbing', () => {
  const sim = new Simulation(createInitial('collapse')); sim.advanceTo(4);
  const scene = sceneFixture(), display = options();
  for (const time of [1, 1 + 1 / 60, 1 + 2 / 60, 3.275, 1.125, .003125]) {
    const state = sim.at(time); scene.update(state, sim, time, display);
    scene.trails.forEach((trail, i) => {
      assertEndpoint(trail.line.geometry, state.positions[i]);
      assert.equal(trail.line.geometry.attributes.instanceOpacityEnd.getX(trail.line.geometry.instanceCount - 1), 1);
    });
  }
  scene.update(sim.at(0), sim, 0, display);
  assert.ok(scene.trails.every(trail => !trail.line.visible && trail.line.geometry.instanceCount === 0));
});

test('paused frames reuse GPU buffers; display edits and a new run still refresh trails', () => {
  const sim = new Simulation(createInitial('collapse')); sim.advanceTo(10);
  const scene = sceneFixture(), display = options(); scene.update(sim.at(10), sim, 10, display);
  const geometry = scene.trails[0].line.geometry, buffer = geometry.attributes.instanceStart.data;
  const version = buffer.version;
  scene.update(sim.at(10), sim, 10, display); assert.equal(buffer.version, version);
  display.trailLength = '5'; display.forceTrails = true; scene.update(sim.at(10), sim, 10, display);
  assert.equal(geometry.instanceCount, 400); assert.ok(buffer.version > version);
  display.forceTrails = false;
  const next = new Simulation(createInitial('figure8')); next.advanceTo(10);
  scene.update(next.at(10), next, 10, display); assertEndpoint(geometry, next.at(10).positions[0]);
  display.trails = false; display.forceTrails = true; scene.update(next.at(10), next, 10, display);
  assert.equal(geometry.instanceCount, 0); assert.equal(scene.trails[0].line.visible, false);
});

test('changing trail density and scrubbing after a long run cannot truncate the drawn endpoint', () => {
  const time = 600; const history: TrailHistory['history'] = Array.from({length: 48001}, (_, i) => ({positions: [[i / 80, 0, 0]]}));
  const sim: TrailHistory = {time, history, at: t => ({positions: [[t, 0, 0]]})};
  const geometry = createTrailGeometry(), bindings = bindingFixture();
  for (const [time, duration] of [[.0125, 5], [600, 'full'], [600, 50], [200.337, 12.5], [.125, 5]] satisfies [number, TrailLength][]) {
    updateTrailGeometry(geometry, sampleTrail(sim, time, duration, 0)); bindings.bind(geometry);
    assert.ok(geometry.instanceCount <= MAX_TRAIL_SEGMENTS);
    assertEndpoint(geometry, [time, 0, 0]);
  }
  bindings.dispose(); geometry.dispose();
});
