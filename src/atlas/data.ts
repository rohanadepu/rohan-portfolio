export type Coordinates = [latitude: number, longitude: number];

export interface AtlasPhoto {
  file: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface Visit {
  year: number;
  date: string;
  activity: string;
  note: string;
  photos?: AtlasPhoto[];
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
  note?: string;
}

export function coordinateLabel([latitude, longitude]: Coordinates): string {
  return `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? 'N' : 'S'} · ${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? 'E' : 'W'}`;
}
