export type BuildingKind = 'government' | 'office' | 'residential' | 'hospital' | 'university';
export interface Building {
  id: string;
  name: { en: string; fa: string };
  kind: BuildingKind;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

export const buildings: Building[] = [
  { id: 'presidential-palace', name: { en: 'Presidential Palace', fa: 'کاخ ریاست‌جمهوری' }, kind: 'government', x: 0, z: -29, width: 24, depth: 14, height: 10, color: '#e3ddd0' },
  { id: 'civic-hospital', name: { en: 'Darvan Central Hospital', fa: 'بیمارستان مرکزی داروان' }, kind: 'hospital', x: -34, z: 31, width: 20, depth: 17, height: 12, color: '#dadbd4' },
  { id: 'university', name: { en: 'National University', fa: 'دانشگاه ملی' }, kind: 'university', x: 34, z: 31, width: 22, depth: 15, height: 10, color: '#c3b29b' },
];

let index = 0;
for (const [cx, cz] of [[-34, -29], [34, -29], [-34, 1], [34, 1]]) {
  for (const dx of [-7, 7]) for (const dz of [-6, 6]) {
    index++;
    const office = cz === -29;
    buildings.push({
      id: `block-${index}`, name: { en: `${office ? 'Horizon offices' : 'Garden residences'} ${index}`, fa: `${office ? 'برج اداری افق' : 'مجتمع مسکونی باغ'} ${index}` },
      kind: office ? 'office' : 'residential', x: cx! + dx, z: cz! + dz,
      width: 10, depth: 9, height: office ? 16 + (index * 7 % 19) : 9 + (index % 4) * 2.8,
      color: office ? ['#789399', '#9da9a5'][index % 2]! : ['#d6c8b6', '#b5a799', '#d8d4c5'][index % 3]!,
    });
  }
}
