import createGlobe, { type Arc, type COBEOptions } from 'cobe';
import type { Coordinates } from './data';

interface GlobePin {
  name: string;
  href: string;
  coordinates: Coordinates;
}

const radians = Math.PI / 180;
const radius = 0.8; // COBE's sphere radius in clip space.
const initialView = { phi: -Math.PI / 2 - 125 * radians, theta: 25 * radians, scale: 1 };
export type GlobeCamera = typeof initialView;
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const ease = (progress: number) => progress * progress * (3 - 2 * progress);

type GlobePalette = Pick<COBEOptions, 'dark' | 'mapBrightness' | 'baseColor' | 'glowColor' | 'arcColor'>;
const lightGlobe: GlobePalette = {
  dark: 0, mapBrightness: 5.6,
  baseColor: [0.98, 0.97, 0.945], glowColor: [0.44, 0.43, 0.4], arcColor: [0.21, 0.20, 0.17],
};
const darkGlobe: GlobePalette = {
  dark: 1, mapBrightness: 3.4,
  baseColor: [0.62, 0.60, 0.55], glowColor: [0.08, 0.08, 0.07], arcColor: [0.89, 0.86, 0.78],
};

export function setupGlobe(
  canvas: HTMLCanvasElement, roads: HTMLCanvasElement, pins: HTMLElement,
  controls: { zoomIn: HTMLButtonElement; zoomOut: HTMLButtonElement; reset: HTMLButtonElement },
) {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const context = { alpha: true, stencil: false, antialias: true, depth: false, preserveDrawingBuffer: false };
  if (!canvas.getContext('webgl2', context) && !canvas.getContext('webgl', context)) return null;

  let { phi, theta, scale } = initialView;
  let size = 1;
  const palette = () => document.documentElement.dataset.theme === 'dark' ? darkGlobe : lightGlobe;
  const readInk = () => getComputedStyle(document.documentElement).getPropertyValue('--ink');
  let routeColor = readInk();
  const globe = createGlobe(canvas, {
    width: size, height: size, phi, theta, scale, devicePixelRatio: dpr,
    diffuse: 1.4, mapSamples: 18000, markerColor: [0.14, 0.13, 0.11], markerElevation: 0,
    arcHeight: 0.22, arcWidth: 0.64, context, ...palette(),
  });
  const roadContext = roads.getContext('2d');
  let routes: Coordinates[][] = [];
  let markers: { pin: GlobePin; element: HTMLAnchorElement }[] = [];
  let pendingFrame = 0;
  let cancelMotion: (() => void) | undefined;

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

  function paint(overrides: Partial<COBEOptions> = {}) {
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
    roadContext.strokeStyle = routeColor;
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

  function camera(): GlobeCamera {
    return { phi, theta, scale };
  }

  function moveTo(target: GlobeCamera, duration = 850, approach = false): Promise<boolean> {
    cancelMotion?.();
    const start = camera();
    const rotation = Math.atan2(Math.sin(target.phi - start.phi), Math.cos(target.phi - start.phi));
    const tilt = target.theta - start.theta;
    const zoomDistance = target.scale - start.scale;
    if (reducedMotion.matches || Math.max(Math.abs(rotation), Math.abs(tilt), Math.abs(zoomDistance)) < 0.001) {
      ({ phi, theta, scale } = target);
      paint();
      return Promise.resolve(true);
    }

    return new Promise(resolve => {
      const started = performance.now();
      let frame: number;
      cancelMotion = () => {
        cancelAnimationFrame(frame);
        cancelMotion = undefined;
        resolve(false);
      };
      function step(now: number) {
        const progress = clamp((now - started) / duration, 0, 1);
        const rotationProgress = ease(approach ? Math.min(progress / 0.8, 1) : progress);
        const zoomProgress = ease(approach ? Math.max(0, (progress - 0.22) / 0.78) : progress);
        phi = start.phi + rotation * rotationProgress;
        theta = start.theta + tilt * rotationProgress;
        scale = start.scale + zoomDistance * zoomProgress;
        paint();
        if (progress < 1) {
          frame = requestAnimationFrame(step);
        } else {
          cancelMotion = undefined;
          resolve(true);
        }
      }
      frame = requestAnimationFrame(step);
    });
  }

  async function focus(coordinates: Coordinates, open = false) {
    const [latitude, longitude] = coordinates;
    pins.querySelector('.located')?.classList.remove('located');
    const arrived = await moveTo({
      phi: -Math.PI / 2 - longitude * radians,
      theta: latitude * radians,
      scale: open ? Math.max(2.45, scale * 1.12) : Math.max(1.18, scale),
    }, open ? 1400 : 900, open);
    if (arrived && !open) {
      markers.find(({ pin }) => pin.coordinates === coordinates)?.element.classList.add('located');
    }
    return arrived;
  }

  const pointers = new Map<number, { x: number; y: number }>();
  function pinchDistance() {
    if (pointers.size !== 2) return 0;
    const [first, second] = [...pointers.values()];
    return Math.hypot(first.x - second.x, first.y - second.y);
  }

  canvas.addEventListener('pointerdown', event => {
    cancelMotion?.();
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
      phi += (event.clientX - previous.x) / 180 / scale;
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
      cancelMotion?.();
      zoom(Math.exp(-clamp(event.deltaY, -100, 100) * 0.002));
    }
  }, { passive: false });
  canvas.addEventListener('keydown', event => {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => { phi -= 0.15; },
      ArrowRight: () => { phi += 0.15; },
      ArrowUp: () => { theta = clamp(theta - 0.15, -1.5, 1.5); },
      ArrowDown: () => { theta = clamp(theta + 0.15, -1.5, 1.5); },
      '+': () => zoom(1.2), '=': () => zoom(1.2), '-': () => zoom(1 / 1.2),
    };
    if (!Object.hasOwn(actions, event.key)) return;
    event.preventDefault();
    cancelMotion?.();
    actions[event.key]();
    requestPaint();
  });
  function easeZoom(factor: number) {
    void moveTo({ ...camera(), scale: clamp(scale * factor, 0.75, 2.6) }, 280);
  }
  controls.zoomIn.addEventListener('click', () => easeZoom(1.2));
  controls.zoomOut.addEventListener('click', () => easeZoom(1 / 1.2));
  controls.reset.addEventListener('click', () => { void moveTo(initialView); });

  new ResizeObserver(([entry]) => {
    const width = Math.round(entry.contentRect.width);
    if (!width || width === size) return;
    size = width;
    roads.width = Math.round(size * dpr);
    roads.height = Math.round(size * dpr);
    paint({ width: size, height: size });
  }).observe(canvas.parentElement!);

  window.addEventListener('portfolio-themechange', () => {
    routeColor = readInk();
    paint(palette());
  });

  // COBE decodes the land texture asynchronously and draws on the next update.
  window.setTimeout(requestPaint, 250);

  return {
    camera,
    moveTo,
    focus,
    stop: () => cancelMotion?.(),
    markerLocation: (anchor: HTMLAnchorElement) => markers.find(({ element }) => element === anchor)?.pin.coordinates,
    setContent(items: GlobePin[], arcs: Arc[], roadPaths: Coordinates[][]) {
      routes = roadPaths;
      pins.toggleAttribute('data-dense', items.length > 8);
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
