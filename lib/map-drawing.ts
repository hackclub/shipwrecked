import {Icon, latLng, LatLng} from 'leaflet';
import {IconConfig} from '@/lib/map-theme';

const toRadians = (degrees: number): number => degrees * Math.PI / 180;
const toDegrees = (radians: number): number => radians * 180 / Math.PI;

function toCartesian(coord: LatLng): { x: number; y: number; z: number } {
  const latRad = toRadians(coord.lat);
  const lngRad = toRadians(coord.lng);
  return {
    x: Math.cos(latRad) * Math.cos(lngRad),
    y: Math.cos(latRad) * Math.sin(lngRad),
    z: Math.sin(latRad)
  };
}

function toGeographic(cartesian: { x: number; y: number; z: number }): LatLng {
  return latLng(
    toDegrees(Math.asin(cartesian.z)),
    toDegrees(Math.atan2(cartesian.y, cartesian.x))
  );
}

export function getIntermediatePoint(p1: LatLng, p2: LatLng, fraction: number): LatLng {
  const v1 = toCartesian(p1);
  const v2 = toCartesian(p2);

  const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const omega = Math.acos(Math.max(-1, Math.min(1, dotProduct))); // Angle between vectors

  if (omega === 0) return p1; // Points are identical

  const sinOmega = Math.sin(omega);
  const a = Math.sin((1 - fraction) * omega) / sinOmega;
  const b = Math.sin(fraction * omega) / sinOmega;

  const interpolatedVector = {
    x: a * v1.x + b * v2.x,
    y: a * v1.y + b * v2.y,
    z: a * v1.z + b * v2.z
  };

  return toGeographic(interpolatedVector);
}

export function generateGreatCirclePoints(p1: LatLng, p2: LatLng, numPoints: number = 100): L.LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    const pt = getIntermediatePoint(p1, p2, fraction);

    // Unwrap longitudes to prevent Leaflet from drawing a line across the entire map.
    if (i > 0) {
      const lastLon = points[points.length - 1].lng;
      // If the longitude jump is > 180°, adjust it by 360°.
      while (pt.lng - lastLon > 180) {
        pt.lng -= 360;
      }
      while (lastLon - pt.lng > 180) {
        pt.lng += 360;
      }
    }
    points.push(latLng(pt.lat, pt.lng));
  }
  return points;
}

export function getBezierPoint(p0: LatLng, p1: LatLng, p2: LatLng, t: number): LatLng {
  const oneMinusT = 1 - t;
  const t2 = t * t;
  const oneMinusT2 = oneMinusT * oneMinusT;

  const lat = oneMinusT2 * p0.lat + 2 * oneMinusT * t * p1.lat + t2 * p2.lat;
  const lng = oneMinusT2 * p0.lng + 2 * oneMinusT * t * p1.lng + t2 * p2.lng;

  return latLng(lat, lng);
}

export function generateBezierPoints(p0: LatLng, p1: LatLng, p2: LatLng, numPoints: number = 100): L.LatLng[] {
  const points: L.LatLng[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const pt = getBezierPoint(p0, p1, p2, t);
    points.push(latLng(pt.lat, pt.lng));
  }
  return points;
}

export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  /* Utility function to calculate the bearing between two geographic coordinates. */
  const toRadians = (deg: number) => deg * Math.PI / 180;
  const toDegrees = (rad: number) => rad * 180 / Math.PI;

  const lat1Rad = toRadians(lat1);
  const lng1Rad = toRadians(lng1);
  const lat2Rad = toRadians(lat2);
  const lng2Rad = toRadians(lng2);

  const deltaLon = lng2Rad - lng1Rad;

  const y = Math.sin(deltaLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLon);

  const bearingRad = Math.atan2(y, x);
  const bearingDeg = toDegrees(bearingRad);

  return (bearingDeg + 360) % 360;
}

export interface IconState {
  flip?: boolean;  // Indicates if the icon should be flipped horizontally after rotation
  rotate?: number;  // Rotation angle in degrees
}

export function makeIcon(config: IconConfig, state: IconState, flip: boolean): Icon {
  let iconUrl = config.main;
  if (flip && config.flipped) {
    iconUrl = config.flipped;
  }
  return new Icon({
    iconUrl,
    iconSize: config.size,
    iconAnchor: config.anchor,
    popupAnchor: config.popupAnchor,
    iconRotate: config.rotate
  });
}