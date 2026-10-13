import test from 'node:test';
import assert from 'node:assert/strict';
import {DESIGNS, designFromPath, designHomePath} from '../src/design.ts';
import type {DesignKey} from '../src/design.ts';

test('every design resolves and links home under root or project hosting', () => {
  for (const base of ['/', '/three-body-lab/', '/three-body-lab']) {
    for (const design of Object.keys(DESIGNS) as DesignKey[]) {
      const home = designHomePath(design, base);
      assert.equal(designFromPath(home, base), design);
      assert.equal(designFromPath(`${home}index.html`, base), design);
      assert.equal(designFromPath(home.replace(/\/$/, ''), base), design);
      assert.equal(home, `${base.replace(/\/$/, '')}/${design === 'original' ? '' : `${design}/`}`);
    }
  }
});

test('route matching respects the hosting prefix and falls back for unknown designs', () => {
  assert.equal(designFromPath('/three-body-lab/unknown/', '/three-body-lab/'), 'original');
  assert.equal(designFromPath('/three-body-laboratory/bauhaus/', '/three-body-lab/'), 'original');
  assert.equal(designFromPath('/bauhaus/', '/three-body-lab/'), 'original');
  assert.equal(designFromPath('/three-body-lab/bauhaus/', '/'), 'original');
});
