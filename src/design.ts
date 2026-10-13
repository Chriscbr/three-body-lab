export const DESIGNS = {
  original: {name: 'Original', title: 'Three Body Lab'},
  bauhaus: {name: 'Bauhaus', title: 'Three Body Lab — Bauhaus edition'},
  'neo-brutalism': {name: 'Neo-brutalism', title: 'Three Body Lab — Neo-brutalism edition'},
  sketch: {name: 'Sketch', title: 'Three Body Lab — Sketchbook edition'},
  newsprint: {name: 'Newsprint', title: 'Three Body Lab — Newsprint edition'},
};

export type DesignKey = keyof typeof DESIGNS;

export function designFromPath(pathname: string, basePath = '/'): DesignKey {
  const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const route = pathname.startsWith(base) ? pathname.slice(base.length).split('/')[0] : '';
  return route && Object.hasOwn(DESIGNS, route) ? route as DesignKey : 'original';
}

export function designHomePath(design: DesignKey, basePath = '/'): string {
  const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return design === 'original' ? base : `${base}${design}/`;
}
