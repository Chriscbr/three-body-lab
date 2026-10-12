import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {SAMPLE_DT} from './physics.js';

export const BODY_COLORS = ['#edb978', '#80d7c3', '#aca3ed'];
const GLOW_STRENGTH = 0.5;
const noiseGLSL = `
float hash(vec3 p) { p=fract(p*0.3183099+vec3(0.1,0.2,0.3)); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 p) { vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p) { float n=0.; n+=noise(p)*0.5; n+=noise(p*2.03)*0.25; n+=noise(p*4.07)*0.125; n+=noise(p*8.11)*0.0625; return n; }
`;

function glowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(0.12, 'rgba(255,255,255,.95)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,.5)'); gradient.addColorStop(0.4, 'rgba(255,255,255,.2)');
  gradient.addColorStop(0.65, 'rgba(255,255,255,.045)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function woodTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(1024, 1024);
  let seed = 4637;
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const warp = Math.sin(x * .007) * 12 + Math.sin(x * .018 + y * .004) * 5;
    const grain = Math.sin((y + warp) * .24) * 5 + Math.sin((y + warp) * 1.4) * 2;
    const variation = Math.sin(y * .014 + Math.sin(x * .005)) * 8 + (seed / 4294967296 - .5) * 6;
    const seam = y % 256 < 2 ? -22 : 0, offset = (y * 1024 + x) * 4;
    pixels.data[offset] = 105 + grain + variation + seam;
    pixels.data[offset + 1] = 64 + grain * .75 + variation * .65 + seam;
    pixels.data[offset + 2] = 37 + grain * .5 + variation * .4 + seam;
    pixels.data[offset + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4; return texture;
}

function galaxyTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.translate(128, 128); ctx.rotate(-.4); ctx.scale(1, .47);
  const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, 112);
  haze.addColorStop(0, 'rgba(255,242,205,.95)'); haze.addColorStop(.08, 'rgba(255,230,200,.7)');
  haze.addColorStop(.22, 'rgba(198,194,239,.22)'); haze.addColorStop(.65, 'rgba(123,160,215,.045)'); haze.addColorStop(1, 'rgba(100,130,180,0)');
  ctx.fillStyle = haze; ctx.fillRect(-128, -128, 256, 256);
  for (let arm = 0; arm < 3; arm++) for (let j = 0; j < 600; j++) {
    const r = 8 + j * .15, angle = arm * Math.PI * 2 / 3 + r * .045;
    const scatter = Math.sin(j * 78.233 + arm) * 8;
    ctx.fillStyle = `rgba(190,211,255,${.025 + .09 * (1 - r / 100)})`;
    ctx.beginPath(); ctx.arc(Math.cos(angle) * r + scatter, Math.sin(angle) * r + Math.cos(j * 12.14) * 6, 1.1, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function axisLabel(text, color) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.font = '500 36px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 32, 32);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false}));
  return sprite;
}

export class GravityScene {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: false, powerPreference: 'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.setAttribute('aria-label', 'Interactive three dimensional gravity simulation. Drag to orbit, scroll or pinch to zoom.');
    container.prepend(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.001, 2500);
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.15 * GLOW_STRENGTH, .65, 1.05);
    this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.065;
    this.controls.minDistance = 0.3; this.controls.maxDistance = 1500;
    this.controls.autoRotateSpeed = 0.45;
    const pmrem = new THREE.PMREMGenerator(this.renderer), room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04).texture; room.dispose(); pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xd9e9ff, 0x37313e, 2.5));
    const key = new THREE.DirectionalLight(0xffedda, 4); key.position.set(-3, 6, 4); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x8dbbdf, 2); fill.position.set(4, 2, -3); this.scene.add(fill);
    this.geometry = new THREE.SphereGeometry(1, 48, 32);
    const glowMap = glowTexture();
    this.bodies = BODY_COLORS.map((color, i) => {
      const body = new THREE.Mesh(this.geometry, new THREE.MeshStandardMaterial({color})); this.scene.add(body);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({map: glowMap, color: new THREE.Color(color).multiplyScalar(2.2), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .85 * GLOW_STRENGTH})); body.add(halo);
      const aura = new THREE.Sprite(new THREE.SpriteMaterial({map: glowMap, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .32 * GLOW_STRENGTH})); body.add(aura);
      const solarMaterial = new THREE.ShaderMaterial({
        uniforms: {bodyColor: {value: new THREE.Color(color)}, time: {value: 0}},
        vertexShader: `varying vec3 vNormal; varying vec3 vPosition; varying vec3 vView; void main(){vPosition=position;vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
        fragmentShader: `${noiseGLSL} varying vec3 vNormal; varying vec3 vPosition; varying vec3 vView; uniform vec3 bodyColor; uniform float time;
        void main(){float n=fbm(vPosition*19.+vec3(time*.018));float cells=noise(vPosition*75.+time*.008);float limb=pow(max(dot(normalize(vNormal),normalize(vView)),0.),.45);vec3 c=bodyColor*(.65+n*1.15+cells*.22);c=mix(c,vec3(1.,.96,.87),smoothstep(.52,.9,n)*.42);c*=2.6+limb*1.8;gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`
      });
      const metalMaterial = new THREE.MeshStandardMaterial({color, metalness: 1, roughness: 0.17, envMapIntensity: 2.2});
      const matteMaterial = new THREE.MeshStandardMaterial({color, metalness: 0, roughness: 1});
      return {body, halo, aura, solarMaterial, metalMaterial, matteMaterial};
    });
    this.trails = BODY_COLORS.map(color => {
      const geometry = new LineGeometry(); geometry.setPositions([0, 0, 0, 0, 0, 0]); geometry.setColors([1, 1, 1, 1, 1, 1]);
      const material = new LineMaterial({color: 0xffffff, vertexColors: true, linewidth: 1.8, transparent: true, opacity: .85, depthWrite: false});
      const line = new Line2(geometry, material); line.frustumCulled = false; this.scene.add(line);
      return {line, color: new THREE.Color(color)};
    });
    this.cosmos = this.makeCosmos(); this.scene.add(this.cosmos);
    this.studio = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({color: 0x1d2226, roughness: .48, metalness: .2}));
    floor.rotation.x = -Math.PI / 2; this.studio.add(floor); this.floor = floor;
    const walnut = woodTexture();
    const edge = new THREE.MeshStandardMaterial({color: 0x593622, roughness: .85, metalness: 0});
    const tabletop = new THREE.MeshStandardMaterial({map: walnut, bumpMap: walnut, bumpScale: .006, roughness: .82, metalness: 0, envMapIntensity: .3});
    this.plinth = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .1, 96), [edge, tabletop, edge]);
    this.studio.add(this.plinth); this.scene.add(this.studio);
    this.abstract = new THREE.Group(); this.scene.add(this.abstract);
    this.gridGroup = new THREE.Group(); this.scene.add(this.gridGroup);
    this.axisGroup = new THREE.Group(); this.scene.add(this.axisGroup);
    this.scale = 1.65; this.style = 'cosmic'; this.showGrid = false; this.showAxes = false;
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container);
    this.setScale(this.scale); this.setStyle('cosmic'); this.resize();
  }
  makeCosmos() {
    const group = new THREE.Group();
    const backdrop = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 20), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: `varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `${noiseGLSL} varying vec3 vPosition;
      void main(){
        vec3 p=normalize(vPosition);
        vec3 warp=vec3(fbm(p*3.+vec3(5.,0.,2.)),fbm(p*3.+vec3(0.,8.,1.)),fbm(p*3.+vec3(3.,2.,9.)));
        vec3 q=p*4.+warp*2.5;
        float cloud=fbm(q+vec3(4.,1.,7.));
        float billows=fbm(q*2.1+vec3(1.,7.,3.));
        float fine=fbm(q*6.);
        float band=.3+.7*exp(-pow((p.x+.2*p.z)*2.1,2.));
        float gas=smoothstep(.27,.65,cloud)*band;
        float dust=smoothstep(.38,.67,billows);
        float filaments=pow(1.-abs(billows-.48)*2.,8.)*gas;
        vec3 blue=vec3(.016,.043,.09);
        vec3 violet=vec3(.085,.022,.073);
        vec3 c=vec3(.002,.003,.008)+mix(blue,violet,smoothstep(.3,.65,fbm(p*2.+vec3(9.))))*gas*1.65;
        c+=vec3(.055,.13,.14)*filaments*.4+vec3(.12,.054,.025)*pow(dust,2.)*gas*.55;
        c*=1.-smoothstep(.43,.7,fine)*dust*.7;
        gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
      }`
    }));
    // Bake the cloud shader once into a real cubemap so mobile frames stay light.
    const skyScene = new THREE.Scene(); skyScene.add(backdrop);
    this.skyboxTarget = new THREE.WebGLCubeRenderTarget(512, {type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter});
    const skyCamera = new THREE.CubeCamera(1, 1500, this.skyboxTarget); skyCamera.update(this.renderer, skyScene);
    this.nebulaBackground = this.skyboxTarget.texture;
    backdrop.geometry.dispose(); backdrop.material.dispose();
    const positions = [], colors = [], sizes = [];
    let seed = 827312; const random = () => {seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296;};
    for (let i = 0; i < 9500; i++) {
      const angle = random() * Math.PI * 2, y = i < 3800 ? random() * 2 - 1 : (random() + random() + random() - 1.5) * .26;
      const r = Math.sqrt(1 - y * y), v = new THREE.Vector3(r * Math.cos(angle), y, r * Math.sin(angle)); v.applyAxisAngle(new THREE.Vector3(0, 0, 1), -.2).multiplyScalar(350 + random() * 200);
      positions.push(v.x, v.y, v.z);
      const c = new THREE.Color().setRGB(.55 + random() * .4, .6 + random() * .35, .7 + random() * .3); colors.push(c.r, c.g, c.b);
      sizes.push(random() < .025 ? 2.6 : .65 + random() * 1.15);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    const material = new THREE.ShaderMaterial({transparent: true, depthWrite: false, vertexColors: true, uniforms: {pixelRatio: {value: this.renderer.getPixelRatio()}},
      vertexShader: `attribute float size; varying vec3 vColor; uniform float pixelRatio; void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*pixelRatio;gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `varying vec3 vColor; void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vColor,(1.-d)*.85);
      #include <colorspace_fragment>
      }`
    }); group.add(new THREE.Points(geometry, material));
    const galaxyMap = galaxyTexture();
    for (let i = 0; i < 200; i++) {
      const galaxy = new THREE.Sprite(new THREE.SpriteMaterial({map: galaxyMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .45 + random() * .25, rotation: random() * Math.PI * 2}));
      const y = random() * 2 - 1, angle = random() * Math.PI * 2, r = Math.sqrt(1 - y * y);
      galaxy.position.set(r * Math.cos(angle), y, r * Math.sin(angle)).multiplyScalar(620);
      galaxy.scale.setScalar(5 + random() * 10); group.add(galaxy);
    }
    return group;
  }
  setScale(scale) {
    this.scale = scale;
    for (const group of [this.gridGroup, this.axisGroup]) {
      while (group.children.length) {const c = group.children[0]; group.remove(c); c.geometry?.dispose(); if (c.material?.map) c.material.map.dispose(); c.material?.dispose();}
    }
    const grid = new THREE.GridHelper(scale * 4, 24, 0x50585c, 0x333c40); grid.material.transparent = true; grid.material.opacity = .34; grid.position.y = -scale * .42; this.gridGroup.add(grid);
    // Three orthogonal planes make the coordinate volume legible from every angle.
    for (let i = 0; i < 2; i++) {
      const grid3D = new THREE.GridHelper(scale * 3, 12, 0x70787c, 0x586065); grid3D.rotation[i === 0 ? 'x' : 'z'] = Math.PI / 2;
      grid3D.material.transparent = true; grid3D.material.opacity = .085; this.gridGroup.add(grid3D);
    }
    for (const [i, label, color] of [[0, 'X', '#bc8984'], [1, 'Y', '#88b4a1'], [2, 'Z', '#8c9fbf']]) {
      const end = [0, 0, 0]; end[i] = scale * 1.5;
      const start = [0, 0, 0]; start[i] = -scale * 1.5;
      const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...start), new THREE.Vector3(...end)]);
      this.axisGroup.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({color, transparent: true, opacity: .65})));
      const sprite = axisLabel(label, color); sprite.position.set(...end); sprite.scale.setScalar(scale * .13); this.axisGroup.add(sprite);
    }
    this.floor.position.y = -scale * .52;
    this.plinth.scale.set(scale * 1.18, scale, scale * 1.18); this.plinth.position.y = -scale * .49;
    this.setStyle(this.style);
  }
  setStyle(style) {
    this.style = style;
    this.container.dataset.world = style;
    this.cosmos.visible = style === 'cosmic'; this.studio.visible = style === 'studio';
    this.scene.background = style === 'cosmic' ? this.nebulaBackground : new THREE.Color(style === 'abstract' ? 0xb6bbc0 : 0x171c20);
    this.scene.environment = style === 'studio' ? this.environment : null;
    this.scene.fog = style === 'studio' ? new THREE.FogExp2(0x171c20, .08 / this.scale) : null;
    for (const b of this.bodies) {b.body.material = style === 'cosmic' ? b.solarMaterial : style === 'studio' ? b.metalMaterial : b.matteMaterial; b.halo.visible = b.aura.visible = style === 'cosmic';}
    this.gridGroup.children.forEach((grid,i) => {grid.material.color.set(style === 'abstract' ? 0x45545e : 0xffffff); grid.material.opacity = style === 'abstract' ? (i === 0 ? .32 : .12) : (i === 0 ? .34 : .085);});
    this.axisGroup.children.forEach(axis => {if (axis.isSprite) axis.material.color.set(style === 'abstract' ? 0x505050 : 0xffffff);});
    this.updateHelpers();
  }
  updateHelpers() {this.gridGroup.visible = this.showGrid; this.axisGroup.visible = this.showAxes;}
  resetCamera(top = false) {
    const s = this.scale;
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(top ? .001 : s * .28, top ? s * 2.5 : s * 1.45, top ? .001 : s * 1.95);
    this.camera.position.multiplyScalar(Math.max(1, .95 / this.camera.aspect));
    this.camera.up.set(0, 1, 0); this.controls.update();
  }
  fit(positions) {
    const center = positions.reduce((a, p) => a.add(new THREE.Vector3(...p)), new THREE.Vector3()).divideScalar(3);
    const radius = Math.max(this.scale * .6, ...positions.map(p => new THREE.Vector3(...p).distanceTo(center)));
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    this.controls.target.copy(center); this.camera.position.copy(center).addScaledVector(direction, radius * 3.5); this.controls.update();
  }
  resize() {
    const {width, height} = this.container.getBoundingClientRect(); if (!width || !height) return;
    const previousAspect = this.camera.aspect;
    this.camera.aspect = width / height;
    const framing = Math.max(1, .95 / this.camera.aspect) / Math.max(1, .95 / previousAspect);
    this.camera.position.sub(this.controls.target).multiplyScalar(framing).add(this.controls.target);
    this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height); this.composer.setSize(width, height);
    for (const t of this.trails) t.line.material.resolution.set(width, height);
  }
  update(state, simulation, time, options, frame) {
    this.bodies.forEach((b, i) => {
      b.body.position.set(...state.positions[i]);
      const radius = this.scale * .052 * Math.cbrt(state.masses[i] / Math.max(...state.masses)); b.body.scale.setScalar(radius);
      b.halo.scale.setScalar(8); b.aura.scale.setScalar(16); b.solarMaterial.uniforms.time.value = time;
    });
    if (frame % 3 === 0 || options.forceTrails) this.updateTrails(simulation, time, options);
    this.controls.autoRotate = options.autoRotate;
    if (options.follow) {
      const center = state.positions.reduce((a, p, i) => a.addScaledVector(new THREE.Vector3(...p), state.masses[i]), new THREE.Vector3()).divideScalar(state.masses.reduce((a, b) => a + b, 0));
      const diff = center.clone().sub(this.controls.target).multiplyScalar(.07); this.controls.target.add(diff); this.camera.position.add(diff);
    }
    this.controls.update(); this.cosmos.position.copy(this.camera.position);
    if (this.style === 'cosmic') this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
  updateTrails(simulation, time, options) {
    const end = Math.min(Math.floor(time / SAMPLE_DT), simulation.history.length - 1);
    const start = options.trailLength === 'full' ? 0 : Math.max(0, end - Math.round(Number(options.trailLength) / SAMPLE_DT));
    const stride = Math.max(1, Math.ceil((end - start) / 1600));
    this.trails.forEach((trail, i) => {
      trail.line.visible = options.trails && end > start;
      if (!trail.line.visible) return;
      const positions = [], colors = [], bg = new THREE.Color(this.style === 'abstract' ? '#b6bbc0' : '#0b0f13');
      const trailColor = this.style === 'abstract' ? trail.color.clone().multiplyScalar(.4) : trail.color;
      for (let index = start; index <= end; index += stride) {
        positions.push(...simulation.history[index].positions[i]);
        const alpha = .08 + .92 * ((index - start) / Math.max(1, end - start)) ** .7;
        const c = bg.clone().lerp(trailColor, alpha); colors.push(c.r, c.g, c.b);
      }
      positions.push(...simulation.at(time).positions[i]); colors.push(trailColor.r, trailColor.g, trailColor.b);
      if (positions.length >= 6) {trail.line.geometry.setPositions(positions); trail.line.geometry.setColors(colors);}
    });
  }
  project(position) {const v = new THREE.Vector3(...position).project(this.camera); const {width, height} = this.container.getBoundingClientRect(); return {x: (v.x * .5 + .5) * width, y: (-v.y * .5 + .5) * height, visible: v.z < 1 && v.z > -1 && Math.abs(v.x) < .97 && Math.abs(v.y) < .9};}
}
