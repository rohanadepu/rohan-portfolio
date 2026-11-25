import type { Coordinates } from './data';

const halfTurn = Math.PI;
const quarterTurn = halfTurn / 2;
const fullTurn = 2 * halfTurn;
const baseRows = 108;
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
  const center = -quarterTurn - phi;
  const zoom = Math.max(0, Math.log2(scale));
  const level = Math.floor(zoom);
  const blend = Math.max(0, (zoom - level - .6) / .4);
  const dot = Math.min(1.15, Math.max(.68, radius / scale / 170)) / (1 + zoom * .07);
  const cap = Math.asin(Math.min(1, Math.hypot(width / 2 + dot, height / 2 + dot) / radius));
  const capLimit = Math.cos(cap);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const opacity = context.globalAlpha;

  function appendDot(x: number, y: number) {
    context.moveTo(x + dot, y);
    context.arc(x, y, dot, 0, fullTurn);
  }

  function drawLevel(detail: number, weight: number, newDotsOnly = false) {
    const subdivisions = 2 ** detail;
    const rows = baseRows * subdivisions;
    const latitudeStep = halfTurn / rows;
    const start = Math.max(1, Math.ceil((theta - cap + quarterTurn) / latitudeStep));
    const end = Math.min(rows, Math.floor((theta + cap + quarterTurn) / latitudeStep) + 1);
    context.globalAlpha = opacity * weight;
    context.beginPath();
    // Sample the same geographic points at a given zoom. Rotation only projects them.
    for (let row = start; row < end; row++) {
      const latitude = row * latitudeStep - quarterTurn;
      const cosLatitude = Math.cos(latitude);
      const sinLatitude = Math.sin(latitude);
      const horizontalLimit = (capLimit - sinTheta * sinLatitude) / (cosTheta * cosLatitude);
      const range = Math.acos(Math.max(-1, Math.min(1, horizontalLimit)));
      const baseColumns = Math.max(1, Math.round(2 * baseRows * cosLatitude));
      const columns = baseColumns * subdivisions;
      const longitudeStep = fullTurn / columns;
      const origin = -halfTurn + (row / subdivisions / 2 % 1) * fullTurn / baseColumns;
      const line = Math.floor((quarterTurn - latitude) * mask.height / halfTurn);
      const first = Math.ceil((center - range - origin) / longitudeStep);
      const last = Math.min(first + columns - 1, Math.floor((center + range - origin) / longitudeStep));
      for (let column = first; column <= last; column++) {
        // Finer grids keep every parent point. Fade in only the additional dots.
        if (newDotsOnly && row % 2 === 0 && column % 2 === 0) continue;
        const longitude = origin + column * longitudeStep;
        const u = ((longitude + halfTurn) % fullTurn + fullTurn) % fullTurn;
        if (!mask.land[line * mask.width + Math.floor(u * mask.width / fullTurn)]) continue;
        const delta = longitude - center;
        const across = cosLatitude * Math.cos(delta);
        if (sinTheta * sinLatitude + cosTheta * across <= 0) continue;
        const x = width / 2 + radius * cosLatitude * Math.sin(delta);
        const y = height / 2 - radius * (cosTheta * sinLatitude - sinTheta * across);
        if (x < -dot || x > width + dot || y < -dot || y > height + dot) continue;
        appendDot(x, y);
      }
    }
    context.fill();
  }

  drawLevel(level, 1);
  if (blend > 0) drawLevel(level + 1, blend, true);
  // At world scale a small island can fall entirely between two samples.
  if (level === 0) {
    context.globalAlpha = opacity * (1 - blend);
    context.beginPath();
    for (const island of hawaiianIslands) {
      const { x, y, front } = project(island);
      if (front) appendDot(x, y);
    }
    context.fill();
  }
  context.globalAlpha = opacity;
}
