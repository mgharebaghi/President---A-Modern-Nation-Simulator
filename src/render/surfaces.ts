import * as THREE from 'three';

/** Small deterministic, locally generated textures; no downloads or runtime RNG. */
export function createSurfaces(anisotropy: number) {
  const textures: THREE.CanvasTexture[] = [];
  function canvas(size: number) {
    const element = document.createElement('canvas');
    element.width = element.height = size;
    return { element, context: element.getContext('2d')! };
  }
  function finish(element: HTMLCanvasElement, repeat = 1) {
    const texture = new THREE.CanvasTexture(element);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    texture.anisotropy = anisotropy;
    textures.push(texture);
    return texture;
  }
  function grain(contrast: number, repeat: number, organic = false) {
    const { element, context } = canvas(256);
    const pixels = context.createImageData(256, 256);
    let seed = 18273;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const coarse = organic ? Math.sin(x * Math.PI / 32) * Math.cos(y * Math.PI / 64) * 12 : 0;
      const value = 232 + (seed / 0xffffffff - 0.5) * contrast + coarse;
      const offset = (y * 256 + x) * 4;
      pixels.data[offset] = value;
      pixels.data[offset + 1] = value;
      pixels.data[offset + 2] = value;
      pixels.data[offset + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    return finish(element, repeat);
  }
  const concrete = grain(35, 2);
  const asphalt = grain(65, 6);
  const grass = grain(45, 32);
  const foliage = grain(70, 1, true);
  const { element: tiles, context: tileContext } = canvas(256);
  tileContext.fillStyle = '#e3e0d7'; tileContext.fillRect(0, 0, 256, 256);
  tileContext.strokeStyle = '#b9b7ac'; tileContext.lineWidth = 1.5;
  for (let y = 0; y <= 256; y += 32) {
    tileContext.beginPath(); tileContext.moveTo(0, y); tileContext.lineTo(256, y); tileContext.stroke();
    for (let x = y % 64 === 0 ? 0 : -16; x < 256; x += 64) {
      tileContext.beginPath(); tileContext.moveTo(x, y); tileContext.lineTo(x, y + 32); tileContext.stroke();
    }
  }
  const paving = finish(tiles, 3);
  const { element: ripples, context: waterContext } = canvas(256);
  waterContext.fillStyle = '#c0d3d2'; waterContext.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 100; i++) {
    waterContext.strokeStyle = i % 3 === 0 ? '#d4dfdc' : '#aebfbd';
    waterContext.lineWidth = 0.5 + i % 2;
    waterContext.beginPath();
    const x = i * 71 % 256, y = i * 37 % 256;
    waterContext.ellipse(x, y, 5 + i % 12, 0.7, 0, 0, Math.PI);
    waterContext.stroke();
  }
  const water = finish(ripples, 7); water.repeat.y = 70;
  const { element: shadow, context: shadowContext } = canvas(128);
  const fade = shadowContext.createRadialGradient(64, 64, 14, 64, 64, 64);
  fade.addColorStop(0, '#07110d9c'); fade.addColorStop(0.45, '#07110d55'); fade.addColorStop(1, '#07110d00');
  shadowContext.fillStyle = fade; shadowContext.fillRect(0, 0, 128, 128);
  const contact = finish(shadow);
  const { element: lamp, context: lampContext } = canvas(128);
  const glow = lampContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  glow.addColorStop(0, '#ffd59acc'); glow.addColorStop(0.3, '#ffc57970'); glow.addColorStop(1, '#ffc57900');
  lampContext.fillStyle = glow; lampContext.fillRect(0, 0, 128, 128);
  const lampGlow = finish(lamp);
  const { element: sky, context: skyContext } = canvas(512);
  sky.height = 256;
  const gradient = skyContext.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#6d9eba'); gradient.addColorStop(0.45, '#c2d3d7');
  gradient.addColorStop(0.5, '#deded0'); gradient.addColorStop(0.55, '#8c9b80'); gradient.addColorStop(1, '#526c4f');
  skyContext.fillStyle = gradient; skyContext.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 11; i++) {
    const x = i * 79 % 512, y = 28 + i * 17 % 60;
    const cloud = skyContext.createRadialGradient(x, y, 1, x, y, 60);
    cloud.addColorStop(0, '#ffffff65'); cloud.addColorStop(1, '#ffffff00');
    skyContext.fillStyle = cloud; skyContext.fillRect(x - 60, y - 60, 120, 120);
  }
  const environment = finish(sky);
  environment.mapping = THREE.EquirectangularReflectionMapping;
  return { concrete, asphalt, grass, foliage, paving, water, contact, lampGlow, environment, dispose: () => textures.forEach(texture => texture.dispose()) };
}
