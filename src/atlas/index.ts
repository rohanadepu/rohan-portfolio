import '../status';
import type { Arc } from 'cobe';
import { cities, journeys, coordinateLabel, type City, type Coordinates, type Journey } from './data';
import { setupGlobe } from './globe';
import type { mountMap } from './map';

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

const overview = byId('overview');
const detail = byId('detail');
const list = byId('atlas-list');
const search = byId<HTMLInputElement>('place-search');
const year = byId<HTMLSelectElement>('year-filter');
const transport = byId<HTMLSelectElement>('transport');
const placesButton = byId<HTMLButtonElement>('places-mode');
const journeysButton = byId<HTMLButtonElement>('journeys-mode');
const globe = setupGlobe(byId('globe'), byId('roads'), byId('globe-pins'), {
  zoomIn: byId('zoom-in'), zoomOut: byId('zoom-out'), reset: byId('reset'),
});
if (!globe) {
  byId('globe-view').hidden = true;
  byId('globe-fallback').hidden = false;
}

const availableYears = new Set([
  ...cities.flatMap(city => city.places.flatMap(place => place.visits.map(visit => visit.year))),
  ...journeys.map(journey => journey.year),
]);
[...availableYears].sort((a, b) => b - a).forEach(value => year.add(new Option(String(value), String(value))));

let mode: 'places' | 'journeys' = 'places';
let currentDetail = '';
let map: ReturnType<typeof mountMap> | undefined;
let selectedPlace = '';

function atlasUrl(values: Record<string, string> = {}) {
  const params = new URLSearchParams();
  if (mode === 'journeys') params.set('view', mode);
  if (year.value) params.set('year', year.value);
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  const query = params.toString();
  return query ? `/atlas/?${query}` : '/atlas/';
}

function cityLink(id: string, place = '') {
  return atlasUrl({ city: id, place });
}

function journeyLink(id: string) {
  return atlasUrl({ view: 'journeys', journey: id });
}

function addListItem(title: string, subtitle: string, href: string, location: Coordinates, children: HTMLElement[] = []) {
  const article = node('article', 'index-entry');
  const titleLink = link(href, title, 'index-link');
  article.append(titleLink, node('p', 'index-meta', subtitle));
  if (globe) {
    const focus = node('button', 'locate', 'Locate');
    focus.type = 'button';
    focus.setAttribute('aria-label', `Locate ${title} on the globe`);
    focus.addEventListener('click', () => globe.focus(location));
    article.append(focus);
  }
  article.append(...children);
  list.append(article);
}

function renderOverview() {
  placesButton.setAttribute('aria-pressed', String(mode === 'places'));
  journeysButton.setAttribute('aria-pressed', String(mode === 'journeys'));
  byId('index-title').textContent = mode === 'places' ? 'Places' : 'Journeys';
  byId('places-filter').hidden = mode !== 'places';
  byId('journeys-filter').hidden = mode !== 'journeys';
  list.replaceChildren();

  if (mode === 'places') {
    const query = search.value.trim().toLocaleLowerCase();
    const visibleCities = cities.flatMap(city => {
      const namedCity = `${city.name} ${city.region}`.toLocaleLowerCase().includes(query);
      const places = city.places.filter(place => place.visits.some(visit =>
        (!year.value || String(visit.year) === year.value) && (namedCity ||
          `${place.name} ${visit.activity} ${visit.note}`.toLocaleLowerCase().includes(query)),
      ));
      return places.length ? [{ ...city, places }] : [];
    });
    globe?.setContent(visibleCities.map(city => ({
      name: city.name, href: cityLink(city.id), coordinates: city.coordinates,
    })), [], []);
    for (const city of visibleCities) {
      const children = query ? city.places.map(place => link(cityLink(city.id, place.id), place.name, 'index-place')) : [];
      const count = city.places.length;
      addListItem(city.name, `${city.region} · ${count} ${count === 1 ? 'place' : 'places'}`, cityLink(city.id), city.coordinates, children);
    }
  } else {
    const visibleJourneys = journeys.filter(journey =>
      (!year.value || String(journey.year) === year.value) &&
      (!transport.value || journey.mode === transport.value),
    );
    const arcs: Arc[] = [];
    const roads: Coordinates[][] = [];
    const pins = [];
    for (const journey of visibleJourneys) {
      const [first] = journey.stops;
      const last = journey.stops.at(-1)!;
      addListItem(journey.name, `${journey.mode === 'flight' ? 'Flight' : 'Road trip'} · ${journey.year}`,
        journeyLink(journey.id), first.coordinates);
      pins.push(
        { name: first.name, href: journeyLink(journey.id), coordinates: first.coordinates },
        { name: last.name, href: journeyLink(journey.id), coordinates: last.coordinates },
      );
      if (journey.mode === 'flight') {
        journey.stops.slice(1).forEach((stop, index) => arcs.push({
          from: journey.stops[index].coordinates, to: stop.coordinates,
        }));
      } else {
        roads.push(journey.stops.map(stop => stop.coordinates));
      }
    }
    globe?.setContent(pins, arcs, roads);
    if (visibleJourneys.length) {
      const legend = node('p', 'legend');
      if (arcs.length) legend.append(node('span', 'legend-flight', 'Flight'));
      if (roads.length) legend.append(node('span', 'legend-road', 'Approximate drive'));
      list.append(legend);
    }
  }
  if (!list.childElementCount) list.append(node('p', 'no-results', 'No entries match these filters.'));
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
    updatePlaceSelection(false, false);
  } catch {
    if (container.isConnected) {
      container.replaceChildren(node('p', 'unavailable', 'The map is unavailable. You can still browse the entries below.'));
    }
  }
}

function updatePlaceSelection(center: boolean, scroll: boolean) {
  const entries = [...detail.querySelectorAll<HTMLElement>('.field-entry')];
  const index = entries.findIndex(entry => entry.id === selectedPlace);
  entries.forEach((entry, i) => {
    entry.classList.toggle('selected', i === index);
    entry.querySelector('.place-select')?.setAttribute('aria-pressed', String(i === index));
  });
  map?.select(index, center);
  if (scroll) entries[index]?.scrollIntoView({ block: 'nearest' });
}

function showCity(city: City) {
  detail.append(detailHeading('Field journal · Sample entry', city.name, `${city.region} · ${coordinateLabel(city.coordinates)}`));
  const mapContainer = node('div', 'detail-map');
  detail.append(mapContainer);
  const entries = node('div', 'field-entries');
  const visiblePlaces = year.value
    ? city.places.filter(place => place.visits.some(visit => String(visit.year) === year.value))
    : city.places;
  for (const [index, place] of visiblePlaces.entries()) {
    const entry = node('article', 'field-entry');
    entry.id = place.id;
    const heading = node('h2');
    const select = node('button', 'place-select');
    select.type = 'button';
    select.append(node('span', 'entry-number', String(index + 1).padStart(2, '0')), node('span', '', place.name));
    select.addEventListener('click', () => pickPlace(index, false));
    heading.append(select);
    entry.append(heading);
    for (const visit of place.visits.filter(visit => !year.value || String(visit.year) === year.value)) {
      const note = node('div', 'visit');
      note.append(node('p', 'eyebrow', visit.date), node('h3', '', visit.activity), node('p', '', visit.note));
      if (visit.photo) {
        const figure = node('figure', 'journal-photo');
        const image = node('img');
        image.src = visit.photo.src;
        image.alt = visit.photo.alt;
        image.width = 1050;
        image.height = 700;
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
    const place = visiblePlaces[index];
    if (!place) return;
    selectedPlace = place.id;
    history.replaceState(null, '', cityLink(city.id, place.id));
    updatePlaceSelection(true, scroll);
  }
  if (!visiblePlaces.length) {
    mapContainer.remove();
    entries.append(node('p', 'no-results', 'No visits are listed for this city in the selected year.'));
  } else {
    void attachMap(mapContainer, visiblePlaces, null, index => pickPlace(index, true));
  }
  detail.append(entries);
}

function showJourney(journey: Journey) {
  const isDrive = journey.mode === 'drive';
  detail.append(detailHeading('Itinerary · Sample journey', journey.name, `${isDrive ? 'Road trip' : 'Flight'} · ${journey.year}`));
  if (isDrive) {
    const container = node('div', 'detail-map');
    detail.append(container, node('p', 'eyebrow map-caption', 'Approximate line between stops'));
    void attachMap(container, journey.stops, journey.stops.map(stop => stop.coordinates),
      index => detail.querySelectorAll('li')[index]?.scrollIntoView({ block: 'nearest' }),
    );
  }
  const stops = node('ol', 'itinerary');
  for (const stop of journey.stops) {
    const entry = node('li');
    entry.append(node('h2', '', stop.name), node('p', 'eyebrow', coordinateLabel(stop.coordinates)));
    if (stop.cityId) entry.append(link(atlasUrl({ city: stop.cityId, year: '' }), 'Open field journal'));
    stops.append(entry);
  }
  detail.append(stops);
}

function renderRoute(moveFocus = false) {
  const params = new URLSearchParams(location.search);
  mode = params.get('view') === 'journeys' ? 'journeys' : 'places';
  const selectedYear = params.get('year') ?? '';
  year.value = availableYears.has(Number(selectedYear)) ? selectedYear : '';
  const city = cities.find(city => city.id === params.get('city'));
  const journey = journeys.find(journey => journey.id === params.get('journey'));
  const nextDetail = city ? `city-${city.id}-${year.value}` : journey ? `journey-${journey.id}` : '';
  selectedPlace = params.get('place') ?? '';

  if (nextDetail !== currentDetail) {
    currentDetail = nextDetail;
    map?.hide();
    map = undefined;
    detail.replaceChildren();
    overview.hidden = Boolean(nextDetail);
    detail.hidden = !nextDetail;
    if (city) showCity(city);
    else if (journey) showJourney(journey);
    if (moveFocus) {
      window.scrollTo(0, 0);
      (nextDetail ? detail.querySelector('h1') : byId('atlas-title'))?.focus({ preventScroll: true });
    }
  }
  if (nextDetail) updatePlaceSelection(false, Boolean(selectedPlace));
  else renderOverview();
}

function switchMode(value: typeof mode) {
  if (mode === value) return;
  history.pushState(null, '', atlasUrl({ view: value === 'places' ? '' : value }));
  renderRoute();
}

placesButton.addEventListener('click', () => switchMode('places'));
journeysButton.addEventListener('click', () => switchMode('journeys'));
search.addEventListener('input', renderOverview);
transport.addEventListener('change', renderOverview);
year.addEventListener('change', () => {
  history.replaceState(null, '', atlasUrl());
  renderRoute();
});
document.addEventListener('click', event => {
  const anchor = event.target instanceof Element ? event.target.closest('a') : null;
  if (!anchor || event.defaultPrevented || event.button || event.ctrlKey || event.metaKey ||
      event.shiftKey || event.altKey || anchor.target || anchor.origin !== location.origin ||
      anchor.pathname !== '/atlas/') return;
  event.preventDefault();
  if (anchor.href !== location.href) history.pushState(null, '', anchor.href);
  renderRoute(true);
});
window.addEventListener('popstate', () => renderRoute(true));

renderRoute();
