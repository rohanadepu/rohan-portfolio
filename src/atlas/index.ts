import type { Arc } from 'cobe';
import { cities as sampleCities, journeys as sampleJourneys, coordinateLabel, type City, type Coordinates, type Journey, type SourceLink } from './data';
import { loadPrivateJournal } from './journal';
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

if (location.pathname === '/atlas/' || location.pathname === '/atlas') {
  history.replaceState(null, '', `/${location.search}${location.hash}`);
}

const atlas = byId('atlas');
const overview = byId('overview');
const detail = byId('detail');
const list = byId('atlas-list');
const journeyIndex = byId('journey-index');
const transport = byId<HTMLSelectElement>('transport');
const placesButton = byId<HTMLButtonElement>('places-mode');
const journeysButton = byId<HTMLButtonElement>('journeys-mode');
const globeView = byId('globe-view');
const fullscreen = byId<HTMLButtonElement>('fullscreen');
const globeCanvas = byId<HTMLCanvasElement>('globe');
const globe = setupGlobe(globeCanvas, byId('roads'), byId('globe-pins'), {
  zoomIn: byId('zoom-in'), zoomOut: byId('zoom-out'), reset: byId('reset'),
});
if (!globe) {
  globeView.hidden = true;
  byId('globe-fallback').hidden = false;
}

let cities = sampleCities;
let journeys = sampleJourneys;
let privateJournal: Awaited<ReturnType<typeof loadPrivateJournal>>;
const journeyMode = { flight: 'Flight', drive: 'Road trip', rail: 'Train', cruise: 'Cruise' };

let mode: 'places' | 'journeys' = 'places';
let currentDetail = '';
let map: ReturnType<typeof mountMap> | undefined;
let selectedPlace = '';
let returnCamera: GlobeCamera | undefined;
let departure: Animation | undefined;
let renderedSearch = location.search;

function updateFullscreenLabel() {
  const expanded = document.fullscreenElement === globeView || globeView.classList.contains('is-expanded');
  fullscreen.textContent = expanded ? 'Exit full screen' : 'Full screen';
}

async function leaveFullscreen() {
  if (document.fullscreenElement === globeView) {
    await document.exitFullscreen().catch(() => {});
  }
  globeView.classList.remove('is-expanded');
  document.body.classList.remove('globe-expanded');
  updateFullscreenLabel();
}

fullscreen.addEventListener('click', async () => {
  if (document.fullscreenElement === globeView || globeView.classList.contains('is-expanded')) {
    await leaveFullscreen();
    return;
  }
  if (document.fullscreenEnabled && globeView.requestFullscreen) {
    try {
      await globeView.requestFullscreen();
      return;
    } catch {
      // Embedded browsers can restrict native fullscreen.
    }
  }
  globeView.classList.add('is-expanded');
  document.body.classList.add('globe-expanded');
  updateFullscreenLabel();
});
document.addEventListener('fullscreenchange', updateFullscreenLabel);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && globeView.classList.contains('is-expanded') && !globeView.querySelector('dialog[open]')) {
    void leaveFullscreen();
  }
});

function showGlobe() {
  if (document.fullscreenElement === globeView || globeView.classList.contains('is-expanded')) return;
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

function addListItem(title: string, subtitle: string, href: string, location: Coordinates) {
  const article = node('article', 'index-entry');
  const titleLink = link(href, title, 'index-link');
  article.append(titleLink, node('p', 'index-meta', subtitle));
  if (globe) {
    const focus = node('button', 'locate', 'Locate');
    focus.type = 'button';
    focus.setAttribute('aria-label', `Locate ${title} on the globe`);
    focus.addEventListener('click', () => {
      interruptTransition();
      showGlobe();
      void globe.focus(location);
    });
    article.append(focus);
  }
  list.append(article);
}

function sourceLinks(sources: SourceLink[]) {
  const group = node('ul', 'journal-sources');
  for (const source of sources) {
    const item = node('li');
    const anchor = link(source.url, source.label);
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    item.append(anchor);
    group.append(item);
  }
  return group;
}

function renderJournalExtras() {
  const extras = byId('journal-extras');
  extras.replaceChildren();
  if (!privateJournal) return false;
  const groups = [
    { name: 'Photo collections', records: privateJournal.photoCollections },
    { name: 'Places to match', records: privateJournal.placeNotes },
  ];
  if (!transport.value || transport.value === 'flight') {
    groups.unshift({ name: 'Upcoming and incomplete flights', records: privateJournal.flightNotes });
  }
  for (const { name, records } of groups) {
    if (!records.length) continue;
    const section = node('details', 'journal-extras');
    section.open = !list.childElementCount;
    section.append(node('summary', '', `${name} (${records.length})`));
    for (const record of records) {
      const entry = node('article', 'index-entry');
      entry.append(node('h3', '', record.name), node('p', 'index-meta', record.description));
      if (record.note) entry.append(node('p', '', record.note));
      if (record.sources.length) entry.append(sourceLinks(record.sources));
      section.append(entry);
    }
    extras.append(section);
  }
  return Boolean(extras.childElementCount);
}

function renderOverview() {
  const showingJourneys = mode === 'journeys';
  placesButton.setAttribute('aria-pressed', String(!showingJourneys));
  journeysButton.setAttribute('aria-pressed', String(showingJourneys));
  overview.dataset.view = mode;
  journeyIndex.hidden = !showingJourneys;

  if (!showingJourneys) {
    const pins = cities.map(city => ({
      name: city.name, region: city.region, href: cityLink(city.id), coordinates: city.coordinates,
    }));
    globe?.setContent(pins, [], []);
    if (!globe) {
      byId('places-fallback').replaceChildren(...pins.map(pin => {
        const row = node('li');
        row.append(link(pin.href, pin.name));
        return row;
      }));
    }
    return;
  }

  byId('places-fallback').replaceChildren();
  list.replaceChildren();
  const visibleJourneys = journeys.filter(journey => !transport.value || journey.mode === transport.value);
  const arcs: Arc[] = [];
  const surfacePaths: Coordinates[][] = [];
  const pins: GlobePin[] = [];
  for (const journey of visibleJourneys) {
    const [first] = journey.stops;
    const last = journey.stops.at(-1)!;
    const href = journeyLink(journey.id);
    const date = journey.date ?? journey.year;
    addListItem(journey.name, [journeyMode[journey.mode], date, journey.evidence].filter(Boolean).join(' · '),
      href, first.coordinates);
    const description = `${journey.name} · ${date}`;
    pins.push({ name: first.name, href, coordinates: first.coordinates, description });
    if (first !== last) pins.push({ name: last.name, href, coordinates: last.coordinates, description });
    if (journey.mode === 'flight') {
      journey.stops.slice(1).forEach((stop, index) => arcs.push({
        from: journey.stops[index].coordinates, to: stop.coordinates,
      }));
    } else if (journey.stops.length > 1) {
      surfacePaths.push(journey.stops.map(stop => stop.coordinates));
    }
  }
  globe?.setContent(pins, arcs, surfacePaths);
  if (arcs.length || surfacePaths.length) {
    const legend = node('p', 'legend');
    if (arcs.length) legend.append(node('span', 'legend-flight', 'Flight'));
    if (surfacePaths.length) legend.append(node('span', 'legend-road', 'Approximate route between stops'));
    list.append(legend);
  }
  const hasJournalExtras = renderJournalExtras();
  if (!list.childElementCount && !hasJournalExtras) list.append(node('p', 'no-results', 'No journeys match this travel mode.'));
}

function detailHeading(label: string, title: string, metadata: string) {
  const group = node('header', 'detail-heading');
  const heading = node('h1', '', title);
  heading.tabIndex = -1;
  group.append(
    link(atlasUrl(), 'Back to the atlas', 'back-link'),
    node('p', 'eyebrow', label),
    heading,
    node('p', 'detail-meta', metadata),
  );
  return group;
}

async function attachMap(container: HTMLElement, stops: City['places'] | Journey['stops'], path: Coordinates[] | null, select: (index: number) => void) {
  try {
    const { mountMap } = await import('./map');
    if (!container.isConnected) return;
    map = mountMap(container, stops, path, select);
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
  detail.append(detailHeading(privateJournal ? 'Field journal' : 'Field journal · Sample entry', city.name, `${city.region} · ${coordinateLabel(city.coordinates)}`));
  const mapContainer = node('div', 'detail-map');
  detail.append(mapContainer);
  const entries = node('div', 'field-entries');
  for (const [index, place] of city.places.entries()) {
    const entry = node('article', 'field-entry');
    entry.id = place.id;
    const heading = node('h2');
    const select = node('button', 'place-select');
    select.type = 'button';
    select.append(node('span', 'entry-number', String(index + 1).padStart(2, '0')), node('span', '', place.name));
    select.addEventListener('click', () => pickPlace(index, false));
    heading.append(select);
    entry.append(heading);
    for (const visit of place.visits) {
      const note = node('div', 'visit');
      note.append(node('p', 'eyebrow', [visit.date, visit.evidence].filter(Boolean).join(' · ')),
        node('h3', '', visit.activity), node('p', '', visit.note));
      if (visit.sources?.length) note.append(sourceLinks(visit.sources));
      if (visit.photo) {
        const figure = node('figure', 'journal-photo');
        const image = node('img');
        image.src = visit.photo.src;
        image.alt = visit.photo.alt;
        image.width = visit.photo.width ?? 1050;
        image.height = visit.photo.height ?? 700;
        image.loading = 'lazy';
        const photoLink = link(visit.photo.src, '');
        photoLink.setAttribute('aria-label', `View larger image of ${place.name}`);
        photoLink.target = '_blank';
        photoLink.rel = 'noopener';
        photoLink.append(image);
        figure.append(photoLink, node('figcaption', 'eyebrow', visit.photo.caption));
        note.append(figure);
      }
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
  detail.append(detailHeading(privateJournal ? 'Itinerary' : 'Itinerary · Sample journey', journey.name,
    [journeyMode[journey.mode], journey.date ?? journey.year, journey.evidence].filter(Boolean).join(' · ')));
  if (journey.note) detail.append(node('p', '', journey.note));
  if (journey.sources?.length) detail.append(sourceLinks(journey.sources));
  if (journey.mode !== 'flight') {
    const container = node('div', 'detail-map');
    const path = journey.stops.length > 1 ? journey.stops.map(stop => stop.coordinates) : null;
    detail.append(container);
    if (path) detail.append(node('p', 'eyebrow map-caption', 'Approximate line between stops'));
    void attachMap(container, journey.stops, path,
      index => scrollToEntry(detail.querySelectorAll('.itinerary > li')[index]),
    );
  }
  const stops = node('ol', 'itinerary');
  for (const stop of journey.stops) {
    const entry = node('li');
    entry.append(node('h2', '', stop.name), node('p', 'eyebrow', coordinateLabel(stop.coordinates)));
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
    if (nextDetail && globeView.classList.contains('is-expanded')) void leaveFullscreen();
    map?.hide();
    map = undefined;
    detail.replaceChildren();
    overview.hidden = Boolean(nextDetail);
    detail.hidden = !nextDetail;
    if (city) showCity(city);
    else if (journey) showJourney(journey);
    if (moveFocus) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const viewButton = mode === 'journeys' ? journeysButton : placesButton;
      (nextDetail ? detail.querySelector('h1') : viewButton)?.focus({ preventScroll: true });
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
    if (changed && returnCamera) {
      void globe?.moveTo(returnCamera);
      returnCamera = undefined;
    }
    if (animateChange) reveal(overview);
  }
}

function switchMode(value: typeof mode) {
  if (mode === value) return;
  interruptTransition();
  history.pushState(null, '', atlasUrl({ view: value === 'places' ? '' : value }));
  renderRoute();
  if (mode === 'journeys' && !reducedMotion.matches) reveal(journeyIndex, 0, 300);
}

async function openAtlasLink(anchor: HTMLAnchorElement) {
  if (anchor.href === location.href) return;
  interruptTransition();
  const { city, journey } = readDestination(new URL(anchor.href).searchParams);
  const target = city?.coordinates ?? globe?.markerLocation(anchor) ?? journey?.stops[0]?.coordinates;
  const fromOverview = !overview.hidden;
  const before = fromOverview ? globe?.camera() : undefined;
  if (globe && fromOverview && target) {
    if (city || (journey && journey.mode !== 'flight')) void import('./map').catch(() => {});
    showGlobe();
    if (!(await globe.focus(target, true))) return;
  }

  if (!reducedMotion.matches && (!fromOverview || target)) {
    const fade = (fromOverview ? overview : detail).animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 175, fill: 'forwards', easing: 'ease-in' },
    );
    departure = fade;
    if (!(await fade.finished.then(() => true, () => false))) return;
  }

  if (before && target) returnCamera = before;
  await leaveFullscreen();
  history.pushState(null, '', anchor.href);
  departure?.cancel();
  departure = undefined;
  renderRoute(true, true);
}

placesButton.addEventListener('click', () => switchMode('places'));
journeysButton.addEventListener('click', () => switchMode('journeys'));
transport.addEventListener('change', () => {
  interruptTransition();
  renderOverview();
  if (!reducedMotion.matches) reveal(list, 0, 300);
});
document.addEventListener('click', event => {
  const anchor = event.target instanceof Element ? event.target.closest('a') : null;
  if (!anchor || event.defaultPrevented || event.button || event.ctrlKey || event.metaKey ||
      event.shiftKey || event.altKey || anchor.target || anchor.origin !== location.origin ||
      anchor.pathname !== '/') return;
  if (anchor.hash) {
    interruptTransition();
    return;
  }
  if (!atlas.contains(anchor)) return;
  event.preventDefault();
  void openAtlasLink(anchor);
});
window.addEventListener('popstate', () => {
  interruptTransition();
  if (location.search !== renderedSearch) renderRoute(!location.hash, true);
});

async function start() {
  if (import.meta.env.DEV) privateJournal = await loadPrivateJournal();
  if (privateJournal) {
    cities = privateJournal.cities;
    journeys = privateJournal.journeys;
    if (journeys.some(journey => journey.mode === 'rail')) transport.add(new Option('Trains', 'rail'));
    if (journeys.some(journey => journey.mode === 'cruise')) transport.add(new Option('Cruises', 'cruise'));
    byId('journal-label').textContent = 'Private journal · Local preview';
  }
  renderRoute();
}

void start();
