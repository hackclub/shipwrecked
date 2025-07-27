'use client';

import {Fragment, useEffect, useRef, useState} from 'react';
import {MapContainer, Popup, TileLayer, useMap} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import themes from '@/lib/map-theme';
import {CalculatedFlight, calculateFlightData, FlightData} from '@/lib/map';
import {calculateBearing} from '@/lib/map-drawing';
import MapPath from '@/components/map/MapPath';
import Marker from '@/components/map/Marker';
import Flight from '@/components/map/Flight';
import ShipwreckedPOI from '@/components/map/ShipwreckedPOI';
import {latLng} from 'leaflet';

export default function Map({theme, flights: flightsProp, center, setCenter}: {
  theme?: number,
  flights?: FlightData[],
  center?: [number, number],
  setCenter?: (center: [number, number] | null) => void
}) {
  const mapTheme = themes[theme || 0];
  const [calculatedFlights, setCalculatedFlights] = useState<(CalculatedFlight | null)[]>([]);
  const flightsRef = useRef(flightsProp);
  flightsRef.current = flightsProp;

  useEffect(() => {
    if (!flightsRef.current) {
      setCalculatedFlights([]);
      return;
    }

    const calculate = () => {
      if (flightsRef.current) {
        setCalculatedFlights(flightsRef.current.map(f => calculateFlightData(f, Date.now())));
      }
    };

    calculate();

    const intervalId = setInterval(calculate, 1000);

    return () => clearInterval(intervalId);
  }, [flightsProp]);

  function MapCenterUpdater({center}: { center?: [number, number] }) {
    const map = useMap();
    useEffect(() => {
      if (center) {
        map.setView(center);
        map.setZoom(10);
        setCenter(null); // Prevent the user from being stuck
      }
    }, [center, map]);
    return null;
  }

  return (<MapContainer
      center={center || [0, 0]}
      zoom={2}
      className="flex-grow h-screen"
    >
      <MapCenterUpdater center={center}/>
      <TileLayer
        attribution={mapTheme.tileLayer.attribution}
        url={mapTheme.tileLayer.url}
        className="brightness-90"
      />
      <ShipwreckedPOI theme={mapTheme}/>
      {calculatedFlights ? calculatedFlights.map((calculatedFlight, index) => {
        if (!calculatedFlight) return null;
        if (!calculatedFlight.serverData || !calculatedFlight.status) return null; // Skip flights without server data or status
        if (calculatedFlight.serverData && 'error' in calculatedFlight.serverData) return null; // Skip flights with errors in server data
        const airportMarkers = (<>
            <Marker
              key={`origin-${index}`}
              iconConfig={mapTheme.icons.airport}
              iconState={{}}
              markerPosition={calculatedFlight.serverData?.origin?.coordinates || {
                lat: 0, lng: 0
              }}
              zIndex={0}
            >
              <Popup>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">{calculatedFlight.serverData.origin.airport}</h3>
                  <p className="text-sm text-gray-600">{calculatedFlight.serverData.origin.iata}</p>
                </div>
              </Popup>
            </Marker>
            <Marker
              key={`destination-${index}`}
              iconConfig={mapTheme.icons.airport}
              iconState={{}}
              markerPosition={calculatedFlight.serverData?.destination?.coordinates || {
                lat: 0, lng: 0
              }}
              zIndex={0}
            >
              <Popup>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">{calculatedFlight.serverData.destination.airport}</h3>
                  <p className="text-sm text-gray-600">{calculatedFlight.serverData.destination.iata}</p>
                </div>
              </Popup>
            </Marker>
          </>);
        if (['UPCOMING', 'PAST_FLIGHT', 'ARRIVED'].includes(calculatedFlight.status)) {
          // This flight is not in progress. Show it's path as elapsed.
          const positions = calculatedFlight?.fullPathPoints || [];
          return (<Fragment key={`flight-${index}`}>
              {airportMarkers}
              <MapPath pathConfig={mapTheme.paths.elapsed} positions={positions}
                       key={`elapsed-${index}`}/>
            </Fragment>);
        } else if (calculatedFlight.status === 'DEPARTING_SOON') {
          // The flight is departing soon. Show its entire path as remaining.
          const positions = calculatedFlight?.fullPathPoints || [];
          return (<Fragment key={`flight-${index}`}>
              {airportMarkers}
              <MapPath pathConfig={mapTheme.paths.remaining} positions={positions}
                       key={`in-progress-${index}`}/>
            </Fragment>);
        } else if (calculatedFlight.status === 'IN_FLIGHT') {
          // Flight is currently in progress. Calculate the elapsed and remaining parts of the path based on the
          // elapsed ratio.
          const positions = calculatedFlight?.fullPathPoints || [];
          const elapsedIndex = positions.length * calculatedFlight.elapsedRatio;
          const floorIndex = Math.floor(elapsedIndex);
          const ceilIndex = Math.ceil(elapsedIndex);

          if (floorIndex >= positions.length - 1) {
            // Flight is at or very close to the destination
            return (<Fragment key={`flight-${index}`}>
                {airportMarkers}
                <MapPath pathConfig={mapTheme.paths.elapsed} positions={positions}
                         key={`elapsed-${index}`}/>
              </Fragment>);
          }

          const floorPosition = positions[floorIndex];
          const ceilPosition = positions[ceilIndex];
          const interpolationRatio = elapsedIndex - floorIndex;

          const interpolatedLat = floorPosition.lat + (ceilPosition.lat - floorPosition.lat) * interpolationRatio;
          const interpolatedLng = floorPosition.lng + (ceilPosition.lng - floorPosition.lng) * interpolationRatio;
          const interpolatedPosition = latLng(interpolatedLat, interpolatedLng);

          const elapsedPositions = positions.slice(0, floorIndex + 1);
          elapsedPositions.push(interpolatedPosition);

          const remainingPositions = [interpolatedPosition, ...positions.slice(ceilIndex)];

          if (elapsedPositions.length === 0 || remainingPositions.length < 2) {
            return null; // Skip flights with no valid positions
          }

          const rotation = calculateBearing(interpolatedPosition.lat, interpolatedPosition.lng, ceilPosition.lat, ceilPosition.lng);
          return (<Fragment key={`flight-${index}`}>
              {airportMarkers}
              <Marker iconConfig={mapTheme.icons.airplane} iconState={{
                flip: true, rotate: rotation
              }} markerPosition={elapsedPositions[elapsedPositions.length - 1]}
                      zIndex={500}
                      key={`airplane-${index}`}>
                <Popup minWidth={200} maxWidth={500}>
                  <Flight flight={calculatedFlight} borderless={true} omitSeconds={false} inPopup={true}/>
                </Popup>
              </Marker>
              <MapPath pathConfig={mapTheme.paths.elapsed} positions={elapsedPositions}
                       key={`elapsed-${index}`}/>
              <MapPath pathConfig={mapTheme.paths.remaining} positions={remainingPositions}
                       key={`remaining-${index}`}/>
            </Fragment>);
        } else {
          console.warn(`Unknown flight status: ${calculatedFlight.status}`);
          return null; // Skip unknown statuses
        }
      }) : null}
    </MapContainer>);
}