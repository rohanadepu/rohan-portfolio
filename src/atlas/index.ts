import type { Arc } from 'cobe';
import { coordinateLabel, type City, type Coordinates, type Journey } from './data';
import { publicCities, publicJourneys } from './public-data';
import type { atlasPreview } from './journal';
import { reducedMotion, setupGlobe, type GlobeCamera } from './globe';
import type { mountMap } from './map';
import type { GlobePin } from './pins';

function byId<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', value = ''): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  return element;
}

function link(url: string, label: string, className = '') {
  const element = node('a', className, label);
  element.href = url;
  return element;
}

const legacyAtlasPath = /^\/atlas\/?$/.test(location.pathname);
if (legacyAtlasPath) {
  history.replaceState(null, '', `/${location.search}${location.hash}`);
}

const atlas = byId('atlas');
const overview = byId('overview');
const portfolio = byId('portfolio');
const detail = byId('detail');
const emptyAtlas = byId('atlas-empty');
const placesButton = byId<HTMLButtonElement>('places-mode');
const journeysButton = byId<HTMLButtonElement>('journeys-mode');
const globeView = byId('globe-view');
const globeCanvas = byId<HTMLCanvasElement>('globe');
const globe = setupGlobe(globeCanvas, byId('surface-routes'), byId('globe-pins'), {
  zoomIn: byId('zoom-in'), zoomOut: byId('zoom-out'), reset: byId('reset'),
}, showGlobe);
if (!globe) {
  globeView.hidden = true;
  byId('globe-fallback').hidden = false;
}

let cities = publicCities;
let journeys = publicJourneys;
const localPreviewCities = new WeakSet<City>();
const journeyMode = { flight: 'Flight', drive: 'Road trip', rail: 'Train', cruise: 'Cruise' };

let mode: 'places' | 'journeys' = 'places';
let currentDetail = '';
let map: ReturnType<typeof mountMap> | undefined;
let selectedPlace = '';
let returnView: { camera?: GlobeCamera; scrollTop: number } | undefined;
let departure: Animation | undefined;
let renderedSearch = location.search;

function showGlobe() {
  const stage = globeCanvas.parentElement!;
  const { top, bottom } = stage.getBoundingClientRect();
  if (top < 0 || bottom > window.innerHeight) {
    stage.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
}

function interruptTransition() {
  globe?.stop();
  departure?.cancel();
  departure = undefined;
}

function reveal(element: Element, delay = 0, duration = 480) {
  return element.animate([
    { opacity: 0, translate: '0 9px' },
    { opacity: 1, translate: '0 0' },
  ], { delay, duration, fill: 'backwards', easing: 'cubic-bezier(.22,.61,.36,1)' });
}

function atlasUrl(values: Record<string, string> = {}) {
  const params = new URLSearchParams();
  if (mode === 'journeys') params.set('view', mode);
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

function cityLink(id: string, place = '') {
  return atlasUrl({ city: id, place });
}

function journeyLink(id: string) {
  return atlasUrl({ view: 'journeys', journey: id });
}

function renderOverview() {
  const showingJourneys = mode === 'journeys';
  placesButton.setAttribute('aria-pressed', String(!showingJourneys));
  journeysButton.setAttribute('aria-pressed', String(showingJourneys));
  overview.dataset.view = mode;

  const pins: GlobePin[] = showingJourneys
    ? journeys.flatMap(journey => {
      const first = journey.stops[0];
      const last = journey.stops.at(-1);
      if (!first || !last) return [];
      const href = journeyLink(journey.id);
      const description = `${journey.name} · ${journey.date ?? journey.year}`;
      return (first === last ? [first] : [first, last]).map(stop => ({
        name: stop.name, coordinates: stop.coordinates, href, description,
      }));
    })
    : cities.map(city => ({
      name: city.name, region: city.region, href: cityLink(city.id), coordinates: city.coordinates,
    }));

  emptyAtlas.hidden = pins.length > 0;
  emptyAtlas.textContent = showingJourneys ? 'No journeys published yet.' : 'No places published yet.';

  if (globe) {
    const flightArcs: Arc[] = [];
    const surfaceRoutes: Coordinates[][] = [];
    if (showingJourneys) {
      for (const journey of journeys) {
        const stops = journey.stops.map(stop => stop.coordinates);
        if (stops.length < 2) continue;
        if (journey.mode === 'flight') {
          stops.slice(1).forEach((to, index) => flightArcs.push({ from: stops[index], to }));
        } else {
          surfaceRoutes.push(stops);
        }
      }
    }
    globe.setContent(pins, flightArcs, surfaceRoutes);
  } else {
    const links = new Map(pins.map(pin => [pin.href, pin.description ?? pin.name]));
    byId('globe-fallback-links').replaceChildren(...[...links].map(([href, title]) => {
      const row = node('li');
      row.append(link(href, title));
      return row;
    }));
  }
}

function detailHeading(label: string, title: string, metadata: string) {
  const group = node('header', 'detail-heading');
  const heading = node('h1', '', title);
  heading.id = 'detail-title';
  heading.tabIndex = -1;
  group.append(
    link(atlasUrl(), 'Back to the atlas', 'back-link'),
    node('p', 'eyebrow', label),
    heading,
    node('p', 'detail-meta', metadata),
  );
  return group;
}

async function attachMap(container: HTMLElement, stops: City['places'] | Journey['stops'], route: Journey['mode'] | null, select: (index: number) => void) {
  try {
    const { mountMap } = await import('./map');
    if (!container.isConnected) return;
    map = mountMap(container, stops, route, select);
    updatePlaceSelection(Boolean(selectedPlace), false);
  } catch {
    if (container.isConnected) {
      container.replaceChildren(node('p', 'unavailable', 'The map is unavailable. You can still browse the entries below.'));
    }
  }
}

function updatePlaceSelection(center: boolean, scroll: boolean, smooth = false) {
  const entries = [...detail.querySelectorAll<HTMLElement>('.field-entry')];
  const index = entries.findIndex(entry => entry.id === selectedPlace);
  entries.forEach((entry, i) => {
    entry.classList.toggle('selected', i === index);
    entry.querySelector('.place-select')?.setAttribute('aria-pressed', String(i === index));
  });
  map?.select(index, center);
  if (scroll) scrollToEntry(entries[index], smooth);
}

function scrollToEntry(entry: Element | undefined, smooth = true) {
  entry?.scrollIntoView({ block: 'nearest', behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant' });
}

function showCity(city: City) {
  detail.append(detailHeading('Field journal', city.name, `${city.region} · ${coordinateLabel(city.coordinates)}`));
  const photoRoot = import.meta.env.DEV && localPreviewCities.has(city) ? '/__atlas/photos' : '/atlas-images';
  const mapContainer = node('div', 'detail-map');
  detail.append(mapContainer);
  const entries = node('div', 'field-entries');
  for (const [index, place] of city.places.entries()) {
    const entry = node('article', 'field-entry');
    entry.id = place.id;
    const heading = node('h3');
    const select = node('button', 'place-select');
    select.type = 'button';
    select.append(node('span', 'entry-number', String(index + 1).padStart(2, '0')), node('span', '', place.name));
    select.addEventListener('click', () => pickPlace(index, false));
    heading.append(select);
    entry.append(heading);
    for (const visit of place.visits) {
      const note = node('div', 'visit');
      note.append(node('p', 'eyebrow', visit.date), node('h4', '', visit.activity), node('p', '', visit.note));
      const gallery = node('div', 'journal-photos');
      for (const photo of visit.photos ?? []) {
        if (!/^[\w-]+\.(?:jpe?g|png|webp|avif)$/i.test(photo.file)) continue;
        const source = `${photoRoot}/${photo.file}`;
        const figure = node('figure', 'journal-photo');
        const image = node('img');
        image.src = source;
        image.alt = photo.alt;
        if (photo.width) image.width = photo.width;
        if (photo.height) image.height = photo.height;
        image.loading = 'lazy';
        const photoLink = link(source, '');
        photoLink.setAttribute('aria-label', `View larger photo: ${photo.alt}`);
        photoLink.target = '_blank';
        photoLink.rel = 'noopener';
        photoLink.append(image);
        figure.append(photoLink);
        if (photo.caption) figure.append(node('figcaption', 'eyebrow', photo.caption));
        gallery.append(figure);
      }
      if (gallery.childElementCount) note.append(gallery);
      entry.append(note);
    }
    entries.append(entry);
  }
  function pickPlace(index: number, scroll: boolean) {
    const place = city.places[index];
    if (!place) return;
    selectedPlace = place.id;
    history.replaceState(null, '', cityLink(city.id, place.id));
    renderedSearch = location.search;
    updatePlaceSelection(true, scroll, true);
  }
  if (!city.places.length) {
    mapContainer.remove();
    entries.append(node('p', 'no-results', 'No visits are listed for this city.'));
  } else {
    void attachMap(mapContainer, city.places, null, index => pickPlace(index, true));
  }
  detail.append(entries);
}

function showJourney(journey: Journey) {
  detail.append(detailHeading('Itinerary', journey.name, `${journeyMode[journey.mode]} · ${journey.date ?? journey.year}`));
  if (journey.note) detail.append(node('p', '', journey.note));
  const container = node('div', 'detail-map');
  detail.append(container);
  if (journey.stops.length > 1) {
    detail.append(node('p', 'eyebrow map-caption',
      journey.mode === 'flight' ? 'Approximate flight path' : 'Approximate line between stops'));
  }
  void attachMap(container, journey.stops, journey.mode,
    index => scrollToEntry(detail.querySelectorAll('.itinerary > li')[index]),
  );
  const stops = node('ol', 'itinerary');
  for (const stop of journey.stops) {
    const entry = node('li');
    entry.append(node('h3', '', stop.name), node('p', 'eyebrow', coordinateLabel(stop.coordinates)));
    if (stop.cityId) entry.append(link(cityLink(stop.cityId), 'Open field journal'));
    stops.append(entry);
  }
  detail.append(stops);
}

function readDestination(params: URLSearchParams) {
  const city = cities.find(item => item.id === params.get('city'));
  const journey = journeys.find(item => item.id === params.get('journey'));
  return { city, journey };
}

function renderRoute(moveFocus = false, animate = false) {
  renderedSearch = location.search;
  const params = new URLSearchParams(renderedSearch);
  mode = params.get('view') === 'journeys' ? 'journeys' : 'places';
  const { city, journey } = readDestination(params);
  const nextDetail = city ? `city-${city.id}` : journey ? `journey-${journey.id}` : '';
  selectedPlace = params.get('place') ?? '';
  const changed = nextDetail !== currentDetail;
  const animateChange = changed && animate && !reducedMotion.matches;

  if (changed) {
    currentDetail = nextDetail;
    map?.hide();
    map = undefined;
    detail.replaceChildren();
    portfolio.hidden = Boolean(nextDetail);
    detail.hidden = !nextDetail;
    if (city) showCity(city);
    else if (journey) showJourney(journey);
    if (nextDetail) detail.append(link(atlasUrl(), 'Back to the atlas', 'back-link'));
    const title = city?.name ?? journey?.name;
    document.title = title ? `${title} · Rohan Adepu` : 'Rohan Adepu';
    if (moveFocus) {
      const top = nextDetail ? 0 : returnView?.scrollTop ?? 0;
      window.scrollTo({ top, behavior: 'instant' });
      const viewButton = mode === 'journeys' ? journeysButton : placesButton;
      (nextDetail ? byId('detail-title') : viewButton).focus({ preventScroll: true });
    }
  }
  if (nextDetail) {
    updatePlaceSelection(false, Boolean(selectedPlace) && !animateChange && !location.hash);
    if (animateChange) {
      const sections = [...detail.children];
      const entered = sections.map((section, index) => reveal(section, 120 * index));
      if (selectedPlace) {
        const destination = selectedPlace;
        void entered.at(-1)?.finished.then(() => {
          if (currentDetail === nextDetail && selectedPlace === destination && !location.hash) {
            updatePlaceSelection(false, true, true);
          }
        }).catch(() => {});
      }
    }
  } else {
    renderOverview();
    if (changed && returnView) {
      if (returnView.camera) void globe?.moveTo(returnView.camera);
      returnView = undefined;
    }
    if (animateChange) reveal(overview);
  }
}

function switchMode(value: typeof mode) {
  if (mode === value) return;
  interruptTransition();
  history.pushState(null, '', atlasUrl({ view: value === 'places' ? '' : value }));
  renderRoute();
}

async function openAtlasLink(anchor: HTMLAnchorElement) {
  if (anchor.href === location.href) return;
  interruptTransition();
  const { city, journey } = readDestination(new URL(anchor.href).searchParams);
  const target = city?.coordinates ?? globe?.markerLocation(anchor) ?? journey?.stops[0]?.coordinates;
  const fromOverview = !portfolio.hidden;
  const before = fromOverview ? { camera: globe?.camera(), scrollTop: window.scrollY } : undefined;
  if (globe && fromOverview && target) {
    if (city || journey) void import('./map').catch(() => {});
    showGlobe();
    if (!(await globe.focus(target))) return;
  }

  if (!reducedMotion.matches && (!fromOverview || target)) {
    const fade = (fromOverview ? overview : detail).animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 175, fill: 'forwards', easing: 'ease-in' },
    );
    departure = fade;
    if (!(await fade.finished.then(() => true, () => false))) return;
  }

  if (before) returnView = before;
  history.pushState(null, '', anchor.href);
  departure?.cancel();
  departure = undefined;
  renderRoute(true, true);
}

placesButton.addEventListener('click', () => switchMode('places'));
journeysButton.addEventListener('click', () => switchMode('journeys'));
document.addEventListener('click', event => {
  const anchor = event.target instanceof Element ? event.target.closest('a') : null;
  if (!anchor || event.defaultPrevented || event.button || event.ctrlKey || event.metaKey ||
      event.shiftKey || event.altKey || anchor.target || anchor.origin !== location.origin ||
      anchor.pathname !== '/') return;
  if (anchor.hash) {
    interruptTransition();
    return;
  }
  if (!atlas.contains(anchor) && !detail.contains(anchor)) return;
  event.preventDefault();
  void openAtlasLink(anchor);
});
window.addEventListener('popstate', () => {
  interruptTransition();
  if (location.search !== renderedSearch) renderRoute(!location.hash || location.hash === '#atlas', true);
});

function withLocalPreview<T extends { id: string }>(published: T[], local: T[]) {
  const publishedIds = new Set(published.map(entry => entry.id));
  return [...local.filter(entry => !publishedIds.has(entry.id)), ...published];
}

async function loadPreview() {
  try {
    const response = await fetch('/__atlas/journal', { cache: 'no-store' });
    if (!response.ok) return;
    const preview = await response.json() as ReturnType<typeof atlasPreview>;
    for (const city of preview.cities) localPreviewCities.add(city);
    cities = withLocalPreview(publicCities, preview.cities);
    journeys = withLocalPreview(publicJourneys, preview.journeys);
    byId('journal-label').hidden = false;
  } catch (error) {
    console.warn('Could not load local travel journal', error);
  }
}

async function start() {
  if (import.meta.env.DEV) await loadPreview();
  const params = new URLSearchParams(location.search);
  const opensDetail = !location.hash && (params.has('city') || params.has('journey'));
  renderRoute(opensDetail);
}

void start();
