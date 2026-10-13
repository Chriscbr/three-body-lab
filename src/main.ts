import './style.css';
import './worlds.css';
import './compact.css';
import './base-ui.css';
import {createIcons, Orbit, ArrowUpRight, ChevronDown, RotateCcw, Play, Pause, SkipBack, SkipForward, Maximize2, Minimize2, SlidersHorizontal, X, Info, MousePointer2, Move3d, Crosshair, Camera, Check, ArrowLeft, Github, Keyboard, Plus, Minus} from 'lucide';
import {GravityScene, BODY_COLORS} from './scene.ts';
import {Simulation, PRESETS, SAMPLE_DT, MAX_TIME, createInitial, isPresetKey} from './physics.ts';
import {bindTimeline} from './timeline.ts';
import {TRAIL_DURATIONS} from './trails.ts';
import type {PresetKey} from './physics.ts';
import type {InitialVectors, OrbitPreset, SimulationConfig, Vector3Tuple, ViewOptions} from './types.ts';

const iconSet = {Orbit, ArrowUpRight, ChevronDown, RotateCcw, Play, Pause, SkipBack, SkipForward, Maximize2, Minimize2, SlidersHorizontal, X, Info, MousePointer2, Move3d, Crosshair, Camera, Check, ArrowLeft, Github, Keyboard, Plus, Minus};
const icon = (name: string) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
interface AppElements {
  preset: HTMLSelectElement;
  speed: HTMLSelectElement;
  'trail-length': HTMLSelectElement;
  softening: HTMLSelectElement;
  timeline: HTMLInputElement;
  gravity: HTMLInputElement;
  velocity: HTMLInputElement;
  perturbation: HTMLInputElement;
  trails: HTMLInputElement;
  labels: HTMLInputElement;
  'auto-rotate': HTMLInputElement;
  grid: HTMLInputElement;
  axes: HTMLInputElement;
  'initial-form': HTMLFormElement;
  'initial-dialog': HTMLDialogElement;
  'about-dialog': HTMLDialogElement;
  'shortcuts-dialog': HTMLDialogElement;
  'jump-live': HTMLButtonElement;
  back: HTMLButtonElement;
  forward: HTMLButtonElement;
  [id: `mass-${number}`]: HTMLInputElement;
}
function $<K extends keyof AppElements>(id: K): AppElements[K];
function $(id: string): HTMLElement;
function $(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing app element: ${id}`);
  return element;
}
const app = $('app');

app.innerHTML = `
  <header class="app-header">
    <a class="brand" href="${import.meta.env.BASE_URL}" aria-label="Three Body Lab home"><span class="brand-mark">${icon('orbit')}</span><span>three body<span class="brand-light"> lab</span><span class="brand-dot">.</span></span></a>

    <button class="text-button about-button" id="about-button" aria-label="About the simulation"><span class="about-label">About</span> ${icon('arrow-up-right')}</button>
    <button class="icon-button mobile-config" id="mobile-config" aria-label="Open simulation settings" aria-controls="settings-panel" aria-expanded="false">${icon('sliders-horizontal')}</button>
  </header>

  <main class="main-shell">


    <div class="workspace">
      <section class="simulation-card" aria-label="Simulation and playback">
        <div class="viewport" id="viewport">
          <div class="scene-top"><div><div class="scene-heading"><h2 id="scene-title">Figure-eight</h2><span class="status-chip" id="stability-badge">Stable</span></div></div><div class="scene-actions"><button class="icon-button" id="reset-camera" title="Reset camera" aria-label="Reset camera">${icon('crosshair')}</button><button class="icon-button" id="fullscreen" title="Expand simulation" aria-label="Expand simulation">${icon('maximize-2')}</button></div></div>
          <div class="body-label" id="label-0"><span></span>BODY A</div><div class="body-label" id="label-1"><span></span>BODY B</div><div class="body-label" id="label-2"><span></span>BODY C</div>
          <div class="scene-bottom"><div class="scene-legend">${BODY_COLORS.map((c,i)=>`<span><i style="--body-color:${c}"></i>Body ${'ABC'[i]}</span>`).join('')}</div><div class="orbit-hint">${icon('mouse-pointer-2')} Drag to orbit <span>·</span> Scroll to zoom</div></div>
          <div class="view-controls"><button class="view-button active" data-view="perspective">3D view</button><button class="view-button" data-view="top">Top view</button><button class="icon-button fit-button" id="fit-camera" title="Fit all bodies" aria-label="Fit all bodies in view">${icon('move-3d')}</button></div>
          <div id="render-error" hidden><h3>3D rendering is unavailable</h3><p>Enable WebGL 2 in your browser, then reload this page to explore the simulation.</p></div>
        </div>
        <div class="timeline-panel">
          <div class="timeline-head"><span class="small-label">TIMELINE</span><div class="timeline-reading"><span id="playback-state" class="live-text"><span class="green-dot"></span>LIVE</span><span class="mono" id="time-readout">t = 3.200</span><span class="time-unit">simulation units</span></div></div>
          <div class="timeline-track"><input id="timeline" type="range" min="0" max="3.2" value="3.2" step="0.0125" aria-label="Simulation timeline" /><div class="timeline-ticks" id="timeline-ticks"></div></div>
          <div class="transport-row"><div class="transport"><button class="icon-button" id="restart" title="Restart run (R)" aria-label="Restart simulation">${icon('rotate-ccw')}</button><span class="transport-divider"></span><button class="icon-button" id="back" title="Back 0.25 simulation units" aria-label="Step backward">${icon('skip-back')}</button><button class="play-button" id="play" title="Play or pause (Space)" aria-label="Pause simulation">${icon('pause')}</button><button class="icon-button" id="forward" title="Forward 0.25 simulation units" aria-label="Step forward">${icon('skip-forward')}</button><span class="transport-divider"></span><label class="speed-control" for="speed"><select id="speed" aria-label="Playback speed"><option value="0.1">0.1×</option><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="5">5×</option><option value="10">10×</option></select>${icon('chevron-down')}</label></div><button class="jump-live" id="jump-live">Jump to live ${icon('arrow-up-right')}</button></div>
        </div>
      </section>
      <div class="drawer-overlay" id="drawer-overlay"></div>
      <aside class="settings-panel" id="settings-panel" aria-label="Simulation settings">
        <div class="settings-heading"><div>${icon('sliders-horizontal')}<h2>Settings</h2></div><button class="icon-button drawer-close" id="close-settings" aria-label="Close settings">${icon('x')}</button></div>
        <div class="settings-content">
          <section class="settings-section"><label class="section-label" for="preset">INITIAL CONFIGURATION</label><div class="select-wrap"><select id="preset">${Object.entries(PRESETS).map(([key,p])=>`<option value="${key}">${p.name}</option>`).join('')}</select>${icon('chevron-down')}</div></section>
          <section class="settings-section visual-section"><div class="section-label">VISUAL WORLD</div><div class="world-options"><button class="world-option active" data-world="cosmic" aria-pressed="true"><div class="world-thumbnail cosmic-thumb"><i></i><i></i><i></i></div><span>Cosmic</span></button><button class="world-option" data-world="studio" aria-pressed="false"><div class="world-thumbnail studio-thumb"><i></i><i></i><i></i></div><span>Studio</span></button><button class="world-option" data-world="abstract" aria-pressed="false"><div class="world-thumbnail abstract-thumb"><i></i><i></i><i></i></div><span>Abstract</span></button></div></section>
          <section class="settings-section display-section"><div class="section-label">DISPLAY</div><label class="toggle-row" for="trails"><span>Orbital trails</span><input class="switch" type="checkbox" id="trails" checked /><span class="switch-visual"></span></label><div class="setting-row trail-length-row"><label for="trail-length">Trail length</label><div class="mini-select"><select id="trail-length">${Object.entries(TRAIL_DURATIONS).map(([label,duration]) => `<option value="${duration}" ${label === 'medium' ? 'selected' : ''}>${label[0].toUpperCase() + label.slice(1)} · ${duration}</option>`).join('')}<option value="full">Full history</option></select>${icon('chevron-down')}</div></div><label class="toggle-row" for="grid"><span>Coordinate grid</span><input class="switch" type="checkbox" id="grid" /><span class="switch-visual"></span></label><label class="toggle-row" for="axes"><span>XYZ axes</span><input class="switch" type="checkbox" id="axes" /><span class="switch-visual"></span></label><label class="toggle-row" for="labels"><span>Body labels</span><input class="switch" type="checkbox" id="labels" checked /><span class="switch-visual"></span></label><label class="toggle-row" for="auto-rotate"><span>Auto-rotate camera</span><input class="switch" type="checkbox" id="auto-rotate" checked /><span class="switch-visual"></span></label></section>
          <section class="settings-section physics-section"><details id="physics-details"><summary><span>PHYSICS & INITIAL CONDITIONS</span>${icon('plus')}</summary><div class="physics-controls"><p class="control-note">Changes start a new run. Values use dimensionless units.</p>${BODY_COLORS.map((color,i)=>`<label class="range-label" for="mass-${i}"><span><i class="body-dot" style="--body-color:${color}"></i>Body ${'ABC'[i]} mass</span><output id="mass-out-${i}">1.00</output></label><input class="physics-range" id="mass-${i}" type="range" min="0.1" max="5" step="0.05" value="1" />`).join('')}<label class="range-label" for="gravity"><span>Gravity strength</span><output id="gravity-out">1.00</output></label><input class="physics-range" id="gravity" type="range" min="0.1" max="3" step="0.05" value="1" /><label class="range-label" for="velocity"><span>Initial velocity</span><output id="velocity-out">1.00×</output></label><input class="physics-range" id="velocity" type="range" min="0" max="2" step="0.01" value="1" /><label class="range-label" for="perturbation"><span>Out-of-plane kick</span><output id="perturbation-out">0.000</output></label><input class="physics-range" id="perturbation" type="range" min="0" max="0.4" step="0.001" value="0" /><div class="setting-row"><label for="softening">Close encounter softening</label><select id="softening"><option value="0">0 (Newtonian)</option><option value="0.001" selected>0.001</option><option value="0.01">0.01</option><option value="0.05">0.05</option></select></div><button class="edit-initial" id="edit-initial">Edit positions & velocities ${icon('arrow-up-right')}</button><button class="apply-button" id="apply-physics">Restart with changes ${icon('rotate-ccw')}</button></div></details></section>
        </div>
      </aside>
    </div>
    <footer class="app-footer"><div class="footer-right"><span class="mono">ΔE <span id="energy-drift">0.000</span>%</span><span class="footer-separator"></span><button id="shortcuts" class="text-button">${icon('keyboard')} Keyboard shortcuts</button></div></footer>

  </main>
  <dialog id="about-dialog" class="modal">
    <div class="modal-header"><h2>About the simulation</h2><button class="icon-button" data-close="about-dialog" aria-label="Close about">${icon('x')}</button></div>
    <p><strong>Three Body Lab</strong> is a browser-based simulation of the three-body problem, rendered in three dimensions with Three.js. It calculates the motion of three point masses under Newtonian gravity, using smaller time steps during close encounters. Saved positions produce fading orbital trails and support replay through a scrubbable timeline. The figure-eight preset uses <a href="https://people.ucsc.edu/~rmont/Nbdy/NbdyC1.html" target="_blank" rel="noopener noreferrer">initial conditions published on Richard Montgomery’s website</a>; Butterfly, Bumblebee, and related presets use initial conditions from <a href="https://arxiv.org/abs/1303.0181" target="_blank" rel="noopener noreferrer">Šuvakov and Dmitrašinović’s study</a>, with more precise velocity values from <a href="https://www.scl.rs/theses/msc_ahudomal.pdf" target="_blank" rel="noopener noreferrer">Ana Hudomal’s thesis</a> where available. The spheres are visual markers, and collisions are not modeled. Numerical error or changes to starting conditions can disrupt periodic motion. The app was authored by Chris Rybicki with ChatGPT, and its <a href="https://github.com/Chriscbr/three-body-lab" target="_blank" rel="noopener noreferrer">source code is available on GitHub</a>.</p>
  </dialog>
  <dialog id="shortcuts-dialog" class="modal small-modal"><div class="modal-header"><h2>Keyboard & camera controls</h2><button class="icon-button" data-close="shortcuts-dialog" aria-label="Close shortcuts">${icon('x')}</button></div><div class="shortcut-row"><span>Play / pause</span><kbd>Space</kbd></div><div class="shortcut-row"><span>Restart simulation</span><kbd>R</kbd></div><div class="shortcut-row"><span>Scrub backward / forward</span><div><kbd>←</kbd> <kbd>→</kbd></div></div><div class="shortcut-row"><span>Rotate the camera</span><span>Drag</span></div><div class="shortcut-row"><span>Pan the camera</span><span>Right-drag / two fingers</span></div><div class="shortcut-row"><span>Zoom</span><span>Scroll / pinch</span></div></dialog>
  <dialog id="initial-dialog" class="modal initial-modal"><div class="modal-header"><h2>Initial conditions</h2><button class="icon-button" data-close="initial-dialog" aria-label="Close initial conditions">${icon('x')}</button></div><p>Starting positions and velocities in 3D. Center-of-mass position and velocity are removed when the run starts.</p><form id="initial-form"><div id="initial-fields"></div><p class="form-error" id="initial-error" role="alert"></p><button class="apply-button" type="submit">Start custom run ${icon('arrow-up-right')}</button></form></dialog>
  <div class="toast" id="toast" role="status"></div>
`;
createIcons({icons: iconSet});

let scene: GravityScene | undefined;
try {scene = new GravityScene($('viewport'));} catch (error) {console.error(error); $('render-error').hidden = false;}

let simulation: Simulation, preset: PresetKey = 'chaotic', currentTime = 0, playing = true, speed = 1, isScrubbing = false;
let custom: InitialVectors | null = null, modified = false, appliedConfig: SimulationConfig = {};
let toastTimer: number | undefined;
let previousTimestamp = performance.now(), lastUI = 0;
const viewOptions: ViewOptions = {trails: true, trailLength: String(TRAIL_DURATIONS.medium), labels: true, autoRotate: true, follow: false, forceTrails: true};

function notify(message: string) {const el = $('toast'); el.textContent = message; el.classList.add('show'); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => el.classList.remove('show'), 2800);}
function draftConfig(): SimulationConfig {return {masses: [0, 1, 2].map(i => Number($(`mass-${i}`).value)), gravity: Number($('gravity').value), velocity: Number($('velocity').value), perturbation: Number($('perturbation').value), softening: Number($('softening').value), custom};}
function updatePlay() {$('play').innerHTML = icon(playing ? 'pause' : 'play'); $('play').setAttribute('aria-label', playing ? 'Pause simulation' : 'Play simulation'); createIcons({icons: iconSet});}
function setPlaying(value: boolean) {playing = value; updatePlay(); updateUI();}
function loadRun({warmup = true, config = null}: {warmup?: boolean; config?: SimulationConfig | null} = {}) {
  const p: OrbitPreset = PRESETS[preset];
  appliedConfig = config ?? {gravity: 1, velocity: 1, perturbation: 0, softening: p.softening ?? .001};
  simulation = new Simulation(createInitial(preset, appliedConfig), appliedConfig);
  const preload = warmup ? p.warmup : 0; simulation.advanceTo(preload); currentTime = simulation.time;
  viewOptions.forceTrails = true; playing = true;
  const isChanged = modified || custom !== null;
  $('scene-title').textContent = custom ? 'Custom configuration' : p.name;
  $('stability-badge').textContent = isChanged ? 'Modified' : p.category;
  $('stability-badge').classList.toggle('chaotic', isChanged || p.category.includes('unstable') || p.category === 'Chaotic');
  scene?.setScale(p.scale); scene?.resetCamera();
  document.querySelectorAll<HTMLElement>('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === 'perspective'));
  updatePlay(); updateUI();
}
function updateUI() {
  const live = simulation.time - currentTime < SAMPLE_DT * 1.5;
  const stateText = isScrubbing ? 'SCRUBBING' : !playing ? 'PAUSED' : live ? 'LIVE' : 'REPLAY';
  $('playback-state').innerHTML = `<span class="green-dot ${stateText === 'LIVE' ? '' : 'muted-dot'}"></span>${stateText}`;
  $('time-readout').textContent = `t = ${currentTime.toFixed(3)}`;
  $('timeline').max = String(Math.max(simulation.time, SAMPLE_DT));
  if (!isScrubbing) $('timeline').value = String(currentTime);
  const progress = currentTime / Math.max(simulation.time, SAMPLE_DT) * 100;
  $('timeline').style.setProperty('--progress', `${progress}%`);
  const span = simulation.time, step = span < 10 ? 1 : span < 25 ? 5 : span < 60 ? 10 : span < 150 ? 25 : 100;
  const ticks = [0]; for (let i = step; i < span; i += step) ticks.push(i);
  if (span - ticks[ticks.length - 1] > step * .5) ticks.push(span);
  $('timeline-ticks').innerHTML = ticks.map(t => `<span style="left:${t / Math.max(span, SAMPLE_DT) * 100}%">${t === span && t !== 0 ? t.toFixed(1) : t.toFixed(0)}</span>`).join('');
  $('jump-live').disabled = live; $('back').disabled = currentTime <= 0; $('forward').disabled = live;
  const drift = simulation.drift(currentTime);
  $('energy-drift').textContent = drift < .001 ? '< 0.001' : drift.toFixed(3);
  $('energy-drift').classList.toggle('drift-warning', drift > .5);
}
function scrub(time: number) {currentTime = Math.max(0, Math.min(simulation.time, time)); viewOptions.forceTrails = true; updateUI();}
const mobileMedia = window.matchMedia('(max-width: 760px)');
function syncDrawerAccessibility() {const hidden = mobileMedia.matches && !$('settings-panel').classList.contains('drawer-open'); $('settings-panel').inert = hidden; $('settings-panel').setAttribute('aria-hidden', String(hidden));}
mobileMedia.addEventListener('change', syncDrawerAccessibility); syncDrawerAccessibility();
function toggleDrawer(open: boolean) {$('settings-panel').classList.toggle('drawer-open', open); $('drawer-overlay').classList.toggle('show', open); $('mobile-config').setAttribute('aria-expanded', String(open)); syncDrawerAccessibility(); if (mobileMedia.matches) (open ? $('preset') : $('mobile-config')).focus();}

function loadPreset(value: PresetKey) {
  preset = value; custom = null; modified = false;
  $('preset').value = preset;
  const masses = PRESETS[preset].initial().masses;
  masses.forEach((m,i) => {$(`mass-${i}`).value = String(m); $(`mass-out-${i}`).textContent = m.toFixed(2);});
  for (const [id, v] of [['gravity', 1], ['velocity', 1], ['perturbation', 0], ['softening', (PRESETS[preset] as OrbitPreset).softening ?? .001]] as const) $(id).value = String(v);
  $('gravity-out').textContent = '1.00'; $('velocity-out').textContent = '1.00×'; $('perturbation-out').textContent = '0.000';
  loadRun();
}
$('preset').addEventListener('change', () => {
  const value = $('preset').value; if (!isPresetKey(value)) return;
  loadPreset(value); notify(`${PRESETS[preset].name} loaded`);
});
document.querySelectorAll<HTMLElement>('.world-option[data-world]').forEach(button => button.addEventListener('click', () => {
  const world = button.dataset.world;
  if (world !== 'cosmic' && world !== 'studio' && world !== 'abstract') return;
  scene?.setStyle(world);
  document.querySelectorAll<HTMLElement>('.world-option[data-world]').forEach(b => {b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button));});
  if (world === 'abstract') {$('grid').checked = true; $('axes').checked = true;} else {$('grid').checked = false; $('axes').checked = false;}
  if (scene) {scene.showGrid = $('grid').checked; scene.showAxes = $('axes').checked; scene.updateHelpers();}
  viewOptions.forceTrails = true;
}));
for (const [id, key] of [['trails', 'trails'], ['labels', 'labels'], ['auto-rotate', 'autoRotate']] as const) $(id).addEventListener('change', () => {viewOptions[key] = $(id).checked; viewOptions.forceTrails = true;});
for (const [id, key] of [['grid', 'showGrid'], ['axes', 'showAxes']] as const) $(id).addEventListener('change', () => {if (scene) {scene[key] = $(id).checked; scene.updateHelpers();}});
$('trail-length').addEventListener('change', () => {viewOptions.trailLength = $('trail-length').value; viewOptions.forceTrails = true;});
$('play').addEventListener('click', () => setPlaying(!playing));
$('restart').addEventListener('click', () => {loadRun({warmup: false, config: appliedConfig}); notify('Run restarted from t = 0');});
$('back').addEventListener('click', () => {setPlaying(false); scrub(currentTime - .25);});
$('forward').addEventListener('click', () => {setPlaying(false); scrub(currentTime + .25);});
$('jump-live').addEventListener('click', () => {scrub(simulation.time); setPlaying(true);});
$('speed').addEventListener('change', () => {speed = Number($('speed').value);});
bindTimeline($('timeline'), {
  pause: () => setPlaying(false),
  seek: scrub,
  scrubbing: active => {isScrubbing = active; updateUI();},
  releaseTarget: window,
});
$('reset-camera').addEventListener('click', () => {scene?.resetCamera(); document.querySelectorAll<HTMLElement>('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === 'perspective'));});
$('fit-camera').addEventListener('click', () => scene?.fit(simulation.at(currentTime).positions));
document.querySelectorAll<HTMLElement>('[data-view]').forEach(button => button.addEventListener('click', () => {scene?.resetCamera(button.dataset.view === 'top'); document.querySelectorAll<HTMLElement>('[data-view]').forEach(b => b.classList.toggle('active', b === button));}));
$('fullscreen').addEventListener('click', async () => {
  const card = document.querySelector<HTMLElement>('.simulation-card');
  if (!card) return;
  try {if (document.fullscreenElement) await document.exitFullscreen(); else if (card.requestFullscreen) await card.requestFullscreen(); else card.classList.toggle('expanded');}
  catch {card.classList.toggle('expanded');}
  $('fullscreen').innerHTML = icon(document.fullscreenElement || card.classList.contains('expanded') ? 'minimize-2' : 'maximize-2'); createIcons({icons: iconSet});
});
document.addEventListener('fullscreenchange', () => {$('fullscreen').innerHTML = icon(document.fullscreenElement ? 'minimize-2' : 'maximize-2'); createIcons({icons: iconSet});});
$('mobile-config').addEventListener('click', () => toggleDrawer(true)); $('close-settings').addEventListener('click', () => toggleDrawer(false)); $('drawer-overlay').addEventListener('click', () => toggleDrawer(false));
for (const [button, dialog] of [['about-button', 'about-dialog'], ['shortcuts', 'shortcuts-dialog']] as const) $(button).addEventListener('click', () => $(dialog).showModal());
document.querySelectorAll<HTMLElement>('[data-close]').forEach(button => button.addEventListener('click', () => {const id = button.dataset.close; if (!id) return; const dialog = $(id); if (dialog instanceof HTMLDialogElement) dialog.close();}));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', e => {if (e.target === dialog) {const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();}}));
for (let i = 0; i < 3; i++) $(`mass-${i}`).addEventListener('input', () => {$(`mass-out-${i}`).textContent = Number($(`mass-${i}`).value).toFixed(2);});
for (const [id, digits, suffix] of [['gravity', 2, ''], ['velocity', 2, '×'], ['perturbation', 3, '']] as const) $(id).addEventListener('input', () => {$(`${id}-out`).textContent = Number($(id).value).toFixed(digits) + suffix;});
$('apply-physics').addEventListener('click', () => {modified = true; loadRun({warmup: false, config: draftConfig()}); notify('New physics applied'); toggleDrawer(false);});
$('edit-initial').addEventListener('click', () => {
  const initial = custom ?? createInitial(preset, draftConfig());
  $('initial-fields').innerHTML = [0, 1, 2].map(i => `<fieldset class="initial-body"><legend><i class="body-dot" style="--body-color:${BODY_COLORS[i]}"></i>Body ${'ABC'[i]}</legend>${(['positions', 'velocities'] as const).map(key => `<div class="initial-vector"><span>${key === 'positions' ? 'Position' : 'Velocity'}</span>${['x', 'y', 'z'].map((axis,k) => `<label>${axis}<input name="${key}-${i}-${k}" type="number" step="any" min="-20" max="20" required value="${initial[key][i][k].toFixed(6)}" aria-label="Body ${'ABC'[i]} ${key} ${axis}" /></label>`).join('')}</div>`).join('')}</fieldset>`).join('');
  $('initial-error').textContent = ''; $('initial-dialog').showModal();
});
$('initial-form').addEventListener('submit', e => {
  e.preventDefault(); const data = new FormData($('initial-form'));
  const readVectors = (key: keyof InitialVectors): Vector3Tuple[] => [0, 1, 2].map(i => [Number(data.get(`${key}-${i}-0`)), Number(data.get(`${key}-${i}-1`)), Number(data.get(`${key}-${i}-2`))]);
  const next: InitialVectors = {positions: readVectors('positions'), velocities: readVectors('velocities')};
  if (Object.values(next).flat(2).some(x => !Number.isFinite(x) || Math.abs(x) > 20)) {$('initial-error').textContent = 'Use finite values between −20 and 20.'; return;}
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (Math.hypot(...next.positions[i].map((x,k) => x - next.positions[j][k])) < .05) {$('initial-error').textContent = 'Start each body at least 0.05 units apart.'; return;}
  custom = next; modified = true; loadRun({warmup: false, config: draftConfig()});
  scene?.fit(simulation.at(0).positions); $('initial-dialog').close(); toggleDrawer(false); notify('Custom run started');
});
window.addEventListener('keydown', e => {
  if ((e.target instanceof Element && e.target.matches('input, select, textarea, button')) || document.querySelector('dialog[open]')) return;
  if (e.code === 'Space') {e.preventDefault(); setPlaying(!playing);}
  else if (e.key.toLowerCase() === 'r') loadRun({warmup: false, config: appliedConfig});
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {e.preventDefault(); setPlaying(false); scrub(currentTime + (e.key === 'ArrowRight' ? .25 : -.25));}
});
document.addEventListener('visibilitychange', () => {previousTimestamp = performance.now();});

loadPreset(preset);
function animate(timestamp: number) {
  requestAnimationFrame(animate);
  const dt = Math.max(0, Math.min(.06, (timestamp - previousTimestamp) / 1000)); previousTimestamp = timestamp;
  if (playing && !isScrubbing && !document.hidden) {
    let target = Math.min(MAX_TIME, currentTime + dt * speed);
    if (target > simulation.time) simulation.advanceTo(target, 8);
    currentTime = Math.min(target, simulation.time);
    if (currentTime >= MAX_TIME) {setPlaying(false); notify('Run complete. All 600 units remain available to replay.');}
  }
  const state = simulation.at(currentTime);
  scene?.update(state, simulation, currentTime, viewOptions); viewOptions.forceTrails = false;
  if (scene) state.positions.forEach((position,i) => {const p = scene.project(position), label = $(`label-${i}`), width = scene.container.clientWidth; label.style.transform = `translate(${p.x > width - 90 ? p.x - 74 : p.x + 19}px,${p.y - 15}px)`; label.style.display = viewOptions.labels && p.visible ? '' : 'none';});
  if (timestamp - lastUI > 100) {updateUI(); lastUI = timestamp;}
}
requestAnimationFrame(animate);
