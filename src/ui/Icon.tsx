export type IconName = 'city' | 'settings' | 'guide' | 'close' | 'play' | 'pause' | 'plus' | 'minus' | 'reset' | 'pin' | 'sun' | 'moon' | 'arrow' | 'globe' | 'building';
const paths: Record<IconName, string> = {
  city: 'M3 21h18M5 21V10h6v11m0-16h7v16M7 13h1m-1 3h1m6-8h1m-1 4h1m-1 4h1M4 10V7h4v3',
  settings: 'm9 3-1 3-3 1-2 3 2 2v3l2 3 3-1 2 1 3-1 3 1 2-3v-3l2-2-2-3-3-1-1-3h-3Zm6 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  guide: 'M4 4h6l2 2 2-2h6v15h-6l-2 2-2-2H4V4Zm8 2v15', close: 'm6 6 12 12M6 18 18 6',
  play: 'm8 5 11 7-11 7V5Z', pause: 'M8 5v14M16 5v14', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
  reset: 'M4 10a8 8 0 1 1 1 8M4 4v6h6', pin: 'M12 22s8-8 8-13A8 8 0 0 0 4 9c0 5 8 13 8 13Zm3-13a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z', arrow: 'M4 12h16m-6-6 6 6-6 6',
  globe: 'M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0ZM3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z',
  building: 'M3 21h18M5 8v13m7-13v13m7-13v13M3 7l9-5 9 5H3Zm0 12h18',
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
