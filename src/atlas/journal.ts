import type { City, Coordinates, Journey, SourceLink, Stop } from './data';

interface Flight {
  id: string;
  trip: string;
  date: string | null;
  sourceDate?: string;
  origin: string | null;
  destination: string;
  flightNumber: string | null;
  evidence: keyof typeof flightEvidence;
  note?: string;
  sources: string[];
}

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
  evidence: keyof typeof visitEvidence;
  links: SourceLink[];
  photo?: { file: string; width: number; height: number };
}

interface PhotoCollection {
  name: string;
  startDate: string;
  endDate: string;
  mediaCount: number;
  url: string;
  shared: boolean;
  location?: string;
}

interface SurfaceJourney extends Omit<Journey, 'year' | 'date' | 'mode'> {
  mode: Exclude<Journey['mode'], 'flight'>;
  startDate: string;
  endDate: string | null;
}

interface Journal {
  airports: Record<string, Stop>;
  flights: Flight[];
  visits: VisitRecord[];
  photoCollections: PhotoCollection[];
  surfaceJourneys?: SurfaceJourney[];
  groundJourneys?: SurfaceJourney[];
  placeNotes?: { name: string; note: string }[];
}

const flightEvidence = {
  'post-flight': 'Post-flight evidence',
  'airport-evidence': 'Day-of-travel evidence',
  'trip-corroborated': 'Trip corroborated',
  'check-in': 'Check-in or departure notice',
  booking: 'Booking found',
  upcoming: 'Upcoming booking',
  'route-incomplete': 'Route incomplete',
  'user-confirmed-route': 'You confirmed the itinerary endpoints',
};

const visitEvidence = {
  photo: 'Photo evidence',
  reservation: 'Reservation or ticket',
  'post-flight': 'Post-flight evidence',
  itinerary: 'Itinerary evidence',
  'user-reviewed': 'User-reviewed photo',
};

const formatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

function formatDate(date: string) {
  return formatter.format(new Date(date));
}

function formatDateRange(start: string, end: string | null) {
  return end && start !== end ? formatter.formatRange(new Date(start), new Date(end)) : formatDate(start);
}

export async function loadPrivateJournal() {
  if (!import.meta.env.DEV) return;
  try {
    const response = await fetch('/__atlas/journal', { cache: 'no-store' });
    if (!response.ok) return;
    const journal = await response.json() as Journal;
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
        evidence: visitEvidence[record.evidence],
        sources: record.links,
        photo: record.photo && {
          src: `/__atlas/photos/${record.photo.file}`,
          alt: `Travel photo from ${record.place}`,
          caption: 'Google Photos viewing copy',
          width: record.photo.width,
          height: record.photo.height,
        },
      });
    }

    const journeys: Journey[] = (journal.surfaceJourneys ?? journal.groundJourneys ?? []).map(({ startDate, endDate, ...journey }) => ({
      ...journey,
      year: Number(startDate.slice(0, 4)),
      date: formatDateRange(startDate, endDate),
    }));
    const flightNotes = [];
    for (const flight of journal.flights) {
      const codes = [flight.origin, flight.destination];
      const name = codes.map(code => code ?? 'Unknown origin').join(' → ');
      const evidence = flightEvidence[flight.evidence];
      const date = flight.date ? formatDate(flight.date) : `Email dated ${formatDate(flight.sourceDate!)}`;
      const sources = flight.sources.map((url, index) => ({ url, label: index === 0 ? 'Gmail source' : `Gmail source ${index + 1}` }));
      const description = [flight.flightNumber, date, evidence].filter(Boolean).join(' · ');
      if (!flight.origin || !flight.date || flight.evidence === 'upcoming') {
        flightNotes.push({
          name, description, note: flight.note, sources, year: Number((flight.date ?? flight.sourceDate)!.slice(0, 4)),
        });
        continue;
      }
      journeys.push({
        id: flight.id,
        name: flight.flightNumber ? `${name} · ${flight.flightNumber}` : name,
        year: Number(flight.date.slice(0, 4)),
        mode: 'flight',
        date,
        evidence,
        note: [flight.trip, flight.note].filter(Boolean).join(' · '),
        sources,
        stops: [flight.origin, flight.destination].map(code => ({
          ...journal.airports[code],
          name: `${journal.airports[code].name} (${code})`,
        })),
      });
    }

    const photoCollections = journal.photoCollections.map(collection => ({
      name: collection.name,
      description: [formatDateRange(collection.startDate, collection.endDate),
        `${collection.mediaCount.toLocaleString('en-US')} items`, collection.shared ? 'Shared album' : 'Personal album'].join(' · '),
      note: collection.location,
      sources: [{ label: 'Open in Google Photos', url: collection.url }],
      year: Number(collection.startDate.slice(0, 4)),
    }));

    const placeNotes = (journal.placeNotes ?? []).map(place => ({
      ...place,
      description: 'Photo match pending',
      sources: [],
      year: null,
    }));

    return { cities: [...cities.values()], journeys, flightNotes, photoCollections, placeNotes };
  } catch (error) {
    console.warn('Could not load local travel journal', error);
  }
}
