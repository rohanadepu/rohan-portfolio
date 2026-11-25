import type { City, Coordinates, Journey, Stop } from './data';

const hongKong: Coordinates = [22.307, 114.183];
const paris: Coordinates = [48.858, 2.353];
const cancun: Coordinates = [21.17, -86.83];

const newCities: City[] = [
  {
    id: 'hong-kong', name: 'Hong Kong', region: 'Hong Kong SAR, China', coordinates: hongKong,
    places: [{
      id: 'hong-kong', name: 'Hong Kong', coordinates: hongKong,
      visits: [{ year: 2026, date: '2026', activity: 'Hong Kong', note: 'The first stop on the route through China, before taking the train to Shenzhen.' }],
    }],
  },
  {
    id: 'paris', name: 'Paris', region: 'Île-de-France, France', coordinates: paris,
    places: [{
      id: 'paris', name: 'Paris', coordinates: paris,
      visits: [{ year: 2019, date: '2019', activity: 'Paris', note: 'A stop in France before continuing to Rome.' }],
    }],
  },
  {
    id: 'cancun', name: 'Cancún', region: 'Quintana Roo, Mexico', coordinates: cancun,
    places: [{
      id: 'cancun', name: 'Cancún', coordinates: cancun,
      visits: [{ year: 2021, date: '2021', activity: 'Cancún', note: 'On the Caribbean coast of Mexico’s Yucatán Peninsula.' }],
    }],
  },
];

const hongKongStop: Stop = { name: 'Hong Kong', cityId: 'hong-kong', coordinates: hongKong };
const shenzhen: Stop = { name: 'Shenzhen', cityId: 'shenzhen', coordinates: [22.543, 114.058] };
const zhangjiajie: Stop = { name: 'Zhangjiajie', cityId: 'zhangjiajie', coordinates: [29.117, 110.479] };
const chongqing: Stop = { name: 'Chongqing', cityId: 'chongqing', coordinates: [29.563, 106.551] };
const chengdu: Stop = { name: 'Chengdu', cityId: 'chengdu', coordinates: [30.573, 104.067] };
const shanghai: Stop = { name: 'Shanghai', cityId: 'shanghai', coordinates: [31.23, 121.474] };
const beijing: Stop = { name: 'Beijing', cityId: 'beijing', coordinates: [39.904, 116.407] };

const railLegs = [
  [hongKongStop, shenzhen], [shenzhen, zhangjiajie], [zhangjiajie, chongqing],
  [chongqing, chengdu], [shanghai, beijing],
];

const updatedFlights = [
  { codes: ['CTU', 'PVG'], name: 'Chengdu → Shanghai', cities: ['chengdu', 'shanghai'], year: 2026 },
  { codes: ['PKX', 'ICN'], name: 'Beijing → Seoul', cities: ['beijing', 'seoul'], year: 2026 },
  { codes: ['CLT', 'CDG'], name: 'Charlotte → Paris', cities: [undefined, 'paris'], year: 2019 },
  { codes: ['CDG', 'FCO'], name: 'Paris → Rome', cities: ['paris', 'rome'], year: 2019 },
];

export function updateCities(cities: City[]) {
  const combined = new Map(newCities.map(city => [city.id, city]));
  for (const city of cities) {
    if (city.id !== 'vancouver') {
      combined.set(city.id, city);
      continue;
    }
    const oldName = 'University Endowment Lands';
    const name = 'University of British Columbia (UBC)';
    combined.set(city.id, {
      ...city,
      places: city.places.map(place => place.id !== 'university-endowment-lands' ? place : {
        ...place,
        name,
        visits: place.visits.map(visit => ({
          ...visit,
          activity: visit.activity.replaceAll(oldName, 'UBC'),
          note: visit.note.replaceAll(oldName, 'UBC'),
          photos: visit.photos?.map(photo => ({ ...photo, alt: photo.alt.replaceAll(oldName, 'UBC') })),
        })),
      }),
    });
  }
  return [...combined.values()];
}

export function updateJourneys(journeys: Journey[]) {
  const linked = journeys.map(journey => {
    if (journey.mode !== 'flight') return journey;
    const match = updatedFlights.find(flight => flight.year === journey.year && journey.stops.length === 2 &&
      flight.codes.every((code, index) => journey.stops[index].name.endsWith(`(${code})`)));
    return match ? {
      ...journey,
      name: match.name,
      stops: journey.stops.map((stop, index) => ({ ...stop, cityId: match.cities[index] ?? stop.cityId })),
    } : journey;
  });
  const rail: Journey[] = railLegs.map(([from, to]) => ({
    id: `rail-${from.cityId}-${to.cityId}`, name: `${from.name} → ${to.name}`,
    year: 2026, mode: 'rail', stops: [from, to],
  }));
  return [...linked, ...rail];
}
