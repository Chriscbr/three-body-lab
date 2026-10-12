import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {SAMPLE_DT} from './physics.js';

export const BODY_COLORS = ['#edb978', '#80d7c3', '#aca3ed'];
const noiseGLSL = `
float hash(vec3 p) { p=fract(p*0.3183099+vec3(0.1,0.2,0.3)); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 p) { vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p) { float n=0.; n+=noise(p)*0.5; n+=noise(p*2.03)*0.25; n+=noise(p*4.07)*0.125; n+=noise(p*8.11)*0.0625; return n; }
`;

function glowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(0.16, 'rgba(255,255,255,.65)');
  gradient.addColorStop(0.34, 'rgba(255,255,255,.17)'); gradient.addColorStop(0.65, 'rgba(255,255,255,.025)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
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
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({map: glowMap, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .75})); body.add(halo);
      const solarMaterial = new THREE.ShaderMaterial({
        uniforms: {bodyColor: {value: new THREE.Color(color)}, time: {value: 0}},
        vertexShader: `varying vec3 vNormal; varying vec3 vPosition; varying vec3 vView; void main(){vPosition=position;vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
        fragmentShader: `${noiseGLSL} varying vec3 vNormal; varying vec3 vPosition; varying vec3 vView; uniform vec3 bodyColor; uniform float time;
        void main(){float n=fbm(vPosition*19.+vec3(time*.018));float cells=noise(vPosition*75.+time*.008);float limb=pow(max(dot(normalize(vNormal),normalize(vView)),0.),.45);vec3 c=bodyColor*(.65+n*1.15+cells*.22);c=mix(c,vec3(1.,.96,.87),smoothstep(.52,.9,n)*.42);c*=.45+limb*.9;gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`
      });
      const metalMaterial = new THREE.MeshStandardMaterial({color, metalness: 1, roughness: 0.17, envMapIntensity: 2.2});
      const matteMaterial = new THREE.MeshStandardMaterial({color, metalness: 0, roughness: 1});
      return {body, halo, solarMaterial, metalMaterial, matteMaterial};
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
    this.plinth = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .075, 96), new THREE.MeshStandardMaterial({color: 0x34393b, roughness: .28, metalness: .75}));
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
      fragmentShader: `${noiseGLSL} varying vec3 vPosition; void main(){vec3 p=normalize(vPosition);float band=exp(-pow((p.y+.22*p.x+.08)*3.8,2.));float cloud=fbm(p*6.+vec3(2.));float dust=fbm(p*24.);vec3 c=vec3(.0014,.0022,.0035)+vec3(.006,.010,.011)*band*pow(cloud,2.)+vec3(.003,.002,.005)*dust*band;gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
      }`
    }));
    group.add(backdrop);
    const positions = [], colors = [], sizes = [];
    let seed = 827312; const random = () => {seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296;};
    for (let i = 0; i < 7000; i++) {
      const angle = random() * Math.PI * 2, y = i < 3800 ? random() * 2 - 1 : (random() + random() + random() - 1.5) * .26;
      const r = Math.sqrt(1 - y * y), v = new THREE.Vector3(r * Math.cos(angle), y, r * Math.sin(angle)); v.applyAxisAngle(new THREE.Vector3(0, 0, 1), -.2).multiplyScalar(350 + random() * 200);
      positions.push(v.x, v.y, v.z);
      const c = new THREE.Color().setRGB(.55 + random() * .4, .6 + random() * .35, .7 + random() * .3); colors.push(c.r, c.g, c.b);
      sizes.push(random() < .025 ? 2.4 : .55 + random() * 1.1);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    const material = new THREE.ShaderMaterial({transparent: true, depthWrite: false, vertexColors: true, uniforms: {pixelRatio: {value: this.renderer.getPixelRatio()}},
      vertexShader: `attribute float size; varying vec3 vColor; uniform float pixelRatio; void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*pixelRatio;gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `varying vec3 vColor; void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vColor,(1.-d)*.7);
      #include <colorspace_fragment>
      }`
    }); group.add(new THREE.Points(geometry, material));
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
  }
  setStyle(style) {
    this.style = style;
    this.cosmos.visible = style === 'cosmic'; this.studio.visible = style === 'studio';
    this.scene.background = style === 'cosmic' ? null : new THREE.Color(style === 'abstract' ? 0x33383b : 0x171c20);
    this.scene.environment = style === 'studio' ? this.environment : null;
    this.scene.fog = style === 'studio' ? new THREE.FogExp2(0x171c20, .08 / this.scale) : null;
    for (const b of this.bodies) {b.body.material = style === 'cosmic' ? b.solarMaterial : style === 'studio' ? b.metalMaterial : b.matteMaterial; b.halo.visible = style === 'cosmic';}
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
    this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height);
    for (const t of this.trails) t.line.material.resolution.set(width, height);
  }
  update(state, simulation, time, options, frame) {
    this.bodies.forEach((b, i) => {
      b.body.position.set(...state.positions[i]);
      const radius = this.scale * .052 * Math.cbrt(state.masses[i] / Math.max(...state.masses)); b.body.scale.setScalar(radius);
      b.halo.scale.setScalar(6.4); b.solarMaterial.uniforms.time.value = time;
    });
    if (frame % 3 === 0 || options.forceTrails) this.updateTrails(simulation, time, options);
    this.controls.autoRotate = options.autoRotate;
    if (options.follow) {
      const center = state.positions.reduce((a, p, i) => a.addScaledVector(new THREE.Vector3(...p), state.masses[i]), new THREE.Vector3()).divideScalar(state.masses.reduce((a, b) => a + b, 0));
      const diff = center.clone().sub(this.controls.target).multiplyScalar(.07); this.controls.target.add(diff); this.camera.position.add(diff);
    }
    this.controls.update(); this.renderer.render(this.scene, this.camera);
  }
  updateTrails(simulation, time, options) {
    const end = Math.min(Math.floor(time / SAMPLE_DT), simulation.history.length - 1);
    const start = options.trailLength === 'full' ? 0 : Math.max(0, end - Math.round(Number(options.trailLength) / SAMPLE_DT));
    const stride = Math.max(1, Math.ceil((end - start) / 1600));
    this.trails.forEach((trail, i) => {
      trail.line.visible = options.trails && end > start;
      if (!trail.line.visible) return;
      const positions = [], colors = [], bg = new THREE.Color(this.style === 'abstract' ? '#33383b' : '#0b0f13');
      for (let index = start; index <= end; index += stride) {
        positions.push(...simulation.history[index].positions[i]);
        const alpha = .08 + .92 * ((index - start) / Math.max(1, end - start)) ** .7;
        const c = bg.clone().lerp(trail.color, alpha); colors.push(c.r, c.g, c.b);
      }
      positions.push(...simulation.at(time).positions[i]); colors.push(trail.color.r, trail.color.g, trail.color.b);
      if (positions.length >= 6) {trail.line.geometry.setPositions(positions); trail.line.geometry.setColors(colors);}
    });
  }
  project(position) {const v = new THREE.Vector3(...position).project(this.camera); const {width, height} = this.container.getBoundingClientRect(); return {x: (v.x * .5 + .5) * width, y: (-v.y * .5 + .5) * height, visible: v.z < 1 && v.z > -1 && Math.abs(v.x) < .97 && Math.abs(v.y) < .9};}
}
