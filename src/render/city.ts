import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildings, type Building } from '../data/capital';
import { clockHour } from '../engine/calendar';

export type Quality = 'low' | 'medium' | 'high';
export interface RenderStats { fps: number; calls: number; triangles: number; frameMs: number }
type Box = { x: number; y: number; z: number; w: number; h: number; d: number; color?: string };

export class CapitalRenderer {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.5, 550);
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private sunlight = new THREE.DirectionalLight('#fff1d5', 3);
  private ambient = new THREE.HemisphereLight('#d8e9ef', '#716a53', 2);
  private lightMaterial = new THREE.MeshStandardMaterial({ color: '#f8dc9e', emissive: '#ffb758', emissiveIntensity: 0 });
  private glass = new THREE.MeshStandardMaterial({ color: '#49737c', roughness: 0.28, metalness: 0.42 });
  private pickables: THREE.Mesh[] = [];
  private outlines = new THREE.Box3Helper(new THREE.Box3(), '#ffe0a0');
  private observer: ResizeObserver;
  private animation = 0;
  private disposed = false;
  private elapsedHours = 0;
  private quality: Quality = 'high';
  private frameCount = 0;
  private sampleStart = performance.now();
  private previousFrame = performance.now();
  private frameTotal = 0;
  private pointerStart = { x: 0, y: 0 };
  private focused: { target: THREE.Vector3; camera: THREE.Vector3 } | null = null;
  private selected: string | null = null;
  private lastStats: RenderStats | null = null;
  private cube = new THREE.BoxGeometry(1, 1, 1);
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private canvas: HTMLCanvasElement;
  private clearSky = new THREE.Color('#bfd3d6');
  private darkSky = new THREE.Color('#101e35');

  constructor(
    private host: HTMLDivElement,
    private onSelect: (id: string) => void,
    private onStats: (stats: RenderStats) => void,
    private onFailure: () => void,
    private compass: SVGSVGElement | null,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.canvas = this.renderer.domElement;
    this.canvas.tabIndex = 0;
    this.host.append(this.canvas);
    this.scene.background = this.clearSky.clone();
    this.scene.fog = new THREE.FogExp2('#bfd3d6', 0.0035);
    this.camera.position.set(105, 102, 132);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 0, -6);
    this.controls.minDistance = 28;
    this.controls.maxDistance = 240;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.minPolarAngle = 0.18;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxTargetRadius = 85;
    this.controls.listenToKeyEvents(this.canvas);
    this.controls.addEventListener('start', this.cancelFocus);
    this.sunlight.castShadow = true;
    this.sunlight.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sunlight.shadow.camera, { left: -100, right: 100, top: 100, bottom: -100, near: 0.5, far: 260 });
    this.sunlight.shadow.normalBias = 0.15;
    this.scene.add(this.sunlight, this.ambient);
    this.outlines.visible = false;
    this.scene.add(this.outlines);
    this.buildCity();
    this.batchStaticBoxes();
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    this.resize();
    this.canvas.addEventListener('pointerdown', this.pointerDown);
    this.canvas.addEventListener('pointerup', this.pointerUp);
    this.canvas.addEventListener('webglcontextlost', this.contextLost);
    this.updateTime(0);
    this.tick();
  }

  private material(color: string) {
    let material = this.materials.get(color);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
      this.materials.set(color, material);
    }
    return material;
  }

  private box(data: Box, material?: THREE.Material, cast = true): THREE.Mesh {
    const mesh = new THREE.Mesh(this.cube, material ?? this.material(data.color ?? '#d4d0c5'));
    mesh.position.set(data.x, data.y, data.z);
    mesh.scale.set(data.w, data.h, data.d);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  private batch(items: Box[], material: THREE.Material, cast = false) {
    const mesh = new THREE.InstancedMesh(this.cube, material, items.length);
    const object = new THREE.Object3D();
    items.forEach((item, i) => {
      object.position.set(item.x, item.y, item.z);
      object.scale.set(item.w, item.h, item.d);
      object.updateMatrix();
      mesh.setMatrixAt(i, object.matrix);
    });
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    this.scene.add(mesh);
  }

  private batchStaticBoxes() {
    const groups = new Map<string, { material: THREE.Material; cast: boolean; items: Box[] }>();
    for (const object of [...this.scene.children]) {
      if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || object.geometry !== this.cube || this.pickables.includes(object) || Array.isArray(object.material)) continue;
      const key = `${object.material.id}:${object.castShadow}`;
      let group = groups.get(key);
      if (!group) {
        group = { material: object.material, cast: object.castShadow, items: [] };
        groups.set(key, group);
      }
      group.items.push({ x: object.position.x, y: object.position.y, z: object.position.z, w: object.scale.x, h: object.scale.y, d: object.scale.z });
      this.scene.remove(object);
    }
    for (const { items, material, cast } of groups.values()) this.batch(items, material, cast);
  }

  private buildCity() {
    this.box({ x: 0, y: -1.15, z: 0, w: 145, h: 2, d: 140, color: '#8a9a78' }, undefined, false);
    // River, embankments and a bridge on the eastern edge of the district.
    this.box({ x: 78, y: -0.65, z: 0, w: 22, h: 0.2, d: 400 }, new THREE.MeshStandardMaterial({ color: '#4e929c', roughness: 0.25, metalness: 0.3 }), false);
    this.box({ x: 66, y: 0, z: 0, w: 2, h: 1.2, d: 140, color: '#c0bbac' });
    this.box({ x: 91, y: -0.2, z: 0, w: 5, h: 1, d: 400, color: '#84977d' }, undefined, false);
    const road = this.material('#4b5253');
    const pavement = this.material('#c6c3b5');
    const markings: Box[] = [];
    for (const x of [-51, -17, 17, 51]) {
      this.box({ x, y: 0, z: 0, w: 7, h: 0.2, d: 116 }, road, false);
      for (const offset of [-4.6, 4.6]) this.box({ x: x + offset, y: 0.12, z: 0, w: 2.1, h: 0.3, d: 116 }, pavement, false);
      for (let z = -55; z < 57; z += 4) if (![-43, -13, 17, 47].some(v => Math.abs(v - z) < 5)) markings.push({ x, y: 0.115, z, w: 0.13, h: 0.02, d: 1.8 });
    }
    for (const z of [-43, -13, 17, 47]) {
      this.box({ x: 0, y: 0.02, z, w: 110, h: 0.2, d: 7 }, road, false);
      for (const offset of [-4.6, 4.6]) this.box({ x: 0, y: 0.13, z: z + offset, w: 110, h: 0.3, d: 2.1 }, pavement, false);
      for (let x = -54; x < 55; x += 4) if (![-51, -17, 17, 51].some(v => Math.abs(v - x) < 5)) markings.push({ x, y: 0.135, z, w: 1.8, h: 0.02, d: 0.13 });
    }
    this.box({ x: 72, y: 0.8, z: 17, w: 40, h: 1.4, d: 8 }, road);
    for (const z of [12.5, 21.5]) this.box({ x: 74, y: 1.8, z, w: 37, h: 0.6, d: 0.3, color: '#d1c8b2' });
    // Crosswalks on the central avenue.
    for (const z of [-13, 17]) for (const x of [-17, 17]) for (let i = 0; i < 7; i++) {
      markings.push({ x: x - 2.5 + i * 0.85, y: 0.145, z: z + 5.6, w: 0.45, h: 0.02, d: 2.3 });
    }
    this.batch(markings, this.material('#e2dfc9'));
    // Plaza and southern gardens.
    this.box({ x: 0, y: 0.18, z: 1, w: 24, h: 0.25, d: 20, color: '#d8cfbb' }, undefined, false);
    this.box({ x: 0, y: 0.2, z: 31, w: 24, h: 0.3, d: 21, color: '#7f9b69' }, undefined, false);
    this.box({ x: 0, y: 0.42, z: 31, w: 2.2, h: 0.1, d: 22, color: '#cfc6aa' }, undefined, false);
    this.box({ x: 0, y: 0.43, z: 31, w: 24, h: 0.1, d: 2.2, color: '#cfc6aa' }, undefined, false);
    const fountain = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.8, 0.7, 40), this.material('#d9d3c3'));
    fountain.position.set(0, 0.6, 1);
    this.scene.add(fountain);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.1, 0.1, 40), this.material('#6babb4'));
    water.position.set(0, 1, 1);
    this.scene.add(water);
    this.box({ x: 0, y: 2.3, z: 1, w: 1, h: 3, d: 1, color: '#8c9e97' });
    const windows: Box[] = [];
    const litWindows: Box[] = [];
    const trim: Box[] = [];
    buildings.forEach((building, bi) => {
      const { x, z, width: w, depth: d, height: h, kind } = building;
      this.box({ x, y: 0.3, z, w: w + 1, h: 0.4, d: d + 1 }, pavement, false);
      const body = this.box({ x, y: h / 2 + 0.5, z, w, h, d, color: building.color });
      body.userData.buildingId = building.id;
      this.pickables.push(body);
      this.box({ x, y: h + 0.8, z, w: w + 0.5, h: 0.6, d: d + 0.5, color: '#c9c9bf' });
      this.box({ x: x + w * 0.2, y: h + 1.5, z: z - d * 0.2, w: w * 0.27, h: 1, d: d * 0.3, color: '#8b9592' });
      // Floor lines and individually instanced inset windows on all four facades.
      for (let y = 2; y < h - 0.5; y += 2.7) {
        trim.push({ x, y: y + 1.25, z, w: w + 0.18, h: 0.17, d: d + 0.18 });
        for (let xx = -w / 2 + 1.2; xx < w / 2 - 0.5; xx += 2) for (const side of [-1, 1]) {
          const item = { x: x + xx, y, z: z + side * (d / 2 + 0.03), w: 1.15, h: 1.6, d: 0.06 };
          ((Math.round(y) + Math.round(xx) + bi) % 4 === 0 ? litWindows : windows).push(item);
        }
        for (let zz = -d / 2 + 1.2; zz < d / 2 - 0.5; zz += 2) for (const side of [-1, 1]) {
          const item = { x: x + side * (w / 2 + 0.03), y, z: z + zz, w: 0.06, h: 1.6, d: 1.15 };
          ((Math.round(y) + Math.round(zz) + bi) % 4 === 0 ? litWindows : windows).push(item);
        }
      }
      if (kind === 'government') this.palace(building);
      if (kind === 'office') {
        for (const offset of [-w / 2, 0, w / 2]) trim.push({ x: x + offset, y: h / 2 + 0.5, z: z + d / 2 + 0.1, w: 0.25, h, d: 0.25 });
      }
      if (kind === 'hospital') {
        this.box({ x, y: h + 1.25, z: z + d / 2 + 0.4, w: 2.7, h: 0.7, d: 0.2, color: '#3f8b78' });
        this.box({ x, y: h + 1.25, z: z + d / 2 + 0.5, w: 0.7, h: 2.7, d: 0.2, color: '#3f8b78' });
      }
    });
    this.batch(windows, this.glass);
    this.batch(litWindows, this.lightMaterial);
    this.batch(trim, this.material('#b9c2bd'));
    this.treesAndStreetFurniture();
    // Distant facades share the window batches; no extra draw call per window.
    const skylineWindows: Box[] = [];
    const skylineTrim: Box[] = [];
    for (let i = 0; i < 15; i++) {
      const height = 15 + (i * 13 % 28);
      const x = -80 + i * 12, z = -83 - (i % 3) * 10, width = 7 + (i % 3) * 2;
      this.box({ x, y: height / 2, z, w: width, h: height, d: 8, color: '#92a4a3' });
      for (let y = 2; y < height; y += 3) {
        skylineTrim.push({ x, y, z, w: width + 0.1, h: 0.12, d: 8.1 });
        for (let dx = -width / 2 + 1; dx < width / 2; dx += 1.6) skylineWindows.push({ x: x + dx, y: y - 0.9, z: z + 4.04, w: 1, h: 1.6, d: 0.08 });
      }
    }
    this.batch(skylineWindows, this.glass);
    this.batch(skylineTrim, this.material('#b9c2bd'));
  }

  private palace({ x, z, width, depth, height }: Building) {
    this.box({ x, y: 1.2, z: z + depth / 2 + 1.8, w: width + 2, h: 1.4, d: 4, color: '#ded6c5' });
    this.box({ x, y: 0.6, z: z + depth / 2 + 3.8, w: width + 4, h: 0.55, d: 2, color: '#ddd5c5' });
    for (let dx = -9; dx <= 9; dx += 3) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 7.6, 12), this.material('#f1e9d7'));
      column.position.set(x + dx, 5.5, z + depth / 2 + 2.2);
      column.castShadow = true;
      this.scene.add(column);
    }
    this.box({ x, y: height, z: z + depth / 2 + 2.2, w: width + 1.4, h: 1.3, d: 3.8, color: '#e7dfce' });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4.5, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), this.material('#7c9b91'));
    dome.position.set(x, height + 1.2, z);
    dome.scale.y = 0.8;
    dome.castShadow = true;
    this.scene.add(dome);
    this.box({ x, y: height + 6.5, z, w: 0.12, h: 5, d: 0.12, color: '#b9b199' });
    this.box({ x: x + 1.1, y: height + 8, z, w: 2.2, h: 1.2, d: 0.06, color: '#427766' });
  }

  private treesAndStreetFurniture() {
    const treePositions: THREE.Vector3[] = [];
    for (const x of [-57, -11, 11, 57]) for (let z = -53; z < 58; z += 9) {
      if (![-43, -13, 17, 47].some(v => Math.abs(v - z) < 6)) treePositions.push(new THREE.Vector3(x, 0.3, z));
    }
    for (const x of [-8, 8]) for (const z of [23, 28, 36, 40]) treePositions.push(new THREE.Vector3(x, 0.4, z));
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.32, 2.5, 7), this.material('#796653'), treePositions.length);
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2, 1), this.material('#588063'), treePositions.length);
    const object = new THREE.Object3D();
    treePositions.forEach((position, i) => {
      object.position.copy(position).y += 1.25;
      object.scale.set(1, 1, 1);
      object.updateMatrix(); trunks.setMatrixAt(i, object.matrix);
      object.position.y += 2.2;
      object.scale.set(1, 1.25 + (i % 3) * 0.15, 1);
      object.updateMatrix(); crowns.setMatrixAt(i, object.matrix);
      crowns.setColorAt(i, new THREE.Color(['#527e5c', '#6e9263', '#47795d'][i % 3]!));
    });
    crowns.castShadow = true; trunks.castShadow = true;
    this.scene.add(trunks, crowns);
    const poles: Box[] = [], lamps: Box[] = [], benches: Box[] = [];
    for (const x of [-21.5, 21.5, 55.5]) for (const z of [-34, -4, 27, 54]) {
      poles.push({ x, y: 3, z, w: 0.16, h: 6, d: 0.16 });
      poles.push({ x: x - 0.65, y: 6, z, w: 1.5, h: 0.15, d: 0.15 });
      lamps.push({ x: x - 1.2, y: 5.9, z, w: 0.7, h: 0.12, d: 0.4 });
    }
    for (const x of [-9, 9]) for (const z of [-4, 6, 26, 36]) benches.push({ x, y: 0.9, z, w: 2, h: 0.3, d: 0.7 });
    this.batch(poles, this.material('#495956'));
    this.batch(lamps, this.lightMaterial);
    this.batch(benches, this.material('#9b7c54'), true);
    // Parked cars are scenery in phase 1, not population/economy agents.
    for (let i = 0; i < 18; i++) {
      const x = i < 9 ? -49 : 49;
      const z = -36 + (i % 9) * 9;
      const color = ['#ece8db', '#455f69', '#b7745f', '#707c77'][i % 4]!;
      this.box({ x, y: 0.85, z, w: 1.6, h: 1, d: 3.1, color });
      this.box({ x, y: 1.5, z: z - 0.1, w: 1.4, h: 0.5, d: 1.7 }, this.glass);
    }
  }

  updateTime(elapsedHours: number) {
    this.elapsedHours = elapsedHours;
    const hour = clockHour(elapsedHours);
    const altitude = Math.sin(((hour - 6) / 24) * Math.PI * 2);
    const daylight = THREE.MathUtils.smoothstep(altitude, -0.15, 0.4);
    const sky = this.darkSky.clone().lerp(this.clearSky, daylight);
    this.scene.background = sky;
    (this.scene.fog as THREE.FogExp2).color.copy(sky);
    this.sunlight.position.set(Math.cos((hour / 24) * Math.PI * 2) * 90, Math.max(8, altitude * 110), 45);
    this.sunlight.intensity = 0.08 + 3.3 * Math.max(0, altitude);
    this.sunlight.color.set(daylight < 0.8 ? '#ffd0a0' : '#fff1da');
    this.ambient.intensity = 0.35 + daylight * 1.65;
    this.lightMaterial.emissiveIntensity = (1 - daylight) * 3;
    this.glass.emissive.set('#647f93');
    this.glass.emissiveIntensity = (1 - daylight) * 0.15;
  }

  setQuality(quality: Quality) {
    this.quality = quality;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'low' ? 1 : quality === 'medium' ? 1.3 : 1.7));
    this.sunlight.castShadow = quality !== 'low';
    this.resize();
  }

  select(id: string | null) {
    this.selected = id;
    const building = buildings.find(b => b.id === id);
    this.outlines.visible = !!building;
    if (building) {
      this.outlines.box.set(
        new THREE.Vector3(building.x - building.width / 2 - 0.3, 0.3, building.z - building.depth / 2 - 0.3),
        new THREE.Vector3(building.x + building.width / 2 + 0.3, building.height + 1.3, building.z + building.depth / 2 + 0.3),
      );
    }
  }

  focus(id: string) {
    const building = buildings.find(b => b.id === id);
    if (!building) return;
    this.focused = {
      target: new THREE.Vector3(building.x, building.height * 0.25, building.z),
      camera: new THREE.Vector3(building.x + 35, building.height + 28, building.z + 42),
    };
  }

  reset() { this.focused = { target: new THREE.Vector3(0, 0, -6), camera: new THREE.Vector3(105, 102, 132) }; }
  zoom(factor: number) {
    this.focused = null;
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance));
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  private cancelFocus = () => { this.focused = null; };
  private resize = () => {
    if (this.disposed) return;
    const { width, height } = this.host.getBoundingClientRect();
    this.camera.aspect = Math.max(width, 1) / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(Math.max(width, 1), Math.max(height, 1));
  };
  private pointerDown = (event: PointerEvent) => {
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.canvas.focus({ preventScroll: true });
  };
  private pointerUp = (event: PointerEvent) => {
    if (event.button !== 0 || Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y) > 5) return;
    const bounds = this.canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(pointer, this.camera);
    const hit = ray.intersectObjects(this.pickables, false)[0];
    if (hit) this.onSelect(hit.object.userData.buildingId as string);
  };
  private contextLost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(this.animation); this.onFailure(); };

  private tick = () => {
    if (this.disposed) return;
    this.animation = requestAnimationFrame(this.tick);
    if (document.hidden) { this.previousFrame = performance.now(); this.sampleStart = this.previousFrame; this.frameCount = 0; this.frameTotal = 0; return; }
    const now = performance.now();
    const delta = Math.min((now - this.previousFrame) / 1000, 0.1);
    if (this.focused) {
      const amount = 1 - Math.exp(-delta * 6);
      this.camera.position.lerp(this.focused.camera, amount);
      this.controls.target.lerp(this.focused.target, amount);
      if (this.camera.position.distanceTo(this.focused.camera) < 0.03) this.focused = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (this.compass) this.compass.style.transform = `rotate(${this.controls.getAzimuthalAngle() * 180 / Math.PI}deg)`;
    this.frameTotal += now - this.previousFrame;
    this.previousFrame = now;
    this.frameCount++;
    if (now - this.sampleStart >= 1000) {
      this.lastStats = { fps: Math.round(this.frameCount * 1000 / (now - this.sampleStart)), calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, frameMs: Math.round(this.frameTotal / this.frameCount * 10) / 10 };
      this.onStats(this.lastStats);
      this.frameCount = 0; this.frameTotal = 0; this.sampleStart = now;
    }
  };

  /** Read-only diagnostics for reproducible browser checks; no renderer mutation. */
  diagnostics() {
    const gl = this.renderer.getContext();
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return { elapsedHours: this.elapsedHours, hour: clockHour(this.elapsedHours), quality: this.quality, selected: this.selected,
      camera: this.camera.position.toArray(), target: this.controls.target.toArray(),
      landmarks: buildings.slice(0, 3).map(building => {
        const point = new THREE.Vector3(building.x, building.height / 2, building.z).project(this.camera);
        return { id: building.id, x: (point.x + 1) / 2, y: (1 - point.y) / 2 };
      }),
      daylight: this.ambient.intensity, lights: this.lightMaterial.emissiveIntensity,
      geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures,
      stats: this.lastStats, pixelRatio: this.renderer.getPixelRatio(),
      canvas: { width: this.canvas.width, height: this.canvas.height },
      renderer: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER) as string };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animation);
    this.observer.disconnect();
    this.controls.removeEventListener('start', this.cancelFocus);
    this.controls.dispose();
    this.canvas.removeEventListener('pointerdown', this.pointerDown);
    this.canvas.removeEventListener('pointerup', this.pointerUp);
    this.canvas.removeEventListener('webglcontextlost', this.contextLost);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
        if (object instanceof THREE.InstancedMesh) object.dispose();
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    this.sunlight.shadow.map?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
