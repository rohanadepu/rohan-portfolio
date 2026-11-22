import { LngLatBounds, Map, Marker, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Coordinates } from './data';

setWorkerUrl(workerUrl);

interface MapStop {
  name: string;
  coordinates: Coordinates;
}

export const longitudeFirst = ([latitude, longitude]: Coordinates): [number, number] => [longitude, latitude];

export function mountMap(container: HTMLElement, stops: MapStop[], path: Coordinates[] | null, select: (index: number) => void) {
  const [first] = stops;
  if (!first) throw new Error('The map has no stops.');
  const map = new Map({
    container,
    style: 'https://tiles.openfreemap.org/styles/positron',
    center: longitudeFirst(first.coordinates),
    zoom: 13.5,
    cooperativeGestures: true,
    renderWorldCopies: false,
  });

  const status = document.createElement('p');
  status.className = 'map-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  status.textContent = 'Street tiles could not load. The numbered stops are still available.';
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
    stops.forEach(stop => bounds.extend(longitudeFirst(stop.coordinates)));
    map.fitBounds(bounds, { padding: 48, maxZoom: 13.75, duration: 0 });
  }

  if (path) {
    map.on('load', () => {
      map.addSource('approximate-route', {
        type: 'geojson',
        data: {
          type: 'Feature', properties: {},
          geometry: { type: 'LineString', coordinates: path.map(longitudeFirst) },
        },
      });
      map.addLayer({
        id: 'approximate-route', type: 'line', source: 'approximate-route',
        paint: { 'line-color': '#29271f', 'line-width': 2.5, 'line-dasharray': [2, 2] },
      });
    });
  }

  return {
    hide: () => map.remove(),
    select(index: number, center: boolean) {
      markers.forEach((marker, i) => marker.getElement().setAttribute('aria-pressed', String(i === index)));
      if (center && stops[index]) {
        map.easeTo({
          center: longitudeFirst(stops[index].coordinates),
          duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 270,
        });
      }
    },
  };
}
