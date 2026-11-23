import createGlobe, { type Arc, type COBEOptions } from 'cobe';
import type { Coordinates } from './data';

import { setupPins, type GlobePin } from './pins';

const radians = Math.PI / 180;
const maximumScale = 64;
const zoomStep = 1.3;
const radius = 0.8; // COBE's sphere radius in clip space.
const initialView = { phi: -Math.PI / 2 - 125 * radians, theta: 25 * radians, scale: 1 };
export type GlobeCamera = typeof initialView;
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const ease = (progress: number) => progress * progress * (3 - 2 * progress);

type GlobePalette = Pick<COBEOptions, 'dark' | 'mapBrightness' | 'baseColor' | 'glowColor' | 'arcColor'>;
const lightGlobe: GlobePalette = {
  dark: 0, mapBrightness: 5.6,
  baseColor: [0.98, 0.97, 0.945], glowColor: [0.44, 0.43, 0.4], arcColor: [0.25, 0.24, 0.21],
};
const darkGlobe: GlobePalette = {
  dark: 1, mapBrightness: 3.4,
  baseColor: [0.62, 0.60, 0.55], glowColor: [0.08, 0.08, 0.07], arcColor: [0.77, 0.74, 0.67],
};

export function setupGlobe(
  canvas: HTMLCanvasElement, surfaceCanvas: HTMLCanvasElement, pins: HTMLElement,
  controls: { zoomIn: HTMLButtonElement; zoomOut: HTMLButtonElement; reset: HTMLButtonElement },
) {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const context = { alpha: true, stencil: false, antialias: true, depth: false, preserveDrawingBuffer: false };
  if (!canvas.getContext('webgl2', context) && !canvas.getContext('webgl', context)) return null;

  let { phi, theta, scale } = initialView;
  let width = 1;
  let height = 1;
  const palette = () => document.documentElement.dataset.theme === 'dark' ? darkGlobe : lightGlobe;
  const globe = createGlobe(canvas, {
    width, height, phi, theta, scale, devicePixelRatio: dpr,
    diffuse: 1.4, mapSamples: 18000, markerColor: [0.14, 0.13, 0.11], markerElevation: 0,
    arcHeight: 0.22, arcWidth: 0.5, context, ...palette(),
  });
  const surfaceContext = surfaceCanvas.getContext('2d');
  const readRouteColor = () => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
  let routeColor = readRouteColor();
  let surfaceRoutes: Coordinates[][] = [];
  const pinLayer = setupPins(pins, canvas, (coordinates, zoomLevel) => {
    void moveTo(cameraAt(coordinates, zoomLevel + .04), 680, true);
  });
  let pendingFrame = 0;
  let cancelMotion: (() => void) | undefined;
  let buttonZoom: { scale: number } | undefined;

  function screenRadius() {
    return radius * Math.min(width, height) / 2;
  }

  function position([latitude, longitude]: Coordinates) {
    const lat = latitude * radians;
    const angle = longitude * radians + phi;
    const x = Math.cos(lat) * Math.cos(angle);
    const y = Math.cos(theta) * Math.sin(lat) + Math.sin(theta) * Math.cos(lat) * Math.sin(angle);
    const z = Math.sin(theta) * Math.sin(lat) - Math.cos(theta) * Math.cos(lat) * Math.sin(angle);
    return {
      x: width / 2 + x * screenRadius() * scale,
      y: height / 2 - y * screenRadius() * scale,
      front: z > 0,
    };
  }

  function paint(overrides: Partial<COBEOptions> = {}) {
    // COBE measures the sphere against canvas height. Fit it to the shorter edge.
    globe.update({ phi, theta, scale: scale * Math.min(1, width / height), ...overrides });
    pinLayer.render(position, width, height, scale, screenRadius() * scale);
    if (!surfaceContext) return;
    surfaceContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    surfaceContext.clearRect(0, 0, width, height);
    surfaceContext.strokeStyle = routeColor;
    surfaceContext.lineWidth = 1.6;
    surfaceContext.setLineDash([3, 4]);
    surfaceContext.beginPath();
    for (const route of surfaceRoutes) {
      let connected = false;
      for (const coordinates of route) {
        const point = position(coordinates);
        if (point.front) {
          if (connected) surfaceContext.lineTo(point.x, point.y);
          else surfaceContext.moveTo(point.x, point.y);
        }
        connected = point.front;
      }
    }
    surfaceContext.stroke();
  }

  function requestPaint() {
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      paint();
    });
  }

  function zoom(factor: number, anchor?: { x: number; y: number }) {
    const nextScale = clamp(scale * factor, 0.75, maximumScale);
    if (anchor) {
      const { left, top } = canvas.getBoundingClientRect();
      const visibleRadius = screenRadius() * scale;
      const x = (anchor.x - left - width / 2) / visibleRadius;
      const y = (anchor.y - top - height / 2) / visibleRadius;
      if (x * x + y * y < 1) {
        const shift = 1 - scale / nextScale;
        phi -= x * shift / Math.max(.4, Math.cos(theta));
        theta = clamp(theta - y * shift, -1.5, 1.5);
      }
    }
    scale = nextScale;
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

  function cameraAt([latitude, longitude]: Coordinates, zoomLevel: number): GlobeCamera {
    return { phi: -Math.PI / 2 - longitude * radians, theta: latitude * radians, scale: zoomLevel };
  }

  function focus(coordinates: Coordinates) {
    const zoomLevel = Math.min(maximumScale, Math.max(2.45, scale * 1.12));
    return moveTo(cameraAt(coordinates, zoomLevel), 1400, true);
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
      const [first, second] = [...pointers.values()];
      zoom((pinchDistance() / startingDistance) ** 1.7, {
        x: (first.x + second.x) / 2, y: (first.y + second.y) / 2,
      });
    } else if (pointers.size === 1) {
      phi += (event.clientX - previous.x) / 180 / scale;
      theta = clamp(theta + (event.clientY - previous.y) / 180 / scale, -1.5, 1.5);
      requestPaint();
    }
  });
  function clearPointer(event: PointerEvent) {
    pointers.delete(event.pointerId);
    if (pointers.size === 0) canvas.classList.remove('dragging');
  }
  canvas.addEventListener('lostpointercapture', clearPointer);
  canvas.addEventListener('pointercancel', clearPointer);
  canvas.addEventListener('wheel', event => {
    // Trackpad pinch is emitted as a control-modified wheel event.
    if (!event.ctrlKey) return;
    event.preventDefault();
    cancelMotion?.();
    zoom(Math.exp(-clamp(event.deltaY, -100, 100) * 0.003), { x: event.clientX, y: event.clientY });
  }, { passive: false });
  canvas.addEventListener('keydown', event => {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => { phi -= 0.15 / scale; },
      ArrowRight: () => { phi += 0.15 / scale; },
      ArrowUp: () => { theta = clamp(theta - 0.15 / scale, -1.5, 1.5); },
      ArrowDown: () => { theta = clamp(theta + 0.15 / scale, -1.5, 1.5); },
      '+': () => zoom(zoomStep), '=': () => zoom(zoomStep), '-': () => zoom(1 / zoomStep),
    };
    if (!Object.hasOwn(actions, event.key)) return;
    event.preventDefault();
    cancelMotion?.();
    actions[event.key]();
    requestPaint();
  });
  function easeZoom(factor: number) {
    const zoom = { scale: clamp((buttonZoom?.scale ?? scale) * factor, 0.75, maximumScale) };
    buttonZoom = zoom;
    void moveTo({ ...camera(), ...zoom }, 280).then(() => {
      if (buttonZoom === zoom) buttonZoom = undefined;
    });
  }
  controls.zoomIn.addEventListener('click', () => easeZoom(zoomStep));
  controls.zoomOut.addEventListener('click', () => easeZoom(1 / zoomStep));
  controls.reset.addEventListener('click', () => { void moveTo(initialView); });

  new ResizeObserver(([entry]) => {
    const nextWidth = Math.round(entry.contentRect.width);
    const nextHeight = Math.round(entry.contentRect.height);
    if (!nextWidth || !nextHeight || (width === nextWidth && height === nextHeight)) return;
    width = nextWidth;
    height = nextHeight;
    surfaceCanvas.width = Math.round(width * dpr);
    surfaceCanvas.height = Math.round(height * dpr);
    paint({ width, height });
  }).observe(canvas.parentElement!);

  window.addEventListener('portfolio-themechange', () => {
    routeColor = readRouteColor();
    paint(palette());
  });

  // COBE decodes the land texture asynchronously and draws on the next update.
  window.setTimeout(requestPaint, 250);

  return {
    camera,
    moveTo,
    focus,
    stop: () => cancelMotion?.(),
    markerLocation: pinLayer.markerLocation,
    setContent(items: GlobePin[], arcs: Arc[], routes: Coordinates[][]) {
      pinLayer.setContent(items);
      surfaceRoutes = routes;
      paint({ arcs });
    },
  };
}
