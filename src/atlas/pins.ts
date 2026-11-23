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

const radians = Math.PI / 180;
const regionZoom = 1.22;
const cityZoom = 1.62;
const labelOffsets = [
  [0, 0], [0, -45], [0, 45], [-44, 0], [44, 0],
  [-36, -45], [36, -45], [-36, 45], [36, 45],
  [-64, 0], [64, 0], [0, -90], [0, 90],
];

function areaOf(region?: string): Marker['area'] {
  const parts = region?.split(',').map(part => part.trim()).filter(Boolean);
  const country = parts?.pop();
  if (!country) return;
  return {
    country: country === 'USA' ? 'United States' : country,
    region: parts?.join(', ') || undefined,
  };
}

function unitVector([latitude, longitude]: Coordinates): Marker['vector'] {
  const lat = latitude * radians;
  const lon = longitude * radians;
  return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
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
  return [Math.atan2(z, Math.hypot(x, y)) / radians, Math.atan2(y, x) / radians];
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

function place(element: HTMLElement, group: Group, label: string, width: number, height: number, occupied: Bounds[]) {
  const halfLabel = Math.min(58, Math.max(14, (label.length * 7.3 + 15) / 2));
  for (const [dx, dy] of labelOffsets) {
    const x = group.x + dx;
    const y = group.y + dy;
    if ((dx || dy) && (x < 15 || x > width - 15 || y < 15 || y > height - 38)) continue;
    const labelX = Math.max(halfLabel, Math.min(width - halfLabel, x));
    const box = {
      left: Math.min(x - 14, labelX - halfLabel),
      right: Math.max(x + 14, labelX + halfLabel),
      top: y - 14,
      bottom: y + 35,
    };
    const overlaps = occupied.some(other =>
      box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top,
    );
    if (overlaps) continue;
    occupied.push(box);
    element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    element.style.setProperty('--label-offset', `${labelX - x}px`);
    element.style.setProperty('--pin-stem-length', `${Math.hypot(dx, dy)}px`);
    element.style.setProperty('--pin-stem-angle', `${Math.atan2(-dy, -dx)}rad`);
    return;
  }
  element.style.transform = `translate(${group.x}px, ${group.y}px) translate(-50%, -50%)`;
  element.style.setProperty('--label-offset', '0px');
  element.style.setProperty('--pin-stem-length', '0px');
}

function makeStem() {
  const stem = document.createElement('span');
  stem.className = 'pin-stem';
  stem.setAttribute('aria-hidden', 'true');
  return stem;
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
  let highlighted: Coordinates | undefined;

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

  function render(project: (coordinates: Coordinates) => ScreenPoint, width: number, height: number, scale: number) {
    const groups: Group[] = [];
    const onScreen = (point: ScreenPoint) =>
      point.front && point.x >= 12 && point.y >= 12 && point.x <= width - 12 && point.y <= height - 12;
    const useAreaPins = scale < cityZoom;
    if (useAreaPins) {
      for (const group of scale < regionZoom ? countryGroups : regionGroups) {
        let anchor = project(group.center);
        if (!onScreen(anchor)) {
          const visible = group.members.map(marker => project(marker.pin.coordinates)).find(onScreen);
          if (!visible) continue;
          anchor = visible;
        }
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
        return marker.area?.country === first.area?.country && sameLocation(marker, first);
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
    const occupied: Bounds[] = [];
    for (const group of groups) {
      const [first] = group.members;
      const located = group.members.some(({ pin }) => pin.coordinates === highlighted);
      if (group.members.length === 1 && !group.zoomLevel) {
        singlePins.add(first);
        place(first.element, group, first.pin.name, width, height, occupied);
        first.element.classList.toggle('located', located);
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
        button.append(makeStem(), count, caption);
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
      button.classList.toggle('located', located);
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
        element.append(makeStem(), makeLabel(pin.name));
        return { id, pin, element, area: areaOf(pin.region), vector: unitVector(pin.coordinates) };
      });
      countryGroups = groupByArea(markers, false);
      regionGroups = groupByArea(markers, true);
      container.replaceChildren(...markers.map(marker => marker.element));
    },
  };
}
