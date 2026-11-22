import createGlobe, { type Arc } from 'cobe';
import type { Coordinates } from './data';

interface GlobePin {
  name: string;
  href: string;
  coordinates: Coordinates;
}

const radians = Math.PI / 180;
const radius = 0.8; // COBE's sphere radius in clip space.
const initialView = { phi: -Math.PI / 2 - 125 * radians, theta: 25 * radians, scale: 1 };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function setupGlobe(
  canvas: HTMLCanvasElement, roads: HTMLCanvasElement, pins: HTMLElement,
  controls: { zoomIn: HTMLButtonElement; zoomOut: HTMLButtonElement; reset: HTMLButtonElement },
) {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const context = { alpha: true, stencil: false, antialias: true, depth: false, preserveDrawingBuffer: false };
  if (!canvas.getContext('webgl2', context) && !canvas.getContext('webgl', context)) return null;

  let { phi, theta, scale } = initialView;
  let size = 1;
  const globe = createGlobe(canvas, {
    width: size, height: size, phi, theta, scale, devicePixelRatio: dpr,
    dark: 0, diffuse: 1.4, mapSamples: 18000, mapBrightness: 5.6,
    baseColor: [0.98, 0.97, 0.945], glowColor: [0.44, 0.43, 0.4],
    markerColor: [0.14, 0.13, 0.11], markerElevation: 0,
    arcColor: [0.21, 0.20, 0.17], arcHeight: 0.22, arcWidth: 0.64, context,
  });
  const roadContext = roads.getContext('2d');
  let routes: Coordinates[][] = [];
  let markers: { pin: GlobePin; element: HTMLAnchorElement }[] = [];
  let pendingFrame = 0;

  function position([latitude, longitude]: Coordinates) {
    const lat = latitude * radians;
    const angle = longitude * radians + phi;
    const x = Math.cos(lat) * Math.cos(angle);
    const y = Math.cos(theta) * Math.sin(lat) + Math.sin(theta) * Math.cos(lat) * Math.sin(angle);
    const z = Math.sin(theta) * Math.sin(lat) - Math.cos(theta) * Math.cos(lat) * Math.sin(angle);
    return {
      x: (1 + x * radius * scale) * size / 2,
      y: (1 - y * radius * scale) * size / 2,
      front: z >= 0,
    };
  }

  function paint(overrides: { arcs?: Arc[]; width?: number; height?: number } = {}) {
    globe.update({ phi, theta, scale, ...overrides });
    for (const { pin, element } of markers) {
      const p = position(pin.coordinates);
      element.hidden = !p.front || p.x < 12 || p.x > size - 12 || p.y < 12 || p.y > size - 12;
      element.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
    }
    if (!roadContext) return;
    roadContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    roadContext.clearRect(0, 0, size, size);
    roadContext.lineWidth = 1.8;
    roadContext.strokeStyle = '#26251f';
    roadContext.setLineDash([4, 4]);
    for (const route of routes) {
      roadContext.beginPath();
      let visible = false;
      for (const point of route) {
        const p = position(point);
        if (p.front) {
          if (visible) roadContext.lineTo(p.x, p.y);
          else roadContext.moveTo(p.x, p.y);
        }
        visible = p.front;
      }
      roadContext.stroke();
    }
  }

  function requestPaint() {
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      paint();
    });
  }

  function zoom(factor: number) {
    scale = clamp(scale * factor, 0.75, 2.6);
    requestPaint();
  }

  function focus([latitude, longitude]: Coordinates) {
    phi = -Math.PI / 2 - longitude * radians;
    theta = latitude * radians;
    requestPaint();
  }

  const pointers = new Map<number, { x: number; y: number }>();
  function pinchDistance() {
    if (pointers.size !== 2) return 0;
    const [first, second] = [...pointers.values()];
    return Math.hypot(first.x - second.x, first.y - second.y);
  }

  canvas.addEventListener('pointerdown', event => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const startingDistance = pinchDistance();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (startingDistance > 0) {
      zoom(pinchDistance() / startingDistance);
    } else if (pointers.size === 1) {
      phi -= (event.clientX - previous.x) / 180 / scale;
      theta = clamp(theta + (event.clientY - previous.y) / 180 / scale, -1.5, 1.5);
      requestPaint();
    }
  });
  canvas.addEventListener('lostpointercapture', event => {
    pointers.delete(event.pointerId);
    if (pointers.size === 0) canvas.classList.remove('dragging');
  });
  canvas.addEventListener('wheel', event => {
    if (event.ctrlKey || document.activeElement === canvas) {
      event.preventDefault();
      zoom(Math.exp(-clamp(event.deltaY, -100, 100) * 0.002));
    }
  }, { passive: false });
  canvas.addEventListener('keydown', event => {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => { phi -= 0.15; },
      ArrowRight: () => { phi += 0.15; },
      ArrowUp: () => { theta = clamp(theta + 0.15, -1.5, 1.5); },
      ArrowDown: () => { theta = clamp(theta - 0.15, -1.5, 1.5); },
      '+': () => zoom(1.2), '=': () => zoom(1.2), '-': () => zoom(1 / 1.2),
    };
    if (!Object.hasOwn(actions, event.key)) return;
    event.preventDefault();
    actions[event.key]();
    requestPaint();
  });
  controls.zoomIn.addEventListener('click', () => zoom(1.2));
  controls.zoomOut.addEventListener('click', () => zoom(1 / 1.2));
  controls.reset.addEventListener('click', () => {
    ({ phi, theta, scale } = initialView);
    requestPaint();
  });

  new ResizeObserver(([entry]) => {
    const width = Math.round(entry.contentRect.width);
    if (!width || width === size) return;
    size = width;
    roads.width = Math.round(size * dpr);
    roads.height = Math.round(size * dpr);
    paint({ width: size, height: size });
  }).observe(canvas.parentElement!);

  // COBE decodes the land texture asynchronously and draws on the next update.
  window.setTimeout(requestPaint, 250);

  return {
    focus,
    setContent(items: GlobePin[], arcs: Arc[], roadPaths: Coordinates[][]) {
      routes = roadPaths;
      markers = items.map(pin => {
        const element = document.createElement('a');
        element.className = 'globe-pin';
        element.href = pin.href;
        element.setAttribute('aria-label', pin.name);
        const label = document.createElement('span');
        label.textContent = pin.name;
        element.append(label);
        return { pin, element };
      });
      pins.replaceChildren(...markers.map(marker => marker.element));
      paint({ arcs });
    },
  };
}
