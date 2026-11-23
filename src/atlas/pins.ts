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

interface Group {
  x: number;
  y: number;
  members: Marker[];
  label?: string;
  zoomLevel?: number;
}

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const regionZoom = 1.22;
const cityZoom = 1.62;
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

function groupByArea(markers: Marker[], useRegion: boolean) {
  const byArea = new Map<string, { label: string; members: Marker[] }>();
  for (const marker of markers) {
    if (!marker.area) continue;
    const { country, region } = marker.area;
    const subdivision = useRegion ? region : undefined;
    const key = JSON.stringify([country, subdivision]);
    const group = byArea.get(key);
    if (group) group.members.push(marker);
    else byArea.set(key, { label: subdivision ?? country, members: [marker] });
  }
  return [...byArea.values()].map(group => ({
    ...group,
    center: centerOf(group.members),
    zoomLevel: useRegion || !group.members.some(marker => marker.area?.region) ? cityZoom : regionZoom,
  }));
}

function makeLabel(name: string) {
  const label = document.createElement('span');
  label.className = 'pin-label';
  label.textContent = name;
  return label;
}

function place(element: HTMLElement, { x, y }: Group, label: string, width: number, height: number, occupied: Bounds[]) {
  element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  const halfLabel = Math.min(58, (label.length * 7.3 + 15) / 2);
  const available = (box: Bounds) => box.left >= 0 && box.right <= width && box.top >= 0 && box.bottom <= height &&
    !occupied.some(other => box.left < other.right && box.right > other.left &&
      box.top < other.bottom && box.bottom > other.top);
  const below = { left: x - halfLabel, right: x + halfLabel, top: y + 12, bottom: y + 34 };
  const above = { ...below, top: y - 34, bottom: y - 12 };
  const slot = available(below) ? below : available(above) ? above : undefined;
  element.classList.toggle('label-above', slot === above);
  element.classList.toggle('label-on-demand', !slot);
  if (slot) occupied.push(slot);
}

export function setupPins(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  zoomTo: (coordinates: Coordinates, zoomLevel: number) => void,
) {
  const dialog = document.querySelector<HTMLDialogElement>('#cluster-choices')!;
  const title = dialog.querySelector('h2')!;
  const options = dialog.querySelector('ul')!;
  const clusters = new Map<string, { button: HTMLButtonElement; caption: HTMLSpanElement }>();
  let markers: Marker[] = [];
  let countryGroups: ReturnType<typeof groupByArea> = [];
  let regionGroups: ReturnType<typeof groupByArea> = [];

  dialog.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('a')) dialog.close();
  });

  function choose(group: Group, label: string) {
    const { members, zoomLevel } = group;
    if (zoomLevel) {
      zoomTo(centerOf(members), zoomLevel);
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

  function render(project: (coordinates: Coordinates) => ScreenPoint, width: number, height: number, scale: number, horizon: number) {
    container.style.setProperty('--pin-horizon', `${horizon}px`);
    const groups: Group[] = [];
    const onScreen = (point: ScreenPoint) =>
      point.front && point.x >= 12 && point.y >= 12 && point.x <= width - 12 && point.y <= height - 12;
    const useAreaPins = scale < cityZoom;
    if (useAreaPins) {
      for (const group of scale < regionZoom ? countryGroups : regionGroups) {
        const anchor = project(group.center);
        if (!onScreen(anchor)) continue;
        groups.push({ ...group, x: anchor.x, y: anchor.y });
      }
    }

    const localGroups: Group[] = [];
    for (const marker of markers) {
      if (useAreaPins && marker.area) continue;
      const point = project(marker.pin.coordinates);
      if (!onScreen(point)) continue;
      const group = localGroups.find(candidate => {
        const first = candidate.members[0];
        if (marker.area?.country !== first.area?.country) return false;
        if (sameLocation(marker, first)) return true;
        return Boolean(marker.area && marker.area.region === first.area?.region &&
          Math.hypot(point.x - candidate.x, point.y - candidate.y) < 12);
      });
      if (!group) {
        localGroups.push({ x: point.x, y: point.y, members: [marker] });
        continue;
      }
      group.members.push(marker);
      group.x += (point.x - group.x) / group.members.length;
      group.y += (point.y - group.y) / group.members.length;
    }
    groups.push(...localGroups);

    const singlePins = new Set<Marker>();
    const visibleClusters = new Set<string>();
    const occupied = groups.map(({ x, y }) => ({
      left: x - 12, right: x + 12, top: y - 12, bottom: y + 12,
    }));
    for (const group of groups) {
      const [first] = group.members;
      if (group.members.length === 1 && !group.zoomLevel) {
        singlePins.add(first);
        place(first.element, group, first.pin.name, width, height, occupied);
        continue;
      }

      const key = `${group.zoomLevel ?? 'local'}:${group.members.map(member => member.id).join(',')}`;
      visibleClusters.add(key);
      const label = group.label ?? first.area?.region ?? first.area?.country ?? first.pin.name;
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
        button.setAttribute('aria-label', `${label}, ${count} ${count === 1 ? 'pin' : 'pins'}`);
      }
      place(button, group, label, width, height, occupied);
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
      countryGroups = groupByArea(markers, false);
      regionGroups = groupByArea(markers, true);
      container.replaceChildren(...markers.map(marker => marker.element));
    },
  };
}
