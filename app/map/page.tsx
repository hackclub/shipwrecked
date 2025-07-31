'use client';

import {useEffect, useState} from 'react';
import {useSession} from 'next-auth/react';
import {useRouter} from 'next/navigation';
import Icon from '@hackclub/icons';
import {calculateFlightData, FlightData, sortFlights} from '@/lib/map';
import Map from '@/components/map/Map';
import Sidebar from '@/components/map/Sidebar';
import mapThemes from '@/lib/map-theme';

async function fetchFlights() {
  const res = await fetch('/api/map/flights', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    if (res.headers.get('Content-Type')?.includes('application/json')) {
      const errorData = await res.json();
      if (errorData.error) {
        throw new Error(`Failed to fetch flights: ${errorData.error}`);
      }
    }
    throw new Error('Failed to fetch flights');
  }

  return res.json();
}

export default function MapPage() {
  const {data: session, status} = useSession();
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [center, setCenter] = useState<[number, number] | undefined>(undefined);
  const [themeIndex, setThemeIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAndUpdateFlights = () => {
      setIsLoading(true);
      fetchFlights()
        .then((data) => setFlights(sortFlights(data.flights)))
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    };

    fetchAndUpdateFlights(); // Initial fetch

    const intervalId = setInterval(fetchAndUpdateFlights, 2 * 60 * 1000); // Fetch every 2 minutes

    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, []);

  const handleFlightSelect = (flight: FlightData) => {
    if ((!flight.serverData) || 'error' in flight.serverData) return;
    // If in progress
    if (flight.status === 'IN_FLIGHT') {
      const calculatedData = calculateFlightData(flight, Date.now());
      if (!calculatedData) return;
      const point = calculatedData.fullPathPoints[Math.floor(calculatedData.fullPathPoints.length * calculatedData.elapsedRatio)];
      if (!point) return;
      setCenter(point);
      return;
    }
    // If completed
    if (flight.status === 'ARRIVED') {
      setCenter(flight.serverData.destination.coordinates);
      return;
    }
    // If not yet departed
    if (flight.status === 'DEPARTING_SOON') {
      setCenter(flight.serverData.origin.coordinates);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading && (
        <div className="fixed inset-0 z-1500 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
            <span className="text-lg font-semibold">Loading flights...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="fixed inset-0 z-1500 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
            <Icon glyph="important" size={48} className="text-red-500 mb-4"/>
            <span className="text-lg font-semibold text-red-700 mb-2">{error}</span>
            <button
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              onClick={() => setError(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="relative min-h-screen">
        <Sidebar
          flights={flights}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onFlightSelect={handleFlightSelect}
          themeIndex={themeIndex}
          setThemeIndex={setThemeIndex}
          themeNames={mapThemes.map(t => t.name)}
        />
        <div className={`transition-all duration-300 ${collapsed ? 'pl-12' : 'pl-[32rem]'}`}>
          <Map
            theme={themeIndex}
            flights={flights}
            center={center}
            setCenter={setCenter}
          />
        </div>
      </div>
    </div>
  );
}