# Three Body Lab

A responsive Three.js gravity sandbox with five initial configurations, three visual worlds, interactive orbit controls, and a complete scrubbable history of each run.

## Run locally

```sh
npm install
npm run dev
```

Open the printed local URL. To try it on a phone on the same Wi-Fi, open the printed Network URL. Production assets are self-contained in `dist` after `npm run build` (fonts gracefully fall back to system fonts if offline).

## Controls

- Drag to rotate; scroll or pinch to zoom; right-drag or two fingers to pan.
- Space: play/pause. R: restart. Left/right arrows: scrub by 0.25 simulation units.
- Scrubbing pauses playback. Play replays saved history before extending the run. Jump to live resumes from the latest computed frame.
- Physics edits and initial-condition edits start a new run; display edits retain the timeline.

## Physics

The app uses dimensionless Newtonian gravity, adjustable Plummer softening, and a velocity-Verlet integrator. Its maximum step is 0.001 time units, subdivided by pairwise dynamical and crossing times near close encounters. Snapshots are saved at 80 Hz, independent of playback speed; rendering interpolates them. A run stores up to 600 simulation units. The footer displays relative total-energy error for the displayed state; interpolation can contribute a small additional error.

The figure-eight uses [Richard Montgomery's published initial conditions](https://people.ucsc.edu/~rmont/Nbdy/NbdyC1.html). Equal-mass Lagrange triangle is periodic but unstable, and labeled accordingly. Hierarchical and chaotic configurations are illustrative numerical experiments; labels describe their initial configuration rather than guaranteeing future stability. Spheres are visual markers and do not collide or merge. Softening regularizes point-mass close encounters.

```sh
npm test
npm run build
```
