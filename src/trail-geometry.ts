import {Box3, Sphere, DynamicDrawUsage, InstancedInterleavedBuffer, InterleavedBufferAttribute} from 'three';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {MAX_TRAIL_SEGMENTS} from './trails.ts';
import type {TrailSamples} from './types.ts';

export interface TrailGeometry extends LineGeometry {
  boundingBox: Box3;
  boundingSphere: Sphere;
  attributes: LineGeometry['attributes'] & {
    instanceStart: InterleavedBufferAttribute;
    instanceEnd: InterleavedBufferAttribute;
    instanceOpacityStart: InterleavedBufferAttribute;
    instanceOpacityEnd: InterleavedBufferAttribute;
  };
  /** Capacity cached by Three.js on the first GPU binding. */
  _maxInstanceCount?: number;
}

export function createTrailGeometry(capacity = MAX_TRAIL_SEGMENTS): TrailGeometry {
  const geometry = new LineGeometry() as TrailGeometry;
  // Three.js caches the instance capacity on the first GPU binding. Keep all
  // attributes at a fixed capacity, and vary only the number of active segments.
  const positions = new InstancedInterleavedBuffer(new Float32Array(capacity * 6), 6).setUsage(DynamicDrawUsage);
  const opacities = new InstancedInterleavedBuffer(new Float32Array(capacity * 2), 2).setUsage(DynamicDrawUsage);
  geometry.setAttribute('instanceStart', new InterleavedBufferAttribute(positions, 3, 0));
  geometry.setAttribute('instanceEnd', new InterleavedBufferAttribute(positions, 3, 3));
  geometry.setAttribute('instanceOpacityStart', new InterleavedBufferAttribute(opacities, 1, 0));
  geometry.setAttribute('instanceOpacityEnd', new InterleavedBufferAttribute(opacities, 1, 1));
  geometry.instanceCount = 0;
  geometry.boundingBox = new Box3(); geometry.boundingSphere = new Sphere();
  return geometry;
}

export function updateTrailGeometry(geometry: TrailGeometry, {positions, opacityPairs}: TrailSamples): void {
  const count = Math.max(0, positions.length / 3 - 1);
  const positionBuffer = geometry.attributes.instanceStart.data;
  const opacityBuffer = geometry.attributes.instanceOpacityStart.data;
  if (count > positionBuffer.count) throw new RangeError('Trail exceeds its allocated segment capacity.');
  geometry.instanceCount = count;
  if (count === 0) return;
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 6; k++) positionBuffer.array[i * 6 + k] = positions[i * 3 + k];
  }
  opacityBuffer.array.set(opacityPairs);
  for (const [buffer, size] of [[positionBuffer, count * 6], [opacityBuffer, count * 2]] as const) {
    buffer.clearUpdateRanges(); buffer.addUpdateRange(0, size); buffer.needsUpdate = true;
  }
  // Only active points contribute to the bounds, including after a restart.
  geometry.boundingBox.setFromArray(positions).getBoundingSphere(geometry.boundingSphere);
}
