import type { AtlasPhoto, City, Coordinates, Journey, Stop } from './data';

interface VisitRecord {
  cityId: string;
  city: string;
  region: string;
  cityCoordinates: Coordinates;
  placeId: string;
  place: string;
  placeCoordinates: Coordinates;
  startDate: string;
  endDate: string | null;
  activity: string;
  note: string;
}

export interface CuratedPhoto extends AtlasPhoto {
  cityId: string;
  placeId: string;
  startDate: string;
}

interface SurfaceJourney extends Omit<Journey, 'year' | 'date' | 'mode'> {
  mode: Exclude<Journey['mode'], 'flight'>;
  startDate: string;
  endDate: string | null;
}

interface Journal {
  airports: Record<string, Stop>;
  flights: {
    id: string;
    trip: string;
    date: string | null;
    origin: string | null;
    destination: string;
    flightNumber: string | null;
    evidence: string;
    note?: string;
  }[];
  visits: VisitRecord[];
  surfaceJourneys?: SurfaceJourney[];
  groundJourneys?: SurfaceJourney[];
}

const formatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

function formatDateRange(start: string, end?: string | null) {
  return end && start !== end ? formatter.formatRange(new Date(start), new Date(end)) : formatter.format(new Date(start));
}

function copyStop({ name, coordinates, cityId }: Stop): Stop {
  return { name, coordinates, cityId };
}

function visitKey({ cityId, placeId, startDate }: Pick<VisitRecord, 'cityId' | 'placeId' | 'startDate'>) {
  return JSON.stringify([cityId, placeId, startDate]);
}

export function atlasPreview(journal: Journal, curatedPhotos: CuratedPhoto[] = []) {
  const photosByVisit = new Map<string, AtlasPhoto[]>();
  for (const selected of curatedPhotos) {
    const key = visitKey(selected);
    const { file, alt, caption, width, height } = selected;
    const photo = { file, alt, caption, width, height };
    const photos = photosByVisit.get(key);
    if (photos) photos.push(photo);
    else photosByVisit.set(key, [photo]);
  }
  const cities = new Map<string, City>();
  for (const record of journal.visits) {
    let city = cities.get(record.cityId);
    if (!city) {
      city = { id: record.cityId, name: record.city, region: record.region, coordinates: record.cityCoordinates, places: [] };
      cities.set(city.id, city);
    }
    let place = city.places.find(place => place.id === record.placeId);
    if (!place) {
      place = { id: record.placeId, name: record.place, coordinates: record.placeCoordinates, visits: [] };
      city.places.push(place);
    }
    place.visits.push({
      year: Number(record.startDate.slice(0, 4)),
      date: formatDateRange(record.startDate, record.endDate),
      activity: record.activity,
      note: record.note,
      photos: photosByVisit.get(visitKey(record)),
    });
  }

  const journeys: Journey[] = (journal.surfaceJourneys ?? journal.groundJourneys ?? []).map(journey => ({
    id: journey.id,
    name: journey.name,
    mode: journey.mode,
    note: journey.note,
    stops: journey.stops.map(copyStop),
    year: Number(journey.startDate.slice(0, 4)),
    date: formatDateRange(journey.startDate, journey.endDate),
  }));
  for (const flight of journal.flights) {
    if (!flight.origin || !flight.date || flight.evidence === 'upcoming') continue;
    const codes = [flight.origin, flight.destination];
    if (!codes.every(code => journal.airports[code])) continue;
    journeys.push({
      id: flight.id,
      name: codes.join(' → ') + (flight.flightNumber ? ` · ${flight.flightNumber}` : ''),
      year: Number(flight.date.slice(0, 4)),
      mode: 'flight',
      date: formatDateRange(flight.date),
      note: [flight.trip, flight.note].filter(Boolean).join(' · '),
      stops: codes.map(code => {
        const stop = copyStop(journal.airports[code]);
        return { ...stop, name: `${stop.name} (${code})` };
      }),
    });
  }

  return { cities: [...cities.values()], journeys };
}
