# Three Body Lab

A responsive Three.js gravity simulation with twelve initial configurations, three visual worlds, interactive orbit controls, and a complete scrubbable history of each run.

## Run locally

Use Node.js 22.18 or newer. Application code, build scripts, and tests are TypeScript. Node runs the tests and route build script directly; Vite compiles the browser app.

```sh
npm install
npm run dev
```

Open the printed local URL. To try it on a phone on the same Wi-Fi, open the printed Network URL. Production assets are self-contained in `dist` after `npm run build` (fonts gracefully fall back to system fonts if offline).

## Design editions

The original interface is at `/`. Separate front ends share the same simulator and controls:

- `/bauhaus/`: geometric composition, primary colors, Outfit typography, and hard shadows.
- `/neo-brutalism/`: cream paper, highlighter colors, heavy borders, outlined type, and sticker motifs.
- `/sketch/`: handwritten type, wobbly frames, paper texture, tape, and scribbled accents.
- `/newsprint/`: a serif newspaper masthead, ruled editorial columns, paper texture, and monochrome controls.

There is no design switcher in the app. The build creates a real index file for each URL so direct links work on static hosting.

## Visual worlds

Cosmic uses HDR stellar surfaces, additive halos, bloom, a procedural nebula cubemap, stars, and distant spiral galaxies. The nebula shader is baked once into the skybox rather than recomputed each frame. Studio uses polished metal spheres above a rough, textured wooden tabletop. Abstract uses matte spheres, a light gray background, and optional coordinate axes and orthogonal grids.

## Controls

- Drag to rotate; scroll or pinch to zoom; right-drag or two fingers to pan.
- Camera auto-rotation is enabled by default and can be disabled in Display settings.
- Space: play/pause. R: restart. Left/right arrows: scrub by 0.25 simulation units.
- Scrubbing pauses playback. Play replays saved history before extending the run. Jump to live resumes from the latest computed frame.
- Physics edits and initial-condition edits start a new run; display edits retain the timeline.
- Short, medium, and long trails retain 5, 12.5, and 50 simulation units respectively. Each point fades linearly with its age using per-vertex transparency. Full history retains the entire displayed past, with a fade over that span. Scrubbing never displays future paths.
- Trails use reusable GPU buffers with capacity for 2,000 segments per body. The active segment count can grow or shrink without being truncated by Three.js's cached capacity. Endpoints update on every rendered simulation frame; paused frames retain their existing buffers.

## Physics

The app uses dimensionless Newtonian gravity, adjustable Plummer softening, and a velocity-Verlet integrator. Its maximum step is 0.001 time units, subdivided by pairwise dynamical and crossing times near close encounters. Snapshots are saved at 80 Hz, independent of playback speed; rendering interpolates them. A run stores up to 600 simulation units. The footer displays relative total-energy error for the displayed state; interpolation can contribute a small additional error.

The figure-eight uses [Richard Montgomery's published initial conditions](https://people.ucsc.edu/~rmont/Nbdy/NbdyC1.html). Equal-mass Lagrange triangle is periodic but unstable, and labeled accordingly. Hierarchical and chaotic configurations are illustrative numerical experiments; labels describe their initial configuration rather than guaranteeing future stability. Spheres are visual markers and do not collide or merge. Softening regularizes point-mass close encounters.

Butterfly I/II, Bumblebee, Dragonfly, Goggles, and Moth I/II use [Šuvakov & Dmitrašinović's initial conditions](https://arxiv.org/abs/1303.0181), with six-digit velocities from [Ana Hudomal's thesis, Table 23](https://www.scl.rs/theses/msc_ahudomal.pdf) where available. They start with equal masses, Newtonian gravity, and zero softening. These are planar periodic orbits; periodicity does not guarantee stability. The papers' xy plane is mapped to the scene's xz plane. Tests check return proximity after a published period and energy conservation. Rounded initial conditions and numerical integration can eventually break periodicity.

```sh
npm run typecheck
npm test
npm run build
```

Strict type checking covers the app, tests, and build script, and runs automatically before production builds. Shared types in `src/types.ts` describe 3D vectors, simulation state, configuration, trail history, and rendering options. The original interface uses a minimum text size of 12px on desktop and mobile.
