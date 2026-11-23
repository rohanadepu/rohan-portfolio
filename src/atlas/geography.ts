import type { Coordinates } from './data';

type Vector = [x: number, y: number, z: number];
export type MapPosition = [longitude: number, latitude: number];

const radians = Math.PI / 180;
const wrapNear = (longitude: number, reference: number) => longitude + 360 * Math.round((reference - longitude) / 360);

export function unitVector([latitude, longitude]: Coordinates): Vector {
  const lat = latitude * radians;
  const lon = longitude * radians;
  return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
}

export function vectorCoordinates([x, y, z]: Vector): Coordinates {
  return [Math.atan2(z, Math.hypot(x, y)) / radians, Math.atan2(y, x) / radians];
}

function flightSegment(from: Coordinates, to: Coordinates): Coordinates[] {
  const [startX, startY, startZ] = unitVector(from);
  const [endX, endY, endZ] = unitVector(to);
  const dot = startX * endX + startY * endY + startZ * endZ;
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
  const sine = Math.sin(angle);
  const steps = Math.ceil(angle / (5 * radians));
  const segment: Coordinates[] = [from];
  for (let index = 1; index < steps; index++) {
    const fraction = index / steps;
    if (sine < 1e-8) {
      const targetLongitude = wrapNear(to[1], from[1]);
      segment.push([from[0] + (to[0] - from[0]) * fraction, from[1] + (targetLongitude - from[1]) * fraction]);
      continue;
    }
    const startWeight = Math.sin((1 - fraction) * angle) / sine;
    const endWeight = Math.sin(fraction * angle) / sine;
    segment.push(vectorCoordinates([
      startWeight * startX + endWeight * endX,
      startWeight * startY + endWeight * endY,
      startWeight * startZ + endWeight * endZ,
    ]));
  }
  return segment;
}

export function routePath(stops: Coordinates[], flight: boolean) {
  const points = flight
    ? stops.flatMap((stop, index) => index < stops.length - 1 ? flightSegment(stop, stops[index + 1]) : [stop])
    : stops;
  const normalized: MapPosition[] = points.map(([lat, lon]) => [wrapNear(lon, 0), Math.max(-85, Math.min(85, lat))]);
  const lines: MapPosition[][] = [[normalized[0]]];
  const bounds: MapPosition[] = [normalized[0]];
  for (let index = 1; index < normalized.length; index++) {
    const [longitude, latitude] = normalized[index];
    const [previousLon, previousLat] = normalized[index - 1];
    if (Math.abs(longitude - previousLon) > 180) {
      const edge = longitude < previousLon ? 180 : -180;
      const nearbyLongitude = wrapNear(longitude, previousLon);
      const fraction = nearbyLongitude === previousLon ? 0 : (edge - previousLon) / (nearbyLongitude - previousLon);
      const crossingLatitude = previousLat + (latitude - previousLat) * fraction;
      lines.at(-1)!.push([edge, crossingLatitude]);
      lines.push([[-edge, crossingLatitude]]);
    }
    lines.at(-1)!.push([longitude, latitude]);
    bounds.push([wrapNear(longitude, bounds[index - 1][0]), latitude]);
  }
  return { lines, bounds };
}
