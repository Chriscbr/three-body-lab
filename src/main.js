import './style.css';
import './themes.css';
import './newsprint.css';
import {createIcons, Orbit, ArrowUpRight, ChevronDown, RotateCcw, Play, Pause, SkipBack, SkipForward, Maximize2, Minimize2, SlidersHorizontal, X, Info, MousePointer2, Move3d, Crosshair, Camera, Check, ArrowLeft, Github, Keyboard, Plus, Minus} from 'lucide';
import {GravityScene, BODY_COLORS} from './scene.js';
import {Simulation, PRESETS, SAMPLE_DT, MAX_TIME, createInitial} from './physics.js';
import {bindTimeline} from './timeline.js';
import {DESIGNS, designFromPath, designDecoration} from './design.js';

const iconSet = {Orbit, ArrowUpRight, ChevronDown, RotateCcw, Play, Pause, SkipBack, SkipForward, Maximize2, Minimize2, SlidersHorizontal, X, Info, MousePointer2, Move3d, Crosshair, Camera, Check, ArrowLeft, Github, Keyboard, Plus, Minus};
const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const $ = id => document.getElementById(id);
const app = $('app');
const design = designFromPath(window.location.pathname), designCopy = DESIGNS[design];
document.documentElement.dataset.design = design;
document.title = designCopy.title;
if (design === 'newsprint') {
  const fonts = document.createElement('style');
  fonts.textContent = '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&display=block");';
  document.head.append(fonts);
  document.querySelector('meta[name="theme-color"]').content = '#F9F9F7';
} else if (design !== 'original') {
  const font = document.createElement('link'); font.rel = 'stylesheet';
  font.href = design === 'bauhaus' ? 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;900&display=swap' : design === 'sketch' ? 'https://fonts.googleapis.com/css2?family=Kalam:wght@700&family=Patrick+Hand&display=swap' : 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap';
  document.head.append(font);
}
const brandMark = design === 'bauhaus' ? '<i class="logo-circle"></i><i class="logo-square"></i><i class="logo-triangle"></i>' : icon('orbit');
const homePath = design === 'original' ? '/' : `/${design}/`;
const isNewsprint = design === 'newsprint';
const editionDate = new Intl.DateTimeFormat('en-US', {month: 'long', day: 'numeric', year: 'numeric'}).format(new Date()).toUpperCase();
const tickerCopy = '<span class="ticker-badge">LIVE SCIENCE</span><span>03 BODIES</span><b>✦</b><span>03 DIMENSIONS</span><b>✦</b><span>NEWTONIAN GRAVITY</span><b>✦</b><span>600 UNITS OF REPLAYABLE HISTORY</span><b>✦</b><span>ORDER / CHAOS / POSSIBILITY</span><b>✦</b>';

app.innerHTML = `
  <header class="app-header">
    <a class="brand" href="${homePath}" aria-label="Three Body Lab home">${isNewsprint ? '<span>The Three Body Lab</span>' : `<span class="brand-mark">${brandMark}</span><span>three body<span class="brand-light"> lab</span><span class="brand-dot">.</span></span>`}</a>
    <div class="header-center">${isNewsprint ? '<span class="edition-label">A JOURNAL OF<br>GRAVITY & MOTION</span>' : '<span class="header-rule"></span>A playground for gravity<span class="header-rule"></span>'}</div>
    <button class="text-button about-button" id="about-button" aria-label="About the experiment"><span class="about-label">About the experiment</span> ${icon('arrow-up-right')}</button>
    <button class="icon-button mobile-config" id="mobile-config" aria-label="Open simulation settings" aria-controls="settings-panel" aria-expanded="false">${icon('sliders-horizontal')}</button>
  </header>
  ${isNewsprint ? `<div class="edition-bar"><span>VOL. IV · NO. 01</span><span>${editionDate}</span><span>THE DYNAMICS EDITION</span></div>` : ''}
  <main class="main-shell">
    <section class="page-intro"><div class="intro-copy"><div class="eyebrow"><span class="tiny-cross">+</span> ${designCopy.eyebrow}</div><h1>${designCopy.headline}</h1><p>${designCopy.description}</p></div>${designDecoration(design)}<div class="intro-meta"><span class="green-dot"></span> Newtonian physics <span class="meta-divider">/</span> Real-time 3D</div></section>
    ${isNewsprint ? `<div class="edition-ticker" aria-label="Simulation facts"><div class="ticker-reel"><div class="ticker-copy">${tickerCopy}</div><div class="ticker-copy" aria-hidden="true">${tickerCopy}</div></div></div><div class="edition-section-rule"><span>01 / THE OBSERVATORY</span><span>CHANGE THE CONDITIONS. FOLLOW THE CONSEQUENCES.</span></div>` : ''}
    <div class="workspace">
      <section class="simulation-card" aria-label="Simulation and playback">
        <div class="viewport" id="viewport">
          <div class="scene-top"><div><div class="scene-heading"><h2 id="scene-title">Figure-eight</h2><span class="status-chip" id="stability-badge">Stable</span></div><p id="scene-subtitle">Three bodies. One beautiful choreography.</p></div><div class="scene-actions"><button class="icon-button" id="reset-camera" title="Reset camera" aria-label="Reset camera">${icon('crosshair')}</button><button class="icon-button" id="fullscreen" title="Expand simulation" aria-label="Expand simulation">${icon('maximize-2')}</button></div></div>
          <div class="body-label" id="label-0"><span></span>BODY A</div><div class="body-label" id="label-1"><span></span>BODY B</div><div class="body-label" id="label-2"><span></span>BODY C</div>
          <div class="scene-bottom">${isNewsprint ? '<span class="figure-caption">FIG. 1 / ORBITAL STUDY</span>' : ''}<div class="scene-legend">${BODY_COLORS.map((c,i)=>`<span><i style="--body-color:${c}"></i>Body ${'ABC'[i]}</span>`).join('')}</div><div class="orbit-hint">${icon('mouse-pointer-2')} Drag to orbit <span>·</span> Scroll to zoom</div></div>
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
        <div class="settings-heading"><div>${icon('sliders-horizontal')}<h2>${isNewsprint ? 'The control desk' : 'Experiment settings'}</h2></div><button class="icon-button drawer-close" id="close-settings" aria-label="Close settings">${icon('x')}</button><span class="settings-tag">3 BODIES</span></div>
        <div class="settings-content">
          <section class="settings-section"><label class="section-label" for="preset">INITIAL CONFIGURATION</label><div class="select-wrap"><select id="preset">${Object.entries(PRESETS).map(([key,p])=>`<option value="${key}">${p.name}</option>`).join('')}</select>${icon('chevron-down')}</div><p class="preset-description" id="preset-description">${PRESETS.figure8.description}</p><div class="preset-hint"><span class="green-dot"></span><span id="preset-hint">Equal masses · Periodic orbit</span></div></section>
          <section class="settings-section visual-section"><div class="section-label">VISUAL WORLD</div><div class="world-options"><button class="world-option active" data-world="cosmic" aria-pressed="true"><div class="world-thumbnail cosmic-thumb"><i></i><i></i><i></i></div><span>Cosmic</span></button><button class="world-option" data-world="studio" aria-pressed="false"><div class="world-thumbnail studio-thumb"><i></i><i></i><i></i></div><span>Studio</span></button><button class="world-option" data-world="abstract" aria-pressed="false"><div class="world-thumbnail abstract-thumb"><i></i><i></i><i></i></div><span>Abstract</span></button></div></section>
          <section class="settings-section display-section"><div class="section-label">DISPLAY</div><label class="toggle-row" for="trails"><span>Orbital trails</span><input class="switch" type="checkbox" id="trails" checked /><span class="switch-visual"></span></label><div class="setting-row trail-length-row"><label for="trail-length">Trail length</label><div class="mini-select"><select id="trail-length"><option value="1">Short</option><option value="2.5" selected>Medium</option><option value="10">Long</option><option value="full">Full history</option></select>${icon('chevron-down')}</div></div><label class="toggle-row" for="grid"><span>Coordinate grid</span><input class="switch" type="checkbox" id="grid" /><span class="switch-visual"></span></label><label class="toggle-row" for="axes"><span>XYZ axes</span><input class="switch" type="checkbox" id="axes" /><span class="switch-visual"></span></label><label class="toggle-row" for="labels"><span>Body labels</span><input class="switch" type="checkbox" id="labels" checked /><span class="switch-visual"></span></label><label class="toggle-row" for="auto-rotate"><span>Auto-rotate camera</span><input class="switch" type="checkbox" id="auto-rotate" /><span class="switch-visual"></span></label></section>
          <section class="settings-section physics-section"><details id="physics-details"><summary><span>PHYSICS & INITIAL CONDITIONS</span>${icon('plus')}</summary><div class="physics-controls"><p class="control-note">Changes start a new run. Values use dimensionless units.</p>${BODY_COLORS.map((color,i)=>`<label class="range-label" for="mass-${i}"><span><i class="body-dot" style="--body-color:${color}"></i>Body ${'ABC'[i]} mass</span><output id="mass-out-${i}">1.00</output></label><input class="physics-range" id="mass-${i}" type="range" min="0.1" max="5" step="0.05" value="1" />`).join('')}<label class="range-label" for="gravity"><span>Gravity strength</span><output id="gravity-out">1.00</output></label><input class="physics-range" id="gravity" type="range" min="0.1" max="3" step="0.05" value="1" /><label class="range-label" for="velocity"><span>Initial velocity</span><output id="velocity-out">1.00×</output></label><input class="physics-range" id="velocity" type="range" min="0" max="2" step="0.01" value="1" /><label class="range-label" for="perturbation"><span>Out-of-plane kick</span><output id="perturbation-out">0.000</output></label><input class="physics-range" id="perturbation" type="range" min="0" max="0.4" step="0.001" value="0" /><div class="setting-row"><label for="softening">Close encounter softening</label><select id="softening"><option value="0.001">0.001</option><option value="0.01">0.01</option><option value="0.05">0.05</option></select></div><button class="edit-initial" id="edit-initial">Edit positions & velocities ${icon('arrow-up-right')}</button><button class="apply-button" id="apply-physics">Restart with changes ${icon('rotate-ccw')}</button></div></details></section>
        </div><div class="settings-footer">${icon('info')} ${isNewsprint ? 'FIELD NOTE: Small changes change the story.' : 'Small changes can change everything.'}</div>
      </aside>
    </div>
    <footer class="app-footer"><div><span class="green-dot"></span><span id="engine-status">3 bodies · 3 dimensions · infinite curiosity</span></div><div class="footer-right"><span class="mono">ΔE <span id="energy-drift">0.000</span>%</span><span class="footer-separator"></span><button id="shortcuts" class="text-button">${icon('keyboard')} Keyboard shortcuts</button></div></footer>
    ${isNewsprint ? '<div class="edition-colophon"><span>THE THREE BODY LAB</span><span class="edition-ornament" aria-hidden="true">✧ &nbsp; ✧ &nbsp; ✧</span><span>EDITION IV / AN INTERACTIVE PUBLICATION</span></div>' : ''}
  </main>
  <dialog id="about-dialog" class="modal"><div class="modal-header"><span class="eyebrow">THE EXPERIMENT</span><button class="icon-button" data-close="about-dialog" aria-label="Close about">${icon('x')}</button></div><div class="modal-orbit">${icon('orbit')}</div><h2>A little order.<br>A lot of chaos.</h2><p>The three-body problem asks a simple question: how do three objects move when each pulls on the other two? The answer is usually wonderfully complicated.</p><p>Explore rare periodic orbits or give a body a tiny kick and watch the symmetry unravel. These are integrated gravitational trajectories, with a full third dimension and replayable history.</p><div class="about-facts"><span>3D Newtonian gravity</span><span>Adaptive velocity-Verlet</span><span>600-unit run limit</span></div><p class="about-fine">Mass, distance, and time are dimensionless. Bodies are visual markers; close encounters use adjustable Plummer softening. Numerical error grows in extreme encounters—watch ΔE in the footer. “Stable” describes the unmodified figure-eight preset; changed masses or velocities may break it.</p><a class="source-link" href="https://people.ucsc.edu/~rmont/Nbdy/NbdyC1.html" target="_blank" rel="noopener noreferrer">Figure-eight initial conditions · Richard Montgomery ${icon('arrow-up-right')}</a></dialog>
  <dialog id="shortcuts-dialog" class="modal small-modal"><div class="modal-header"><h2>Make yourself at home.</h2><button class="icon-button" data-close="shortcuts-dialog" aria-label="Close shortcuts">${icon('x')}</button></div><div class="shortcut-row"><span>Play / pause</span><kbd>Space</kbd></div><div class="shortcut-row"><span>Restart simulation</span><kbd>R</kbd></div><div class="shortcut-row"><span>Scrub backward / forward</span><div><kbd>←</kbd> <kbd>→</kbd></div></div><div class="shortcut-row"><span>Rotate the camera</span><span>Drag</span></div><div class="shortcut-row"><span>Pan the camera</span><span>Right-drag / two fingers</span></div><div class="shortcut-row"><span>Zoom</span><span>Scroll / pinch</span></div></dialog>
  <dialog id="initial-dialog" class="modal initial-modal"><div class="modal-header"><div><span class="eyebrow">INITIAL CONDITIONS</span><h2>Set a new course.</h2></div><button class="icon-button" data-close="initial-dialog" aria-label="Close initial conditions">${icon('x')}</button></div><p>Starting positions and velocities in 3D. Center-of-mass position and velocity are removed when the run starts.</p><form id="initial-form"><div id="initial-fields"></div><p class="form-error" id="initial-error" role="alert"></p><button class="apply-button" type="submit">Start custom run ${icon('arrow-up-right')}</button></form></dialog>
  <div class="toast" id="toast" role="status"></div>
`;
createIcons({icons: iconSet});

let scene;
try {scene = new GravityScene($('viewport'));} catch (error) {console.error(error); $('render-error').hidden = false;}

let simulation, preset = 'figure8', currentTime = 0, playing = true, speed = 1, isScrubbing = false, custom = null, modified = false, appliedConfig = {};
let frame = 0, previousTimestamp = performance.now(), lastUI = 0;
const viewOptions = {trails: true, trailLength: '2.5', labels: true, autoRotate: false, follow: false, forceTrails: true};

function notify(message) {const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(notify.timer); notify.timer = setTimeout(() => el.classList.remove('show'), 2800);}
function draftConfig() {return {masses: [0, 1, 2].map(i => Number($(`mass-${i}`).value)), gravity: Number($('gravity').value), velocity: Number($('velocity').value), perturbation: Number($('perturbation').value), softening: Number($('softening').value), custom};}
function updatePlay() {$('play').innerHTML = icon(playing ? 'pause' : 'play'); $('play').setAttribute('aria-label', playing ? 'Pause simulation' : 'Play simulation'); createIcons({icons: iconSet});}
function setPlaying(value) {playing = value; updatePlay(); updateUI();}
function loadRun({warmup = true, config = null} = {}) {
  const p = PRESETS[preset];
  appliedConfig = config ?? {gravity: 1, velocity: 1, perturbation: 0, softening: .001};
  simulation = new Simulation(createInitial(preset, appliedConfig), appliedConfig);
  const preload = warmup ? p.warmup : 0; simulation.advanceTo(preload); currentTime = simulation.time;
  viewOptions.forceTrails = true; playing = true;
  const isChanged = modified || custom;
  $('scene-title').textContent = custom ? 'Custom configuration' : p.name;
  $('stability-badge').textContent = isChanged ? 'Modified' : p.category;
  $('stability-badge').classList.toggle('chaotic', isChanged || p.category.includes('unstable') || p.category === 'Chaotic');
  $('scene-subtitle').textContent = custom ? 'Your initial conditions. A new beginning.' : p.subtitle;
  $('preset-description').textContent = p.description;
  $('preset-hint').textContent = preset === 'figure8' ? 'Equal masses · Periodic orbit' : preset === 'hierarchy' ? 'Unequal masses · Tilted orbit' : preset === 'triangle' ? 'Equal masses · Unstable symmetry' : 'Close encounters · Sensitive to changes';
  scene?.setScale(p.scale); scene?.resetCamera();
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === 'perspective'));
  updatePlay(); updateUI();
}
function updateUI() {
  const live = simulation.time - currentTime < SAMPLE_DT * 1.5;
  const stateText = isScrubbing ? 'SCRUBBING' : !playing ? 'PAUSED' : live ? 'LIVE' : 'REPLAY';
  $('playback-state').innerHTML = `<span class="green-dot ${stateText === 'LIVE' ? '' : 'muted-dot'}"></span>${stateText}`;
  $('time-readout').textContent = `t = ${currentTime.toFixed(3)}`;
  $('timeline').max = Math.max(simulation.time, SAMPLE_DT);
  if (!isScrubbing) $('timeline').value = currentTime;
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
  $('engine-status').textContent = currentTime >= MAX_TIME ? 'Run complete · 600 simulation units saved' : custom || modified ? 'Custom run · 3 bodies · 3 dimensions' : '3 bodies · 3 dimensions · infinite curiosity';
}
function scrub(time) {currentTime = Math.max(0, Math.min(simulation.time, time)); viewOptions.forceTrails = true; updateUI();}
const mobileMedia = window.matchMedia('(max-width: 760px)');
function syncDrawerAccessibility() {const hidden = mobileMedia.matches && !$('settings-panel').classList.contains('drawer-open'); $('settings-panel').inert = hidden; $('settings-panel').setAttribute('aria-hidden', String(hidden));}
mobileMedia.addEventListener('change', syncDrawerAccessibility); syncDrawerAccessibility();
function toggleDrawer(open) {$('settings-panel').classList.toggle('drawer-open', open); $('drawer-overlay').classList.toggle('show', open); $('mobile-config').setAttribute('aria-expanded', String(open)); syncDrawerAccessibility(); if (mobileMedia.matches) (open ? $('preset') : $('mobile-config')).focus();}

$('preset').addEventListener('change', e => {
  preset = e.target.value; custom = null; modified = false;
  const masses = PRESETS[preset].initial().masses;
  masses.forEach((m,i) => {$(`mass-${i}`).value = m; $(`mass-out-${i}`).textContent = m.toFixed(2);});
  for (const [id, v] of [['gravity', 1], ['velocity', 1], ['perturbation', 0], ['softening', .001]]) $(id).value = v;
  $('gravity-out').textContent = '1.00'; $('velocity-out').textContent = '1.00×'; $('perturbation-out').textContent = '0.000';
  loadRun(); notify(`${PRESETS[preset].name} loaded`);
});
document.querySelectorAll('.world-option[data-world]').forEach(button => button.addEventListener('click', () => {
  const world = button.dataset.world; scene?.setStyle(world);
  document.querySelectorAll('.world-option[data-world]').forEach(b => {b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button));});
  if (world === 'abstract') {$('grid').checked = true; $('axes').checked = true;} else {$('grid').checked = false; $('axes').checked = false;}
  if (scene) {scene.showGrid = $('grid').checked; scene.showAxes = $('axes').checked; scene.updateHelpers();}
  viewOptions.forceTrails = true;
}));
for (const [id, key] of [['trails', 'trails'], ['labels', 'labels'], ['auto-rotate', 'autoRotate']]) $(id).addEventListener('change', e => {viewOptions[key] = e.target.checked; viewOptions.forceTrails = true;});
for (const [id, key] of [['grid', 'showGrid'], ['axes', 'showAxes']]) $(id).addEventListener('change', e => {if (scene) {scene[key] = e.target.checked; scene.updateHelpers();}});
$('trail-length').addEventListener('change', e => {viewOptions.trailLength = e.target.value; viewOptions.forceTrails = true;});
$('play').addEventListener('click', () => setPlaying(!playing));
$('restart').addEventListener('click', () => {loadRun({warmup: false, config: appliedConfig}); notify('Run restarted from t = 0');});
$('back').addEventListener('click', () => {setPlaying(false); scrub(currentTime - .25);});
$('forward').addEventListener('click', () => {setPlaying(false); scrub(currentTime + .25);});
$('jump-live').addEventListener('click', () => {scrub(simulation.time); setPlaying(true);});
$('speed').addEventListener('change', e => {speed = Number(e.target.value);});
bindTimeline($('timeline'), {
  pause: () => setPlaying(false),
  seek: scrub,
  scrubbing: active => {isScrubbing = active; updateUI();},
  releaseTarget: window,
});
$('reset-camera').addEventListener('click', () => {scene?.resetCamera(); document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === 'perspective'));});
$('fit-camera').addEventListener('click', () => scene?.fit(simulation.at(currentTime).positions));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {scene?.resetCamera(button.dataset.view === 'top'); document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === button));}));
$('fullscreen').addEventListener('click', async () => {
  const card = document.querySelector('.simulation-card');
  try {if (document.fullscreenElement) await document.exitFullscreen(); else if (card.requestFullscreen) await card.requestFullscreen(); else card.classList.toggle('expanded');}
  catch {card.classList.toggle('expanded');}
  $('fullscreen').innerHTML = icon(document.fullscreenElement || card.classList.contains('expanded') ? 'minimize-2' : 'maximize-2'); createIcons({icons: iconSet});
});
document.addEventListener('fullscreenchange', () => {$('fullscreen').innerHTML = icon(document.fullscreenElement ? 'minimize-2' : 'maximize-2'); createIcons({icons: iconSet});});
$('mobile-config').addEventListener('click', () => toggleDrawer(true)); $('close-settings').addEventListener('click', () => toggleDrawer(false)); $('drawer-overlay').addEventListener('click', () => toggleDrawer(false));
for (const [button, dialog] of [['about-button', 'about-dialog'], ['shortcuts', 'shortcuts-dialog']]) $(button).addEventListener('click', () => $(dialog).showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', e => {if (e.target === dialog) {const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();}}));
for (let i = 0; i < 3; i++) $(`mass-${i}`).addEventListener('input', e => {$(`mass-out-${i}`).textContent = Number(e.target.value).toFixed(2);});
for (const [id, digits, suffix] of [['gravity', 2, ''], ['velocity', 2, '×'], ['perturbation', 3, '']]) $(id).addEventListener('input', e => {$(`${id}-out`).textContent = Number(e.target.value).toFixed(digits) + suffix;});
$('apply-physics').addEventListener('click', () => {modified = true; loadRun({warmup: false, config: draftConfig()}); notify('New physics applied'); toggleDrawer(false);});
$('edit-initial').addEventListener('click', () => {
  const initial = custom ?? createInitial(preset, draftConfig());
  $('initial-fields').innerHTML = [0, 1, 2].map(i => `<fieldset class="initial-body"><legend><i class="body-dot" style="--body-color:${BODY_COLORS[i]}"></i>Body ${'ABC'[i]}</legend>${['positions', 'velocities'].map(key => `<div class="initial-vector"><span>${key === 'positions' ? 'Position' : 'Velocity'}</span>${['x', 'y', 'z'].map((axis,k) => `<label>${axis}<input name="${key}-${i}-${k}" type="number" step="any" min="-20" max="20" required value="${initial[key][i][k].toFixed(6)}" aria-label="Body ${'ABC'[i]} ${key} ${axis}" /></label>`).join('')}</div>`).join('')}</fieldset>`).join('');
  $('initial-error').textContent = ''; $('initial-dialog').showModal();
});
$('initial-form').addEventListener('submit', e => {
  e.preventDefault(); const data = new FormData(e.target);
  const next = Object.fromEntries(['positions', 'velocities'].map(key => [key, [0, 1, 2].map(i => [0, 1, 2].map(k => Number(data.get(`${key}-${i}-${k}`))))]));
  if (Object.values(next).flat(2).some(x => !Number.isFinite(x) || Math.abs(x) > 20)) {$('initial-error').textContent = 'Use finite values between −20 and 20.'; return;}
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (Math.hypot(...next.positions[i].map((x,k) => x - next.positions[j][k])) < .05) {$('initial-error').textContent = 'Start each body at least 0.05 units apart.'; return;}
  custom = next; modified = true; loadRun({warmup: false, config: draftConfig()});
  scene?.fit(simulation.at(0).positions); $('initial-dialog').close(); toggleDrawer(false); notify('Custom run started');
});
window.addEventListener('keydown', e => {
  if (e.target.matches('input, select, textarea, button') || document.querySelector('dialog[open]')) return;
  if (e.code === 'Space') {e.preventDefault(); setPlaying(!playing);}
  else if (e.key.toLowerCase() === 'r') loadRun({warmup: false, config: appliedConfig});
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {e.preventDefault(); setPlaying(false); scrub(currentTime + (e.key === 'ArrowRight' ? .25 : -.25));}
});
document.addEventListener('visibilitychange', () => {previousTimestamp = performance.now();});

loadRun();
function animate(timestamp) {
  requestAnimationFrame(animate);
  const dt = Math.min(.06, (timestamp - previousTimestamp) / 1000); previousTimestamp = timestamp;
  if (playing && !isScrubbing && !document.hidden) {
    let target = Math.min(MAX_TIME, currentTime + dt * speed);
    if (target > simulation.time) simulation.advanceTo(target, 8);
    currentTime = Math.min(target, simulation.time);
    if (currentTime >= MAX_TIME) {setPlaying(false); notify('Run complete. All 600 units remain available to replay.');}
  }
  const state = simulation.at(currentTime);
  scene?.update(state, simulation, currentTime, viewOptions, frame++); viewOptions.forceTrails = false;
  if (scene) state.positions.forEach((position,i) => {const p = scene.project(position), label = $(`label-${i}`), width = scene.container.clientWidth; label.style.transform = `translate(${p.x > width - 90 ? p.x - 74 : p.x + 19}px,${p.y - 15}px)`; label.style.display = viewOptions.labels && p.visible ? '' : 'none';});
  if (timestamp - lastUI > 100) {updateUI(); lastUI = timestamp;}
}
requestAnimationFrame(animate);
