import {mkdir, copyFile} from 'node:fs/promises';
import {DESIGNS} from '../src/design.ts';

// Real index files make every design URL work without an SPA fallback on hosting.
for (const design of Object.keys(DESIGNS).filter(key => key !== 'original')) {
  await mkdir(`dist/${design}`, {recursive: true});
  await copyFile('dist/index.html', `dist/${design}/index.html`);
}
