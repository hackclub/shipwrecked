import L, {LatLng} from 'leaflet';
import {generateBezierPoints, generateGreatCirclePoints} from '@/lib/map-drawing';

export type FlightStatus =
  | 'UPCOMING'  // Flight is scheduled to depart in the future
  | 'DEPARTING_SOON'  // Flight is scheduled to depart soon
  | 'IN_FLIGHT'  // Flight is currently in the air and arriving soon
  | 'ARRIVED'  // Flight has recently arrived at the destination
  | 'PAST_FLIGHT';  // Flight has already departed and arrived in the past
export type FlightRelation =  // Specific to one direction (that is, inbound or outbound)
  | 'SINGLE'  // No relations to other flights
  | 'CONNECTING_AFTER'  // This flight connects to another flight after it arrives
  | 'CONNECTING_BEFORE'  // This flight connects to another flight before it departs
  | 'CONNECTING_BOTH'  // This flight connects to another flight both before and after
export type FlightDirection =  // Direction of the flight(s)
  | 'INBOUND'  // Flight arriving at the destination
  | 'OUTBOUND';  // Flight departing from the origin
interface Location {
  airport: string;  // Airport name
  iata: string;  // IATA code
  departure_time?: number;  // Departure time in seconds since epoch, if this is the origin location
  actual_departure_time?: number;  // Actual departure time in seconds since epoch, if this is the origin location
  arrival_time?: number;  // Arrival time in seconds since epoch, if this is the destination location
  actual_arrival_time?: number;  // Actual arrival time in seconds since epoch, if this is the destination location
  coordinates: { lat: number, lng: number };  // Coordinates of the airport
}

interface SuccessfulServerData {
  airline: string;
  identifier: string;  // Flight number (in a standard format)
  link: string;  // Link to flight tracking page
  origin: Location;  // Origin location
  destination: Location;  // Destination location
  distance: { elapsed: number; remaining: number };  // Flight distance information
  speed: number;  // Speed of the flight
  scraped_at: number;  // Timestamp when the data was scraped (in seconds since epoch)
}

interface ErrorServerData {
  error: string;
}

type ServerData = SuccessfulServerData | ErrorServerData;

export interface FlightData {
  flightNumber: string;
  status?: FlightStatus;  // Determined after API call
  relation: FlightRelation;
  direction: FlightDirection;
  departureTime: number;  // Departure time in milliseconds since epoch
  slackId: string;
  flightTime: number;
  user?: {
    name: string;
    image: string;
  };
  index?: number; // Index of the connecting flight (0 for first, 1 for second, etc.)
  serverData?: ServerData;
}


// Returns a hash of the slack ID
function hashSlackId(slackId: string): number {
  const hash = Array.from(slackId).reduce((acc, char) => {
    return (acc + char.charCodeAt(0)) % 10000;
  }, 0);
  return hash;
}

function formatHash(hash: number): string {
  return hash.toString().padStart(4, '0');  // Ensure it's always 4 digits
}

/* Flight scoring (determines how flights are sorted):
 * +2 for having server data
 * +1 for having a user
 * +0.5 for IN_FLIGHT status
 * +0.4 for ARRIVED status
 * +0.3 for DEPARTING_SOON status
 * +0.1 for UPCOMING status
 * Connecting flights:
 * Hash user slack ID
 * +0.0<hash>0 for CONNECTING_AFTER
 * +0.0<hash><n> for CONNECTING_BOTH, where 0<n<9 & n represents index of the flight in the whole list
 * +0.0<hash>9 for CONNECTING_BEFORE
 * The function also returns an alternate score, the slack ID hash, in case two flights have the same score.
 */
function scoreFlight(flight: FlightData, index: number, totalFlights: number): {
  score: number,
  alternateScore: number
} {
  let score = 0;

  // Base score for server data
  if (flight.serverData && !('error' in flight.serverData)) {
    score += 2;
  }

  // User presence
  if (flight.user && flight.user.name && flight.user.image) {
    score += 1;
  }

  // Status-based scoring
  switch (flight.status) {
    case 'IN_FLIGHT':
      score += 0.5;
      break;
    case 'ARRIVED':
      score += 0.4;
      break;
    case 'DEPARTING_SOON':
      score += 0.3;
      break;
    case 'UPCOMING':
      score += 0.1;
      break;
    default:
      break;
  }

  // Scoring based on flight relation
  const numericHash = hashSlackId(flight.slackId);
  const slackIdHash = formatHash(numericHash);
  if (flight.relation === 'CONNECTING_AFTER') {
    score += parseFloat(`0.${slackIdHash}0`);
  } else if (flight.relation === 'CONNECTING_BOTH') {
    const n = (index + 1).toString().padStart(totalFlights.toString().length, '0'); // Ensures n is same length as totalFlights
    score += parseFloat(`0.${slackIdHash}${n}`);
  } else if (flight.relation === 'CONNECTING_BEFORE') {
    score += parseFloat(`0.${slackIdHash}9`);
  }
  return {score, alternateScore: numericHash};
}

export function sortFlights(flights: FlightData[]): FlightData[] {
  // Sort flights by score, then hash (as a backup)
  return flights
    .map((flight, index) => ({flight, score: scoreFlight(flight, index, flights.length)}))
    .sort((a, b) => {
      if (a.score.score !== b.score.score) {
        return b.score.score - a.score.score;  // Higher score first
      }
      return a.score.alternateScore - b.score.alternateScore;  // Lower hash value first
    })
    .map(({flight}) => flight);  // Extract the flight data back out
}

export interface CalculatedFlight extends FlightData {
  elapsedDistance: number;
  totalDistance: number;
  elapsedRatio: number;
  user: {
    name: string,
    image: string
  };
  fullPathPoints: L.LatLng[];
}

export function calculateFlightData(flight: FlightData, currentTime: number): CalculatedFlight | null {
  if ((flight.serverData && 'error' in flight.serverData) || !flight.serverData) {
    return null;
  }
  let elapsedDistance = flight.serverData.distance.elapsed || 0;
  const totalDistance = elapsedDistance + (flight.serverData.distance.remaining || 0);

  if (flight.status === 'IN_FLIGHT' && flight.serverData.scraped_at && flight.serverData.speed && totalDistance > 0) {
    const timeSinceScrape = (currentTime / 1000) - flight.serverData.scraped_at; // in seconds
    if (timeSinceScrape > 0) {
      const speedInNmps = flight.serverData.speed / 3600; // convert knots (nm/h) to nm/s
      const distanceSinceScrape = timeSinceScrape * speedInNmps;
      elapsedDistance += distanceSinceScrape;
    }
  }

  elapsedDistance = Math.min(elapsedDistance, totalDistance);
  const elapsedRatio = totalDistance > 0 ? elapsedDistance / totalDistance : 0;

  const originCoords: { lat: number, lng: number } = flight.serverData.origin.coordinates || {lat: 0, lng: 0};
  const destCoords: { lat: number, lng: number } = flight.serverData.destination.coordinates || {lat: 0, lng: 0};

  const lngDiff = destCoords.lng - originCoords.lng;
  const crossesAntiMeridian = Math.abs(lngDiff) > 180;
  const numPoints = 100;

  let fullPathPoints: LatLng[];
  let bezierControlPoint: { lat: number, lng: number } | undefined;

  if (crossesAntiMeridian) {
    const p0 = {...originCoords};
    const p2 = {...destCoords};

    if (p0.lng > 0 && p2.lng < 0) {
      // No adjustment needed, path will cross the anti meridian naturally.
    } else {
      // Adjust longitude to force path across the anti meridian.
      if (lngDiff > 180) p2.lng -= 360;
      else if (lngDiff < -180) p2.lng += 360;
    }

    const midLon = (p0.lng + p2.lng) / 2;
    const midLat = (p0.lat + p2.lat) / 2;
    const latOffset = Math.abs(p2.lng - p0.lng) / 4;
    const controlLat = midLat < 0 ? Math.max(midLat - latOffset, -85) : Math.min(midLat + latOffset, 85);

    bezierControlPoint = {lat: controlLat, lng: midLon};
    fullPathPoints = generateBezierPoints(p0 as LatLng, bezierControlPoint, p2, numPoints);
  } else {
    fullPathPoints = generateGreatCirclePoints(originCoords as LatLng, destCoords, numPoints);
  }

  return {
    ...flight,
    elapsedDistance,
    totalDistance,
    elapsedRatio,
    fullPathPoints
  };
}