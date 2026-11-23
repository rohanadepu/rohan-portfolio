export type Coordinates = [latitude: number, longitude: number];

export interface SourceLink {
  label: string;
  url: string;
}

export interface Visit {
  year: number;
  date: string;
  activity: string;
  note: string;
  photo?: { src: string; alt: string; caption: string; width?: number; height?: number };
  evidence?: string;
  sources?: SourceLink[];
}

export interface Place {
  id: string;
  name: string;
  coordinates: Coordinates;
  visits: Visit[];
}

export interface City {
  id: string;
  name: string;
  region: string;
  coordinates: Coordinates;
  places: Place[];
}

export interface Stop {
  name: string;
  coordinates: Coordinates;
  cityId?: string;
}

export interface Journey {
  id: string;
  name: string;
  year: number;
  mode: 'flight' | 'drive' | 'rail' | 'cruise';
  stops: Stop[];
  date?: string;
  evidence?: string;
  note?: string;
  sources?: SourceLink[];
}

export const cities: City[] = [
  {
    id: 'kyoto', name: 'Kyoto', region: 'Japan', coordinates: [35.0116, 135.7681],
    places: [
      {
        id: 'higashiyama', name: 'Higashiyama', coordinates: [34.9983, 135.7805],
        visits: [{
          year: 2024, date: 'April 2024', activity: 'Early morning walk',
          note: 'Follow the stone lanes uphill past wooden storefronts to the Yasaka Pagoda.',
          photo: { src: '/atlas-images/kyoto.jpg', alt: 'A stone lane facing Yasaka Pagoda in Kyoto', caption: 'Illustration of Higashiyama' },
        }],
      },
      {
        id: 'nishiki', name: 'Nishiki Market', coordinates: [35.0050, 135.7649],
        visits: [
          { year: 2024, date: 'April 2024', activity: 'Market lunch', note: 'A walk past stalls of pickles, grilled seafood, and sweets in the covered market.' },
          { year: 2025, date: 'Spring 2025', activity: 'Second visit', note: 'Return to the market for tea and a slower walk through the arcade.' },
        ],
      },
      {
        id: 'fushimi-inari', name: 'Fushimi Inari', coordinates: [34.9671, 135.7727],
        visits: [{ year: 2024, date: 'April 2024', activity: 'Shrine walk', note: 'Take the hillside path through the torii gates above the main shrine.' }],
      },
    ],
  },
  {
    id: 'san-francisco', name: 'San Francisco', region: 'California, USA', coordinates: [37.7749, -122.4194],
    places: [{
      id: 'lands-end', name: 'Lands End', coordinates: [37.7818, -122.5000],
      visits: [{ year: 2025, date: 'June 2025', activity: 'Coastal hike', note: 'Walk the bluffs above the Golden Gate and stop at the old Sutro Baths.' }],
    }],
  },
  {
    id: 'yosemite', name: 'Yosemite Valley', region: 'California, USA', coordinates: [37.7459, -119.5936],
    places: [{
      id: 'tunnel-view', name: 'Tunnel View', coordinates: [37.7157, -119.6774],
      visits: [{ year: 2025, date: 'June 2025', activity: 'Scenic overlook', note: 'The valley opens up to views of El Capitan, Bridalveil Fall, and Half Dome.' }],
    }],
  },
];

export const journeys: Journey[] = [
  {
    id: 'pacific-flight', name: 'Across the Pacific', year: 2024, mode: 'flight',
    stops: [
      { name: 'San Francisco (SFO)', coordinates: [37.6213, -122.3790], cityId: 'san-francisco' },
      { name: 'Tokyo (HND)', coordinates: [35.5494, 139.7798] },
    ],
  },
  {
    id: 'yosemite-road-trip', name: 'To Yosemite Valley', year: 2025, mode: 'drive',
    stops: [
      { name: 'San Francisco', coordinates: [37.7749, -122.4194], cityId: 'san-francisco' },
      { name: 'Groveland', coordinates: [37.8389, -120.2327] },
      { name: 'Yosemite Valley', coordinates: [37.7459, -119.5936], cityId: 'yosemite' },
    ],
  },
];

export function coordinateLabel([latitude, longitude]: Coordinates): string {
  return `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? 'N' : 'S'} · ${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? 'E' : 'W'}`;
}
