import type { Coordinates } from './data';

const degrees = 180 / Math.PI;
const hawaiianIslands: Coordinates[] = [
  [22.05, -159.52], [21.48, -157.98], [21.13, -157.02], [20.8, -156.32], [19.6, -155.5],
];

export async function loadLandMask() {
  const image = new Image();
  image.src = '/land-mask.png';
  await image.decode();
  const canvas = document.createElement('canvas');
  const width = canvas.width = image.naturalWidth;
  const height = canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not read the coastline mask.');
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, width, height);
  const land = new Uint8Array(width * height);
  for (let i = 0; i < land.length; i++) land[i] = data[i * 4] >>> 7;
  return { land, width, height };
}

type LandMask = Awaited<ReturnType<typeof loadLandMask>>;

export function paintLand(
  context: CanvasRenderingContext2D,
  mask: LandMask,
  view: { width: number; height: number; radius: number; scale: number; phi: number; theta: number },
  project: (coordinates: Coordinates) => { x: number; y: number; front: boolean },
) {
  const { width, height, radius, scale, phi, theta } = view;
  const centerX = width / 2;
  const centerY = height / 2;
  const step = Math.min(7.5, 3.5 + Math.max(0, Math.log2(scale)) * .65);
  const dot = step * .22;
  const cosine = Math.cos(theta);
  const sine = Math.sin(theta);
  const minimumY = Math.max(0, centerY - radius);
  const maximumY = Math.min(height, centerY + radius);
  const minimumX = Math.max(0, centerX - radius);
  const maximumX = Math.min(width, centerX + radius);
  context.beginPath();
  for (let row = 0, y = minimumY + step / 2; y < maximumY; row++, y += step) {
    const projectedY = (centerY - y) / radius;
    const strip = 1 - projectedY * projectedY;
    const offset = (row % 2) * step / 2;
    for (let x = minimumX + offset; x < maximumX; x += step) {
      const projectedX = (x - centerX) / radius;
      const depthSquared = strip - projectedX * projectedX;
      if (depthSquared <= 0) continue;
      const depth = Math.sqrt(depthSquared);
      const latitude = Math.asin(Math.max(-1, Math.min(1, cosine * projectedY + sine * depth))) * degrees;
      const longitude = (Math.atan2(sine * projectedY - cosine * depth, projectedX) - phi) * degrees;
      const u = ((longitude + 180) % 360 + 360) % 360;
      const column = Math.floor(u * mask.width / 360);
      const line = Math.min(mask.height - 1, Math.floor((90 - latitude) * mask.height / 180));
      if (!mask.land[line * mask.width + column]) continue;
      context.moveTo(x + dot, y);
      context.arc(x, y, dot, 0, Math.PI * 2);
    }
  }
  // At world scale a small island can fall entirely between two samples.
  if (scale < 3) {
    for (const island of hawaiianIslands) {
      const { x, y, front } = project(island);
      if (!front || x < 0 || y < 0 || x > width || y > height) continue;
      const islandDot = Math.min(dot, .85);
      context.moveTo(x + islandDot, y);
      context.arc(x, y, islandDot, 0, Math.PI * 2);
    }
  }
  context.fill();
}
