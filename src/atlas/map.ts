import { LngLatBounds, Map, Marker, setWorkerUrl, type TransformStyleFunction } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Coordinates, Journey } from './data';
import { routePath } from './geography';

setWorkerUrl(workerUrl);

interface MapStop {
  name: string;
  coordinates: Coordinates;
}

export const longitudeFirst = ([latitude, longitude]: Coordinates): [number, number] => [longitude, latitude];

export function mountMap(container: HTMLElement, stops: MapStop[], route: Journey['mode'] | null, select: (index: number) => void) {
  const [first] = stops;
  if (!first) throw new Error('The map has no stops.');
  const path = route && stops.length > 1 ? routePath(stops.map(stop => stop.coordinates), route === 'flight') : null;

  const mapStyle = () => {
    const style = document.documentElement.dataset.theme === 'dark' ? 'fiord' : 'positron';
    return `https://tiles.openfreemap.org/styles/${style}`;
  };
  const withRoute: TransformStyleFunction | undefined = path ? (_previous, style) => ({
    ...style,
    sources: {
      ...style.sources,
      'approximate-route': {
        type: 'geojson',
        data: {
          type: 'Feature', properties: {},
          geometry: { type: 'MultiLineString', coordinates: path.lines },
        },
      },
    },
    layers: [...style.layers, {
      id: 'approximate-route', type: 'line', source: 'approximate-route',
      paint: {
        'line-color': getComputedStyle(document.documentElement).getPropertyValue('--ink'),
        'line-width': 2.5,
        'line-dasharray': [2, 2],
      },
    }],
  }) : undefined;

  const map = new Map({
    container,
    style: mapStyle(),
    transformStyle: withRoute,
    center: longitudeFirst(first.coordinates),
    zoom: 13.5,
    cooperativeGestures: true,
    renderWorldCopies: Boolean(path),
  });

  const status = document.createElement('p');
  status.className = 'map-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  status.textContent = 'Map tiles could not load. The numbered stops are still available.';
  container.append(status);
  map.on('error', () => { status.hidden = map.loaded(); });
  map.on('idle', () => { status.hidden = true; });

  const markers = stops.map((stop, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-pin';
    button.textContent = String(index + 1);
    button.setAttribute('aria-label', stop.name);
    button.addEventListener('click', () => select(index));
    return new Marker({ element: button }).setLngLat(longitudeFirst(stop.coordinates)).addTo(map);
  });

  if (stops.length > 1) {
    const bounds = new LngLatBounds();
    const points = path?.bounds ?? stops.map(stop => longitudeFirst(stop.coordinates));
    points.forEach(point => bounds.extend(point));
    map.fitBounds(bounds, { padding: 48, maxZoom: 13.75, duration: 0 });
  }

  const updateStyle = () => map.setStyle(mapStyle(), { diff: false });
  window.addEventListener('portfolio-themechange', updateStyle);

  return {
    hide() {
      window.removeEventListener('portfolio-themechange', updateStyle);
      map.remove();
    },
    select(index: number, center: boolean) {
      markers.forEach((marker, i) => marker.getElement().setAttribute('aria-pressed', String(i === index)));
      if (center && stops[index]) {
        map.easeTo({
          center: longitudeFirst(stops[index].coordinates),
          zoom: Math.max(map.getZoom(), 14),
          duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 610,
        });
      }
    },
  };
}
