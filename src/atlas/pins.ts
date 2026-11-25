import type { Coordinates } from './data';
import { unitVector, vectorCoordinates } from './geography';

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
  area?: { country: string; region?: string };
  vector: [number, number, number];
  element: HTMLAnchorElement;
}

interface VisibleMarker extends ScreenPoint {
  marker: Marker;
}

interface Group {
  x: number;
  y: number;
  members: Marker[];
  label?: string;
}

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const subdivisionZoom = 1.22;
export function pinDiameter(scale: number) {
  return 24 + Math.min(12, Math.max(0, Math.log2(scale)) * 3);
}
function areaOf(region?: string): Marker['area'] {
  const parts = region?.split(',').map(part => part.trim()).filter(Boolean);
  const country = parts?.pop();
  if (!country) return;
  return {
    country: country === 'USA' ? 'United States' : country,
    region: parts?.join(', ') || undefined,
  };
}

function sameLocation(first: Marker, second: Marker) {
  const [latitude, longitude] = first.pin.coordinates;
  return Math.abs(latitude - second.pin.coordinates[0]) < .001 &&
    Math.abs(longitude - second.pin.coordinates[1]) < .001;
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
  return vectorCoordinates([x, y, z]);
}

function pinsOverlap(first: VisibleMarker, second: VisibleMarker, diameter: number) {
  const area = first.marker.area;
  if (area?.country !== second.marker.area?.country) return false;
  if (!area) return sameLocation(first.marker, second.marker);
  return Math.hypot(first.x - second.x, first.y - second.y) < diameter;
}

function groupOverlappingPins(points: VisibleMarker[], diameter: number) {
  const groups: VisibleMarker[][] = [];
  for (const point of points) {
    const merged = [point];
    for (let index = groups.length - 1; index >= 0; index--) {
      if (!groups[index].some(member => pinsOverlap(point, member, diameter))) continue;
      merged.push(...groups[index]);
      groups.splice(index, 1);
    }
    groups.push(merged);
  }
  return groups;
}

function makeLabel(name: string) {
  const label = document.createElement('span');
  label.className = 'pin-label';
  label.textContent = name;
  return label;
}

function place(element: HTMLElement, { x, y }: Group, label: string, width: number, height: number, pinRadius: number, occupied: Bounds[]) {
  element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  const halfLabel = Math.min(58, (label.length * 7.3 + 15) / 2);
  const available = (box: Bounds) => box.left >= 0 && box.right <= width && box.top >= 0 && box.bottom <= height &&
    !occupied.some(other => box.left < other.right && box.right > other.left &&
      box.top < other.bottom && box.bottom > other.top);
  const below = { left: x - halfLabel, right: x + halfLabel, top: y + pinRadius, bottom: y + pinRadius + 22 };
  const above = { ...below, top: y - pinRadius - 22, bottom: y - pinRadius };
  const slot = available(below) ? below : available(above) ? above : undefined;
  element.classList.toggle('label-above', slot === above);
  element.classList.toggle('label-on-demand', !slot);
  if (slot) occupied.push(slot);
}

export function setupPins(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  focusCluster: (center: Coordinates, members: Coordinates[], neighbors: Coordinates[]) => boolean,
) {
  const dialog = document.querySelector<HTMLDialogElement>('#cluster-choices')!;
  const title = dialog.querySelector('h2')!;
  const options = dialog.querySelector('ul')!;
  const clusters = new Map<string, { button: HTMLButtonElement; caption: HTMLSpanElement }>();
  let markers: Marker[] = [];

  dialog.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('a')) dialog.close();
  });

  function choose(group: Group, label: string) {
    const { members } = group;
    if (members[0].area) {
      const locations = members.map(member => member.pin.coordinates);
      const neighbors = markers.filter(marker => !members.includes(marker)).map(marker => marker.pin.coordinates);
      if (focusCluster(centerOf(members), locations, neighbors)) return;
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

  function render(project: (coordinates: Coordinates) => ScreenPoint, width: number, height: number, scale: number, horizon: number) {
    const diameter = pinDiameter(scale);
    const radius = diameter / 2;
    container.style.setProperty('--pin-size', `${diameter}px`);
    container.style.setProperty('--pin-horizon', `${horizon}px`);
    const onScreen = (point: ScreenPoint) =>
      point.front && point.x >= radius && point.y >= radius && point.x <= width - radius && point.y <= height - radius;
    const points = markers.map(marker => ({ marker, ...project(marker.pin.coordinates) })).filter(onScreen);
    const groups = groupOverlappingPins(points, diameter).map((group): Group => {
      const members = group.map(point => point.marker).sort((first, second) => first.id - second.id);
      const [first] = members;
      if (members.length === 1) return { x: group[0].x, y: group[0].y, members };
      const area = first.area;
      const sharesRegion = scale >= subdivisionZoom && area?.region &&
        members.every(member => member.area?.region === area.region);
      return {
        ...project(centerOf(members)),
        members,
        label: (sharesRegion ? area.region : area?.country) ?? first.pin.name,
      };
    });

    const singlePins = new Set<Marker>();
    const visibleClusters = new Set<string>();
    const occupied = groups.map(({ x, y }) => ({
      left: x - radius, right: x + radius, top: y - radius, bottom: y + radius,
    }));
    for (const group of groups) {
      const [first] = group.members;
      if (group.members.length === 1) {
        singlePins.add(first);
        place(first.element, group, first.pin.name, width, height, radius, occupied);
        continue;
      }

      const key = group.members.map(member => member.id).join(',');
      visibleClusters.add(key);
      const label = group.label ?? first.pin.name;
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
        button.addEventListener('click', () => choose(group, caption.textContent ?? label));
        cluster = { button, caption };
        clusters.set(key, cluster);
        container.append(button);
      }
      const { button, caption } = cluster;
      if (caption.textContent !== label) {
        caption.textContent = label;
        const count = group.members.length;
        button.setAttribute('aria-label', `${label}, ${count} pins`);
      }
      place(button, group, label, width, height, radius, occupied);
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
    markerLocation: (anchor: HTMLAnchorElement) => markers.find(({ element }) => element === anchor)?.pin.coordinates,
    setContent(items: GlobePin[]) {
      if (dialog.open) dialog.close();
      clusters.clear();
      markers = items.map((pin, id) => {
        const element = document.createElement('a');
        element.className = 'globe-pin';
        element.href = pin.href;
        element.setAttribute('aria-label', pin.description ?? pin.name);
        element.append(makeLabel(pin.name));
        return { id, pin, element, area: areaOf(pin.region), vector: unitVector(pin.coordinates) };
      });
      container.replaceChildren(...markers.map(marker => marker.element));
    },
  };
}
