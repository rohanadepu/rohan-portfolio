import type { Coordinates } from './data';

export interface GlobePin {
  name: string;
  href: string;
  coordinates: Coordinates;
  region?: string;
  description?: string;
}

interface ScreenPoint {
  x: number;
  y: number;
  front: boolean;
}

interface Marker {
  id: number;
  pin: GlobePin;
  vector: [number, number, number];
  element: HTMLAnchorElement;
}

interface Group {
  x: number;
  y: number;
  members: Marker[];
}

const groupDistance = 56;
const radians = Math.PI / 180;
const minimumAlignment = Math.cos(18 * radians);

function unitVector([latitude, longitude]: Coordinates): Marker['vector'] {
  const lat = latitude * radians;
  const lon = longitude * radians;
  return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
}

function nearby(first: Marker, second: Marker) {
  const [x, y, z] = first.vector;
  const [otherX, otherY, otherZ] = second.vector;
  return x * otherX + y * otherY + z * otherZ > minimumAlignment;
}

function centerOf(members: Marker[]): Coordinates {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const { vector } of members) {
    x += vector[0];
    y += vector[1];
    z += vector[2];
  }
  return [Math.atan2(z, Math.hypot(x, y)) / radians, Math.atan2(y, x) / radians];
}

function labelFor(members: Marker[], scale: number) {
  const { pin } = members[0];
  if (scale < 2.5 && pin.region && members.every(member => member.pin.region === pin.region)) {
    return pin.region.split(',')[0];
  }
  return pin.name;
}

function makeLabel(name: string) {
  const label = document.createElement('span');
  label.className = 'pin-label';
  label.textContent = name;
  return label;
}

function place(element: HTMLElement, group: Pick<Group, 'x' | 'y'>, size: number) {
  element.style.transform = `translate(${group.x}px, ${group.y}px) translate(-50%, -50%)`;
  const labelOffset = Math.max(58 - group.x, Math.min(0, size - 58 - group.x));
  element.style.setProperty('--label-offset', `${labelOffset}px`);
}

export function setupPins(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  canZoom: () => boolean,
  zoomTo: (coordinates: Coordinates) => void,
) {
  const dialog = document.querySelector<HTMLDialogElement>('#cluster-choices')!;
  const title = dialog.querySelector('h2')!;
  const options = dialog.querySelector('ul')!;
  const clusters = new Map<string, { button: HTMLButtonElement; caption: HTMLSpanElement }>();
  let markers: Marker[] = [];
  let highlighted: Coordinates | undefined;

  dialog.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('a')) dialog.close();
  });

  function choose(members: Marker[], label: string) {
    const [latitude, longitude] = members[0].pin.coordinates;
    const spread = members.some(({ pin }) =>
      Math.abs(pin.coordinates[0] - latitude) > .001 ||
      Math.abs(pin.coordinates[1] - longitude) > .001,
    );
    if (spread && canZoom()) {
      zoomTo(centerOf(members));
      return;
    }
    title.textContent = label;
    const targets = new Map(members.map(({ pin }) => [pin.href, pin]));
    options.replaceChildren(...[...targets.values()].map(pin => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = pin.href;
      link.textContent = pin.description ?? pin.name;
      item.append(link);
      return item;
    }));
    dialog.showModal();
  }

  function render(project: (coordinates: Coordinates) => ScreenPoint, size: number, scale: number) {
    const groups: Group[] = [];
    for (const marker of markers) {
      const point = project(marker.pin.coordinates);
      if (!point.front || point.x < 12 || point.y < 12 || point.x > size - 12 || point.y > size - 12) continue;
      // Avoid grouping distant locations that only look close at the edge of the globe.
      const group = groups.find(group =>
        (point.x - group.x) ** 2 + (point.y - group.y) ** 2 < groupDistance ** 2 &&
        nearby(marker, group.members[0]),
      );
      if (!group) {
        groups.push({ x: point.x, y: point.y, members: [marker] });
        continue;
      }
      group.members.push(marker);
      group.x += (point.x - group.x) / group.members.length;
      group.y += (point.y - group.y) / group.members.length;
    }

    const singlePins = new Set<Marker>();
    const visibleClusters = new Set<string>();
    for (const group of groups) {
      const [first] = group.members;
      const located = group.members.some(({ pin }) => pin.coordinates === highlighted);
      if (group.members.length === 1) {
        singlePins.add(first);
        place(first.element, group, size);
        first.element.classList.toggle('located', located);
        continue;
      }

      const key = group.members.map(member => member.id).join(',');
      visibleClusters.add(key);
      const label = labelFor(group.members, scale);
      let cluster = clusters.get(key);
      if (!cluster) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'globe-pin globe-cluster';
        const count = document.createElement('span');
        count.className = 'pin-count';
        count.textContent = String(group.members.length);
        count.setAttribute('aria-hidden', 'true');
        const caption = makeLabel('');
        button.append(count, caption);
        button.addEventListener('click', () => choose(group.members, caption.textContent ?? label));
        cluster = { button, caption };
        clusters.set(key, cluster);
        container.append(button);
      }
      const { button, caption } = cluster;
      if (caption.textContent !== label) {
        caption.textContent = label;
        button.setAttribute('aria-label', `${label}, ${group.members.length} nearby pins`);
      }
      button.classList.toggle('located', located);
      place(button, group, size);
    }

    for (const marker of markers) {
      marker.element.hidden = !singlePins.has(marker);
    }
    for (const [key, { button }] of clusters) {
      if (visibleClusters.has(key)) continue;
      if (button === document.activeElement && button.matches(':focus-visible')) {
        canvas.focus({ preventScroll: true });
      }
      button.remove();
      clusters.delete(key);
    }
  }

  return {
    render,
    highlight(coordinates?: Coordinates) {
      highlighted = coordinates;
    },
    markerLocation: (anchor: HTMLAnchorElement) => markers.find(({ element }) => element === anchor)?.pin.coordinates,
    setContent(items: GlobePin[]) {
      if (dialog.open) dialog.close();
      clusters.clear();
      highlighted = undefined;
      markers = items.map((pin, id) => {
        const element = document.createElement('a');
        element.className = 'globe-pin';
        element.href = pin.href;
        element.setAttribute('aria-label', pin.description ?? pin.name);
        element.append(makeLabel(pin.name));
        return { id, pin, element, vector: unitVector(pin.coordinates) };
      });
      container.replaceChildren(...markers.map(marker => marker.element));
    },
  };
}
