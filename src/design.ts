export const DESIGNS = {
  original: {name: 'Original', title: 'Three Body Lab'},
  bauhaus: {name: 'Bauhaus', title: 'Three Body Lab — Bauhaus edition'},
  'neo-brutalism': {name: 'Neo-brutalism', title: 'Three Body Lab — Neo-brutalism edition'},
  sketch: {name: 'Sketch', title: 'Three Body Lab — Sketchbook edition'},
  newsprint: {name: 'Newsprint', title: 'Three Body Lab — Newsprint edition'},
};

export type DesignKey = keyof typeof DESIGNS;

export function designFromPath(pathname: string): DesignKey {
  const route = pathname.split('/').filter(Boolean)[0];
  return route && Object.hasOwn(DESIGNS, route) ? route as DesignKey : 'original';
}
