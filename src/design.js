export const DESIGNS = {
  original: {name: 'Original', title: 'Three Body Lab — Gravity, in motion', eyebrow: 'AN INTERACTIVE EXPLORATION', headline: 'Gravity, in motion<span>.</span>', description: 'Three bodies. Endless possibilities. Find the balance, or embrace the chaos.'},
  bauhaus: {name: 'Bauhaus', title: 'Three Body Lab — Bauhaus edition', eyebrow: 'STUDY 01 / FORM FOLLOWS GRAVITY', headline: 'GRAVITY<span class="headline-separator"> /</span><br>IN MOTION<span>.</span>', description: 'Three bodies. Pure geometry. A study in balance and beautiful disorder.'},
  'neo-brutalism': {name: 'Neo-brutalism', title: 'Three Body Lab — Neo-brutalism edition', eyebrow: 'STUDY 02 / A GRAVITATIONAL PLAYGROUND', headline: '<span class="headline-solid">GRAVITY.</span><br><span class="headline-outline">NO RULES.*</span>', description: '*Except Newton’s. Three bodies, zero chill. Give the universe a little nudge.'},
  sketch: {name: 'Sketch', title: 'Three Body Lab — Sketchbook edition', eyebrow: 'Study no. 3 — notes on the universe', headline: 'A little gravity.<br>A lot of <span class="sketch-underline">possibility.</span>', description: 'Three little bodies, pulling on each other. Let’s see where they go...'},
};

export function designFromPath(pathname) {
  const route = pathname.split('/').filter(Boolean)[0];
  return Object.hasOwn(DESIGNS, route) ? route : 'original';
}

export function designDecoration(design) {
  if (design === 'bauhaus') return '<div class="design-composition bauhaus-composition" aria-hidden="true"><i class="composition-circle"></i><i class="composition-square"></i><i class="composition-triangle"></i><span>03</span></div>';
  if (design === 'neo-brutalism') return '<div class="design-composition neo-composition" aria-hidden="true"><span class="neo-star">✦</span><span class="neo-sticker">CHAOS<br>IS A FEATURE.</span><span class="neo-orbit">3</span></div>';
  if (design === 'sketch') return '<div class="design-composition sketch-composition" aria-hidden="true"><svg viewBox="0 0 300 160"><path d="M25 95 C70 8 220 10 262 80 S82 156 25 95 M34 100 C84 15 220 18 257 83"/><circle cx="89" cy="43" r="13"/><circle cx="246" cy="104" r="17"/><circle cx="58" cy="123" r="9"/><path class="sketch-arrow" d="M240 135 Q271 145 260 155 M260 155 L251 148 M260 155 L271 152"/></svg><span>what happens next?</span></div>';
  return '';
}
